import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requestOrigin } from "@/lib/request-origin";
import { getOrCreateCustomer, getPriceMap, getStripe, lookupKey, PLAN_KEYS, type Interval } from "@/lib/stripe";
import type { Plan } from "@/lib/planner/types";

const TRIAL_DAYS = 14;

/**
 * POST /api/stripe/checkout { plan, interval }
 * Starts a Stripe Checkout session: 14 days free, card required up front,
 * then the chosen plan. Returns { url } to redirect to.
 */
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });

  const body = (await request.json().catch(() => null)) as { plan?: string; interval?: string } | null;
  const plan = body?.plan as Plan;
  const interval = (body?.interval === "yearly" ? "yearly" : "monthly") as Interval;
  if (!PLAN_KEYS.includes(plan)) return NextResponse.json({ error: "Pick a plan." }, { status: 400 });

  const admin = createAdminClient();
  const { data: profile } = await admin.from("profiles").select("name,email").eq("id", user.id).single();
  const customerId = await getOrCreateCustomer(admin, user.id, profile?.email ?? user.email ?? "", profile?.name ?? "");

  // One TaDa subscription per member. If one is live, send them to the portal instead.
  const { data: existing } = await admin.from("entitlements").select("status,stripe_sub_id").eq("user_id", user.id).eq("source", "stripe").maybeSingle();
  if (existing?.stripe_sub_id && ["trialing", "active", "past_due"].includes(existing.status)) {
    return NextResponse.json({ error: "You already have a subscription. Use Manage billing to change it." }, { status: 409 });
  }
  // Only the very first subscription gets the free trial.
  const trialUsed = !!existing?.stripe_sub_id;

  const prices = await getPriceMap();
  const priceId = prices[lookupKey(plan, interval)];
  if (!priceId) return NextResponse.json({ error: "Prices are not set up yet. Run scripts/stripe-setup.mjs." }, { status: 500 });

  const origin = await requestOrigin();
  const session = await getStripe().checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    line_items: [{ price: priceId, quantity: 1 }],
    payment_method_collection: "always",
    allow_promotion_codes: true,
    subscription_data: {
      metadata: { app: "tada", user_id: user.id, plan },
      ...(trialUsed ? {} : { trial_period_days: TRIAL_DAYS, trial_settings: { end_behavior: { missing_payment_method: "cancel" } } }),
    },
    metadata: { app: "tada", user_id: user.id, plan },
    success_url: `${origin}/account?checkout=success`,
    cancel_url: `${origin}/account?checkout=cancel`,
  });
  return NextResponse.json({ url: session.url });
}
