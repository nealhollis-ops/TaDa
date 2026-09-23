import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { pushOnly } from "@/lib/notify/deliver";

type Copy = { title: string; body: string; url: string };
type Extra = Record<string, string | undefined>;

const clean = (s: string | undefined, max: number) => (s ?? "").replace(/\s+/g, " ").trim().slice(0, max);

/**
 * What each kind says. Social kinds go to another member; `badge` and `level`
 * are the member's own milestones and may only be sent to themselves.
 */
const COPY: Record<string, { self: boolean; community?: boolean; make: (x: Extra) => Copy }> = {
  message: {
    self: false,
    make: (x) => ({ title: "TaDa", body: x.name ? `${clean(x.name, 40)} sent you a message.` : "You have a new message.", url: x.boss ? "/partners?tab=boss" : "/partners" }),
  },
  partner_request: { self: false, make: () => ({ title: "TaDa", body: "Someone asked to be your accountability partner.", url: "/partners" }) },
  team_invite: { self: false, make: () => ({ title: "TaDa", body: "You've been invited to a team.", url: "/partners" }) },
  assignment: { self: false, make: () => ({ title: "TaDa", body: "New work was assigned to you.", url: "/today" }) },
  assignment_note: {
    self: false,
    make: (x) => ({
      title: `${clean(x.name, 40) || "Someone"} added a note`,
      body: `${clean(x.task, 60) ? clean(x.task, 60) + ": " : ""}${clean(x.snippet, 120)}`,
      url: x.boss ? "/partners?tab=boss" : "/today",
    }),
  },
  reply: {
    self: false,
    community: true,
    make: (x) => ({ title: `${clean(x.name, 40) || "Someone"} replied to your post`, body: clean(x.snippet, 120), url: "/community" }),
  },
  mention: {
    self: false,
    community: true,
    make: (x) => ({ title: `${clean(x.name, 40) || "Someone"} mentioned you`, body: clean(x.snippet, 120), url: "/community" }),
  },
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
    admin.from("profiles").select("notif_on,notif_community,banned_at").eq("id", toUser).maybeSingle(),
    def.self ? Promise.resolve({ data: null }) : admin.from("blocks").select("blocker_id").eq("blocker_id", toUser).eq("blocked_id", user.id).maybeSingle(),
  ]);
  if (!profile || profile.banned_at || blocked) return NextResponse.json({ ok: false });
  // A member who switched off community notifications gets neither the bell entry nor the push for replies and mentions.
  if (def.community && profile.notif_community === false) return NextResponse.json({ ok: false, reason: "community off" });

  const copy = def.make(body ?? {});
  await admin.from("notifications").insert({ user_id: toUser, kind: body!.kind, title: copy.title, body: copy.body, url: copy.url });

  const sent = await pushOnly(admin, toUser, copy, profile.notif_on !== false);
  return NextResponse.json({ ok: true, sent });
}
