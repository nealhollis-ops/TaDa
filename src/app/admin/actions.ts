"use server";

import { revalidatePath } from "next/cache";
import { Resend } from "resend";
import webpush from "web-push";
import { requireAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { logAdmin } from "@/lib/admin";
import { publicEnv, serverEnv } from "@/lib/env";
import { requestOrigin } from "@/lib/request-origin";
import { getStripe } from "@/lib/stripe";
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

/** The member's live Stripe subscription, if they have one that is still billing. */
async function activeStripeSub(userId: string) {
  const admin = createAdminClient();
  const { data } = await admin.from("entitlements").select("stripe_sub_id,status").eq("user_id", userId).eq("source", "stripe").maybeSingle();
  if (!data?.stripe_sub_id || !["trialing", "active", "past_due", "unpaid"].includes(data.status)) return null;
  return data.stripe_sub_id as string;
}

/**
 * Cancel a member's Stripe subscription from here instead of the Stripe
 * dashboard. "end" lets them keep what they paid for until the period ends;
 * "now" stops it immediately. Stripe's webhook then updates the entitlement
 * row, so nothing is written to it here.
 */
export async function cancelSubscription(_prev: AdminResult, formData: FormData): Promise<AdminResult> {
  const { user } = await requireAdmin();
  const userId = str(formData.get("userId"));
  const when = str(formData.get("when")) === "now" ? "now" : "end";
  const subId = await activeStripeSub(userId);
  if (!subId) return { ok: false, message: "No active Stripe subscription to cancel." };
  try {
    const stripe = getStripe();
    if (when === "now") await stripe.subscriptions.cancel(subId, { prorate: false });
    else await stripe.subscriptions.update(subId, { cancel_at_period_end: true });
  } catch (e) {
    return { ok: false, message: (e as Error).message };
  }
  await logAdmin(user.id, "subscription.cancel", userId, { subId, when });
  revalidatePath(`/admin/members/${userId}`);
  return { ok: true, message: when === "now" ? "Subscription cancelled. Access ends as soon as Stripe confirms, usually within a minute." : "Subscription set to end at the close of the current period. They keep access until then." };
}

/**
 * Delete a member for good: their sign-in, profile, tasks, stats, messages,
 * posts and replies all go (the database cascades from the auth user). Any
 * live Stripe subscription is cancelled first so nothing bills afterwards.
 * The Stripe customer and its invoices stay in Stripe for your records.
 */
export async function deleteMember(_prev: AdminResult, formData: FormData): Promise<AdminResult> {
  const { user } = await requireAdmin();
  const userId = str(formData.get("userId"));
  const confirm = str(formData.get("confirm")).toLowerCase();
  if (userId === user.id) return { ok: false, message: "You cannot delete yourself." };
  const admin = createAdminClient();
  const { data: target } = await admin.from("profiles").select("email,name,role").eq("id", userId).maybeSingle();
  if (!target) return { ok: false, message: "Member not found." };
  if (target.role === "admin") return { ok: false, message: "Admins cannot be deleted from here." };
  if (confirm !== "delete") return { ok: false, message: "Type delete to confirm." };
  const subId = await activeStripeSub(userId);
  if (subId) {
    try {
      await getStripe().subscriptions.cancel(subId, { prorate: false });
    } catch (e) {
      return { ok: false, message: `Could not cancel their Stripe subscription (${(e as Error).message}). Nothing was deleted.` };
    }
  }
  const { error } = await admin.auth.admin.deleteUser(userId);
  if (error) return { ok: false, message: error.message };
  await logAdmin(user.id, "member.delete", userId, { email: target.email, name: target.name, cancelledSub: subId });
  revalidatePath("/admin/members");
  revalidatePath("/admin");
  return { ok: true, message: `${target.email} deleted${subId ? " and their subscription cancelled" : ""}.` };
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
  const type = ["hi", "question", "win", "boost"].includes(str(formData.get("type"))) ? str(formData.get("type")) : "boost";
  if (!text) return { ok: false, message: "Write something first." };
  const admin = createAdminClient();
  const { error } = await admin.from("posts").insert({ user_id: user.id, type, text, pinned: true });
  if (error) return { ok: false, message: error.message };
  await logAdmin(user.id, "announcement.post", null, { type });
  revalidatePath("/admin/announcements");
  return { ok: true, message: "Pinned to the top of the community." };
}

const PUSH_LINKS: Record<string, string> = { today: "/today", plan: "/plan", community: "/community", partners: "/partners", account: "/account" };

/** Push a short announcement to every member who has notifications on. Honors bans and cleans dead devices. */
export async function pushAnnouncement(_prev: AdminResult, formData: FormData): Promise<AdminResult> {
  const { user } = await requireAdmin();
  const title = str(formData.get("title")).slice(0, 60) || "TaDa";
  const body = str(formData.get("body")).slice(0, 160);
  const url = PUSH_LINKS[str(formData.get("link"))] ?? "/today";
  if (!body) return { ok: false, message: "Write the message first." };
  const env = serverEnv();
  if (!env.vapidPrivateKey || !publicEnv.vapidPublicKey) return { ok: false, message: "Push keys are not configured on the server." };

  const admin = createAdminClient();
  const { data: everyone, error: eErr } = await admin.from("profiles").select("id,notif_on").is("banned_at", null);
  if (eErr) return { ok: false, message: eErr.message };
  // The bell shows the announcement to every active member; devices are only pinged for those with notifications on.
  const rows = (everyone ?? []).map((p) => ({ user_id: p.id, kind: "announcement", title, body, url }));
  for (let i = 0; i < rows.length; i += 500) await admin.from("notifications").insert(rows.slice(i, i + 500));
  const ids = (everyone ?? []).filter((p) => p.notif_on !== false).map((p) => p.id);
  if (!ids.length) return { ok: true, message: `Posted to ${rows.length} inbox${rows.length === 1 ? "" : "es"}. Nobody has notifications on yet, so no device was pinged.` };
  const { data: subs, error: sErr } = await admin.from("push_subscriptions").select("id,user_id,endpoint,keys").in("user_id", ids);
  if (sErr) return { ok: false, message: sErr.message };
  if (!subs?.length) return { ok: true, message: `Posted to ${rows.length} inbox${rows.length === 1 ? "" : "es"}. No device has registered for push yet.` };

  webpush.setVapidDetails(env.vapidSubject, publicEnv.vapidPublicKey, env.vapidPrivateKey);
  const payload = JSON.stringify({ title, body, url });
  let sent = 0;
  let dropped = 0;
  const reached = new Set<string>();
  // Small batches so a long list does not open hundreds of connections at once.
  for (let i = 0; i < subs.length; i += 50) {
    await Promise.all(
      subs.slice(i, i + 50).map(async (s) => {
        try {
          await webpush.sendNotification({ endpoint: s.endpoint, keys: s.keys as { p256dh: string; auth: string } }, payload, { TTL: 60 * 60 * 24 });
          sent += 1;
          reached.add(s.user_id);
        } catch (err) {
          const status = (err as { statusCode?: number }).statusCode;
          if (status === 404 || status === 410) {
            dropped += 1;
            await admin.from("push_subscriptions").delete().eq("id", s.id);
          }
        }
      }),
    );
  }
  await logAdmin(user.id, "announcement.push", null, { title, body, url, sent, members: reached.size, dropped });
  revalidatePath("/admin/announcements");
  const m = reached.size;
  return { ok: true, message: `Posted to ${rows.length} inbox${rows.length === 1 ? "" : "es"} and pushed to ${m} member${m === 1 ? "" : "s"} on ${sent} device${sent === 1 ? "" : "s"}.${dropped ? ` Removed ${dropped} dead device${dropped === 1 ? "" : "s"}.` : ""}` };
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
  revalidatePath("/admin/moderation");
  return { ok: true, message: pinned ? "Pinned." : "Unpinned." };
}

function inviteHtml(from: string, plan: Plan, link: string) {
  const planName = plan === "boss" ? "Boss" : plan === "teams" ? "Teams" : "Standard";
  return `<!doctype html><html><body style="margin:0;padding:0;background:#F5F5F5;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#111111;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F5F5F5;padding:32px 16px;"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#ffffff;border-radius:16px;border:1px solid #DDDDDD;">
<tr><td style="padding:32px 32px 8px;text-align:center;"><div style="font-size:28px;font-weight:800;color:#111111;">TaDa</div>
<div style="font-size:13px;color:#666666;margin-top:4px;">Plan your day, check it off, and hear the TaDa.</div></td></tr>
<tr><td style="padding:16px 32px 0;"><h1 style="margin:0 0 8px;font-size:22px;">Your TaDa ${planName} access is ready</h1>
<p style="margin:0 0 20px;font-size:16px;line-height:1.5;">${escapeHtml(from)} set you up with TaDa ${planName} at no charge. Create your account with this email address and you land straight in your planner. No checkout, no card.</p>
<p style="margin:0 0 24px;text-align:center;"><a href="${link}" style="display:inline-block;background:#E30022;color:#ffffff;text-decoration:none;font-weight:700;font-size:16px;padding:14px 28px;border-radius:999px;">Create my account</a></p>
<p style="margin:0 0 8px;font-size:13px;line-height:1.5;color:#666666;">Or copy this link: <span style="word-break:break-all;color:#111111;">${link}</span></p></td></tr>
<tr><td style="padding:16px 32px 28px;font-size:12px;line-height:1.5;color:#666666;border-top:1px solid #DDDDDD;">Questions? Write to clientcare@gettada.me.</td></tr>
</table></td></tr></table></body></html>`;
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] as string);
}
