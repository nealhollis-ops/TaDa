import Link from "next/link";
import { listMembers } from "@/lib/admin";

export const metadata = { title: "Members" };
export const dynamic = "force-dynamic";

type Search = Promise<{ q?: string; plan?: string; status?: string }>;

const badge = (text: string, tone: "navy" | "gold" | "coral" | "teal" | "fade") => {
  const map = { navy: "bg-mist text-navy-2", gold: "bg-gold-soft text-gold-deep", coral: "bg-coral-soft text-coral", teal: "bg-[#F1E7D0] text-teal", fade: "bg-mist text-fade" };
  return <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${map[tone]}`}>{text}</span>;
};

export default async function MembersPage({ searchParams }: { searchParams: Search }) {
  const sp = await searchParams;
  const rows = await listMembers(sp);
  const sel = "rounded-xl border border-line bg-white px-3 py-2 text-sm";
  return (
    <div>
      <h1 className="text-2xl font-extrabold text-navy">Members</h1>
      <form className="mt-4 flex flex-wrap gap-2" method="get">
        <input name="q" defaultValue={sp.q ?? ""} placeholder="Search name or email" className={`${sel} min-w-[220px] flex-1`} />
        <select name="plan" defaultValue={sp.plan ?? ""} className={sel}>
          <option value="">Any plan</option>
          <option value="standard">Standard</option>
          <option value="teams">Teams</option>
          <option value="boss">Boss</option>
        </select>
        <select name="status" defaultValue={sp.status ?? ""} className={sel}>
          <option value="">Any status</option>
          <option value="trialing">Trialing</option>
          <option value="active">Paying</option>
          <option value="past_due">Past due</option>
          <option value="canceled">Canceled</option>
          <option value="comp">Comped</option>
          <option value="admin">Founder</option>
          <option value="none">No plan</option>
          <option value="banned">Banned</option>
        </select>
        <button type="submit" className="rounded-xl bg-navy px-4 py-2 text-sm font-semibold text-white">
          Search
        </button>
      </form>
      <p className="mt-3 text-xs text-fade">
        {rows.length} shown{rows.length >= 100 ? " (first 100 by newest; narrow the search for more)" : ""}.
      </p>
      <div className="mt-2 overflow-x-auto rounded-2xl border border-line bg-white">
        <table className="w-full text-sm">
          <thead className="bg-mist text-left text-xs uppercase tracking-wide text-fade">
            <tr>
              <th className="px-3 py-2">Member</th>
              <th className="px-3 py-2">Plan</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Joined</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-t border-line">
                <td className="px-3 py-2">
                  <Link href={`/admin/members/${r.id}`} className="font-semibold text-navy hover:underline">
                    {r.name || "(no name)"}
                  </Link>
                  <div className="text-xs text-fade">{r.email}</div>
                </td>
                <td className="px-3 py-2">{r.plan ? badge(r.plan, r.plan === "boss" ? "gold" : "navy") : badge("none", "fade")}</td>
                <td className="px-3 py-2">
                  <span className="flex flex-wrap gap-1">
                    {r.bannedAt && badge("banned", "coral")}
                    {r.role === "admin" && badge("admin", "gold")}
                    {r.status && r.status !== "none" && badge(r.status, r.status === "past_due" || r.status === "canceled" ? "coral" : r.status === "trialing" ? "teal" : "navy")}
                    {r.expiresAt && r.source === "comp" && badge(`until ${r.expiresAt.slice(0, 10)}`, "fade")}
                  </span>
                </td>
                <td className="px-3 py-2 text-xs text-fade">{r.createdAt.slice(0, 10)}</td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={4} className="px-3 py-6 text-center text-fade">
                  Nobody matches.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
