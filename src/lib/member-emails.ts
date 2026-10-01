import type { SupabaseClient } from "@supabase/supabase-js";
import { emailShell, escapeHtml, sendEmail } from "./email";
import { publicEnv } from "./env";

/**
 * The two emails TaDa sends a member: hello, and a word before the card is
 * charged.
 *
 * Both are claimed before they are sent. The claim is an update that only
 * matches a row nobody has claimed yet, so a member opening two magic links at
 * once, or a cron that runs twice, still gets one email. A send that fails
 * releases the claim, because an unsent email should be retried rather than
 * marked done.
 */

const firstName = (name: string | null) => (name || "").trim().split(/\s+/)[0] || "";

/**
 * Welcome, once per account.
 *
 * Reached from both ways in: the confirmation link, and a signup that comes
 * back with a session already. Safe to call on every sign-in.
 */
export async function sendWelcomeOnce(admin: SupabaseClient, userId: string): Promise<boolean> {
  try {
    // Claim first. Anyone else calling this at the same moment matches no row.
    const { data: claimed } = await admin
      .from("profiles")
      .update({ welcomed_at: new Date().toISOString() })
      .eq("id", userId)
      .is("welcomed_at", null)
      .select("id,name,email")
      .maybeSingle();
    if (!claimed?.email) return false;

    const who = firstName(claimed.name as string | null);
    const hi = who ? `Welcome, ${escapeHtml(who)}.` : "Welcome to TaDa.";
    const app = publicEnv.appUrl;

    const sent = await sendEmail(
      claimed.email as string,
      "Welcome to TaDa",
      emailShell({
        heading: hi,
        paragraphs: [
          "TaDa is a month at a time. Put everything on your plate into the Brain Dump on Plan, let it sort the jumble into tasks, and tap Organize to drop them onto the quietest days.",
          "Then forget the month and work the day. Today shows what is due, you tap the circle, and you hear it.",
          "Two things worth doing in the first five minutes: add three tasks, and install TaDa on your phone from Account so it has its own icon.",
        ],
        cta: { label: "Open TaDa", href: `${app}/today` },
        footer: `New here? The guide at <a href="${app}/help" style="color:#111111;">${app.replace(/^https?:\/\//, "")}/help</a> covers every screen. Reply to this email if you get stuck; a person reads it.`,
      }),
      `${who ? `Welcome, ${who}.` : "Welcome to TaDa."}\n\nTaDa is a month at a time. Put everything on your plate into the Brain Dump on Plan, let it sort the jumble into tasks, and tap Organize to drop them onto the quietest days. Then forget the month and work the day.\n\nTwo things worth doing in the first five minutes: add three tasks, and install TaDa on your phone from Account.\n\nOpen TaDa: ${app}/today\nThe guide: ${app}/help`,
    );

    // Put it back if it never went, so the next sign-in tries again.
    if (!sent) await admin.from("profiles").update({ welcomed_at: null }).eq("id", userId);
    return sent;
  } catch (err) {
    console.error("welcome email", err);
    return false;
  }
}

/**
 * Three days before the trial becomes a charge. Claimed on the entitlement row,
 * so a resubscribe after a cancel can be reminded again on its own trial.
 */
export async function sendTrialEndingOnce(
  admin: SupabaseClient,
  entitlementId: string,
  userId: string,
  plan: string,
  chargeOn: Date,
): Promise<boolean> {
  try {
    const { data: claimed } = await admin
      .from("entitlements")
      .update({ trial_reminder_sent_at: new Date().toISOString() })
      .eq("id", entitlementId)
      .is("trial_reminder_sent_at", null)
      .select("id")
      .maybeSingle();
    if (!claimed) return false;

    const { data: profile } = await admin.from("profiles").select("name,email").eq("id", userId).maybeSingle();
    if (!profile?.email) {
      await admin.from("entitlements").update({ trial_reminder_sent_at: null }).eq("id", entitlementId);
      return false;
    }

    const who = firstName(profile.name as string | null);
    const planName = plan.charAt(0).toUpperCase() + plan.slice(1);
    const day = chargeOn.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
    const app = publicEnv.appUrl;

    const sent = await sendEmail(
      profile.email as string,
      `Your TaDa trial ends ${day}`,
      emailShell({
        heading: who ? `${escapeHtml(who)}, your free trial ends soon.` : "Your free trial ends soon.",
        paragraphs: [
          `Three days left. On <b>${escapeHtml(day)}</b> your card is charged for the ${escapeHtml(planName)} plan and TaDa carries on as it is.`,
          "Nothing to do if that suits you. If it does not, cancel from Account before that day and you are not charged a penny; your tasks stay where they are in case you come back.",
        ],
        cta: { label: "Open TaDa", href: `${app}/today` },
        footer: "Manage or cancel the plan under Account, then Billing.",
      }),
      `${who ? `${who}, your` : "Your"} free TaDa trial ends in three days.\n\nOn ${day} your card is charged for the ${planName} plan. Nothing to do if that suits you. To stop it, cancel from Account before that day and you are not charged.\n\nOpen TaDa: ${app}/today`,
    );

    if (!sent) await admin.from("entitlements").update({ trial_reminder_sent_at: null }).eq("id", entitlementId);
    return sent;
  } catch (err) {
    console.error("trial ending email", err);
    return false;
  }
}
