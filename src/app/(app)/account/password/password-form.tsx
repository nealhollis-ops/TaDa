"use client";

import { useActionState } from "react";
import { updatePassword, type PasswordState } from "./actions";

const input =
  "w-full rounded-xl border border-line bg-white px-4 py-3 text-base text-ink placeholder:text-fade/70 outline-none transition focus:border-navy focus:ring-2 focus:ring-navy/20";

export function PasswordForm() {
  const [state, formAction, pending] = useActionState<PasswordState, FormData>(updatePassword, null);

  return (
    <form action={formAction} className="flex flex-col gap-3 rounded-2xl border border-line bg-white p-6 shadow-sm">
      <input name="password" type="password" placeholder="New password (6+ characters)" autoComplete="new-password" required minLength={6} className={input} />
      <input name="confirm" type="password" placeholder="Type it again" autoComplete="new-password" required minLength={6} className={input} />
      {state?.error && <p className="rounded-lg bg-coral-soft px-3 py-2 text-sm font-medium text-coral">{state.error}</p>}
      <button
        type="submit"
        disabled={pending}
        className="mt-1 rounded-full bg-coral px-5 py-3 font-semibold text-white shadow-sm transition hover:brightness-95 disabled:opacity-60"
      >
        {pending ? "Saving…" : "Save password"}
      </button>
    </form>
  );
}
