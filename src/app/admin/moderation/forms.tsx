"use client";

import { useActionState } from "react";
import { deleteContent, resolveReport, setPinned, type AdminResult } from "../actions";
import { Notice } from "../notice";

export function ModerationForms({ reportId, postId, replyId, pinned = null, compact = false }: { reportId: string | null; postId: string | null; replyId: string | null; pinned?: boolean | null; compact?: boolean }) {
  const [delState, delAction, deleting] = useActionState<AdminResult, FormData>(deleteContent, null);
  const [resState, resAction, resolving] = useActionState<AdminResult, FormData>(resolveReport, null);
  const [pinState, pinAction, pinning] = useActionState<AdminResult, FormData>(setPinned, null);
  const btn = "rounded-xl px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-60";
  return (
    <div className={compact ? "shrink-0" : "mt-3"}>
      <div className="flex flex-wrap gap-2">
        {postId && pinned !== null && (
          <form action={pinAction}>
            <input type="hidden" name="id" value={postId} />
            <input type="hidden" name="pinned" value={pinned ? "0" : "1"} />
            <button type="submit" disabled={pinning} className={`${btn} ${pinned ? "bg-fade" : "bg-gold text-ink"}`}>
              {pinned ? "Unpin" : "Pin to the top"}
            </button>
          </form>
        )}
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
      <Notice state={delState ?? resState ?? pinState} />
    </div>
  );
}
