"use client";

import type { AdminResult } from "./actions";

export function Notice({ state }: { state: AdminResult }) {
  if (!state) return null;
  return <p className={`mt-2 rounded-lg px-3 py-2 text-sm font-medium ${state.ok ? "bg-gold-soft text-gold-deep" : "bg-coral-soft text-coral"}`}>{state.message}</p>;
}
