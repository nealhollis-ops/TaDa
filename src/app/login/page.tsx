import Image from "next/image";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { InstallPrompt } from "@/components/pwa/install-prompt";
import { LoginForm } from "./login-form";

export const metadata = { title: "Sign in" };

type Search = Promise<{ next?: string; error?: string; mode?: string }>;

export default async function LoginPage({ searchParams }: { searchParams: Search }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) redirect("/today");

  const { next, error, mode } = await searchParams;
  const linkError = error === "link" ? "That link has expired or was already used. Request a fresh one below." : undefined;

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-8 px-4 py-10">
      <div className="flex flex-col items-center gap-3 text-center">
        <Image src="/icons/icon-192.png" alt="TaDa" width={72} height={72} priority className="rounded-[22%] shadow-md" />
        <h1 className="text-3xl font-extrabold tracking-tight text-navy">TaDa</h1>
        <p className="max-w-xs text-fade">Plan your day, check it off, and hear the ta-da.</p>
      </div>

      <LoginForm next={next} initialError={linkError} initialMode={mode} />

      <InstallPrompt />
    </main>
  );
}
