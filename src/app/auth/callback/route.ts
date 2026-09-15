import { verifyAuthLink } from "@/lib/supabase/verify";

/**
 * Supabase redirects here after a magic link, signup confirmation, or
 * password recovery. Add both of these in Supabase > Authentication >
 * URL Configuration > Redirect URLs:
 *   https://app.gettada.me/auth/callback
 *   http://localhost:3000/auth/callback
 */
export async function GET(request: Request) {
  return verifyAuthLink(request);
}
