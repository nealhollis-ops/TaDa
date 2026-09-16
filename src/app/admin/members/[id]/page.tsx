import Link from "next/link";
import { notFound } from "next/navigation";
import { getMember } from "@/lib/admin";
import { MemberActions } from "./member-actions";

export const metadata = { title: "Member" };
export const dynamic = "force-dynamic";

export default async function MemberPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const m = await getMember(id);
  if (!m) notFound();
  const p = m.profile;
  return (
    <div>
      <Link href="/admin/members" className="text-xs text-fade underline">
        All members
      </Link>
      <div className="mt-2 flex flex-wrap items-baseline gap-3">
        <h1 className="text-2xl font-extrabold text-navy">{p.name || "(no name)"}</h1>
        <span className="text-sm text-fade">{p.email}</span>
        {p.role === "admin" && <span className="rounded-full bg-gold-soft px-2 py-0.5 text-xs font-semibold text-gold-deep">admin</span>}
        {p.banned_at && <span className="rounded-full bg-coral-soft px-2 py-0.5 text-xs font-semibold text-coral">banned {p.banned_at.slice(0, 10)}</span>}
      </div>
      <p className="mt-1 text-xs text-fade">
        Joined {p.created_at.slice(0, 10)} · slug {p.slug} · {p.hidden ? "hidden" : "visible"} · {p.private ? "private profile" : "open profile"} · {p.seeking ? "seeking a partner" : "not seeking"}
      </p>

      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <section className="rounded-2xl border border-line bg-white p-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-fade">Access</h2>
          <p className="mt-2 text-lg font-bold text-navy">
            {m.effective ? `${m.effective.plan} via ${m.effective.source}` : "No active plan"}
            {m.effective?.expires_at && <span className="ml-2 text-sm font-normal text-fade">until {m.effective.expires_at.slice(0, 10)}</span>}
          </p>
          <ul className="mt-2 space-y-1 text-sm">
            {m.entitlements.map((e) => (
              <li key={e.id} className="flex flex-wrap gap-x-2 text-ink">
                <span className="font-semibold">{e.source}</span>
                <span>{e.plan}</span>
                <span className="text-fade">{e.status}</span>
                {e.expires_at && <span className="text-fade">expires {e.expires_at.slice(0, 10)}</span>}
                {e.plan === "boss" ? <span className="text-fade">{e.seats_included} seats</span> : null}
                {e.note && <span className="text-fade">· {e.note}</span>}
              </li>
            ))}
            {m.entitlements.length === 0 && <li className="text-fade">No entitlement rows.</li>}
          </ul>
          <div className="mt-3 flex flex-wrap gap-2">
            {m.stripeUrl ? (
              <a href={m.stripeUrl} target="_blank" rel="noreferrer" className="rounded-xl bg-navy px-3 py-2 text-xs font-semibold text-white">
                Refund or manage in Stripe
              </a>
            ) : (
              <span className="text-xs text-fade">No Stripe customer yet.</span>
            )}
          </div>
        </section>

        <section className="rounded-2xl border border-line bg-white p-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-fade">Activity</h2>
          <dl className="mt-2 grid grid-cols-2 gap-2 text-sm">
            <dt className="text-fade">Streak</dt>
            <dd className="font-semibold">{m.stats?.streak ?? 0} (best {m.stats?.best_streak ?? 0})</dd>
            <dt className="text-fade">Tasks done</dt>
            <dd className="font-semibold">{m.stats?.total_done ?? 0}</dd>
            <dt className="text-fade">Last month opened</dt>
            <dd className="font-semibold">{m.lastProgress ? `${m.lastProgress.month}: ${m.lastProgress.done}/${m.lastProgress.total}` : "never"}</dd>
            <dt className="text-fade">Last seen</dt>
            <dd className="font-semibold">{m.lastProgress?.updated_at ? m.lastProgress.updated_at.slice(0, 16).replace("T", " ") : "never"}</dd>
          </dl>
        </section>
      </div>

      <MemberActions userId={p.id} isAdmin={p.role === "admin"} banned={!!p.banned_at} comp={m.entitlements.find((e) => e.source === "comp") ?? null} />

      {m.log.length > 0 && (
        <section className="mt-6 rounded-2xl border border-line bg-white p-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-fade">Admin history</h2>
          <ul className="mt-2 space-y-1 text-xs text-ink">
            {m.log.map((l, i) => (
              <li key={i}>
                <span className="text-fade">{l.created_at.slice(0, 16).replace("T", " ")}</span> · {l.action}
                {l.detail ? ` · ${JSON.stringify(l.detail)}` : ""}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
