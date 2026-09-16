import Link from "next/link";
import { numbers } from "@/lib/admin";

export const metadata = { title: "Admin" };
export const dynamic = "force-dynamic";

export default async function AdminHome() {
  const n = await numbers();
  const tiles: { label: string; value: number; hint?: string; href?: string }[] = [
    { label: "Members", value: n.members, hint: `${n.signups7} new this week, ${n.signups30} this month`, href: "/admin/members" },
    { label: "Trials running", value: n.trials, href: "/admin/members?status=trialing" },
    { label: "Paying", value: n.paying, hint: "conversions: Stripe subscriptions now active", href: "/admin/members?status=active" },
    { label: "Past due", value: n.pastDue, href: "/admin/members?status=past_due" },
    { label: "Cancels (30 days)", value: n.cancels30, href: "/admin/members?status=canceled" },
    { label: "Comped", value: n.comps, hint: "Faith Hub Unleashed and friends", href: "/admin/members?status=comp" },
    { label: "Active today", value: n.activesToday, hint: `${n.actives7} active this week` },
    { label: "Open reports", value: n.openReports, href: "/admin/moderation" },
  ];
  return (
    <div>
      <h1 className="text-2xl font-extrabold text-navy">Numbers</h1>
      <p className="mt-1 text-sm text-fade">Live counts from the database. Active means the member opened the app and their progress was published.</p>
      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {tiles.map((t) => {
          const body = (
            <div className="h-full rounded-2xl border border-line bg-white p-4">
              <div className="text-xs font-semibold uppercase tracking-wide text-fade">{t.label}</div>
              <div className="mt-1 text-3xl font-extrabold text-navy">{t.value}</div>
              {t.hint && <div className="mt-1 text-xs text-fade">{t.hint}</div>}
            </div>
          );
          return t.href ? (
            <Link key={t.label} href={t.href} className="block hover:opacity-90">
              {body}
            </Link>
          ) : (
            <div key={t.label}>{body}</div>
          );
        })}
      </div>
    </div>
  );
}
