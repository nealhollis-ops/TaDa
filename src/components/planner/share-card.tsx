"use client";

import { useState } from "react";
import { Check, Copy, Share2, X } from "lucide-react";
import { usePlanner } from "./store";
import { C, inputCls, inputStyle, Overlay } from "./ui";

/** Their words, not ours. Short enough that changing it is easy. */
const DEFAULT_MESSAGE = "Check out this awesome app! You're gonna love it.";

/**
 * The message, the link and the send button. Shared, because this sits inline
 * on Account and inside a dialog off the Today bar, and the two must never
 * drift apart: one wording, one link, one behaviour.
 */
function ShareBody({ onSent }: { onSent?: () => void }) {
  const p = usePlanner();
  const [message, setMessage] = useState(DEFAULT_MESSAGE);
  const [said, setSaid] = useState("");
  const link = `https://gettada.me?from=${encodeURIComponent(p.me.slug)}`;

  /** What actually gets sent: their words, then the link, as one piece of text. */
  const full = () => `${message.trim() || DEFAULT_MESSAGE} ${link}`;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(full());
      setSaid("Copied. Paste it into any app, Google Chat included.");
    } catch {
      setSaid("Copying was blocked. Select the message and link above and copy them by hand.");
    }
    setTimeout(() => setSaid(""), 4000);
  };

  const share = async () => {
    const nav = navigator as Navigator & { share?: (d: { text?: string; url?: string }) => Promise<void> };
    if (nav.share) {
      try {
        // Text only, with the link inside it. Passing "url" alongside "text"
        // looks tidier but several targets, Messenger among them, take the url
        // and throw the message away, so the note someone wrote never arrives.
        await nav.share({ text: full() });
        onSent?.();
        return;
      } catch {
        // They backed out of the sheet, or it refused. Fall through to copying.
      }
    }
    await copy();
  };

  return (
    <>
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
      <div className="flex gap-2">
        <button onClick={() => void share()} className="flex-1 rounded-xl py-2.5 text-sm font-semibold" style={{ background: C.coral, color: "#fff" }}>
          Share TaDa
        </button>
        {/* The share sheet only lists apps installed on the device, so Google
            Chat and anything else on the web needs a plain copy. */}
        <button onClick={() => void copy()} className="flex shrink-0 items-center gap-1.5 rounded-xl border px-3 py-2.5 text-sm font-semibold" style={{ ...inputStyle, borderColor: C.line, color: C.navy2 }}>
          {said.startsWith("Copied") ? <Check size={15} style={{ color: C.teal }} /> : <Copy size={15} />} Copy
        </button>
      </div>
      {said && (
        <p className="mt-2 text-xs font-medium" style={{ color: C.teal }}>
          {said}
        </p>
      )}
    </>
  );
}

/**
 * Hand TaDa to a friend. The link carries this member's slug, so when the
 * friend signs up we know who brought them in and can say thank you.
 *
 * The phone's own share sheet does the work where there is one; everywhere
 * else the message and link go to the clipboard.
 */
export function ShareCard() {
  return (
    <div className="mb-4 rounded-2xl p-4" style={{ background: "#fff" }}>
      <div className="mb-1 flex items-center gap-2 text-xs font-semibold" style={{ color: C.navy2 }}>
        <Share2 size={14} /> Share TaDa with someone
      </div>
      <ShareBody />
    </div>
  );
}

/** The same thing over the page, for the bar at the top of Today. */
export function ShareDialog({ onClose }: { onClose: () => void }) {
  return (
    <Overlay onClose={onClose} align="end">
      <div className="mb-1 flex items-center justify-between">
        <span className="flex items-center gap-2 text-xs font-semibold" style={{ color: C.navy2 }}>
          <Share2 size={14} /> Share TaDa with someone
        </span>
        <button onClick={onClose} aria-label="Close" className="shrink-0">
          <X size={18} style={{ color: C.fade }} />
        </button>
      </div>
      <ShareBody onSent={onClose} />
    </Overlay>
  );
}

/**
 * The gold bar under the header on Today. Sharing used to live only in Account,
 * which someone reaches about once; this is the same dialog, offered where
 * people actually are.
 */
export function ShareBar() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex w-full items-center justify-center gap-2 px-5 py-3"
        style={{ background: C.gold }}
      >
        {/* Ink, not white: white on this gold is about 2:1 and unreadable on a
            phone outdoors. */}
        <Share2 size={15} style={{ color: C.ink }} />
        <span className="text-sm font-semibold" style={{ color: C.ink }}>
          Share TaDa with someone you care about
        </span>
      </button>
      {open && <ShareDialog onClose={() => setOpen(false)} />}
    </>
  );
}
