import { NextResponse } from "next/server";
import { Resend } from "resend";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { serverEnv } from "@/lib/env";
import { requestOrigin } from "@/lib/request-origin";

/**
 * POST /api/invites/send { inviteId }
 * Emails a team invitation with a magic link. Only the team owner who created
 * the invite may trigger it.
 */
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });

  const body = (await request.json().catch(() => null)) as { inviteId?: string } | null;
  if (!body?.inviteId) return NextResponse.json({ error: "Bad request." }, { status: 400 });

  const admin = createAdminClient();
  const { data: inv } = await admin.from("team_invites").select("id,email,token,invited_by,team_id").eq("id", body.inviteId).maybeSingle();
  if (!inv || inv.invited_by !== user.id) return NextResponse.json({ error: "Not your invite." }, { status: 403 });
  const [{ data: team }, { data: inviter }] = await Promise.all([
    admin.from("teams").select("name,kind").eq("id", inv.team_id).single(),
    admin.from("profiles").select("name").eq("id", user.id).single(),
  ]);

  const origin = await requestOrigin();
  const link = `${origin}/invite/${inv.token}`;
  const env = serverEnv();
  const resend = new Resend(env.resendApiKey);
  const kindLine =
    team?.kind === "boss"
      ? "This is a boss team: the owner assigns tasks with deadlines and sees their status. Your personal task list stays yours."
      : "Teams share a discussion room and see each other's weekly progress. Nobody sees your actual tasks.";

  const { error } = await resend.emails.send({
    from: env.emailFrom,
    to: inv.email,
    subject: `${inviter?.name ?? "A TaDa member"} invited you to ${team?.name ?? "a team"} on TaDa`,
    html: `<!doctype html><html><body style="margin:0;padding:0;background:#F5F5F5;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#111111;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F5F5F5;padding:32px 16px;"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#ffffff;border-radius:16px;border:1px solid #DDDDDD;">
<tr><td style="padding:32px 32px 8px;text-align:center;"><div style="font-size:28px;font-weight:800;color:#111111;">TaDa</div>
<div style="font-size:13px;color:#666666;margin-top:4px;">Plan your day, check it off, and hear the TaDa.</div></td></tr>
<tr><td style="padding:16px 32px 0;"><h1 style="margin:0 0 8px;font-size:22px;">You're invited to ${escapeHtml(team?.name ?? "a team")}</h1>
<p style="margin:0 0 12px;font-size:16px;line-height:1.5;">${escapeHtml(inviter?.name ?? "A TaDa member")} added you to their team. Tap below to join. If you don't have a TaDa account yet, you'll create one on the way in.</p>
<p style="margin:0 0 20px;font-size:14px;line-height:1.5;color:#666666;">${kindLine}</p>
<p style="margin:0 0 24px;text-align:center;"><a href="${link}" style="display:inline-block;background:#E30022;color:#ffffff;text-decoration:none;font-weight:700;font-size:16px;padding:14px 28px;border-radius:999px;">Join the team</a></p>
<p style="margin:0 0 8px;font-size:13px;line-height:1.5;color:#666666;">Or copy this link: <span style="word-break:break-all;color:#111111;">${link}</span><br>This invitation expires in 14 days.</p></td></tr>
<tr><td style="padding:16px 32px 28px;font-size:12px;line-height:1.5;color:#666666;border-top:1px solid #DDDDDD;">Not expecting this? You can ignore it. Questions? Write to clientcare@gettada.me.</td></tr>
</table></td></tr></table></body></html>`,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 502 });
  return NextResponse.json({ ok: true });
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] as string);
}
