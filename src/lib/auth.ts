import "server-only";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { MyProfile, Plan } from "@/lib/planner/types";

export type { MyProfile, Plan };

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
  const [{ data: p }, { data: card }, { data: plan }] = await Promise.all([
    supabase.from("profiles").select("id,name,slug,avatar_url,role,hidden,private,seeking,muted,notif_on,onboarding").eq("id", user.id).maybeSingle(),
    supabase.rpc("profile_card", { target: user.id }),
    supabase.rpc("effective_plan", { uid: user.id }),
  ]);
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
    onboarding: { tour: false, posted: false, done: false, ...(p?.onboarding ?? {}) },
  };
  return { supabase, user, profile, plan: (plan as Plan | null) ?? null };
}

/** Admin gate for /admin routes. */
export async function requireAdmin() {
  const me = await getMe();
  if (me.profile.role !== "admin") redirect("/today");
  return me;
}
