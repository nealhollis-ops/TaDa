"use client";

import { useActionState, useState } from "react";
import { useRouter } from "next/navigation";
import { cancelSubscription, deleteMember, grantComp, removeComp, setBan, type AdminResult } from "../../actions";
import { Notice } from "../../notice";

type Comp = { plan: string; expires_at: string | null; note: string | null } | null;
type Sub = { plan: string; status: string; cancelAtPeriodEnd: boolean } | null;

export function MemberActions({ userId, email, isAdmin, banned, comp, sub }: { userId: string; email: string; isAdmin: boolean; banned: boolean; comp: Comp; sub: Sub }) {
  const [grantState, grantAction, granting] = useActionState<AdminResult, FormData>(grantComp, null);
  const [removeState, removeAction, removing] = useActionState<AdminResult, FormData>(removeComp, null);
  const [banState, banAction, banning] = useActionState<AdminResult, FormData>(setBan, null);
  const [cancelState, cancelAction, cancelling] = useActionState<AdminResult, FormData>(cancelSubscription, null);
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
        <h2 className="text-sm font-semibold uppercase tracking-wide text-fade">Subscription</h2>
        {!sub ? (
          <p className="mt-2 text-sm text-fade">No Stripe subscription. Paid access, if any, comes from a comp or admin grant.</p>
        ) : sub.cancelAtPeriodEnd ? (
          <p className="mt-2 text-sm text-fade">
            {sub.plan} subscription is <b>{sub.status}</b> and already set to end at the close of this period.
          </p>
        ) : (
          <div className="mt-2">
            <p className="text-sm text-ink">
              {sub.plan} subscription, <b>{sub.status}</b>.
            </p>
            <p className="mt-1 text-xs text-fade">Cancelling here does the same as cancelling in Stripe. Stripe confirms through the webhook and their access updates within a minute. Refunds are still done in Stripe.</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <form action={cancelAction}>
                <input type="hidden" name="userId" value={userId} />
                <input type="hidden" name="when" value="end" />
                <button type="submit" disabled={cancelling} className="rounded-xl bg-navy px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">
                  Cancel at period end
                </button>
              </form>
              <form action={cancelAction}>
                <input type="hidden" name="userId" value={userId} />
                <input type="hidden" name="when" value="now" />
                <button type="submit" disabled={cancelling} className="rounded-xl bg-coral px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">
                  Cancel now
                </button>
              </form>
            </div>
          </div>
        )}
        <Notice state={cancelState} />
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
              {banned ? "Lifting the ban lets them sign in again. Their earlier posts stay hidden." : "Banning locks them out immediately and hides every post and reply they wrote. Their subscription is not changed; use the Subscription card if it should stop."}
            </p>
            <button type="submit" disabled={banning} className={`rounded-xl px-4 py-2 text-sm font-semibold text-white disabled:opacity-60 ${banned ? "bg-teal" : "bg-coral"}`}>
              {banned ? "Lift ban" : "Ban this member"}
            </button>
            <Notice state={banState} />
          </form>
        )}
      </section>

      <DeleteCard userId={userId} email={email} isAdmin={isAdmin} hasSub={!!sub && !sub.cancelAtPeriodEnd} />
    </div>
  );
}

/** Permanent removal, gated behind typing "delete". Sends the admin back to the list on success. */
function DeleteCard({ userId, email, isAdmin, hasSub }: { userId: string; email: string; isAdmin: boolean; hasSub: boolean }) {
  const router = useRouter();
  const [confirm, setConfirm] = useState("");
  const [state, action, pending] = useActionState<AdminResult, FormData>(async (prev, fd) => {
    const res = await deleteMember(prev, fd);
    if (res?.ok) router.push("/admin/members");
    return res;
  }, null);
  return (
    <section className="rounded-2xl border border-coral bg-white p-4">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-coral">Delete this member</h2>
      {isAdmin ? (
        <p className="mt-2 text-sm text-fade">Admins cannot be deleted from here.</p>
      ) : (
        <form action={action} className="mt-2">
          <input type="hidden" name="userId" value={userId} />
          <p className="text-xs text-fade">
            Removes their sign-in, profile, tasks, stats, messages, posts and replies for good. There is no undo.
            {hasSub && " Their Stripe subscription is cancelled first so nothing bills afterwards."} Use Ban instead if you may want them back.
          </p>
          <label className="mt-3 block text-xs text-fade">
            Type <b>delete</b> to confirm removing {email}
            <input name="confirm" value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="off" className="mt-1 block w-full rounded-xl border border-line bg-white px-3 py-2 text-sm" />
          </label>
          <button type="submit" disabled={pending || confirm.trim().toLowerCase() !== "delete"} className="mt-3 rounded-xl bg-coral px-4 py-2 text-sm font-semibold text-white disabled:opacity-40">
            {pending ? "Deleting..." : "Delete member"}
          </button>
          <Notice state={state} />
        </form>
      )}
    </section>
  );
}
