/**
 * One-time Stripe setup for TaDa (run in TEST mode first, LIVE mode at launch):
 *   node --env-file=.env.local scripts/stripe-setup.mjs
 *
 * Idempotent. Creates (or finds) in the connected Stripe account:
 *  - products "TaDa Standard / Teams / Boss / Boss extra seat" (metadata app=tada)
 *  - prices with lookup keys tada_<plan>_<interval>
 *  - a Customer Portal configuration for TaDa (not the account default, so other
 *    products on this Stripe account are untouched)
 *  - the webhook endpoint for <NEXT_PUBLIC_APP_URL>/api/stripe (prints the signing
 *    secret ONCE and writes it to .env.local as STRIPE_WEBHOOK_SECRET)
 */
import fs from "node:fs";
import Stripe from "stripe";

const key = process.env.STRIPE_SECRET_KEY;
if (!key) {
  console.error("STRIPE_SECRET_KEY missing");
  process.exit(1);
}
const stripe = new Stripe(key);
const appUrl = (process.env.NEXT_PUBLIC_APP_URL || "https://app.gettada.me").replace(/\/$/, "");
const mode = key.startsWith("sk_live") ? "LIVE" : "TEST";
console.log(`Stripe ${mode} mode -> ${appUrl}`);

const PLANS = [
  { key: "standard", name: "TaDa Standard", monthly: 1700, yearly: 17000, description: "The full planner, celebrations, community, and one accountability partner." },
  { key: "teams", name: "TaDa Teams", monthly: 2700, yearly: 27000, description: "Everything in Standard plus unlimited partners and named teams." },
  { key: "boss", name: "TaDa Boss", monthly: 9700, yearly: 97000, description: "Everything in Teams plus boss powers. 7 member seats included." },
  { key: "boss_seat", name: "TaDa Boss extra seat", monthly: 900, yearly: 9000, description: "One additional boss team seat beyond the 7 included." },
];

async function findProduct(planKey) {
  const res = await stripe.products.search({ query: `active:'true' AND metadata['app']:'tada' AND metadata['plan']:'${planKey}'` });
  return res.data[0] ?? null;
}

async function ensurePrice(product, planKey, interval, amount) {
  const lookup_key = `tada_${planKey}_${interval === "month" ? "monthly" : "yearly"}`;
  const existing = await stripe.prices.list({ lookup_keys: [lookup_key], active: true, limit: 1 });
  if (existing.data[0]) {
    console.log(`  price ${lookup_key} exists (${existing.data[0].id})`);
    return existing.data[0];
  }
  const price = await stripe.prices.create({
    product: product.id,
    currency: "usd",
    unit_amount: amount,
    recurring: { interval },
    lookup_key,
    transfer_lookup_key: true,
    metadata: { app: "tada", plan: planKey, interval },
  });
  console.log(`  price ${lookup_key} created (${price.id})`);
  return price;
}

const productByKey = {};
const pricesByKey = {};
for (const p of PLANS) {
  let product = await findProduct(p.key);
  if (!product) {
    product = await stripe.products.create({ name: p.name, description: p.description, metadata: { app: "tada", plan: p.key } });
    console.log(`product ${p.name} created (${product.id})`);
  } else {
    console.log(`product ${p.name} exists (${product.id})`);
  }
  const m = await ensurePrice(product, p.key, "month", p.monthly);
  const y = await ensurePrice(product, p.key, "year", p.yearly);
  productByKey[p.key] = product;
  pricesByKey[p.key] = [m.id, y.id];
}

// ---- Customer Portal configuration (TaDa only, not the account default) ----
const configs = await stripe.billingPortal.configurations.list({ limit: 100, active: true });
let portal = configs.data.find((c) => c.metadata?.app === "tada");
const portalParams = {
  business_profile: { headline: "TaDa billing", privacy_policy_url: `${appUrl}/legal/privacy`, terms_of_service_url: `${appUrl}/legal/terms` },
  default_return_url: `${appUrl}/account`,
  features: {
    customer_update: { enabled: true, allowed_updates: ["email", "address"] },
    invoice_history: { enabled: true },
    payment_method_update: { enabled: true },
    subscription_cancel: { enabled: true, mode: "at_period_end", cancellation_reason: { enabled: true, options: ["too_expensive", "missing_features", "switched_service", "unused", "other"] } },
    subscription_update: {
      enabled: true,
      default_allowed_updates: ["price"],
      proration_behavior: "create_prorations",
      products: PLANS.filter((p) => p.key !== "boss_seat").map((p) => ({ product: productByKey[p.key].id, prices: pricesByKey[p.key] })),
    },
  },
  metadata: { app: "tada" },
};
if (portal) {
  portal = await stripe.billingPortal.configurations.update(portal.id, portalParams);
  console.log(`portal configuration updated (${portal.id})`);
} else {
  portal = await stripe.billingPortal.configurations.create(portalParams);
  console.log(`portal configuration created (${portal.id})`);
}

// ---- Webhook endpoint ----
const whUrl = `${appUrl}/api/stripe`;
const events = ["checkout.session.completed", "customer.subscription.created", "customer.subscription.updated", "customer.subscription.deleted", "invoice.payment_failed", "invoice.paid"];
const endpoints = await stripe.webhookEndpoints.list({ limit: 100 });
let wh = endpoints.data.find((w) => w.url === whUrl);
if (wh) {
  await stripe.webhookEndpoints.update(wh.id, { enabled_events: events, disabled: false });
  console.log(`webhook endpoint exists (${wh.id}). Its signing secret is only shown at creation; keep the one you have.`);
} else {
  wh = await stripe.webhookEndpoints.create({ url: whUrl, enabled_events: events, description: "TaDa app", metadata: { app: "tada" } });
  console.log(`webhook endpoint created (${wh.id})`);
  if (wh.secret) {
    const envPath = ".env.local";
    if (fs.existsSync(envPath)) {
      let env = fs.readFileSync(envPath, "utf8");
      env = env.match(/^STRIPE_WEBHOOK_SECRET=.*$/m) ? env.replace(/^STRIPE_WEBHOOK_SECRET=.*$/m, `STRIPE_WEBHOOK_SECRET=${wh.secret}`) : env + `\nSTRIPE_WEBHOOK_SECRET=${wh.secret}\n`;
      fs.writeFileSync(envPath, env);
      console.log("STRIPE_WEBHOOK_SECRET written to .env.local. Copy the same value into Vercel.");
    } else {
      console.log("Signing secret:", wh.secret);
    }
  }
}
console.log("done");
