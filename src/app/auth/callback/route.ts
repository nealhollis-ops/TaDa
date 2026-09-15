import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { publicEnv } from "@/lib/env";

/**
 * Supabase redirects here after a magic link or email confirmation.
 * Exchanges the one-time code for a session cookie, then sends the member on.
 * Add this URL in Supabase > Authentication > URL Configuration > Redirect URLs:
 *   https://app.gettada.me/auth/callback  and  http://localhost:3000/auth/callback
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";
  const safeNext = next.startsWith("/") ? next : "/";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(`${publicEnv.appUrl}${safeNext}`);
  }

  return NextResponse.redirect(`${publicEnv.appUrl}/?auth=error`);
}
