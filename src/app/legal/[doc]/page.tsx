import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { DOCS } from "../content";

export async function generateMetadata({ params }: { params: Promise<{ doc: string }> }) {
  const { doc } = await params;
  return { title: DOCS[doc]?.title ?? "Legal" };
}

const NAV: { href: string; label: string; key: string }[] = [
  { href: "/legal/terms", label: "Terms", key: "terms" },
  { href: "/legal/privacy", label: "Privacy", key: "privacy" },
  { href: "/legal/refunds", label: "Refunds", key: "refunds" },
];

/** Renders one paragraph or, for a run of "- " lines, one bulleted list. */
function Body({ body }: { body: string[] }) {
  const out: React.ReactNode[] = [];
  let bullets: string[] = [];
  const flush = () => {
    if (!bullets.length) return;
    out.push(
      <ul key={`ul-${out.length}`} className="mt-3 list-disc space-y-1.5 pl-5 leading-relaxed text-ink">
        {bullets.map((b, i) => (
          <li key={i}>{b}</li>
        ))}
      </ul>,
    );
    bullets = [];
  };
  body.forEach((line, i) => {
    if (line.startsWith("- ")) {
      bullets.push(line.slice(2));
      return;
    }
    flush();
    out.push(
      <p key={`p-${i}`} className="mt-3 leading-relaxed text-ink">
        {line}
      </p>,
    );
  });
  flush();
  return <>{out}</>;
}

export default async function LegalPage({ params }: { params: Promise<{ doc: string }> }) {
  const { doc } = await params;
  const d = DOCS[doc];
  if (!d) notFound();
  return (
    <main className="mx-auto max-w-2xl px-5 py-10">
      <Link href="/today" className="inline-block" aria-label="Back to TaDa">
        <Image src="/brand/wordmark.png" alt="Tada!" width={95} height={60} priority />
      </Link>
      <nav className="mt-6 flex gap-4 text-sm">
        {NAV.map((n) => (
          <Link key={n.key} href={n.href} className={n.key === doc ? "font-semibold text-ink underline" : "text-fade underline"}>
            {n.label}
          </Link>
        ))}
      </nav>
      <h1 className="mt-4 text-3xl font-extrabold text-navy">{d.title}</h1>
      <p className="mt-1 text-sm text-fade">Last updated {d.updated}</p>
      {d.intro.map((p, i) => (
        <p key={i} className="mt-4 leading-relaxed text-ink">
          {p}
        </p>
      ))}
      {d.sections.map((s) => (
        <section key={s.h} className="mt-8">
          <h2 className="text-lg font-bold text-navy">{s.h}</h2>
          <Body body={s.body} />
        </section>
      ))}
      <p className="mt-10 border-t border-line pt-6 text-sm text-fade">
        <Link href="/today" className="underline">
          Back to TaDa
        </Link>
        {" · "}
        <Link href="/help" className="underline">
          How TaDa works
        </Link>
      </p>
    </main>
  );
}
