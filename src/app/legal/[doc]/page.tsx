import Link from "next/link";
import { notFound } from "next/navigation";

const DOCS: Record<string, { title: string; body: string[] }> = {
  terms: {
    title: "Terms of Service",
    body: [
      "TaDa is a personal planning app made by Data Forge Media. By creating an account you agree to use it for your own planning and to treat other members with respect.",
      "You must be 13 or older to use TaDa.",
      "Full terms, including billing and cancellation details, are published before public launch. Questions: clientcare@gettada.me.",
    ],
  },
  privacy: {
    title: "Privacy Policy",
    body: [
      "Your tasks are yours. Nobody else, partner or teammate included, can see your task list. Partners and teammates see progress numbers only. In a boss team, the boss sees the work the boss assigned.",
      "We store your account email, name, optional photo and bio, your tasks, and your activity so the app works. We never sell your data.",
      "The full policy is published before public launch. Questions: clientcare@gettada.me.",
    ],
  },
  refunds: {
    title: "Refund Policy",
    body: [
      "Every new account starts with 14 days free. Cancel any time from your account and you will not be charged again.",
      "If something went wrong with a charge, write to clientcare@gettada.me and a real person will sort it out.",
    ],
  },
};

export async function generateMetadata({ params }: { params: Promise<{ doc: string }> }) {
  const { doc } = await params;
  return { title: DOCS[doc]?.title ?? "Legal" };
}

export default async function LegalPage({ params }: { params: Promise<{ doc: string }> }) {
  const { doc } = await params;
  const d = DOCS[doc];
  if (!d) notFound();
  return (
    <main className="mx-auto max-w-xl px-5 py-10">
      <h1 className="text-2xl font-extrabold text-navy">{d.title}</h1>
      {d.body.map((p, i) => (
        <p key={i} className="mt-4 leading-relaxed text-ink">
          {p}
        </p>
      ))}
      <p className="mt-8 text-sm text-fade">
        <Link href="/today" className="underline">
          Back to TaDa
        </Link>
      </p>
    </main>
  );
}
