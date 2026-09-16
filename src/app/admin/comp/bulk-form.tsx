"use client";

import { useActionState } from "react";
import { bulkComp, type AdminResult } from "../actions";
import { Notice } from "../notice";

export function BulkCompForm() {
  const [state, action, pending] = useActionState<AdminResult, FormData>(bulkComp, null);
  const input = "rounded-xl border border-line bg-white px-3 py-2 text-sm";
  return (
    <form action={action} className="mt-4 rounded-2xl border border-line bg-white p-4">
      <label className="block text-xs text-fade">
        Emails, one per line (commas and spaces work too)
        <textarea name="emails" rows={6} required className={`${input} mt-1 block w-full font-mono`} placeholder={"jane@example.com\njohn@example.com"} />
      </label>
      <div className="mt-3 flex flex-wrap items-end gap-2">
        <label className="text-xs text-fade">
          Level
          <select name="plan" defaultValue="standard" className={`${input} block`}>
            <option value="standard">Standard</option>
            <option value="teams">Teams</option>
            <option value="boss">Boss</option>
          </select>
        </label>
        <label className="text-xs text-fade">
          Expires (optional)
          <input type="date" name="expiresAt" className={`${input} block`} />
        </label>
        <label className="flex-1 text-xs text-fade">
          Note
          <input name="note" defaultValue="Faith Hub Unleashed" maxLength={200} className={`${input} block w-full`} />
        </label>
      </div>
      <label className="mt-3 flex items-center gap-2 text-sm text-ink">
        <input type="checkbox" name="sendEmail" value="1" defaultChecked />
        Email a signup link to people who don&rsquo;t have an account yet
      </label>
      <button type="submit" disabled={pending} className="mt-3 rounded-xl bg-teal px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">
        {pending ? "Granting..." : "Grant to everyone on the list"}
      </button>
      <Notice state={state} />
    </form>
  );
}
