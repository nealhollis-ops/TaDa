import Link from "next/link";
import Image from "next/image";
import { HELP } from "@/lib/planner/content";

export const metadata = {
  title: "How TaDa works",
  description: "Everything about using TaDa: adding tasks, the brain dump, celebrations, streaks, partners, teams, the community, and your account.",
};

/**
 * Public user guide. Built from the same HELP content the Account screen shows,
 * so the two can never drift apart. Readable without signing in.
 */

const FIRST_DAY = [
  { t: "Sign in", d: "Open app.gettada.me, enter your email, and use the magic link or your password. Pick a plan and add a card: your first 14 days are free, nothing is charged until day 15, and cancelling before then costs nothing." },
  { t: "Put it on your phone", d: "In Account, scroll to Install TaDa on this phone and follow the two taps for Android or iPhone. It becomes a real app with its own icon." },
  { t: "Add three things", d: "Go to Plan, tap Add task, and add what's on your plate. Or open Pour it all out, type the whole jumble, and let TaDa sort it into tasks." },
  { t: "Check one off", d: "Back on Today, tap the circle beside a task. Fireworks, Deb's TaDa, and your streak starts." },
  { t: "Find a partner", d: "On Partners, ask someone to be your accountability partner. They see your progress numbers, never your tasks, and you keep each other honest." },
];

/** "Q: ... / A: ..." pairs render as a definition list; everything else is a paragraph. */
function Body({ body }: { body: string[] }) {
  const out: React.ReactNode[] = [];
  for (let i = 0; i < body.length; i++) {
    const line = body[i];
    if (line.startsWith("Q: ") && body[i + 1]?.startsWith("A: ")) {
      out.push(
        <div key={i} className="mt-3">
          <p className="font-semibold text-navy">{line.slice(3)}</p>
          <p className="mt-1 leading-relaxed text-ink">{body[i + 1].slice(3)}</p>
        </div>,
      );
      i += 1;
      continue;
    }
    out.push(
      <p key={i} className="mt-3 leading-relaxed text-ink">
        {line}
      </p>,
    );
  }
  return <>{out}</>;
}

export default function HelpPage() {
  return (
    <main className="mx-auto max-w-2xl px-5 py-10">
      <Link href="/today" className="inline-block" aria-label="Open TaDa">
        <Image src="/brand/wordmark.png" alt="Tada!" width={95} height={60} priority />
      </Link>
      <h1 className="mt-6 text-3xl font-extrabold text-navy">How TaDa works</h1>
      <p className="mt-2 leading-relaxed text-fade">
        TaDa is a daily planner that celebrates with you. Plan the month, work the day, hear the TaDa when you check something off, and keep an accountability partner in the loop. This page is the whole manual. It is the same text you will find under Help in your Account.
      </p>

      <section className="mt-8 rounded-2xl bg-white p-5">
        <h2 className="text-lg font-bold text-navy">Your first day, in five steps</h2>
        <ol className="mt-3 space-y-3">
          {FIRST_DAY.map((s, i) => (
            <li key={s.t} className="flex gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-coral text-xs font-bold text-white">{i + 1}</span>
              <div>
                <p className="font-semibold text-ink">{s.t}</p>
                <p className="mt-0.5 text-sm leading-relaxed text-fade">{s.d}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <nav className="mt-8 rounded-2xl border border-line bg-white p-5">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-fade">On this page</h2>
        <ul className="mt-2 grid gap-1 text-sm sm:grid-cols-2">
          {HELP.map((h) => (
            <li key={h.id}>
              <a href={`#${h.id}`} className="text-navy underline">
                {h.t}
              </a>
            </li>
          ))}
        </ul>
      </nav>

      {HELP.map((h) => (
        <section key={h.id} id={h.id} className="mt-8 scroll-mt-6">
          <h2 className="text-xl font-bold text-navy">{h.t}</h2>
          <Body body={h.b} />
        </section>
      ))}

      <section className="mt-10 rounded-2xl bg-navy p-5 text-white">
        <h2 className="text-lg font-bold">Still stuck?</h2>
        <p className="mt-1 text-sm leading-relaxed" style={{ color: "#CFCFCF" }}>
          Email clientcare@gettada.me and a real person will help. For plans and billing, see{" "}
          <Link href="/legal/refunds" className="underline">
            the refund policy
          </Link>
          . For what we collect and why, see{" "}
          <Link href="/legal/privacy" className="underline">
            the privacy policy
          </Link>
          .
        </p>
      </section>

      <p className="mt-8 text-sm text-fade">
        <Link href="/today" className="underline">
          Open TaDa
        </Link>
        {" · "}
        <Link href="/legal/terms" className="underline">
          Terms
        </Link>
        {" · "}
        <Link href="/legal/privacy" className="underline">
          Privacy
        </Link>
      </p>
    </main>
  );
}
