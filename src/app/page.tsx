import Image from "next/image";
import { InstallPrompt } from "@/components/pwa/install-prompt";
import { supabaseConfigured } from "@/lib/env";

export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 px-6 py-16 text-center">
      <Image src="/icons/icon-192.png" alt="TaDa" width={96} height={96} priority className="rounded-[22%] shadow-md" />

      <div className="flex flex-col gap-2">
        <h1 className="text-4xl font-extrabold tracking-tight text-navy">TaDa</h1>
        <p className="max-w-sm text-lg text-fade">Plan your day, check it off, and hear the ta-da.</p>
      </div>

      <InstallPrompt />

      {process.env.NODE_ENV === "development" && !supabaseConfigured && (
        <p className="mt-6 max-w-sm rounded-xl border border-gold-soft bg-gold-soft/60 px-4 py-3 text-sm text-gold-deep">
          Supabase is not configured yet. Fill in NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in
          .env.local, then restart the dev server.
        </p>
      )}
    </main>
  );
}
