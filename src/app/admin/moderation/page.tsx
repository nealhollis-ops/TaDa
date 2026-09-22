import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { ModerationForms } from "./forms";

export const metadata = { title: "Moderation" };
export const dynamic = "force-dynamic";

export default async function ModerationPage() {
  const admin = createAdminClient();
  const { data: reports } = await admin
    .from("reports")
    .select("id,reason,status,created_at,reporter_id,target_user_id,post_id,reply_id")
    .eq("status", "open")
    .order("created_at", { ascending: false })
    .limit(100);
  const ids = new Set<string>();
  (reports ?? []).forEach((r) => {
    if (r.reporter_id) ids.add(r.reporter_id);
    if (r.target_user_id) ids.add(r.target_user_id);
  });
  const postIds = (reports ?? []).map((r) => r.post_id).filter(Boolean) as string[];
  const replyIds = (reports ?? []).map((r) => r.reply_id).filter(Boolean) as string[];
  const [{ data: posts }, { data: replies }] = await Promise.all([
    postIds.length ? admin.from("posts").select("id,user_id,text,deleted_at").in("id", postIds) : Promise.resolve({ data: [] as { id: string; user_id: string; text: string; deleted_at: string | null }[] }),
    replyIds.length ? admin.from("replies").select("id,user_id,text,deleted_at").in("id", replyIds) : Promise.resolve({ data: [] as { id: string; user_id: string; text: string; deleted_at: string | null }[] }),
  ]);
  (posts ?? []).forEach((p) => ids.add(p.user_id));
  (replies ?? []).forEach((r) => ids.add(r.user_id));
  const { data: recent } = await admin.from("posts").select("id,user_id,type,text,created_at,milestone,pinned").is("deleted_at", null).order("created_at", { ascending: false }).limit(30);
  (recent ?? []).forEach((p) => ids.add(p.user_id));
  const { data: people } = ids.size ? await admin.from("profiles").select("id,name,email").in("id", Array.from(ids)) : { data: [] };
  const nameOf = (id: string | null) => (id ? ((people ?? []).find((p) => p.id === id)?.name ?? "member") : "");
  const postById = new Map((posts ?? []).map((p) => [p.id, p]));
  const replyById = new Map((replies ?? []).map((r) => [r.id, r]));

  return (
    <div>
      <h1 className="text-2xl font-extrabold text-navy">Moderation</h1>
      <p className="mt-1 text-sm text-fade">Reports come from the Report button on profiles. Removing a post or reply hides it everywhere. Banning is on the member&rsquo;s page.</p>

      <section className="mt-5">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-fade">Open reports ({reports?.length ?? 0})</h2>
        <div className="mt-2 space-y-3">
          {(reports ?? []).map((r) => {
            const post = r.post_id ? postById.get(r.post_id) : null;
            const reply = r.reply_id ? replyById.get(r.reply_id) : null;
            const targetId = r.target_user_id ?? post?.user_id ?? reply?.user_id ?? null;
            return (
              <div key={r.id} className="rounded-2xl border border-line bg-white p-4">
                <div className="flex flex-wrap items-center gap-x-2 text-sm">
                  <span className="text-fade">{r.created_at.slice(0, 16).replace("T", " ")}</span>
                  <span>
                    <span className="font-semibold">{nameOf(r.reporter_id)}</span> reported{" "}
                    {targetId ? (
                      <Link href={`/admin/members/${targetId}`} className="font-semibold text-navy underline">
                        {nameOf(targetId)}
                      </Link>
                    ) : (
                      "content"
                    )}
                  </span>
                </div>
                {r.reason && <p className="mt-1 text-sm text-ink">&ldquo;{r.reason}&rdquo;</p>}
                {post && (
                  <blockquote className="mt-2 rounded-xl bg-mist px-3 py-2 text-sm text-ink">
                    Post: {post.text}
                    {post.deleted_at && <span className="ml-2 text-xs text-coral">(already removed)</span>}
                  </blockquote>
                )}
                {reply && (
                  <blockquote className="mt-2 rounded-xl bg-mist px-3 py-2 text-sm text-ink">
                    Reply: {reply.text}
                    {reply.deleted_at && <span className="ml-2 text-xs text-coral">(already removed)</span>}
                  </blockquote>
                )}
                <ModerationForms reportId={r.id} postId={post && !post.deleted_at ? post.id : null} replyId={reply && !reply.deleted_at ? reply.id : null} />
              </div>
            );
          })}
          {!reports?.length && <p className="rounded-2xl border border-line bg-white p-4 text-sm text-fade">The queue is empty.</p>}
        </div>
      </section>

      <section className="mt-8">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-fade">Recent posts</h2>
        <div className="mt-2 space-y-2">
          {(recent ?? []).map((p) => (
            <div key={p.id} className="flex flex-wrap items-start gap-2 rounded-2xl border border-line bg-white p-3 text-sm">
              <div className="min-w-0 flex-1">
                <span className="font-semibold text-navy">{nameOf(p.user_id)}</span> <span className="text-xs text-fade">{p.type} · {p.created_at.slice(0, 16).replace("T", " ")}{p.milestone ? " · milestone" : ""}{p.pinned ? " · pinned" : ""}</span>
                <p className="mt-0.5 text-ink">{p.text}</p>
              </div>
              <ModerationForms reportId={null} postId={p.id} replyId={null} pinned={!!p.pinned} compact />
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
