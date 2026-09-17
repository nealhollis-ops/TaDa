"use client";

/**
 * Personal data: profile, tasks, stats, published progress, avatar.
 * All calls run as the signed-in member; RLS keeps tasks owner-only.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { weekOf, type MonthInfo } from "@/lib/planner/calendar";
import type { MyProfile, Stats, Task } from "@/lib/planner/types";
import { fromStats, fromTask, toStats, toTask } from "./map";

type SB = SupabaseClient;

export async function loadMe(sb: SB, userId: string, email: string): Promise<MyProfile> {
  const [{ data: p, error }, { data: card }] = await Promise.all([
    sb.from("profiles").select("id,name,slug,avatar_url,role,hidden,private,seeking,muted,notif_on,notif_community,onboarding").eq("id", userId).single(),
    sb.rpc("profile_card", { target: userId }),
  ]);
  if (error || !p) throw error ?? new Error("profile missing");
  return {
    id: p.id,
    email,
    name: p.name ?? "",
    slug: p.slug ?? "",
    avatarUrl: p.avatar_url ?? null,
    bio: (card as { bio?: string } | null)?.bio ?? "",
    role: p.role ?? "member",
    hidden: !!p.hidden,
    private: !!p.private,
    seeking: !!p.seeking,
    muted: !!p.muted,
    notifOn: p.notif_on !== false,
    notifCommunity: p.notif_community !== false,
    onboarding: { tour: false, posted: false, done: false, ...(p.onboarding ?? {}) },
  };
}

export async function saveMe(sb: SB, userId: string, patch: Partial<Pick<MyProfile, "name" | "bio" | "hidden" | "private" | "seeking" | "muted" | "notifOn" | "notifCommunity" | "onboarding" | "avatarUrl">>) {
  const row: Record<string, unknown> = {};
  if (patch.name !== undefined) row.name = patch.name.trim().slice(0, 40) || "friend";
  if (patch.bio !== undefined) row.bio = patch.bio.slice(0, 150);
  if (patch.hidden !== undefined) row.hidden = patch.hidden;
  if (patch.private !== undefined) row.private = patch.private;
  if (patch.seeking !== undefined) row.seeking = patch.seeking;
  if (patch.muted !== undefined) row.muted = patch.muted;
  if (patch.notifOn !== undefined) row.notif_on = patch.notifOn;
  if (patch.notifCommunity !== undefined) row.notif_community = patch.notifCommunity;
  if (patch.onboarding !== undefined) row.onboarding = patch.onboarding;
  if (patch.avatarUrl !== undefined) row.avatar_url = patch.avatarUrl;
  const { error } = await sb.from("profiles").update(row).eq("id", userId);
  if (error) throw error;
}

/** Square-crop to 256px JPEG in the browser, upload to Storage, return the public URL. */
export async function uploadAvatar(sb: SB, userId: string, file: File): Promise<string> {
  const blob = await new Promise<Blob>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("read failed"));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("bad image"));
      img.onload = () => {
        const c = document.createElement("canvas");
        const S = 256;
        c.width = S;
        c.height = S;
        const ctx = c.getContext("2d")!;
        const side = Math.min(img.width, img.height);
        ctx.drawImage(img, (img.width - side) / 2, (img.height - side) / 2, side, side, 0, 0, S, S);
        c.toBlob((b) => (b ? resolve(b) : reject(new Error("encode failed"))), "image/jpeg", 0.82);
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
  const path = `${userId}/avatar.jpg`;
  const { error } = await sb.storage.from("avatars").upload(path, blob, { upsert: true, contentType: "image/jpeg" });
  if (error) throw error;
  const { data } = sb.storage.from("avatars").getPublicUrl(path);
  return `${data.publicUrl}?v=${Date.now()}`;
}

export async function removeAvatar(sb: SB, userId: string) {
  await sb.storage.from("avatars").remove([`${userId}/avatar.jpg`]);
}

// ---------------------------------------------------------------- tasks --
export async function loadTasks(sb: SB, userId: string, month: string): Promise<Task[]> {
  const { data, error } = await sb.from("tasks").select("*").eq("user_id", userId).eq("month", month).order("sort");
  if (error) throw error;
  return (data ?? []).map(toTask);
}

export async function loadRepeatersFrom(sb: SB, userId: string, month: string): Promise<Task[]> {
  const { data, error } = await sb.from("tasks").select("*").eq("user_id", userId).eq("month", month).neq("repeat", "none");
  if (error) throw error;
  return (data ?? []).map(toTask);
}

/** Persist a whole-list change: upsert what changed, delete what vanished. */
export async function syncTasks(sb: SB, userId: string, prev: Task[], next: Task[]) {
  const before = new Map(prev.map((t) => [t.id, JSON.stringify(t)]));
  const nextIds = new Set(next.map((t) => t.id));
  const changed = next.filter((t) => before.get(t.id) !== JSON.stringify(t));
  const removed = prev.filter((t) => !nextIds.has(t.id)).map((t) => t.id);
  if (changed.length) {
    const { error } = await sb.from("tasks").upsert(changed.map((t) => fromTask(userId, t)));
    if (error) throw error;
  }
  if (removed.length) {
    const { error } = await sb.from("tasks").delete().in("id", removed);
    if (error) throw error;
  }
}

// ---------------------------------------------------------------- stats --
export async function loadStats(sb: SB, userId: string): Promise<Stats | null> {
  const { data, error } = await sb.from("stats").select("*").eq("user_id", userId).maybeSingle();
  if (error) throw error;
  return toStats(data);
}

export async function saveStats(sb: SB, userId: string, s: Stats) {
  // The signup trigger creates the row, so an update is the normal path.
  const row = fromStats(userId, s);
  const { data, error } = await sb.from("stats").update(row).eq("user_id", userId).select("user_id");
  if (error) throw error;
  if (!data?.length) {
    const { error: insErr } = await sb.from("stats").insert(row);
    if (insErr) throw insErr;
  }
}

/** Publish the monthly progress summary partners and teammates see (never the tasks). */
export async function publishProgress(sb: SB, userId: string, m: MonthInfo, tasks: Task[]) {
  const weeks: Record<string, { done: number; total: number }> = {};
  tasks.forEach((t) => {
    const w = String(t.date ? weekOf(m, t.date) : t.week);
    if (!weeks[w]) weeks[w] = { done: 0, total: 0 };
    weeks[w].total += 1;
    if (t.done) weeks[w].done += 1;
  });
  const { error } = await sb.from("progress").upsert({
    user_id: userId,
    month: m.prefix,
    total: tasks.length,
    done: tasks.filter((t) => t.done).length,
    weeks,
    updated_at: new Date().toISOString(),
  });
  if (error) throw error;
}
