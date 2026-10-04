"use client";

import { useState } from "react";
import { Check, Pencil, X } from "lucide-react";
import { usePlanner } from "./store";
import { C, inputStyle } from "./ui";
import type { Team } from "@/lib/planner/types";

/**
 * The buckets a boss sorts assigned work into. Owner only: a member sees the
 * category on their own task and nothing else, which the row policy and a
 * trigger both enforce, so this card simply is not rendered for them.
 *
 * Suggestions are offers rather than rows. A brand new team starts at zero of
 * ten, and a boss who ignores them is left with a clean list instead of five
 * names to delete.
 */

const SUGGESTED = ["Content", "Admin", "Marketing", "Follow-up", "Events"];

/** Ten colours, so a category keeps its own as others come and go. */
export const CATEGORY_TINTS = ["#F8B018", "#12B76A", "#E30022", "#7A5200", "#0B6B3A", "#B00018", "#333333", "#F0997B", "#5DCAA5", "#D4537E"];

export const tintOf = (n: number) => CATEGORY_TINTS[((n % 10) + 10) % 10];

export function CategoriesCard({ t }: { t: Team }) {
  const p = usePlanner();
  const cats = p.categoriesOf(t.id);
  const [draft, setDraft] = useState("");
  const [editing, setEditing] = useState<string | null>(null);
  const [editText, setEditText] = useState("");

  const taken = new Set(cats.map((c) => c.name.toLowerCase()));
  const offers = SUGGESTED.filter((s) => !taken.has(s.toLowerCase()));
  const full = cats.length >= 10;

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
  );
}
