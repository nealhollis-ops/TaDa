"use client";

import { useState } from "react";
import { Check, ChevronDown, ChevronRight, Pencil, X } from "lucide-react";
import { usePlanner } from "./store";
import { C, inputStyle } from "./ui";
import type { Team } from "@/lib/planner/types";

/**
 * The buckets a boss sorts assigned work into. Owner only: a member sees the
 * category on their own task and nothing else, which the row policy and a
 * trigger both enforce, so this card simply is not rendered for them.
 *
 * Suggestions are offers rather than rows. A brand new team starts at zero of
 * ten, and a boss who ignores them is left with a clean list instead of a
 * handful of names to delete.
 */

/** Offered a few at a time, in this order, never all at once. */
const SUGGESTED = ["Content", "Admin", "Marketing", "Follow-up", "Events"];

/** How many suggestions are on offer at once. */
const OFFERS_SHOWN = 3;

/** Ten colours, so a category keeps its own as others come and go. */
export const CATEGORY_TINTS = ["#F8B018", "#12B76A", "#E30022", "#7A5200", "#0B6B3A", "#B00018", "#333333", "#F0997B", "#5DCAA5", "#D4537E"];

export const tintOf = (n: number) => CATEGORY_TINTS[((n % 10) + 10) % 10];

export function CategoriesCard({ t }: { t: Team }) {
  const p = usePlanner();
  const cats = p.categoriesOf(t.id);
  const [draft, setDraft] = useState("");
  const [editing, setEditing] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  // Setting categories up is a once-in-a-while job, so it folds away. A team
  // with none yet opens it, because a boss cannot keep a section they have
  // never seen; a team that has them keeps it shut and out of the way.
  const [open, setOpen] = useState(() => p.categoriesOf(t.id).length === 0);

  const taken = new Set(cats.map((c) => c.name.toLowerCase()));
  const full = cats.length >= 10;
  // Three at a time, not the whole list. The card is at its longest the first
  // time it is opened, which is exactly when a boss knows least about what it
  // is for, so a wall of dashed rows reads as work to get through. The rest
  // surface one at a time as categories get made, and never past ten.
  const offers = SUGGESTED.filter((s) => !taken.has(s.toLowerCase())).slice(0, Math.min(OFFERS_SHOWN, 10 - cats.length));

  const add = (name: string) => {
    if (full) return;
    void p.addCategory(t.id, name);
    setDraft("");
  };

  const saveEdit = (id: string) => {
    void p.renameCategory(id, editText);
    setEditing(null);
  };

  return (
    <>
      <button onClick={() => setOpen(!open)} className="mb-2 mt-3 flex w-full items-center gap-1.5 text-xs font-bold uppercase" style={{ color: C.coral, letterSpacing: 0.5 }} aria-expanded={open}>
        {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        Categories
        <span className="ml-auto normal-case" style={{ fontWeight: 600, color: C.fade, letterSpacing: 0 }}>
          {cats.length ? cats.map((c) => c.name).join(", ") : "none yet"}
        </span>
      </button>
      {open && (
    <div className="mb-2 rounded-xl p-3" style={{ background: C.cream }}>
      <p className="mb-2 text-xs" style={{ color: C.fade }}>
        Up to 10. Tap a suggestion to keep it, or write your own. Deleting one leaves its tasks under No category.
      </p>

      {cats.map((c) => (
        <div key={c.id} className="mb-1.5 flex items-center gap-2 rounded-lg px-2.5 py-2" style={{ background: "#fff" }}>
          <span className="shrink-0 rounded-full" style={{ width: 9, height: 9, background: tintOf(c.tint) }} />
          {editing === c.id ? (
            <>
              <input
                className="min-w-0 flex-1 rounded-md border px-2 py-1 text-xs outline-none"
                style={inputStyle}
                value={editText}
                maxLength={32}
                autoFocus
                onChange={(e) => setEditText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") saveEdit(c.id);
                  if (e.key === "Escape") setEditing(null);
                }}
                aria-label="Category name"
              />
              <button onClick={() => saveEdit(c.id)} aria-label="Save name">
                <Check size={14} style={{ color: C.teal }} />
              </button>
            </>
          ) : (
            <>
              <span className="min-w-0 flex-1 text-xs" style={{ color: C.ink, overflowWrap: "anywhere" }}>
                {c.name}
              </span>
              <button
                onClick={() => {
                  setEditing(c.id);
                  setEditText(c.name);
                }}
                aria-label={`Rename ${c.name}`}
              >
                <Pencil size={13} style={{ color: C.fade }} />
              </button>
              <button onClick={() => void p.removeCategory(c.id)} aria-label={`Delete ${c.name}`}>
                <X size={14} style={{ color: C.fade }} />
              </button>
            </>
          )}
        </div>
      ))}

      {!full &&
        offers.map((name) => (
          <div key={name} className="mb-1.5 flex items-center gap-2 rounded-lg px-2.5 py-2" style={{ background: "#fff", border: `1px dashed ${C.line}` }}>
            <span className="shrink-0 rounded-full" style={{ width: 9, height: 9, background: C.line }} />
            <span className="min-w-0 flex-1 text-xs italic" style={{ color: C.fade }}>
              {name}
            </span>
            <button onClick={() => add(name)} className="shrink-0 text-[10px] font-bold" style={{ color: C.coral }}>
              Keep
            </button>
          </div>
        ))}

      {!full && (
        <div className="mt-2 flex gap-1.5">
          <input
            className="min-w-0 flex-1 rounded-lg border px-2.5 py-2 text-xs outline-none"
            style={inputStyle}
            placeholder="Name a category..."
            maxLength={32}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") add(draft);
            }}
            aria-label="New category name"
          />
          <button onClick={() => add(draft)} disabled={!draft.trim()} className="shrink-0 rounded-lg px-3 text-xs font-semibold" style={{ background: C.coral, color: "#fff", opacity: draft.trim() ? 1 : 0.5 }}>
            Add
          </button>
        </div>
      )}

      <div className="mt-2" style={{ fontSize: 10, color: C.fade }}>
        {cats.length} of 10 used{full ? " - remove one to add another" : ""}
      </div>
    </div>
      )}
    </>
  );
}
