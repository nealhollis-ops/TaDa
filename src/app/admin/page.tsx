import Link from "next/link";
import { requireAdmin } from "@/lib/auth";

export const metadata = { title: "Admin" };

export default async function AdminPage() {
  const { profile } = await requireAdmin();
  return (
    <main className="mx-auto max-w-xl px-5 py-10">
      <h1 className="text-2xl font-extrabold text-navy">Admin</h1>
      <p className="mt-2 text-fade">Signed in as {profile.name}. Member search, comp grants, moderation, and the numbers arrive in Phase 5.</p>
      <p className="mt-6 text-sm">
        <Link href="/today" className="underline text-navy">
          Back to TaDa
        </Link>
      </p>
    </main>
  );
}
