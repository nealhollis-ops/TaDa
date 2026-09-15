import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import { serverEnv } from "@/lib/env";
import { applySubscription, getStripe, syncBossSeats } from "@/lib/stripe";

export const runtime = "nodejs";

/**
 * POST /api/stripe  (Stripe webhook)
 * Mirrors TaDa subscriptions into the entitlements table. Only rows with
 * source = 'stripe' can ever be touched from here (apply_stripe_entitlement).
 * Events for other products on this Stripe account are ignored.
 */
export async function POST(request: Request) {
  const sig = request.headers.get("stripe-signature");
  if (!sig) return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  const raw = await request.text();

  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(raw, sig, serverEnv().stripeWebhookSecret);
  } catch (err) {
    return NextResponse.json({ error: `Bad signature: ${(err as Error).message}` }, { status: 400 });
  }

  const admin = createAdminClient();
  const stripe = getStripe();

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object;
        if (session.mode !== "subscription" || !session.subscription) break;
        const subId = typeof session.subscription === "string" ? session.subscription : session.subscription.id;
        const sub = await stripe.subscriptions.retrieve(subId);
        const customerId = typeof session.customer === "string" ? session.customer : session.customer?.id;
        const userId = session.metadata?.user_id || sub.metadata?.user_id;
        if (userId && customerId) await admin.from("billing_customers").upsert({ user_id: userId, stripe_customer_id: customerId });
        const applied = await applySubscription(admin, sub);
        if (applied?.plan === "boss") await syncBossSeats(admin, applied.userId);
        break;
      }
      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const sub = event.data.object;
        await applySubscription(admin, sub);
        break;
      }
      case "invoice.payment_failed":
      case "invoice.paid": {
        // Status changes arrive via customer.subscription.updated; nothing extra to do.
        break;
      }
      default:
        break;
    }
  } catch (err) {
    console.error("stripe webhook", event.type, err);
    return NextResponse.json({ error: "Handler failed" }, { status: 500 });
  }
  return NextResponse.json({ received: true });
}
