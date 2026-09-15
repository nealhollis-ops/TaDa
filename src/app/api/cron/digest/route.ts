import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

const MIN_TO_ROLL_UP = 5;

/**
 * GET /api/cron/digest  (Vercel cron, nightly; see vercel.json)
 * Once the community is busy, the day's automatic milestone posts get rolled
 * into a single digest post so the Wins room stays readable. Below the
 * threshold the individual posts stay as they are.
 * Vercel sends "Authorization: Bearer <CRON_SECRET>" when CRON_SECRET is set.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return NextResponse.json({ error: "CRON_SECRET is not set." }, { status: 500 });
  if (request.headers.get("authorization") !== `Bearer ${secret}`) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = createAdminClient();
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { data: posts, error } = await admin
    .from("posts")
    .select("id,user_id,text,created_at")
    .eq("milestone", true)
    .is("deleted_at", null)
    .gte("created_at", since)
    .order("created_at");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!posts || posts.length < MIN_TO_ROLL_UP) return NextResponse.json({ ok: true, rolled: 0, reason: "below threshold" });

  const { data: author } = await admin.from("profiles").select("id").eq("role", "admin").order("created_at").limit(1).maybeSingle();
  if (!author) return NextResponse.json({ error: "No admin profile to post as." }, { status: 500 });

  const lines = posts.map((p) => p.text.replace(/ just earned the /, " earned the ").replace(/!$/, "")).slice(0, 40);
  const text = `🎉 Today's milestones, all in one place:\n${lines.map((l) => `• ${l}`).join("\n")}${posts.length > 40 ? `\n…and ${posts.length - 40} more` : ""}`;

  const { error: insErr } = await admin.from("posts").insert({ user_id: author.id, type: "win", text, milestone: true });
  if (insErr) return NextResponse.json({ error: insErr.message }, { status: 500 });
  await admin.from("posts").update({ deleted_at: new Date().toISOString() }).in("id", posts.map((p) => p.id));
  return NextResponse.json({ ok: true, rolled: posts.length });
}
