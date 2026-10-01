import { Resend } from "resend";
import type { SupabaseClient } from "@supabase/supabase-js";
import { serverEnv } from "./env";
import type { Plan } from "./planner/types";

/**
 * Tells the founders when someone starts paying, and when they move between
 * plans.
 *
 * Nothing here may ever break billing: an entitlement that was written
 * correctly must not be rolled back because an email bounced, so every path
 * swallows its own errors and says so in the log.
 */

/** Overridable without a deploy, but these two are the default. */
const DEFAULT_RECIPIENTS = ["neal.hollis@gmail.com", "debhollis1@gmail.com"];

const PLAN_LABEL: Record<Plan, string> = { standard: "Standard", teams: "Teams", boss: "Boss" };

/** Plans in order of size, so a move can be called an upgrade or a downgrade honestly. */
const PLAN_RANK: Record<Plan, number> = { standard: 1, teams: 2, boss: 3 };

function recipients(): string[] {
  const listed = (process.env.FOUNDER_ALERT_EMAILS ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  return listed.length ? listed : DEFAULT_RECIPIENTS;
}

/**
 * Test-mode Stripe keys mean a replayed event, not a real member: `npm run
 * test:stripe` fires checkouts and plan changes through this same code path and
 * must not mail anybody. Set FOUNDER_ALERT_IN_TEST=1 to watch it work.
 */
function shouldSend(): boolean {
  if (process.env.FOUNDER_ALERT_IN_TEST === "1") return true;
  return !serverEnv().stripeSecretKey.startsWith("sk_test_");
}

type Who = { name: string; email: string };

async function whoIs(admin: SupabaseClient, userId: string): Promise<Who> {
  const { data } = await admin.from("profiles").select("name,email").eq("id", userId).maybeSingle();
  return { name: data?.name || "Someone", email: data?.email || "unknown email" };
}

function wrap(heading: string, rows: [string, string][]): string {
  const cells = rows
    .map(
      ([k, v]) =>
        `<tr><td style="padding:6px 16px 6px 0;color:#666666;font-size:14px;white-space:nowrap;">${k}</td><td style="padding:6px 0;color:#111111;font-size:14px;font-weight:600;">${v}</td></tr>`,
    )
    .join("");
  return `<!doctype html><html><body style="margin:0;padding:0;background:#F5F5F5;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F5F5F5;padding:32px 16px;"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#ffffff;border-radius:16px;padding:24px;">
<tr><td style="font-size:18px;font-weight:700;color:#111111;padding-bottom:12px;">${heading}</td></tr>
<tr><td><table role="presentation" cellpadding="0" cellspacing="0">${cells}</table></td></tr>
<tr><td style="padding-top:18px;font-size:12px;color:#666666;">Sent by TaDa to the founders. Nobody else receives this.</td></tr>
</table></td></tr></table></body></html>`;
}

function escape(s: string): string {
  return s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c] as string);
}

async function send(subject: string, html: string, text: string): Promise<void> {
  const env = serverEnv();
  const { error } = await new Resend(env.resendApiKey).emails.send({
    from: env.emailFrom,
    to: recipients(),
    subject,
    html,
    text,
  });
  if (error) console.error("founder alert", subject, error);
}

/** Someone just started a subscription. Status says whether they are on trial yet. */
export async function alertNewMember(admin: SupabaseClient, userId: string, plan: Plan, status: string): Promise<void> {
  try {
    if (!shouldSend()) return;
    const who = await whoIs(admin, userId);
    const planName = PLAN_LABEL[plan] ?? plan;
    const stage = status === "trialing" ? "14-day trial" : status;
    const subject = `TaDa: new ${planName} member - ${who.name}`;
    await send(
      subject,
      wrap("Someone joined TaDa", [
        ["Name", escape(who.name)],
        ["Email", escape(who.email)],
        ["Plan", escape(planName)],
        ["Starting on", escape(stage)],
      ]),
      `${who.name} (${who.email}) signed up for the ${planName} plan. Starting on: ${stage}.`,
    );
  } catch (err) {
    console.error("founder alert: new member", err);
  }
}

/** Someone moved between plans, in either direction. */
export async function alertPlanChange(admin: SupabaseClient, userId: string, from: Plan, to: Plan): Promise<void> {
  try {
    if (!shouldSend()) return;
    const who = await whoIs(admin, userId);
    const fromName = PLAN_LABEL[from] ?? from;
    const toName = PLAN_LABEL[to] ?? to;
    const direction = PLAN_RANK[to] > PLAN_RANK[from] ? "upgraded" : "moved down";
    const subject = `TaDa: ${who.name} ${direction} to ${toName}`;
    await send(
      subject,
      wrap(`Someone ${direction}`, [
        ["Name", escape(who.name)],
        ["Email", escape(who.email)],
        ["Was on", escape(fromName)],
        ["Now on", escape(toName)],
      ]),
      `${who.name} (${who.email}) ${direction} from ${fromName} to ${toName}.`,
    );
  } catch (err) {
    console.error("founder alert: plan change", err);
  }
}
