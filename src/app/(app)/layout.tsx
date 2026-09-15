import Image from "next/image";
import Link from "next/link";
import { getMe } from "@/lib/auth";

/**
 * Layout for every signed-in screen. Redirects to /login when signed out.
 * Phase 3 replaces this header with the real tab bar from the prototype.
 */
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { profile } = await getMe();

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <header className="sticky top-0 z-10 border-b border-line bg-white/90 backdrop-blur">
        <div className="mx-auto flex w-full max-w-3xl items-center justify-between gap-3 px-4 py-2">
          <Link href="/today" className="flex items-center gap-2">
            <Image src="/icons/icon-192.png" alt="" width={28} height={28} className="rounded-[22%]" />
            <span className="text-lg font-extrabold tracking-tight text-navy">TaDa</span>
          </Link>
          <div className="flex items-center gap-3 text-sm">
            {profile?.role === "admin" && (
              <Link href="/admin" className="font-semibold text-gold-deep hover:underline">
                Admin
              </Link>
            )}
            <span className="hidden text-fade sm:inline">{profile?.name}</span>
            <form action="/auth/signout" method="post">
              <button type="submit" className="rounded-full border border-line px-3 py-1 font-semibold text-navy hover:bg-mist">
                Sign out
              </button>
            </form>
          </div>
        </div>
      </header>
      <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-4 py-6">{children}</div>
    </div>
  );
}
