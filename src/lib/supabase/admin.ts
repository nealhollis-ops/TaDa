import "server-only";

import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { publicEnv, serverEnv } from "@/lib/env";

/**
 * Service-role client. BYPASSES Row Level Security.
 * Only for trusted server code: Stripe webhooks, admin panel actions, seed scripts.
 * Never import this from a Client Component (the "server-only" import enforces it).
 */
export function createAdminClient() {
  return createSupabaseClient(publicEnv.supabaseUrl, serverEnv().supabaseServiceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
