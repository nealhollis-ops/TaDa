import "server-only";

import Stripe from "stripe";
import type { SupabaseClient } from "@supabase/supabase-js";
import { serverEnv } from "@/lib/env";
import type { Plan } from "@/lib/planner/types";
import { SEATS_INCLUDED } from "@/lib/planner/content";

export type Interval = "monthly" | "yearly";
export const PLAN_KEYS: Plan[] = ["standard", "teams", "boss"];

let stripeClient: Stripe | null = null;
export function getStripe() {
  if (!stripeClient) stripeClient = new Stripe(serverEnv().stripeSecretKey);
  return stripeClient;
}

export const lookupKey = (plan: Plan | "boss_seat", interval: Interval) => `tada_${plan}_${interval}`;

/** lookup_key -> price id, cached for the life of the server instance. */
let priceCache: { at: number; map: Record<string, string> } | null = null;
export async function getPriceMap(): Promise<Record<string, string>> {
  if (priceCache && Date.now() - priceCache.at < 10 * 60 * 1000) return priceCache.map;
  const stripe = getStripe();
  const keys = [...PLAN_KEYS, "boss_seat" as const].flatMap((p) => [lookupKey(p, "monthly"), lookupKey(p, "yearly")]);
  const res = await stripe.prices.list({ lookup_keys: keys, active: true, limit: 20 });
  const map: Record<string, string> = {};
  res.data.forEach((p) => {
    if (p.lookup_key) map[p.lookup_key] = p.id;
  });
  priceCache = { at: Date.now(), map };
  return map;
}

/** Parse "tada_<plan>_<interval>" from a price. */
export function parseLookup(key: string | null | undefined): { plan: Plan | "boss_seat"; interval: Interval } | null {
  if (!key) return null;
  const m = /^tada_(standard|teams|boss|boss_seat)_(monthly|yearly)$/.exec(key);
  if (!m) return null;
  return { plan: m[1] as Plan | "boss_seat", interval: m[2] as Interval };
}

/** The TaDa portal configuration (created by scripts/stripe-setup.mjs). */
let portalConfigId: string | null = null;
export async function getPortalConfigId(): Promise<string | undefined> {
  if (portalConfigId) return portalConfigId;
  const stripe = getStripe();
  const configs = await stripe.billingPortal.configurations.list({ limit: 100, active: true });
  const mine = configs.data.find((c) => c.metadata?.app === "tada");
  portalConfigId = mine?.id ?? null;
  return mine?.id;
}

/** Find or create the Stripe customer for a member. Service-role client required. */
export async function getOrCreateCustomer(admin: SupabaseClient, userId: string, email: string, name: string): Promise<string> {
  const { data } = await admin.from("billing_customers").select("stripe_customer_id").eq("user_id", userId).maybeSingle();
  if (data?.stripe_customer_id) return data.stripe_customer_id;
  const stripe = getStripe();
  const customer = await stripe.customers.create({ email, name, metadata: { app: "tada", user_id: userId } });
  await admin.from("billing_customers").upsert({ user_id: userId, stripe_customer_id: customer.id });
  return customer.id;
}

async function userIdForCustomer(admin: SupabaseClient, customerId: string): Promise<string | null> {
  const { data } = await admin.from("billing_customers").select("user_id").eq("stripe_customer_id", customerId).maybeSingle();
  if (data?.user_id) return data.user_id;
  // Fall back to the metadata we stamp on every TaDa customer.
  const customer = await getStripe().customers.retrieve(customerId);
  if (!customer.deleted && customer.metadata?.user_id) {
    await admin.from("billing_customers").upsert({ user_id: customer.metadata.user_id, stripe_customer_id: customerId });
    return customer.metadata.user_id;
  }
  return null;
}

type SubLike = Stripe.Subscription & { current_period_end?: number };

/** Which TaDa plan a subscription carries, or null when it is not a TaDa subscription. */
export function planOfSubscription(sub: Stripe.Subscription): { plan: Plan; interval: Interval; seatItem: Stripe.SubscriptionItem | null; baseItem: Stripe.SubscriptionItem } | null {
  let base: { plan: Plan; interval: Interval; item: Stripe.SubscriptionItem } | null = null;
  let seatItem: Stripe.SubscriptionItem | null = null;
  for (const item of sub.items.data) {
    const parsed = parseLookup(item.price.lookup_key);
    if (!parsed) continue;
    if (parsed.plan === "boss_seat") seatItem = item;
    else base = { plan: parsed.plan, interval: parsed.interval, item };
  }
  if (!base) return null;
  return { plan: base.plan, interval: base.interval, seatItem, baseItem: base.item };
}

