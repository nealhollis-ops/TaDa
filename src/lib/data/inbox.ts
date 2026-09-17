import type { SupabaseClient } from "@supabase/supabase-js";

export type Notice = { id: string; kind: string; title: string; body: string; url: string; createdAt: string; readAt: string | null };

type Row = { id: string; kind: string; title: string; body: string; url: string; created_at: string; read_at: string | null };

export const toNotice = (r: Row): Notice => ({ id: r.id, kind: r.kind, title: r.title, body: r.body, url: r.url, createdAt: r.created_at, readAt: r.read_at });

/** The member's most recent notifications, newest first. */
export async function loadInbox(sb: SupabaseClient, me: string): Promise<Notice[]> {
  const { data, error } = await sb.from("notifications").select("id,kind,title,body,url,created_at,read_at").eq("user_id", me).order("created_at", { ascending: false }).limit(60);
  if (error) throw error;
  return (data as Row[]).map(toNotice);
}

export async function markNoticeRead(sb: SupabaseClient, id: string) {
  const { error } = await sb.from("notifications").update({ read_at: new Date().toISOString() }).eq("id", id).is("read_at", null);
  if (error) throw error;
}

export async function markAllNoticesRead(sb: SupabaseClient, me: string) {
  const { error } = await sb.from("notifications").update({ read_at: new Date().toISOString() }).eq("user_id", me).is("read_at", null);
  if (error) throw error;
}
