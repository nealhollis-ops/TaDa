import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { syncBossSeats } from "@/lib/stripe";

/**
 * POST /api/stripe/seats { teamId }
 * Called by the app whenever a boss team roster changes (join, removal, delete).
 * Recounts the owner's unique members and updates the extra-seat quantity.
 * Any member of that team may trigger it; the owner is looked up server side.
 */
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });

  const body = (await request.json().catch(() => null)) as { teamId?: string; ownerId?: string } | null;
  const admin = createAdminClient();
  let ownerId = body?.ownerId ?? null;
  if (body?.teamId) {
    const { data: team } = await admin.from("teams").select("owner_id,kind").eq("id", body.teamId).maybeSingle();
    if (!team || team.kind !== "boss") return NextResponse.json({ ok: false, reason: "not a boss team" });
    ownerId = team.owner_id;
  }
  if (!ownerId) return NextResponse.json({ error: "teamId or ownerId required" }, { status: 400 });
  if (ownerId !== user.id) {
    // Only people on one of the owner's teams may poke the sync.
    const { data: rel } = await admin.from("team_members").select("team_id, teams!inner(owner_id)").eq("user_id", user.id).eq("teams.owner_id", ownerId).limit(1);
    if (!rel?.length) return NextResponse.json({ error: "Not allowed" }, { status: 403 });
  }
  try {
    const result = await syncBossSeats(admin, ownerId);
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    console.error("seat sync", err);
    return NextResponse.json({ error: "Seat sync failed" }, { status: 500 });
  }
}
