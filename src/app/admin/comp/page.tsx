import { createAdminClient } from "@/lib/supabase/admin";
import { BulkCompForm } from "./bulk-form";

export const metadata = { title: "Comp grants" };
export const dynamic = "force-dynamic";

export default async function CompPage() {
  const admin = createAdminClient();
  const [{ data: pending }, { data: comps }] = await Promise.all([
    admin.from("comp_invites").select("email,plan,expires_at,note,created_at").is("redeemed_at", null).order("created_at", { ascending: false }).limit(200),
    admin.from("entitlements").select("user_id,plan,expires_at,note,created_at,profiles!entitlements_user_id_fkey(name,email)").eq("source", "comp").order("created_at", { ascending: false }).limit(200),
  ]);
  return (
    <div>
      <h1 className="text-2xl font-extrabold text-navy">Comp grants</h1>
      <p className="mt-1 text-sm text-fade">
        The Faith Hub Unleashed flow. Paste emails, pick a level, and grant them all at once. People who already have an account are comped immediately. Everyone else gets a comp invite: the moment they sign up with that email, they land at their level and never see a checkout page.
      </p>
      <BulkCompForm />

      <div className="mt-8 grid gap-4 md:grid-cols-2">
        <section className="rounded-2xl border border-line bg-white p-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-fade">Waiting for signup ({pending?.length ?? 0})</h2>
          <ul className="mt-2 space-y-1 text-sm">
            {(pending ?? []).map((i) => (
              <li key={i.email} className="flex flex-wrap gap-x-2">
                <span className="font-semibold text-ink">{i.email}</span>
                <span className="text-fade">{i.plan}</span>
                {i.expires_at && <span className="text-fade">until {i.expires_at.slice(0, 10)}</span>}
                <span className="text-fade">· invited {i.created_at.slice(0, 10)}</span>
              </li>
            ))}
            {!pending?.length && <li className="text-fade">Nobody waiting.</li>}
          </ul>
        </section>
        <section className="rounded-2xl border border-line bg-white p-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-fade">Comped members ({comps?.length ?? 0})</h2>
          <ul className="mt-2 space-y-1 text-sm">
            {(comps ?? []).map((c) => {
              const prof = (Array.isArray(c.profiles) ? c.profiles[0] : c.profiles) as { name: string; email: string } | null;
              return (
                <li key={c.user_id} className="flex flex-wrap gap-x-2">
                  <a href={`/admin/members/${c.user_id}`} className="font-semibold text-navy hover:underline">
                    {prof?.name || prof?.email}
                  </a>
                  <span className="text-fade">{c.plan}</span>
                  {c.expires_at && <span className="text-fade">until {c.expires_at.slice(0, 10)}</span>}
                  {c.note && <span className="text-fade">· {c.note}</span>}
                </li>
              );
            })}
            {!comps?.length && <li className="text-fade">No comps yet.</li>}
          </ul>
        </section>
      </div>
    </div>
  );
}
