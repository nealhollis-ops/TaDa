import { NextResponse } from "next/server";
import webpush from "web-push";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { publicEnv, serverEnv } from "@/lib/env";

type Copy = { title: string; body: string; url: string };
type Extra = Record<string, string | undefined>;

const clean = (s: string | undefined, max: number) => (s ?? "").replace(/\s+/g, " ").trim().slice(0, max);

/**
 * What each kind says. Social kinds go to another member; `badge` and `level`
 * are the member's own milestones and may only be sent to themselves.
 */
const COPY: Record<string, { self: boolean; make: (x: Extra) => Copy }> = {
  message: { self: false, make: () => ({ title: "TaDa", body: "You have a new message.", url: "/partners" }) },
  partner_request: { self: false, make: () => ({ title: "TaDa", body: "Someone asked to be your accountability partner.", url: "/partners" }) },
  team_invite: { self: false, make: () => ({ title: "TaDa", body: "You've been invited to a team.", url: "/partners" }) },
  assignment: { self: false, make: () => ({ title: "TaDa", body: "New work was assigned to you.", url: "/today" }) },
  badge: {
    self: true,
    make: (x) => {
      const name = clean(x.name, 60) || "a new badge";
      const e = clean(x.e, 4);
      return { title: `${e ? e + " " : ""}New badge: ${name}`, body: "You earned it. Your win is up in the community so people can cheer.", url: "/account" };
    },
  },
  level: {
    self: true,
    make: (x) => {
      const name = clean(x.name, 60) || "a new level";
      const e = clean(x.e, 4);
      return { title: `${e ? e + " " : ""}${name}`, body: "You climbed. Keep going, the view gets better.", url: "/account" };
    },
  },
};

/**
 * POST /api/notify { kind, toUser, ...extra }
 * Called by the app right after the triggering action lands. Always writes the
 * notice to the recipient's in-app inbox (the bell), then pushes it to their
 * devices if their notifications are on. Honors bans and blocks.
 */
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });

  const body = (await request.json().catch(() => null)) as ({ kind?: string; toUser?: string } & Extra) | null;
  const def = body?.kind ? COPY[body.kind] : undefined;
  const toUser = body?.toUser;
  if (!def || !toUser) return NextResponse.json({ ok: false });
  if (def.self ? toUser !== user.id : toUser === user.id) return NextResponse.json({ ok: false });

  const admin = createAdminClient();
  const [{ data: profile }, { data: blocked }] = await Promise.all([
    admin.from("profiles").select("notif_on,banned_at").eq("id", toUser).maybeSingle(),
    def.self ? Promise.resolve({ data: null }) : admin.from("blocks").select("blocker_id").eq("blocker_id", toUser).eq("blocked_id", user.id).maybeSingle(),
  ]);
  if (!profile || profile.banned_at || blocked) return NextResponse.json({ ok: false });

  const copy = def.make(body ?? {});
  await admin.from("notifications").insert({ user_id: toUser, kind: body!.kind, title: copy.title, body: copy.body, url: copy.url });

  const env = serverEnv();
  if (profile.notif_on === false || !env.vapidPrivateKey || !publicEnv.vapidPublicKey) return NextResponse.json({ ok: true, sent: 0 });
  const { data: subs } = await admin.from("push_subscriptions").select("id,endpoint,keys").eq("user_id", toUser);
  if (!subs?.length) return NextResponse.json({ ok: true, sent: 0 });

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
