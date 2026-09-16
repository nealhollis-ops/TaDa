import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { serverEnv } from "@/lib/env";
import type { Plan } from "@/lib/planner/types";

export type MemberRow = {
  id: string;
  email: string;
  name: string;
  role: "member" | "admin";
  bannedAt: string | null;
  createdAt: string;
  plan: Plan | null;
  source: "stripe" | "comp" | "admin" | null;
  status: string | null;
  expiresAt: string | null;
};

const ACTIVE_STRIPE = ["trialing", "active", "past_due"];

export type EntitlementRow = { id: string; plan: Plan; source: "stripe" | "comp" | "admin"; status: string; expires_at: string | null; stripe_customer_id: string | null; stripe_sub_id: string | null; seats_included: number; note: string | null; created_at: string };

/** Pick the row that currently grants access (same rule as effective_plan). */
export function effectiveRow(rows: EntitlementRow[]): EntitlementRow | null {
  const rank: Record<string, number> = { boss: 3, teams: 2, standard: 1 };
  const active = rows.filter((e) => (!e.expires_at || new Date(e.expires_at) > new Date()) && (e.source !== "stripe" || ACTIVE_STRIPE.includes(e.status)));
  active.sort((x, y) => rank[y.plan] - rank[x.plan] || (x.source === "stripe" ? 1 : -1));
  return active[0] ?? null;
}

/** Stripe dashboard deep link for a customer (test or live picked from the key). */
export function stripeCustomerUrl(customerId: string) {
  const live = serverEnv().stripeSecretKey.startsWith("sk_live");
  return `https://dashboard.stripe.com/${live ? "" : "test/"}customers/${customerId}`;
}

export type MemberFilter = { q?: string; plan?: string; status?: string };

export async function listMembers(filter: MemberFilter, limit = 100): Promise<MemberRow[]> {
  const admin = createAdminClient();
  let query = admin.from("profiles").select("id,email,name,role,banned_at,created_at").order("created_at", { ascending: false }).limit(limit);
  const q = filter.q?.trim();
  if (q) query = query.or(`email.ilike.%${q.replace(/[%,]/g, "")}%,name.ilike.%${q.replace(/[%,]/g, "")}%`);
  const { data: profiles } = await query;
  const ids = (profiles ?? []).map((p) => p.id);
  const { data: ents } = ids.length ? await admin.from("entitlements").select("*").in("user_id", ids) : { data: [] as EntitlementRow[] & { user_id: string }[] };
  const byUser: Record<string, EntitlementRow[]> = {};
  (ents ?? []).forEach((e) => (byUser[(e as { user_id: string }).user_id] ||= []).push(e as EntitlementRow));
  let rows: MemberRow[] = (profiles ?? []).map((p) => {
    const eff = effectiveRow(byUser[p.id] ?? []);
    const stripeRow = (byUser[p.id] ?? []).find((e) => e.source === "stripe");
    return {
      id: p.id, email: p.email, name: p.name, role: p.role, bannedAt: p.banned_at, createdAt: p.created_at,
      plan: eff?.plan ?? null, source: eff?.source ?? null,
      status: eff ? (eff.source === "stripe" ? eff.status : eff.source) : stripeRow ? stripeRow.status : "none",
      expiresAt: eff?.expires_at ?? null,
    };
  });
  if (filter.plan) rows = rows.filter((r) => r.plan === filter.plan);
  if (filter.status) {
    rows = rows.filter((r) => {
      if (filter.status === "banned") return !!r.bannedAt;
      if (filter.status === "none") return !r.plan;
      return r.status === filter.status;
    });
  }
  return rows;
}

export async function getMember(id: string) {
  const admin = createAdminClient();
  const [{ data: p }, { data: ents }, { data: bc }, { data: st }, { data: prog }, { data: log }] = await Promise.all([
    admin.from("profiles").select("id,email,name,slug,role,banned_at,created_at,hidden,private,seeking").eq("id", id).maybeSingle(),
    admin.from("entitlements").select("*").eq("user_id", id).order("created_at"),
    admin.from("billing_customers").select("stripe_customer_id").eq("user_id", id).maybeSingle(),
    admin.from("stats").select("streak,best_streak,total_done").eq("user_id", id).maybeSingle(),
    admin.from("progress").select("month,total,done,updated_at").eq("user_id", id).order("month", { ascending: false }).limit(1),
    admin.from("admin_log").select("action,detail,created_at,admin_id").eq("target", id).order("created_at", { ascending: false }).limit(20),
  ]);
  if (!p) return null;
  const rows = (ents ?? []) as EntitlementRow[];
  const customerId = bc?.stripe_customer_id ?? rows.find((e) => e.stripe_customer_id)?.stripe_customer_id ?? null;
  return {
    profile: p,
    entitlements: rows,
    effective: effectiveRow(rows),
    stripeCustomerId: customerId,
    stripeUrl: customerId ? stripeCustomerUrl(customerId) : null,
    stats: st,
    lastProgress: prog?.[0] ?? null,
    log: log ?? [],
  };
}

export async function numbers() {
  const admin = createAdminClient();
  const now = new Date();
  const dayAgo = new Date(now.getTime() - 24 * 3600 * 1000).toISOString();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 3600 * 1000).toISOString();
  const monthAgo = new Date(now.getTime() - 30 * 24 * 3600 * 1000).toISOString();
  const count = async (table: string, build: (q: ReturnType<typeof admin.from>) => unknown) => {
    const q = admin.from(table).select("*", { count: "exact", head: true });
    const { count: c } = (await build(q as unknown as ReturnType<typeof admin.from>)) as { count: number | null };
    return c ?? 0;
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const c = (q: any) => q as any;
  const [members, signups7, signups30, trials, paying, pastDue, cancels30, comps, activesToday, actives7, openReports] = await Promise.all([
    count("profiles", (q) => c(q)),
    count("profiles", (q) => c(q).gte("created_at", weekAgo)),
    count("profiles", (q) => c(q).gte("created_at", monthAgo)),
    count("entitlements", (q) => c(q).eq("source", "stripe").eq("status", "trialing")),
    count("entitlements", (q) => c(q).eq("source", "stripe").eq("status", "active")),
    count("entitlements", (q) => c(q).eq("source", "stripe").eq("status", "past_due")),
    count("entitlements", (q) => c(q).eq("source", "stripe").eq("status", "canceled").gte("updated_at", monthAgo)),
    count("entitlements", (q) => c(q).eq("source", "comp")),
    count("progress", (q) => c(q).gte("updated_at", dayAgo)),
    count("progress", (q) => c(q).gte("updated_at", weekAgo)),
    count("reports", (q) => c(q).eq("status", "open")),
  ]);
  return { members, signups7, signups30, trials, paying, pastDue, cancels30, comps, activesToday, actives7, openReports };
}

export async function logAdmin(adminId: string, action: string, target: string | null, detail?: Record<string, unknown>) {
  const admin = createAdminClient();
  await admin.from("admin_log").insert({ admin_id: adminId, action, target, detail: detail ?? null });
}
