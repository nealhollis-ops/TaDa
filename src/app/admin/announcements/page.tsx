import { createAdminClient } from "@/lib/supabase/admin";
import { AnnouncementForms } from "./forms";

export const metadata = { title: "Announcements" };
export const dynamic = "force-dynamic";

export default async function AnnouncementsPage() {
  const admin = createAdminClient();
  const { data: pinned } = await admin.from("posts").select("id,type,text,created_at,user_id").eq("pinned", true).is("deleted_at", null).order("created_at", { ascending: false });
  const ids = Array.from(new Set((pinned ?? []).map((p) => p.user_id)));
  const { data: people } = ids.length ? await admin.from("profiles").select("id,name").in("id", ids) : { data: [] };
  const nameOf = (id: string) => (people ?? []).find((p) => p.id === id)?.name ?? "admin";
  return (
    <div>
      <h1 className="text-2xl font-extrabold text-navy">Announcements</h1>
      <p className="mt-1 text-sm text-fade">A pinned post sits at the top of its room in the community until you unpin it. Boosts is the room everyone reads for encouragement; Questions and Wins work too.</p>
      <AnnouncementForms pinned={(pinned ?? []).map((p) => ({ id: p.id, type: p.type, text: p.text, createdAt: p.created_at, by: nameOf(p.user_id) }))} />
    </div>
  );
}
