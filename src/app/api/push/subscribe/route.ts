import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/** Save or remove this device's Web Push subscription for the signed-in member. */
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });

  const body = (await request.json().catch(() => null)) as { subscription?: { endpoint?: string; keys?: Record<string, string> }; userAgent?: string } | null;
  const sub = body?.subscription;
  if (!sub?.endpoint || !sub.keys) return NextResponse.json({ error: "Bad subscription." }, { status: 400 });

  const { error } = await supabase
    .from("push_subscriptions")
    .upsert({ user_id: user.id, endpoint: sub.endpoint, keys: sub.keys, user_agent: (body?.userAgent ?? "").slice(0, 300) }, { onConflict: "endpoint" });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const body = (await request.json().catch(() => null)) as { endpoint?: string } | null;
  if (!body?.endpoint) return NextResponse.json({ error: "Bad request." }, { status: 400 });
  await supabase.from("push_subscriptions").delete().eq("user_id", user.id).eq("endpoint", body.endpoint);
  return NextResponse.json({ ok: true });
}
