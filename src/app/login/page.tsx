import Link from "next/link";
import Image from "next/image";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { InstallPrompt } from "@/components/pwa/install-prompt";
import { LoginForm } from "./login-form";

export const metadata = { title: "Sign in" };

type Search = Promise<{ next?: string; error?: string; mode?: string; email?: string; from?: string }>;

export default async function LoginPage({ searchParams }: { searchParams: Search }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) redirect("/today");

  const { next, error, mode, email, from } = await searchParams;
  const linkError = error === "link" ? "That link has expired or was already used. Request a fresh one below." : undefined;

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-8 px-4 py-10">
      <div className="flex flex-col items-center gap-3 text-center">
        <h1 className="sr-only">Tada!</h1>
        <Image src="/brand/wordmark.png" alt="Tada!" width={190} height={120} priority />
        <p className="max-w-xs text-fade">Plan your day, check it off, and hear the TaDa.</p>
      </div>

      <LoginForm next={next} initialError={linkError} initialMode={mode} initialEmail={email} from={from} />

      <InstallPrompt />

      <p className="max-w-xs text-center text-xs text-fade">
        New here?{" "}
        <Link href="/help" className="underline">
          See how TaDa works
        </Link>
        . By continuing you agree to the{" "}
        <Link href="/legal/terms" className="underline">
          Terms of Service
        </Link>{" "}
        and{" "}
        <Link href="/legal/privacy" className="underline">
          Privacy Policy
        </Link>
        .
      </p>
    </main>
  );
}
