import { getMe } from "@/lib/auth";

export const metadata = { title: "Today" };

const PLAN_LABEL = { standard: "Standard", teams: "Teams", boss: "Boss" } as const;

export default async function TodayPage() {
  const { profile, plan } = await getMe();
  const first = (profile?.name ?? "friend").split(" ")[0];

  return (
    <main className="flex flex-col gap-6">
      <section className="rounded-2xl border border-line bg-white p-6 shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-wide text-fade">Signed in</p>
        <h1 className="mt-1 text-3xl font-extrabold tracking-tight text-navy">Hi {first}, you&rsquo;re in.</h1>
        <div className="mt-4 flex flex-wrap items-center gap-2 text-sm">
          <span className="rounded-full bg-mist px-3 py-1 font-medium text-navy-2">{profile?.email}</span>
          {plan ? (
            <span className="rounded-full bg-gold-soft px-3 py-1 font-semibold text-gold-deep">{PLAN_LABEL[plan]} plan</span>
          ) : (
            <span className="rounded-full bg-coral-soft px-3 py-1 font-semibold text-coral">No active plan yet</span>
          )}
          {profile?.role === "admin" && (
            <span className="rounded-full bg-navy px-3 py-1 font-semibold text-white">Admin</span>
          )}
        </div>
      </section>

      <section className="rounded-2xl border border-dashed border-line bg-white/60 p-6 text-fade">
        <h2 className="font-semibold text-ink">The planner lands next</h2>
        <p className="mt-1 text-sm">
          Accounts, the database, and the paywall rules are live (Phase 2). Today, Plan, Timeline, partners, teams and
          the community come across from the prototype in Phase 3.
        </p>
      </section>
    </main>
  );
}
