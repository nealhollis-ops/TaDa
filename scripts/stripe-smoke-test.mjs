/**
 * Stripe billing smoke test against a running dev server (TEST mode only):
 *   npm run dev            (in another terminal)
 *   node --env-file=.env.local scripts/stripe-smoke-test.mjs
 *
 * Creates a throwaway member, subscribes them to Boss with a test card via the
 * API, replays the resulting Stripe events into the local webhook with a
 * valid signature, and checks the entitlements table after each step:
 *   trial start -> entitlement boss/trialing
 *   seat sync   -> 9 members on a boss team = 2 extra seats on the subscription
 *   upgrade     -> price change, proration left to Stripe's default
 *   cancel      -> entitlement canceled, member loses access
 * Cleans up the Stripe customer and the member at the end.
 */
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

const BASE = process.env.SMOKE_BASE_URL || "http://localhost:3000";
const key = process.env.STRIPE_SECRET_KEY;
if (!key || key.startsWith("sk_live")) throw new Error("Use a TEST secret key.");
const stripe = new Stripe(key);
const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const secret = process.env.STRIPE_WEBHOOK_SECRET;

const log = (...a) => console.log(...a);

async function replay(type, object) {
  const payload = JSON.stringify({ id: `evt_test_${Date.now()}`, object: "event", api_version: stripe.getApiField("version"), created: Math.floor(Date.now() / 1000), type, data: { object }, livemode: false, pending_webhooks: 0, request: { id: null, idempotency_key: null } });
  const sig = stripe.webhooks.generateTestHeaderString({ payload, secret });
  const res = await fetch(`${BASE}/api/stripe`, { method: "POST", headers: { "Content-Type": "application/json", "stripe-signature": sig }, body: payload });
  const body = await res.text();
  if (!res.ok) throw new Error(`webhook ${type} -> ${res.status} ${body}`);
  return body;
}

async function entitlement(userId) {
  const { data } = await admin.from("entitlements").select("plan,status,source,seats_included,expires_at,stripe_sub_id").eq("user_id", userId).eq("source", "stripe").maybeSingle();
  return data;
}

async function effectivePlan(userId) {
  const { data } = await admin.rpc("effective_plan", { uid: userId });
  return data;
}

// ---- 1. throwaway member ----------------------------------------------------
const email = `stripe-smoke-${Date.now()}@example.com`;
const { data: created, error: cErr } = await admin.auth.admin.createUser({ email, password: "TestPass!2026", email_confirm: true, user_metadata: { name: "Smoke" } });
if (cErr) throw cErr;
const userId = created.user.id;
log("member:", email);
log("effective plan before:", await effectivePlan(userId), "(expect null -> paywall)");

// ---- 2. customer + Boss subscription with trial (what Checkout would create) --
const customer = await stripe.customers.create({ email, name: "Smoke", metadata: { app: "tada", user_id: userId }, payment_method: "pm_card_visa", invoice_settings: { default_payment_method: "pm_card_visa" } });
await admin.from("billing_customers").upsert({ user_id: userId, stripe_customer_id: customer.id });
const prices = await stripe.prices.list({ lookup_keys: ["tada_boss_monthly", "tada_boss_seat_monthly", "tada_standard_monthly"], active: true });
const priceOf = (k) => prices.data.find((p) => p.lookup_key === k).id;
let sub = await stripe.subscriptions.create({ customer: customer.id, items: [{ price: priceOf("tada_boss_monthly"), quantity: 1 }], trial_period_days: 14, metadata: { app: "tada", user_id: userId, plan: "boss" } });
log("subscription:", sub.id, sub.status);
await replay("customer.subscription.created", sub);
let ent = await entitlement(userId);
log("after trial start:", ent?.plan, ent?.status, "seats", ent?.seats_included, "| effective:", await effectivePlan(userId));
if (ent?.plan !== "boss" || ent?.status !== "trialing") throw new Error("trial start did not write the entitlement");

// ---- 3. seat sync: 9 members on a boss team -> 2 extra seats --------------
const { data: team } = await admin.from("teams").insert({ name: "Smoke Boss Team", kind: "boss", owner_id: userId }).select("id").single();
const memberIds = [];
for (let i = 0; i < 9; i++) {
  const { data: m } = await admin.auth.admin.createUser({ email: `stripe-smoke-m${i}-${Date.now()}@example.com`, password: "TestPass!2026", email_confirm: true, user_metadata: { name: `M${i}` } });
  memberIds.push(m.user.id);
}
await admin.from("team_members").insert(memberIds.map((id) => ({ team_id: team.id, user_id: id })));
const cronRes = await fetch(`${BASE}/api/cron/seats`, { headers: { Authorization: `Bearer ${process.env.CRON_SECRET}` } });
const cronBody = await cronRes.json();
log("seat sync:", JSON.stringify(cronBody.results?.[userId]));
sub = await stripe.subscriptions.retrieve(sub.id);
const seatItem = sub.items.data.find((i) => i.price.lookup_key === "tada_boss_seat_monthly");
log("seat item quantity:", seatItem?.quantity, "(expect 2)");
if (seatItem?.quantity !== 2) throw new Error("seat sync did not add 2 extra seats");
ent = await entitlement(userId);
log("entitlement seats_included:", ent?.seats_included, "(expect 9)");

// remove 3 members -> 6 -> no extra seats
await admin.from("team_members").delete().eq("team_id", team.id).in("user_id", memberIds.slice(0, 3));
await fetch(`${BASE}/api/cron/seats`, { headers: { Authorization: `Bearer ${process.env.CRON_SECRET}` } });
sub = await stripe.subscriptions.retrieve(sub.id);
log("seat item after removals:", sub.items.data.find((i) => i.price.lookup_key === "tada_boss_seat_monthly")?.quantity ?? "removed", "(expect removed)");

// ---- 4. downgrade to Standard (proration at Stripe's default) -------------
const baseItem = sub.items.data.find((i) => i.price.lookup_key === "tada_boss_monthly");
sub = await stripe.subscriptions.update(sub.id, { items: [{ id: baseItem.id, price: priceOf("tada_standard_monthly") }], proration_behavior: "create_prorations" });
await replay("customer.subscription.updated", sub);
ent = await entitlement(userId);
log("after plan change:", ent?.plan, ent?.status, "| effective:", await effectivePlan(userId), "(expect standard)");

// ---- 5. cancel ---------------------------------------------------------------
sub = await stripe.subscriptions.cancel(sub.id);
await replay("customer.subscription.deleted", sub);
ent = await entitlement(userId);
log("after cancel:", ent?.plan, ent?.status, "| effective:", await effectivePlan(userId), "(expect null -> paywall)");

// ---- 6. comp rows are untouchable by billing --------------------------------
await admin.from("entitlements").upsert({ user_id: userId, plan: "teams", source: "comp", status: "active" }, { onConflict: "user_id,source" });
await replay("customer.subscription.deleted", sub);
log("comp row survives a stripe event -> effective:", await effectivePlan(userId), "(expect teams)");

// ---- cleanup ------------------------------------------------------------------
await stripe.customers.del(customer.id);
for (const id of [userId, ...memberIds]) await admin.auth.admin.deleteUser(id);
log("cleaned up. done.");
