import { NextResponse } from "next/server";
import webpush from "web-push";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { publicEnv, serverEnv } from "@/lib/env";

const COPY: Record<string, { title: string; body: string; url: string }> = {
  message: { title: "TaDa", body: "You have a new message.", url: "/partners" },
  partner_request: { title: "TaDa", body: "Someone asked to be your accountability partner.", url: "/partners" },
  team_invite: { title: "TaDa", body: "You've been invited to a team.", url: "/partners" },
  assignment: { title: "TaDa", body: "New work was assigned to you.", url: "/today" },
};

/**
 * POST /api/notify { kind, toUser }
 * Called by the app right after the sender's action lands. Honors the
 * recipient's notification toggle and blocks; sends to every device they registered.
 */
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });

  const body = (await request.json().catch(() => null)) as { kind?: string; toUser?: string } | null;
  const copy = body?.kind ? COPY[body.kind] : undefined;
  const toUser = body?.toUser;
  if (!copy || !toUser || toUser === user.id) return NextResponse.json({ ok: false });

  const env = serverEnv();
  if (!env.vapidPrivateKey || !publicEnv.vapidPublicKey) return NextResponse.json({ ok: false, reason: "push not configured" });

  const admin = createAdminClient();
  const [{ data: profile }, { data: blocked }, { data: subs }] = await Promise.all([
    admin.from("profiles").select("notif_on,banned_at").eq("id", toUser).maybeSingle(),
    admin.from("blocks").select("blocker_id").eq("blocker_id", toUser).eq("blocked_id", user.id).maybeSingle(),
    admin.from("push_subscriptions").select("id,endpoint,keys").eq("user_id", toUser),
  ]);
  if (!profile || profile.notif_on === false || profile.banned_at || blocked || !subs?.length) return NextResponse.json({ ok: false });

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
  return NextResponse.json({ ok: true, sent });
}