/**
 * Mirror a Stripe subscription into the entitlements table.
 * Uses apply_stripe_entitlement(), which can only touch source = 'stripe' rows.
 */
export async function applySubscription(admin: SupabaseClient, sub: Stripe.Subscription): Promise<{ userId: string; plan: Plan } | null> {
  const info = planOfSubscription(sub);
  if (!info) return null; // not a TaDa subscription (shared Stripe account)
  const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer.id;
  const userId = sub.metadata?.user_id || (await userIdForCustomer(admin, customerId));
  if (!userId) return null;

  const periodEnd = (info.baseItem as unknown as { current_period_end?: number }).current_period_end ?? (sub as SubLike).current_period_end ?? null;
  // Keep access through the paid period even after a cancel-at-period-end.
  const expiresAt = sub.status === "canceled" || sub.status === "incomplete_expired" ? new Date().toISOString() : periodEnd ? new Date(periodEnd * 1000 + 24 * 3600 * 1000).toISOString() : null;
  const seats = info.plan === "boss" ? SEATS_INCLUDED + (info.seatItem?.quantity ?? 0) : 0;

  const { error } = await admin.rpc("apply_stripe_entitlement", {
    p_user_id: userId,
    p_plan: info.plan,
    p_status: sub.status,
    p_stripe_customer_id: customerId,
    p_stripe_sub_id: sub.id,
    p_seats_included: seats,
    p_expires_at: expiresAt,
  });
  if (error) throw error;
  return { userId, plan: info.plan };
}

/**
 * Boss seat sync: count unique members across this owner's boss teams and set
 * the extra-seat quantity on their subscription to anything above the included 7.
 */
export async function syncBossSeats(admin: SupabaseClient, ownerId: string): Promise<{ members: number; extra: number; changed: boolean }> {
  const { data: teams } = await admin.from("teams").select("id").eq("owner_id", ownerId).eq("kind", "boss");
  const teamIds = (teams ?? []).map((t) => t.id);
  const members = new Set<string>();
  if (teamIds.length) {
    const { data: tm } = await admin.from("team_members").select("user_id").in("team_id", teamIds);
    (tm ?? []).forEach((r) => r.user_id !== ownerId && members.add(r.user_id));
  }
  const extra = Math.max(0, members.size - SEATS_INCLUDED);

  const { data: ent } = await admin.from("entitlements").select("stripe_sub_id,plan,status").eq("user_id", ownerId).eq("source", "stripe").maybeSingle();
  if (!ent?.stripe_sub_id || ent.plan !== "boss" || !["trialing", "active", "past_due"].includes(ent.status)) {
    return { members: members.size, extra, changed: false }; // comp/admin bosses are never billed for seats
  }
  const stripe = getStripe();
  const sub = await stripe.subscriptions.retrieve(ent.stripe_sub_id);
  const info = planOfSubscription(sub);
  if (!info) return { members: members.size, extra, changed: false };
  const current = info.seatItem?.quantity ?? 0;
  if (current === extra) return { members: members.size, extra, changed: false };

  if (extra === 0 && info.seatItem) {
    await stripe.subscriptionItems.del(info.seatItem.id, { proration_behavior: "create_prorations" });
  } else if (info.seatItem) {
    await stripe.subscriptionItems.update(info.seatItem.id, { quantity: extra, proration_behavior: "create_prorations" });
  } else {
    const prices = await getPriceMap();
    const priceId = prices[lookupKey("boss_seat", info.interval)];
    if (!priceId) throw new Error("Boss seat price missing. Run scripts/stripe-setup.mjs.");
    await stripe.subscriptionItems.create({ subscription: sub.id, price: priceId, quantity: extra, proration_behavior: "create_prorations" });
  }
  const fresh = await stripe.subscriptions.retrieve(ent.stripe_sub_id);
  await applySubscription(admin, fresh);
  return { members: members.size, extra, changed: true };
}
