"use client";

import { Megaphone } from "lucide-react";
import { usePlanner } from "./store";
import { C } from "./ui";

/**
 * A word from the founders, across the top of Today and Plan while it is in
 * date. There is nothing to dismiss and nothing to tidy up: the window the
 * admin set decides when it appears and when it goes, so an old notice cannot
 * be left sitting there.
 */
export function Banner() {
  const p = usePlanner();
  if (!p.banner) return null;
  return (
    <div className="mb-4 flex gap-2 rounded-2xl p-3" style={{ background: C.coral }}>
      <Megaphone size={16} className="mt-0.5 shrink-0" style={{ color: "#fff" }} />
      <p className="text-xs leading-relaxed" style={{ color: "#fff", overflowWrap: "anywhere" }}>
        {p.banner.text}
      </p>
    </div>
  );
}
