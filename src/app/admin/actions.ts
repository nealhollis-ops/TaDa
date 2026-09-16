"use server";

import { revalidatePath } from "next/cache";
import { Resend } from "resend";
import { requireAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { logAdmin } from "@/lib/admin";
import { serverEnv } from "@/lib/env";
import { requestOrigin } from "@/lib/request-origin";
import type { Plan } from "@/lib/planner/types";

export type AdminResult = { ok: boolean; message: string } | null;

const PLANS: Plan[] = ["standard", "teams", "boss"];
const str = (v: FormDataEntryValue | null) => String(v ?? "").trim();
const planOf = (v: FormDataEntryValue | null): Plan => (PLANS.includes(str(v) as Plan) ? (str(v) as Plan) : "standard");
const expiryOf = (v: FormDataEntryValue | null) => {
  const s = str(v);
  if (!s) return null;
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d.toISOString();
};

/** Comp grant: set any member to any level free, with an optional expiry. Never touches Stripe rows. */
export async function grantComp(_prev: AdminResult, formData: FormData): Promise<AdminResult> {
  const { user } = await requireAdmin();
  const userId = str(formData.get("userId"));
  const plan = planOf(formData.get("plan"));
  const expiresAt = expiryOf(formData.get("expiresAt"));
  const note = str(formData.get("note")).slice(0, 200) || "Comp";
  if (!userId) return { ok: false, message: "Missing member." };
  const admin = createAdminClient();
  const { error } = await admin.from("entitlements").upsert({ user_id: userId, plan, source: "comp", status: "active", expires_at: expiresAt, granted_by: user.id, note }, { onConflict: "user_id,source" });
  if (error) return { ok: false, message: error.message };
  await logAdmin(user.id, "comp.grant", userId, { plan, expiresAt, note });
  revalidatePath(`/admin/members/${userId}`);
  revalidatePath("/admin/members");
  return { ok: true, message: `Comped to ${plan}${expiresAt ? ` until ${expiresAt.slice(0, 10)}` : " with no expiry"}.` };
}

export async function removeComp(_prev: AdminResult, formData: FormData): Promise<AdminResult> {
  const { user } = await requireAdmin();
  const userId = str(formData.get("userId"));
  const admin = createAdminClient();
  const { error } = await admin.from("entitlements").delete().eq("user_id", userId).eq("source", "comp");
  if (error) return { ok: false, message: error.message };
  await logAdmin(user.id, "comp.remove", userId);
  revalidatePath(`/admin/members/${userId}`);
  return { ok: true, message: "Comp removed." };
}

/** Ban hides the member everywhere, soft-deletes their posts and replies, and locks them out. */
export async function setBan(_prev: AdminResult, formData: FormData): Promise<AdminResult> {
  const { user } = await requireAdmin();
  const userId = str(formData.get("userId"));
  const ban = str(formData.get("ban")) === "1";
  if (userId === user.id) return { ok: false, message: "You cannot ban yourself." };
  const admin = createAdminClient();
  const { data: target } = await admin.from("profiles").select("role").eq("id", userId).maybeSingle();
  if (target?.role === "admin") return { ok: false, message: "Admins cannot be banned from here." };
  const { error } = await admin.from("profiles").update({ banned_at: ban ? new Date().toISOString() : null }).eq("id", userId);
  if (error) return { ok: false, message: error.message };
  if (ban) {
    const now = new Date().toISOString();
    await admin.from("posts").update({ deleted_at: now }).eq("user_id", userId).is("deleted_at", null);
    await admin.from("replies").update({ deleted_at: now }).eq("user_id", userId).is("deleted_at", null);
  }
  await logAdmin(user.id, ban ? "member.ban" : "member.unban", userId);
  revalidatePath(`/admin/members/${userId}`);
  revalidatePath("/admin/members");
  return { ok: true, message: ban ? "Member banned. Their posts are hidden." : "Ban lifted." };
}

/**
 * Bulk comp: existing members are granted right away; unknown emails get a
 * comp invite (granted the moment they sign up) and, optionally, an email.
 */
export async function bulkComp(_prev: AdminResult, formData: FormData): Promise<AdminResult> {
  const { user, profile } = await requireAdmin();
  const plan = planOf(formData.get("plan"));
  const expiresAt = expiryOf(formData.get("expiresAt"));
  const note = str(formData.get("note")).slice(0, 200) || "Faith Hub Unleashed";
  const sendEmail = str(formData.get("sendEmail")) === "1";
  const emails = Array.from(new Set(str(formData.get("emails")).split(/[\s,;]+/).map((e) => e.toLowerCase()).filter((e) => e.includes("@"))));
  if (!emails.length) return { ok: false, message: "Paste at least one email address." };

  const admin = createAdminClient();
  const { data: existing } = await admin.from("profiles").select("id,email").in("email", emails);
  const known = new Map((existing ?? []).map((p) => [p.email.toLowerCase(), p.id]));
  let granted = 0;
  let invited = 0;
  let mailed = 0;
  const failures: string[] = [];
  const origin = await requestOrigin();
  const env = serverEnv();
  const resend = sendEmail ? new Resend(env.resendApiKey) : null;

  for (const email of emails) {
    const id = known.get(email);
    if (id) {
      const { error } = await admin.from("entitlements").upsert({ user_id: id, plan, source: "comp", status: "active", expires_at: expiresAt, granted_by: user.id, note }, { onConflict: "user_id,source" });
      if (error) failures.push(`${email}: ${error.message}`);
      else granted += 1;
      continue;
    }
    // One open invite per email (unique on lower(email) where not redeemed): update it or create it.
    const { data: open } = await admin.from("comp_invites").select("id").ilike("email", email).is("redeemed_at", null).maybeSingle();
    const { error } = open
      ? await admin.from("comp_invites").update({ plan, expires_at: expiresAt, note, invited_by: user.id }).eq("id", open.id)
      : await admin.from("comp_invites").insert({ email, plan, expires_at: expiresAt, note, invited_by: user.id });
    if (error) {
      failures.push(`${email}: ${error.message}`);
      continue;
    }
    invited += 1;
    if (resend) {
      const link = `${origin}/login?mode=signup&email=${encodeURIComponent(email)}`;
      const { error: mailErr } = await resend.emails.send({
        from: env.emailFrom,
        to: email,
        subject: `${profile.name} set up your TaDa access`,
        html: inviteHtml(profile.name, plan, link),
      });
      if (mailErr) failures.push(`${email}: email failed (${mailErr.message})`);
      else mailed += 1;
    }
  }
  await logAdmin(user.id, "comp.bulk", null, { plan, expiresAt, granted, invited, mailed, count: emails.length });
  revalidatePath("/admin/members");
  revalidatePath("/admin/comp");
  const parts = [`${granted} member${granted === 1 ? "" : "s"} comped now`, `${invited} invite${invited === 1 ? "" : "s"} waiting for signup`];
  if (sendEmail) parts.push(`${mailed} email${mailed === 1 ? "" : "s"} sent`);
  return { ok: failures.length === 0, message: `${parts.join(", ")}.${failures.length ? ` Problems: ${failures.join("; ")}` : ""}` };
}

export async function deleteContent(_prev: AdminResult, formData: FormData): Promise<AdminResult> {
  const { user } = await requireAdmin();
  const kind = str(formData.get("kind"));
  const id = str(formData.get("id"));
  const reportId = str(formData.get("reportId"));
  if (!["post", "reply"].includes(kind) || !id) return { ok: false, message: "Bad request." };
  const admin = createAdminClient();
  const { error } = await admin.from(kind === "post" ? "posts" : "replies").update({ deleted_at: new Date().toISOString() }).eq("id", id);
  if (error) return { ok: false, message: error.message };
  if (reportId) await admin.from("reports").update({ status: "reviewed" }).eq("id", reportId);
  await logAdmin(user.id, `${kind}.delete`, id, reportId ? { reportId } : undefined);
  revalidatePath("/admin/moderation");
  revalidatePath("/admin/announcements");
  return { ok: true, message: `${kind === "post" ? "Post" : "Reply"} removed.` };
}

export async function resolveReport(_prev: AdminResult, formData: FormData): Promise<AdminResult> {
  const { user } = await requireAdmin();
  const id = str(formData.get("reportId"));
  const status = str(formData.get("status")) === "dismissed" ? "dismissed" : "reviewed";
  const admin = createAdminClient();
  const { error } = await admin.from("reports").update({ status }).eq("id", id);
  if (error) return { ok: false, message: error.message };
  await logAdmin(user.id, `report.${status}`, id);
  revalidatePath("/admin/moderation");
  return { ok: true, message: status === "dismissed" ? "Report dismissed." : "Report marked reviewed." };
}

export async function postAnnouncement(_prev: AdminResult, formData: FormData): Promise<AdminResult> {
  const { user } = await requireAdmin();
  const text = str(formData.get("text")).slice(0, 2000);
  const type = ["question", "win", "boost"].includes(str(formData.get("type"))) ? str(formData.get("type")) : "boost";
  if (!text) return { ok: false, message: "Write something first." };
  const admin = createAdminClient();
  const { error } = await admin.from("posts").insert({ user_id: user.id, type, text, pinned: true });
  if (error) return { ok: false, message: error.message };
  await logAdmin(user.id, "announcement.post", null, { type });
  revalidatePath("/admin/announcements");
  return { ok: true, message: "Pinned to the top of the community." };
}

export async function setPinned(_prev: AdminResult, formData: FormData): Promise<AdminResult> {
  const { user } = await requireAdmin();
  const id = str(formData.get("id"));
  const pinned = str(formData.get("pinned")) === "1";
  const admin = createAdminClient();
  const { error } = await admin.from("posts").update({ pinned }).eq("id", id);
  if (error) return { ok: false, message: error.message };
  await logAdmin(user.id, pinned ? "post.pin" : "post.unpin", id);
  revalidatePath("/admin/announcements");
  return { ok: true, message: pinned ? "Pinned." : "Unpinned." };
}

function inviteHtml(from: string, plan: Plan, link: string) {
  const planName = plan === "boss" ? "Boss" : plan === "teams" ? "Teams" : "Standard";
  return `<!doctype html><html><body style="margin:0;padding:0;background:#F6F0DC;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#2B2622;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F6F0DC;padding:32px 16px;"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#ffffff;border-radius:16px;border:1px solid #E3D9BE;">
<tr><td style="padding:32px 32px 8px;text-align:center;"><div style="font-size:28px;font-weight:800;color:#189AB4;">TaDa</div>
<div style="font-size:13px;color:#7C7468;margin-top:4px;">Plan your day, check it off, and hear the ta-da.</div></td></tr>
<tr><td style="padding:16px 32px 0;"><h1 style="margin:0 0 8px;font-size:22px;">Your TaDa ${planName} access is ready</h1>
<p style="margin:0 0 20px;font-size:16px;line-height:1.5;">${escapeHtml(from)} set you up with TaDa ${planName} at no charge. Create your account with this email address and you land straight in your planner. No checkout, no card.</p>
<p style="margin:0 0 24px;text-align:center;"><a href="${link}" style="display:inline-block;background:#9B2915;color:#ffffff;text-decoration:none;font-weight:700;font-size:16px;padding:14px 28px;border-radius:999px;">Create my account</a></p>
<p style="margin:0 0 8px;font-size:13px;line-height:1.5;color:#7C7468;">Or copy this link: <span style="word-break:break-all;color:#189AB4;">${link}</span></p></td></tr>
<tr><td style="padding:16px 32px 28px;font-size:12px;line-height:1.5;color:#7C7468;border-top:1px solid #E3D9BE;">Questions? Write to clientcare@gettada.me.</td></tr>
</table></td></tr></table></body></html>`;
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] as string);
}
