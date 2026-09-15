import "server-only";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type Profile = {
  id: string;
  email: string;
  name: string;
  slug: string;
  avatar_url: string | null;
  bio: string;
  role: "member" | "admin";
  hidden: boolean;
  private: boolean;
  seeking: boolean;
  muted: boolean;
  notif_on: boolean;
  onboarding: { tour: boolean; posted: boolean; done: boolean };
  banned_at: string | null;
};

export type Plan = "standard" | "teams" | "boss";

/** Returns the signed-in user or sends the visitor to /login. Use in server components and actions. */
export async function requireUser(nextPath?: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(nextPath ? `/login?next=${encodeURIComponent(nextPath)}` : "/login");
  return { supabase, user };
}

/** Signed-in user's profile plus their effective plan (null = no active entitlement). */
export async function getMe() {
  const { supabase, user } = await requireUser();
  const [{ data: profile }, { data: plan }] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user.id).single<Profile>(),
    supabase.rpc("effective_plan", { uid: user.id }),
  ]);
  return { supabase, user, profile, plan: (plan as Plan | null) ?? null };
}

/** Admin gate for /admin routes. */
export async function requireAdmin() {
  const me = await getMe();
  if (me.profile?.role !== "admin") redirect("/today");
  return me;
}
