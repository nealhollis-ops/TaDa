"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { usePlanner } from "@/components/planner/store";
import { C } from "@/components/planner/ui";
import { acceptInvite } from "@/lib/data/social";

type Preview = { team_id: string; team_name: string; team_kind: "standard" | "boss"; inviter_name: string; email: string; expired: boolean };

export function InviteClient({ token }: { token: string }) {
  const p = usePlanner();
  const router = useRouter();
  const [preview, setPreview] = useState<Preview | null | undefined>(undefined);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    p.sb
      .rpc("team_invite_preview", { p_token: token })
      .then(({ data }) => setPreview(((data as Preview[] | null) ?? [])[0] ?? null));
  }, [p.sb, token]);

  const join = async () => {
    setBusy(true);
    setError(null);
    try {
      await acceptInvite(p.sb, token);
      await p.refreshShared();
      router.replace("/partners");
    } catch (e) {
      setError((e as { message?: string }).message ?? "That invitation didn't work.");
      setBusy(false);
    }
  };

  return (
    <div className="px-5 py-8">
      <div className="rounded-2xl p-5" style={{ background: "#fff", border: `2px solid ${C.gold}` }}>
        {preview === undefined ? (
          <p className="text-sm" style={{ color: C.fade }}>
            Checking your invitation...
          </p>
        ) : !preview || preview.expired ? (
          <>
            <h1 className="mb-2 text-lg font-bold" style={{ color: C.navy }}>
              This invitation has expired
            </h1>
            <p className="text-sm" style={{ color: C.fade }}>
              Ask the team owner to send a fresh one. Invitations last 14 days.
            </p>
          </>
        ) : (
          <>
            <h1 className="mb-1 text-lg font-bold" style={{ color: C.navy }}>
              Join {preview.team_name}
            </h1>
            <p className="mb-3 text-sm" style={{ color: C.ink }}>
              {preview.inviter_name} invited you{preview.email.toLowerCase() !== p.me.email.toLowerCase() ? ` (sent to ${preview.email})` : ""}.
            </p>
            {preview.team_kind === "boss" && (
              <p className="mb-3 text-xs" style={{ color: C.fade }}>
                Boss team: the owner assigns tasks, sees their status, and sets deadlines. Hidden and private settings don&rsquo;t apply inside this team, and your signup email is shared with the team owner. Your personal task list stays yours.
              </p>
            )}
            {error && (
              <p className="mb-2 text-sm font-medium" style={{ color: C.coral }}>
                {error}
              </p>
            )}
            <div className="flex gap-2">
              <button onClick={() => router.replace("/partners")} className="flex-1 rounded-xl py-2.5 text-sm font-semibold" style={{ background: "#EDF3F2", color: C.ink }}>
                Not now
              </button>
              <button onClick={() => void join()} disabled={busy} className="flex-1 rounded-xl py-2.5 text-sm font-semibold" style={{ background: C.teal, color: "#fff", opacity: busy ? 0.7 : 1 }}>
                {busy ? "Joining..." : "Join the team"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
