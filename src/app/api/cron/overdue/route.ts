import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { deliver } from "@/lib/notify/deliver";

/**
 * GET /api/cron/overdue  (Vercel cron, every morning; see vercel.json)
 * Any assigned task still open the day after its deadline gets one reminder to
 * the person it was assigned to: a bell entry plus a push if their alerts are
 * on. The row is stamped so the reminder goes out once.
 * Vercel sends "Authorization: Bearer <CRON_SECRET>" when CRON_SECRET is set.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return NextResponse.json({ error: "CRON_SECRET is not set." }, { status: 500 });
  if (request.headers.get("authorization") !== `Bearer ${secret}`) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Deadlines are calendar days; "past due" means the date is before today in US Central time.
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Chicago", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());

  const admin = createAdminClient();
  const { data: rows, error } = await admin
    .from("assignments")
    .select("id,to_user,title,date")
    .eq("done", false)
    .is("overdue_notified_at", null)
    .not("to_user", "is", null)
    .lt("date", today)
    .limit(500);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!rows?.length) return NextResponse.json({ ok: true, reminded: 0 });

  let reminded = 0;
  for (const a of rows) {
    const due = new Date(`${a.date}T12:00:00`).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
    const sent = await deliver(admin, a.to_user as string, "overdue", {
      title: `Past due: ${a.title}`,
      body: `It was due ${due} and is still open. Your boss can see it too.`,
      url: "/partners?tab=boss",
    });
    await admin.from("assignments").update({ overdue_notified_at: new Date().toISOString() }).eq("id", a.id);
    if (sent >= 0) reminded += 1;
  }
  return NextResponse.json({ ok: true, reminded, checked: rows.length });
}
