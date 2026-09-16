"use client";

import { useActionState, useState } from "react";
import { authAction, type AuthMode, type AuthState } from "./actions";

const MODES: { id: AuthMode; label: string }[] = [
  { id: "signin", label: "Sign in" },
  { id: "signup", label: "Create account" },
];

const input =
  "w-full rounded-xl border border-line bg-white px-4 py-3 text-base text-ink placeholder:text-fade/70 outline-none transition focus:border-navy focus:ring-2 focus:ring-navy/20";

export function LoginForm({
  next,
  initialError,
  initialMode,
  initialEmail,
}: {
  next?: string;
  initialError?: string;
  initialMode?: string;
  initialEmail?: string;
}) {
  const [mode, setMode] = useState<AuthMode>(
    initialMode === "signup" || initialMode === "magic" || initialMode === "forgot" ? initialMode : "signin",
  );
  const [state, formAction, pending] = useActionState<AuthState, FormData>(authAction, null);
  const error = state?.error ?? (state ? undefined : initialError);
  const message = state?.message;

  const needsPassword = mode === "signin" || mode === "signup";
  const primaryLabel = { signin: "Sign in", signup: "Create my account", magic: "Email me a magic link", forgot: "Send reset link" }[mode];

  return (
    <div className="w-full max-w-sm rounded-2xl border border-line bg-white p-6 shadow-sm">
      {/* Sign in / Create account switch */}
      <div className="mb-5 grid grid-cols-2 rounded-xl bg-mist p-1 text-sm font-semibold">
        {MODES.map((m) => {
          const active = mode === m.id || (m.id === "signin" && (mode === "magic" || mode === "forgot"));
          return (
            <button
              key={m.id}
              type="button"
              onClick={() => setMode(m.id)}
              className={`rounded-lg py-2 transition ${active ? "bg-white text-navy shadow-sm" : "text-fade hover:text-ink"}`}
            >
              {m.label}
            </button>
          );
        })}
      </div>

      <form action={formAction} className="flex flex-col gap-3">
        <input type="hidden" name="mode" value={mode} />
        <input type="hidden" name="next" value={next ?? "/today"} />

        {mode === "signup" && (
          <input name="name" placeholder="Your first name" autoComplete="given-name" maxLength={40} className={input} />
        )}

        <input
          name="email"
          type="email"
          placeholder="Email"
          autoComplete="email"
          required
          inputMode="email"
          defaultValue={initialEmail ?? ""}
          className={input}
        />

        {needsPassword && (
          <input
            name="password"
            type="password"
            placeholder={mode === "signup" ? "Choose a password (6+ characters)" : "Password"}
            autoComplete={mode === "signup" ? "new-password" : "current-password"}
            required
            minLength={6}
            className={input}
          />
        )}

        {mode === "magic" && (
          <p className="text-sm text-fade">We&rsquo;ll email you a link. Tap it on this device and you&rsquo;re in, no password needed.</p>
        )}
        {mode === "forgot" && <p className="text-sm text-fade">We&rsquo;ll email you a link to set a new password.</p>}

        {error && <p className="rounded-lg bg-coral-soft px-3 py-2 text-sm font-medium text-coral">{error}</p>}
        {message && <p className="rounded-lg bg-gold-soft px-3 py-2 text-sm font-medium text-gold-deep">{message}</p>}

        <button
          type="submit"
          disabled={pending}
          className="mt-1 rounded-full bg-coral px-5 py-3 text-base font-semibold text-white shadow-sm transition hover:brightness-95 disabled:opacity-60"
        >
          {pending ? "One moment…" : primaryLabel}
        </button>
      </form>

      <div className="mt-4 flex flex-col items-center gap-2 text-sm">
        {mode === "signin" && (
          <>
            <button type="button" onClick={() => setMode("magic")} className="font-semibold text-navy hover:underline">
              Email me a magic link instead
            </button>
            <button type="button" onClick={() => setMode("forgot")} className="text-fade hover:text-ink hover:underline">
              Forgot your password?
            </button>
          </>
        )}
        {(mode === "magic" || mode === "forgot") && (
          <button type="button" onClick={() => setMode("signin")} className="text-fade hover:text-ink hover:underline">
            Back to password sign in
          </button>
        )}
        {mode === "signup" && (
          <p className="text-center text-xs text-fade">
            By creating an account you agree to the Terms of Service and Privacy Policy. You must be 13 or older.
          </p>
        )}
      </div>
    </div>
  );
}
