import { NextResponse } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

/**
 * Shared handler for the links Supabase emails out.
 * Supports both link styles so it works with the default templates AND the
 * branded ones in supabase/templates:
 *   ?code=...                      (PKCE, default {{ .ConfirmationURL }})
 *   ?token_hash=...&type=email     (custom templates using {{ .TokenHash }})
 * On success the member lands on `next` (defaults to /today). Redirects stay
 * on the origin the link was opened on, so local and production both work.
 */
export async function verifyAuthLink(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const rawNext = searchParams.get("next") ?? "/today";
  const next = rawNext.startsWith("/") && !rawNext.startsWith("//") ? rawNext : "/today";

  const supabase = await createClient();
  let failed = false;

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    failed = Boolean(error);
  } else if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    failed = Boolean(error);
  } else {
    failed = true;
  }

  if (failed) {
    return NextResponse.redirect(new URL("/login?error=link", request.url));
  }
  // Password recovery and invites land on the "set a new password" screen.
  const target = type === "recovery" || type === "invite" ? "/account/password" : next;
  return NextResponse.redirect(new URL(target, request.url));
}
