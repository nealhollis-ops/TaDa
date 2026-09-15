import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { syncBossSeats } from "@/lib/stripe";

/**
 * GET /api/cron/seats  (Vercel cron, nightly)
 * Belt and braces for the seat counter: re-syncs every paying boss so the
 * extra-seat quantity always matches the rosters, even if an app-side sync was missed.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return NextResponse.json({ error: "CRON_SECRET is not set." }, { status: 500 });
  if (request.headers.get("authorization") !== `Bearer ${secret}`) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = createAdminClient();
  const { data: bosses } = await admin.from("entitlements").select("user_id").eq("source", "stripe").eq("plan", "boss").in("status", ["trialing", "active", "past_due"]);
  const results: Record<string, unknown> = {};
  for (const b of bosses ?? []) {
    try {
      results[b.user_id] = await syncBossSeats(admin, b.user_id);
    } catch (err) {
      results[b.user_id] = { error: (err as Error).message };
    }
  }
  return NextResponse.json({ ok: true, bosses: (bosses ?? []).length, results });
}
