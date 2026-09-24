import { createAdminClient } from "@/lib/supabase/admin";
import { AnnouncementForms } from "./forms";

export const metadata = { title: "Announcements" };
export const dynamic = "force-dynamic";

export default async function AnnouncementsPage() {
  const admin = createAdminClient();
  const { data: banners } = await admin.from("banners").select("id,text,starts_at,ends_at").order("starts_at", { ascending: false });
  const { data: pinned } = await admin.from("posts").select("id,type,text,created_at,user_id").eq("pinned", true).is("deleted_at", null).order("created_at", { ascending: false });
  const ids = Array.from(new Set((pinned ?? []).map((p) => p.user_id)));
  const { data: people } = ids.length ? await admin.from("profiles").select("id,name").in("id", ids) : { data: [] };
  const nameOf = (id: string) => (people ?? []).find((p) => p.id === id)?.name ?? "admin";
  return (
    <div>
      <h1 className="text-2xl font-extrabold text-navy">Announcements</h1>
      <p className="mt-1 text-sm text-fade">Three ways to reach people: a banner across Today and Plan for a set window, a pinned post that sits at the top of its room in the community, and a push to their devices.</p>
      <AnnouncementForms
        pinned={(pinned ?? []).map((p) => ({ id: p.id, type: p.type, text: p.text, createdAt: p.created_at, by: nameOf(p.user_id) }))}
        banners={(banners ?? []).map((b) => ({ id: b.id, text: b.text, startsAt: b.starts_at, endsAt: b.ends_at }))}
      />
    </div>
  );
}
