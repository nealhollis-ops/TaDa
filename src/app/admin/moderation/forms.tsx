"use client";

import { useActionState } from "react";
import { deleteContent, resolveReport, type AdminResult } from "../actions";
import { Notice } from "../notice";

export function ModerationForms({ reportId, postId, replyId, compact = false }: { reportId: string | null; postId: string | null; replyId: string | null; compact?: boolean }) {
  const [delState, delAction, deleting] = useActionState<AdminResult, FormData>(deleteContent, null);
  const [resState, resAction, resolving] = useActionState<AdminResult, FormData>(resolveReport, null);
  const btn = "rounded-xl px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-60";
  return (
    <div className={compact ? "shrink-0" : "mt-3"}>
      <div className="flex flex-wrap gap-2">
        {(postId || replyId) && (
          <form action={delAction}>
            <input type="hidden" name="kind" value={postId ? "post" : "reply"} />
            <input type="hidden" name="id" value={postId ?? replyId ?? ""} />
            {reportId && <input type="hidden" name="reportId" value={reportId} />}
            <button type="submit" disabled={deleting} className={`${btn} bg-coral`}>
              Remove {postId ? "post" : "reply"}
            </button>
          </form>
        )}
        {reportId && (
          <>
            <form action={resAction}>
              <input type="hidden" name="reportId" value={reportId} />
              <input type="hidden" name="status" value="reviewed" />
              <button type="submit" disabled={resolving} className={`${btn} bg-navy`}>
                Mark reviewed
              </button>
            </form>
            <form action={resAction}>
              <input type="hidden" name="reportId" value={reportId} />
              <input type="hidden" name="status" value="dismissed" />
              <button type="submit" disabled={resolving} className={`${btn} bg-fade`}>
                Dismiss
              </button>
            </form>
          </>
        )}
      </div>
      <Notice state={delState ?? resState} />
    </div>
  );
}
