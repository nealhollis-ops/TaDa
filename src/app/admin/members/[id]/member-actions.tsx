"use client";

import { useActionState } from "react";
import { grantComp, removeComp, setBan, type AdminResult } from "../../actions";
import { Notice } from "../../notice";

type Comp = { plan: string; expires_at: string | null; note: string | null } | null;

export function MemberActions({ userId, isAdmin, banned, comp }: { userId: string; isAdmin: boolean; banned: boolean; comp: Comp }) {
  const [grantState, grantAction, granting] = useActionState<AdminResult, FormData>(grantComp, null);
  const [removeState, removeAction, removing] = useActionState<AdminResult, FormData>(removeComp, null);
  const [banState, banAction, banning] = useActionState<AdminResult, FormData>(setBan, null);
  const input = "rounded-xl border border-line bg-white px-3 py-2 text-sm";

  return (
    <div className="mt-4 grid gap-4 md:grid-cols-2">
      <section className="rounded-2xl border border-line bg-white p-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-fade">Comp grant</h2>
        <p className="mt-1 text-xs text-fade">Free access at any level. Source is comp, so billing never touches it. Leave the date empty for no expiry.</p>
        <form action={grantAction} className="mt-3 flex flex-wrap items-end gap-2">
          <input type="hidden" name="userId" value={userId} />
          <label className="text-xs text-fade">
            Level
            <select name="plan" defaultValue={comp?.plan ?? "standard"} className={`${input} block`}>
              <option value="standard">Standard</option>
              <option value="teams">Teams</option>
              <option value="boss">Boss</option>
            </select>
          </label>
          <label className="text-xs text-fade">
            Expires
            <input type="date" name="expiresAt" defaultValue={comp?.expires_at?.slice(0, 10) ?? ""} className={`${input} block`} />
          </label>
          <label className="flex-1 text-xs text-fade">
            Note
            <input name="note" defaultValue={comp?.note ?? "Faith Hub Unleashed"} maxLength={200} className={`${input} block w-full`} />
          </label>
          <button type="submit" disabled={granting} className="rounded-xl bg-teal px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">
            {comp ? "Update comp" : "Grant comp"}
          </button>
        </form>
        <Notice state={grantState} />
        {comp && (
          <form action={removeAction} className="mt-2">
            <input type="hidden" name="userId" value={userId} />
            <button type="submit" disabled={removing} className="text-xs text-coral underline disabled:opacity-60">
              Remove comp
            </button>
            <Notice state={removeState} />
          </form>
        )}
      </section>

      <section className="rounded-2xl border border-line bg-white p-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-fade">Moderation</h2>
        {isAdmin ? (
          <p className="mt-2 text-sm text-fade">Admins cannot be banned from here.</p>
        ) : (
          <form action={banAction} className="mt-3">
            <input type="hidden" name="userId" value={userId} />
            <input type="hidden" name="ban" value={banned ? "0" : "1"} />
            <p className="mb-2 text-xs text-fade">
              {banned ? "Lifting the ban lets them sign in again. Their earlier posts stay hidden." : "Banning locks them out immediately and hides every post and reply they wrote. Their subscription is not changed; cancel it in Stripe if needed."}
            </p>
            <button type="submit" disabled={banning} className={`rounded-xl px-4 py-2 text-sm font-semibold text-white disabled:opacity-60 ${banned ? "bg-teal" : "bg-coral"}`}>
              {banned ? "Lift ban" : "Ban this member"}
            </button>
            <Notice state={banState} />
          </form>
        )}
      </section>
    </div>
  );
}
