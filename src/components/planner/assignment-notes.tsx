"use client";

import { useState } from "react";
import { Check, MessageSquare, Pencil, Send } from "lucide-react";
import { usePlanner } from "./store";
import { Avatar, C, inputStyle } from "./ui";
import { ago } from "@/lib/planner/calendar";
import type { Assignment } from "@/lib/planner/types";

/**
 * The back-and-forth on one piece of assigned work. Both sides can write here:
 * the member it went to and the boss who set it. A note tells the other side,
 * so a blocker doesn't sit unread and context doesn't get lost in a chat thread
 * miles from the task. Boss mode only; personal tasks have no notes.
 */
export function AssignmentNotes({ a, compact = false }: { a: Assignment; compact?: boolean }) {
  const p = usePlanner();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const notes = p.notesFor(a.id);
  const size = compact ? 10 : 11;

  const saveEdit = async (id: string) => {
    await p.editAssignmentNote(id, editText);
    setEditing(null);
  };

  const send = async () => {
    if (!text.trim() || busy) return;
    setBusy(true);
    await p.addAssignmentNote(a, text);
    setText("");
    setBusy(false);
  };

  return (
    <div className="mt-1">
      <button onClick={() => setOpen(!open)} className="flex items-center gap-1 font-semibold" style={{ fontSize: size, color: notes.length ? C.navy : C.fade }}>
        <MessageSquare size={compact ? 11 : 13} />
        {notes.length === 0 ? "Add a note" : `${notes.length} ${notes.length === 1 ? "note" : "notes"}`}
      </button>

      {open && (
        <div className="mt-1.5 rounded-xl p-2" style={{ background: C.cream }}>
          {notes.map((n) => (
            <div key={n.id} className="mb-1.5 flex gap-2">
              <Avatar src={p.avatarOf(n.userId)} name={p.nameOf(n.userId)} size={18} />
              <div className="min-w-0 flex-1">
                <div style={{ fontSize: size - 1, color: C.fade }}>
                  {n.userId === p.me.id ? "You" : p.nameOf(n.userId)} · {ago(n.createdAt)}
                  {n.edited ? " · edited" : ""}
                </div>
                {editing === n.id ? (
                  <div className="mt-0.5 flex gap-1.5">
                    <input
                      className="min-w-0 flex-1 rounded-lg border px-2 py-1"
                      style={{ ...inputStyle, fontSize: size + 1 }}
                      value={editText}
                      maxLength={1000}
                      autoFocus
                      onChange={(e) => setEditText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") void saveEdit(n.id);
                        if (e.key === "Escape") setEditing(null);
                      }}
                      aria-label="Edit note"
                    />
                    <button onClick={() => void saveEdit(n.id)} className="shrink-0" aria-label="Save note">
                      <Check size={size + 3} style={{ color: C.teal }} />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-start gap-1.5">
                    <span className="min-w-0 flex-1" style={{ fontSize: size + 1, color: C.ink, overflowWrap: "anywhere" }}>
                      {n.text}
                    </span>
                    {/* Your own words only. The row policy says the same thing. */}
                    {n.userId === p.me.id && (
                      <button
                        onClick={() => {
                          setEditing(n.id);
                          setEditText(n.text);
                        }}
                        className="shrink-0"
                        aria-label="Edit note"
                      >
                        <Pencil size={size} style={{ color: C.fade }} />
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
          {notes.length === 0 && (
            <p className="mb-1.5" style={{ fontSize: size, color: C.fade }}>
              Nothing here yet. Say where this stands, what you need, or anything the other side should know.
            </p>
          )}
          <div className="flex gap-1.5">
            <input
              className="min-w-0 flex-1 rounded-lg border px-2 py-1.5"
              style={{ ...inputStyle, fontSize: size + 1 }}
              placeholder="Add a note..."
              maxLength={1000}
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") void send();
              }}
            />
            <button onClick={() => void send()} disabled={!text.trim() || busy} className="shrink-0 rounded-lg px-2.5" style={{ background: C.navy, color: C.cream, opacity: !text.trim() || busy ? 0.5 : 1 }} aria-label="Add note">
              <Send size={compact ? 12 : 14} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
