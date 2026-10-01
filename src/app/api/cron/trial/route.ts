import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getStripe } from "@/lib/stripe";
import { sendTrialEndingOnce } from "@/lib/member-emails";

export const runtime = "nodejs";

/**
 * GET /api/cron/trial  (Vercel cron, every morning; see vercel.json)
 *
 * Emails anyone whose free trial turns into a charge in three days. Day 11 of
 * 14, so there is a working day or two to decide rather than an hour.
 *
 * The exact moment comes from Stripe's trial_end, not from the entitlement's
 * expires_at: expires_at carries a day of grace on top of the period end, and
 * telling someone the wrong date about their own money is worse than not
 * telling them at all. Trialing members are few, so the extra calls are cheap.
 *
 * The row is stamped, so the reminder goes out once per subscription.
 * Vercel sends "Authorization: Bearer <CRON_SECRET>" when CRON_SECRET is set.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return NextResponse.json({ error: "CRON_SECRET is not set." }, { status: 500 });
  if (request.headers.get("authorization") !== `Bearer ${secret}`) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = createAdminClient();
  const { data: rows, error } = await admin
    .from("entitlements")
    .select("id,user_id,plan,stripe_sub_id")
    .eq("source", "stripe")
    .eq("status", "trialing")
    .is("trial_reminder_sent_at", null)
    .not("stripe_sub_id", "is", null)
    .limit(200);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!rows?.length) return NextResponse.json({ ok: true, checked: 0, emailed: 0 });

  const stripe = getStripe();
  // Whole days apart, not milliseconds apart. A trial created three days ago to
  // the second sits exactly on the boundary, and a second of clock skew between
  // here and Stripe was enough to push it out of range and silently skip a day.
  // Calendar days in one timezone are what the member is counting anyway.
  const dayOf = (d: Date) => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Chicago", year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
  const daysApart = (from: string, to: string) => Math.round((Date.parse(`${to}T12:00:00Z`) - Date.parse(`${from}T12:00:00Z`)) / 86_400_000);
  const today = dayOf(new Date());
  let emailed = 0;
  let skipped = 0;

  for (const row of rows) {
    try {
      const sub = await stripe.subscriptions.retrieve(row.stripe_sub_id as string);
      if (sub.status !== "trialing" || !sub.trial_end) {
        skipped += 1;
        continue;
      }
      const endsAt = sub.trial_end * 1000;
      const daysLeft = daysApart(today, dayOf(new Date(endsAt)));
      // A window rather than the exact day, so a cron that misses a morning
      // still catches the member before the charge.
      if (daysLeft < 1 || daysLeft > 3) {
        skipped += 1;
        continue;
      }
      if (await sendTrialEndingOnce(admin, row.id as string, row.user_id as string, row.plan as string, new Date(endsAt))) {
        emailed += 1;
      }
    } catch (err) {
      // One unreadable subscription must not stop the rest of the run.
      console.error("trial reminder", row.stripe_sub_id, err);
      skipped += 1;
    }
  }

  return NextResponse.json({ ok: true, checked: rows.length, emailed, skipped });
}
