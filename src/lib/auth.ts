import "server-only";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { MyProfile, Plan } from "@/lib/planner/types";

export type { MyProfile, Plan };

export type Billing = {
  plan: Plan;
  source: "stripe" | "comp" | "admin";
  status: string;
  expiresAt: string | null;
  seatsIncluded: number;
  hasStripe: boolean;
};

/** Returns the signed-in user or sends the visitor to /login. Use in server components and actions. */
export async function requireUser(nextPath?: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(nextPath ? `/login?next=${encodeURIComponent(nextPath)}` : "/login");
  return { supabase, user };
}

/** Signed-in member's profile plus their effective plan (null = no active entitlement). */
export async function getMe() {
  const { supabase, user } = await requireUser();
  const [{ data: p }, { data: card }, { data: plan }, { data: ents }] = await Promise.all([
    supabase.from("profiles").select("id,name,slug,avatar_url,role,hidden,private,seeking,muted,notif_on,notif_community,onboarding,banned_at").eq("id", user.id).maybeSingle(),
    supabase.rpc("profile_card", { target: user.id }),
    supabase.rpc("effective_plan", { uid: user.id }),
    supabase.from("entitlements").select("plan,source,status,expires_at,seats_included,stripe_sub_id").eq("user_id", user.id),
  ]);
  // The row that grants the effective plan. Comp and admin rows win over a Stripe row at the same level.
  const rank: Record<string, number> = { boss: 3, teams: 2, standard: 1 };
  const rows = ents ?? [];
  const active = rows.filter((e) => (!e.expires_at || new Date(e.expires_at) > new Date()) && (e.source !== "stripe" || ["trialing", "active", "past_due"].includes(e.status)));
  active.sort((x, y) => rank[y.plan] - rank[x.plan] || (x.source === "stripe" ? 1 : -1));
  const top = active[0] ?? rows.find((e) => e.source === "stripe") ?? null;
  const billing: Billing | null = top
    ? { plan: top.plan as Plan, source: top.source, status: top.status, expiresAt: top.expires_at, seatsIncluded: top.seats_included, hasStripe: rows.some((e) => e.source === "stripe" && e.stripe_sub_id) }
    : null;
  const profile: MyProfile = {
    id: user.id,
    email: user.email ?? "",
    name: p?.name ?? user.email?.split("@")[0] ?? "friend",
    slug: p?.slug ?? "",
    avatarUrl: p?.avatar_url ?? null,
    bio: (card as { bio?: string } | null)?.bio ?? "",
    role: p?.role ?? "member",
    hidden: !!p?.hidden,
    private: !!p?.private,
    seeking: !!p?.seeking,
    muted: !!p?.muted,
    notifOn: p?.notif_on !== false,
    notifCommunity: p?.notif_community !== false,
    onboarding: { tour: false, posted: false, done: false, ...(p?.onboarding ?? {}) },
  };
  return { supabase, user, profile, plan: (plan as Plan | null) ?? null, billing, banned: !!p?.banned_at };
}

/** Admin gate for /admin routes. */
export async function requireAdmin() {
  const me = await getMe();
  if (me.profile.role !== "admin") redirect("/today");
  return me;
}
