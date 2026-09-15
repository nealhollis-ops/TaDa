import { verifyAuthLink } from "@/lib/supabase/verify";

/** Same handler as /auth/callback; this path is what the branded email templates link to. */
export async function GET(request: Request) {
  return verifyAuthLink(request);
}
