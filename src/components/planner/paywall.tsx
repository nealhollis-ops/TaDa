"use client";

import { useState } from "react";
import type { Billing } from "@/lib/auth";
import type { Plan } from "@/lib/planner/types";
import { C } from "./ui";

const PLANS: { id: Plan; name: string; monthly: number; yearly: number; blurb: string; bullets: string[] }[] = [
  { id: "standard", name: "Standard", monthly: 17, yearly: 170, blurb: "The full planner for one focused person.", bullets: ["Today, Plan, Timeline", "Brain dump and the talking calendar", "Celebrations, streaks, badges, levels", "The community", "One accountability partner"] },
  { id: "teams", name: "Teams", monthly: 27, yearly: 270, blurb: "Everything in Standard, plus your people.", bullets: ["Unlimited accountability partners", "Named teams with their own room", "Team progress view"] },
  { id: "boss", name: "Boss", monthly: 97, yearly: 970, blurb: "Everything in Teams, plus boss powers.", bullets: ["Assign work with deadlines", "See every assignment and its status", "7 member seats included, $9 each after"] },
];

/** Shown instead of the app when a member has no active plan. */
export function Paywall({ name, billing }: { name: string; billing: Billing | null }) {
  const [interval, setInterval] = useState<"monthly" | "yearly">("monthly");
  const [busy, setBusy] = useState<Plan | null>(null);
  const [error, setError] = useState<string | null>(null);
  const ended = billing?.source === "stripe";

  const go = async (plan: Plan) => {
    setBusy(plan);
    setError(null);
    try {
      const res = await fetch("/api/stripe/checkout", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ plan, interval }) });
      const data = await res.json();
      if (!res.ok || !data.url) throw new Error(data.error || "Checkout didn't open.");
      window.location.assign(data.url);
    } catch (e) {
      setError((e as Error).message);
      setBusy(null);
    }
  };

  return (
    <div className="min-h-screen px-5 py-8" style={{ background: C.cream }}>
      <div className="mx-auto max-w-md">
        <div className="text-center" style={{ fontFamily: "Georgia, serif", fontStyle: "italic", fontSize: 36, color: C.navy }}>
          TaDa<span style={{ color: C.coral }}>!</span>
        </div>
        <h1 className="mt-3 text-center text-xl font-bold" style={{ color: C.navy }}>
          {ended ? `Welcome back, ${name}.` : `Hi ${name}. Pick your plan.`}
        </h1>
        <p className="mt-1 text-center text-sm" style={{ color: C.fade }}>
          {ended
            ? "Your subscription has ended. Pick a plan to open your planner again. Everything you built is still here."
            : "Every plan starts with 14 days free. Add a card now, pay nothing until day 15, cancel any time before that and you owe nothing."}
        </p>

        <div className="mx-auto mt-5 grid w-fit grid-cols-2 rounded-xl p-1 text-sm font-semibold" style={{ background: "#fff" }}>
          {(["monthly", "yearly"] as const).map((i) => (
            <button key={i} onClick={() => setInterval(i)} className="rounded-lg px-4 py-2" style={{ background: interval === i ? C.navy : "transparent", color: interval === i ? C.cream : C.ink }}>
              {i === "monthly" ? "Monthly" : "Yearly, 2 months free"}
            </button>
          ))}
        </div>

        {error && (
          <p className="mt-4 rounded-xl px-3 py-2 text-center text-sm font-medium" style={{ background: "#FFE4E9", color: C.coral }}>
            {error}
          </p>
        )}

        <div className="mt-5 flex flex-col gap-3">
          {PLANS.map((p) => (
            <div key={p.id} className="rounded-2xl p-4" style={{ background: "#fff", border: p.id === "standard" ? `2px solid ${C.gold}` : `1px solid ${C.line}` }}>
              <div className="flex items-baseline justify-between">
                <span className="text-lg font-bold" style={{ color: C.navy }}>
                  {p.name}
                </span>
                <span className="text-sm" style={{ color: C.ink }}>
                  <span className="text-xl font-extrabold">${interval === "monthly" ? p.monthly : p.yearly}</span> / {interval === "monthly" ? "month" : "year"}
                </span>
              </div>
              <p className="mt-1 text-sm" style={{ color: C.fade }}>
                {p.blurb}
              </p>
              <ul className="mt-2 space-y-1 text-sm" style={{ color: C.ink }}>
                {p.bullets.map((b) => (
                  <li key={b}>• {b}</li>
                ))}
              </ul>
              <button onClick={() => void go(p.id)} disabled={busy !== null} className="mt-3 w-full rounded-xl py-2.5 font-semibold" style={{ background: p.id === "standard" ? C.coral : C.navy, color: "#fff", opacity: busy && busy !== p.id ? 0.6 : 1 }}>
                {busy === p.id ? "Opening checkout..." : ended ? `Restart on ${p.name}` : `Start 14 days free on ${p.name}`}
              </button>
            </div>
          ))}
        </div>

        <p className="mt-5 text-center text-xs" style={{ color: C.fade }}>
          Upgrades prorate automatically. Manage or cancel any time from Account.
          <br />
          Part of Faith Hub Unleashed? Your access is complimentary; write to clientcare@gettada.me if you see this screen.
        </p>
        <form action="/auth/signout" method="post" className="mt-4 text-center">
          <button type="submit" className="text-xs underline" style={{ color: C.fade }}>
            Sign out
          </button>
        </form>
      </div>
    </div>
  );
}
