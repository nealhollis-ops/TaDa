import webpush from "web-push";
import type { SupabaseClient } from "@supabase/supabase-js";
import { publicEnv, serverEnv } from "@/lib/env";

export type Copy = { title: string; body: string; url: string };

/**
 * Put a notice in a member's bell and push it to their devices if alerts are on.
 * Shared by the /api/notify route (member-triggered) and the crons (server-triggered).
 * Returns how many devices took the push, or -1 when the member was skipped.
 */
export async function deliver(admin: SupabaseClient, toUser: string, kind: string, copy: Copy): Promise<number> {
  const { data: profile } = await admin.from("profiles").select("notif_on,banned_at").eq("id", toUser).maybeSingle();
  if (!profile || profile.banned_at) return -1;
  await admin.from("notifications").insert({ user_id: toUser, kind, title: copy.title, body: copy.body, url: copy.url });
  return pushOnly(admin, toUser, copy, profile.notif_on !== false);
}

export async function pushOnly(admin: SupabaseClient, toUser: string, copy: Copy, alertsOn: boolean): Promise<number> {
  const env = serverEnv();
  if (!alertsOn || !env.vapidPrivateKey || !publicEnv.vapidPublicKey) return 0;
  const { data: subs } = await admin.from("push_subscriptions").select("id,endpoint,keys").eq("user_id", toUser);
  if (!subs?.length) return 0;
  webpush.setVapidDetails(env.vapidSubject, publicEnv.vapidPublicKey, env.vapidPrivateKey);
  const payload = JSON.stringify(copy);
  let sent = 0;
  await Promise.all(
    subs.map(async (s) => {
      try {
        await webpush.sendNotification({ endpoint: s.endpoint, keys: s.keys as { p256dh: string; auth: string } }, payload, { TTL: 60 * 60 });
        sent += 1;
      } catch (err) {
        const status = (err as { statusCode?: number }).statusCode;
        if (status === 404 || status === 410) await admin.from("push_subscriptions").delete().eq("id", s.id);
      }
    }),
  );
  return sent;
}
