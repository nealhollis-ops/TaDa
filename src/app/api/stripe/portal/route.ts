import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requestOrigin } from "@/lib/request-origin";
import { getPortalConfigId, getPriceMap, getStripe, lookupKey, PLAN_KEYS } from "@/lib/stripe";
import type { Plan } from "@/lib/planner/types";

/**
 * POST /api/stripe/portal -> { url } to the Stripe Customer Portal.
 * With no body: the portal home (change card, switch plan, cancel).
 * With { upgradeTo: "teams" | "boss" }: straight to the confirmation screen for
 * that plan on the member's current billing interval, prorated by Stripe.
 */
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });

  const body = (await request.json().catch(() => null)) as { upgradeTo?: string } | null;
  const upgradeTo = PLAN_KEYS.includes(body?.upgradeTo as Plan) ? (body!.upgradeTo as Plan) : null;

  const admin = createAdminClient();
  const [{ data: cust }, { data: ent }] = await Promise.all([
    admin.from("billing_customers").select("stripe_customer_id").eq("user_id", user.id).maybeSingle(),
    admin.from("entitlements").select("stripe_sub_id").eq("user_id", user.id).eq("source", "stripe").not("stripe_sub_id", "is", null).maybeSingle(),
  ]);
  if (!cust?.stripe_customer_id) return NextResponse.json({ error: "No billing account yet." }, { status: 404 });

  const stripe = getStripe();
  const origin = await requestOrigin();
  const configuration = await getPortalConfigId();

  // Build the one-tap upgrade flow when we can; otherwise fall back to the portal home.
  let flow_data: Stripe.BillingPortal.SessionCreateParams.FlowData | undefined;
  if (upgradeTo && ent?.stripe_sub_id) {
    try {
      const sub = await stripe.subscriptions.retrieve(ent.stripe_sub_id, { expand: ["items.data.price"] });
      // The plan item is the one whose price is a plan price (not a boss seat).
      const prices = await getPriceMap();
      const planPriceIds = new Set(PLAN_KEYS.flatMap((p) => [prices[lookupKey(p, "monthly")], prices[lookupKey(p, "yearly")]]).filter(Boolean));
      const item = sub.items.data.find((i) => planPriceIds.has(i.price.id)) ?? sub.items.data[0];
      const interval = item?.price.recurring?.interval === "year" ? "yearly" : "monthly";
      const newPrice = prices[lookupKey(upgradeTo, interval)];
      if (item && newPrice && newPrice !== item.price.id) {
        flow_data = {
          type: "subscription_update_confirm",
          subscription_update_confirm: { subscription: sub.id, items: [{ id: item.id, price: newPrice, quantity: 1 }] },
          after_completion: { type: "redirect", redirect: { return_url: `${origin}/account?upgraded=${upgradeTo}` } },
        };
      }
    } catch {
      flow_data = undefined;
    }
  }

  const session = await stripe.billingPortal.sessions.create({
    customer: cust.stripe_customer_id,
    return_url: `${origin}/account`,
    ...(configuration ? { configuration } : {}),
    ...(flow_data ? { flow_data } : {}),
  });
  return NextResponse.json({ url: session.url });
}
