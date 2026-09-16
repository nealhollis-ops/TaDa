import Link from "next/link";
import { requireAdmin } from "@/lib/auth";

const NAV = [
  { href: "/admin", label: "Numbers" },
  { href: "/admin/members", label: "Members" },
  { href: "/admin/comp", label: "Comp grants" },
  { href: "/admin/moderation", label: "Moderation" },
  { href: "/admin/announcements", label: "Announcements" },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const { profile } = await requireAdmin();
  return (
    <div className="min-h-screen bg-cream text-ink">
      <header className="sticky top-0 z-10 border-b border-line bg-white/95 backdrop-blur">
        <div className="mx-auto flex w-full max-w-4xl flex-wrap items-center gap-x-4 gap-y-2 px-4 py-2">
          <Link href="/admin" className="text-lg font-extrabold tracking-tight text-navy">
            TaDa Admin
          </Link>
          <nav className="flex flex-wrap gap-1 text-sm">
            {NAV.map((n) => (
              <Link key={n.href} href={n.href} className="rounded-full px-3 py-1 font-medium text-navy-2 hover:bg-mist">
                {n.label}
              </Link>
            ))}
          </nav>
          <span className="ml-auto text-xs text-fade">
            {profile.name} ·{" "}
            <Link href="/today" className="underline">
              back to the app
            </Link>
          </span>
        </div>
      </header>
      <main className="mx-auto w-full max-w-4xl px-4 py-6">{children}</main>
    </div>
  );
}
