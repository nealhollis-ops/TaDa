"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requestOrigin } from "@/lib/request-origin";

export type AuthMode = "signin" | "signup" | "magic" | "forgot";
export type AuthState = { error?: string; message?: string; mode?: AuthMode } | null;

const clean = (v: FormDataEntryValue | null) => String(v ?? "").trim();
const cleanEmail = (v: FormDataEntryValue | null) => clean(v).toLowerCase();
const safeNext = (v: FormDataEntryValue | null) => {
  const n = clean(v);
  return n.startsWith("/") && !n.startsWith("//") ? n : "/today";
};

function friendly(message: string): string {
  const m = message.toLowerCase();
  if (m.includes("invalid login credentials")) return "That email and password don't match.";
  if (m.includes("email not confirmed")) return "Check your inbox and confirm your email first.";
  if (m.includes("already registered")) return "That email already has an account. Sign in instead.";
  if (m.includes("password should be")) return "Password needs at least 6 characters.";
  if (m.includes("rate limit") || m.includes("too many")) return "Too many tries. Wait a minute and try again.";
  return message;
}

/**
 * One server action for the whole login screen. `mode` picks the behaviour:
 *  signin  - email + password
 *  signup  - create account with password (confirmation email is sent)
 *  magic   - email a one-tap sign-in link
 *  forgot  - email a password reset link
 */
export async function authAction(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const mode = (clean(formData.get("mode")) || "signin") as AuthMode;
  const email = cleanEmail(formData.get("email"));
  const password = String(formData.get("password") ?? "");
  const name = clean(formData.get("name")).slice(0, 40);
  const next = safeNext(formData.get("next"));

  if (!email || !email.includes("@")) return { mode, error: "Enter a valid email address." };

  const supabase = await createClient();
  const origin = await requestOrigin();
  const callback = `${origin}/auth/callback?next=${encodeURIComponent(next)}`;

  if (mode === "signin") {
    if (!password) return { mode, error: "Enter your password." };
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { mode, error: friendly(error.message) };
    redirect(next);
  }

  if (mode === "signup") {
    if (password.length < 6) return { mode, error: "Password needs at least 6 characters." };
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: callback, data: { name } },
    });
    if (error) return { mode, error: friendly(error.message) };
    // When email confirmation is off, Supabase returns a live session right away.
    if (data.session) redirect(next);
    return { mode, message: "Almost there. Check your email and tap the confirmation link." };
  }

  if (mode === "magic") {
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: callback, shouldCreateUser: true },
    });
    if (error) return { mode, error: friendly(error.message) };
    return { mode, message: "Magic link sent. Open the email on this device and tap the link." };
  }

  if (mode === "forgot") {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${origin}/auth/callback?next=${encodeURIComponent("/account/password")}`,
    });
    if (error) return { mode, error: friendly(error.message) };
    return { mode, message: "Reset link sent. Check your email." };
  }

  return { mode, error: "Unknown action." };
}
