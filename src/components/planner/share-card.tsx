"use client";

import { useState } from "react";
import { Share2 } from "lucide-react";
import { usePlanner } from "./store";
import { C, inputCls, inputStyle } from "./ui";

/** Their words, not ours. Short enough that changing it is easy. */
const DEFAULT_MESSAGE = "I've been using TaDa to actually finish things. Thought of you.";

/**
 * Hand TaDa to a friend. The link carries this member's slug, so when the
 * friend signs up we know who brought them in and can say thank you.
 *
 * The phone's own share sheet does the work where there is one; everywhere
 * else the message and link go to the clipboard.
 */
export function ShareCard() {
  const p = usePlanner();
  const [message, setMessage] = useState(DEFAULT_MESSAGE);
  const [said, setSaid] = useState("");
  const link = `https://gettada.me?from=${encodeURIComponent(p.me.slug)}`;

  const share = async () => {
    const text = message.trim() || DEFAULT_MESSAGE;
    const nav = navigator as Navigator & { share?: (d: { text?: string; url?: string }) => Promise<void> };
    if (nav.share) {
      try {
        await nav.share({ text, url: link });
        return;
      } catch {
        // They backed out of the sheet, or it refused. Fall through to copying.
      }
    }
    try {
      await navigator.clipboard.writeText(`${text} ${link}`);
      setSaid("Copied. Paste it wherever you like.");
    } catch {
      setSaid("Copy the message and link below and send them on.");
    }
    setTimeout(() => setSaid(""), 4000);
  };

  return (
    <div className="mb-4 rounded-2xl p-4" style={{ background: "#fff" }}>
      <div className="mb-1 flex items-center gap-2 text-xs font-semibold" style={{ color: C.navy2 }}>
        <Share2 size={14} /> Share TaDa with someone
      </div>
      <p className="mb-3 text-xs" style={{ color: C.fade }}>
        Say it your way, then send it on. The link is yours, so we know who to thank.
      </p>
      <textarea
        className={`${inputCls} mb-2 resize-none`}
        style={inputStyle}
        rows={2}
        maxLength={200}
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        aria-label="Your message"
      />
      <div className="mb-3 truncate text-xs" style={{ color: C.fade }}>
        {link}
      </div>
      <button onClick={() => void share()} className="w-full rounded-xl py-2.5 text-sm font-semibold" style={{ background: C.coral, color: "#fff" }}>
        Share TaDa
      </button>
      {said && (
        <p className="mt-2 text-xs font-medium" style={{ color: C.teal }}>
          {said}
        </p>
      )}
    </div>
  );
}
