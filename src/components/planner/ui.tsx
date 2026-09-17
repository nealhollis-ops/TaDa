"use client";

import React from "react";
import { levelColor, levelIcon } from "@/lib/planner/content";
import type { Badge } from "@/lib/planner/types";

// brand: steel blue anchor, seafoam growth, coral CTA, amber tags, ice white canvas
export const C = {
  navy: "#111111",
  navy2: "#333333",
  gold: "#F8B018",
  goldDeep: "#7A5200",
  goldSoft: "#FEF0C7",
  mist: "#EAEAEA",
  cream: "#F5F5F5",
  coral: "#E30022",
  teal: "#12B76A",
  ink: "#111111",
  fade: "#666666",
  line: "#DDDDDD",
};

export function Bar({ pct, color = C.gold, h = 10, bg = "#EAEAEA" }: { pct: number; color?: string; h?: number; bg?: string }) {
  return (
    <div className="w-full overflow-hidden rounded-full" style={{ background: bg, height: h }}>
      <div className="h-full rounded-full transition-all duration-700" style={{ width: `${Math.min(100, Math.max(0, pct))}%`, background: color }} />
    </div>
  );
}

export function Chip({ children, color = C.navy, bg = "#EAEAEA" }: { children: React.ReactNode; color?: string; bg?: string }) {
  return (
    <span className="rounded-full px-2 py-0.5 text-xs font-medium" style={{ color, background: bg }}>
      {children}
    </span>
  );
}

export function Avatar({ src, name, size = 24 }: { src?: string | null; name?: string | null; size?: number }) {
  const initial = (name || "?").trim().charAt(0).toUpperCase();
  return src ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={name || "avatar"} className="shrink-0 rounded-full object-cover" style={{ width: size, height: size }} />
  ) : (
    <div className="flex shrink-0 items-center justify-center rounded-full font-bold" style={{ width: size, height: size, background: C.navy2, color: C.cream, fontSize: size * 0.45 }}>
      {initial}
    </div>
  );
}

export const renderRich = (text: string) =>
  String(text)
    .split(/(@[\w'-]+)/g)
    .map((part, i) =>
      part.startsWith("@") ? (
        <span key={i} style={{ color: C.coral, fontWeight: 700 }}>
          {part}
        </span>
      ) : (
        <React.Fragment key={i}>{part}</React.Fragment>
      ),
    );

export function BadgeStrip({ streak, badges, level, size = 11 }: { streak?: number; badges?: Badge[]; level?: number; size?: number }) {
  const seen: string[] = [];
  const show = (badges || [])
    .filter((b) => {
      if (seen.includes(b.e)) return false;
      seen.push(b.e);
      return true;
    })
    .slice(0, 2);
  const lv = level ?? 0;
  if ((!streak || streak < 2) && show.length === 0 && !(lv >= 1)) return null;
  return (
    <span className="flex shrink-0 items-center gap-1">
      {(streak ?? 0) >= 2 && (
        <span className="font-bold" style={{ fontSize: size, color: C.coral }}>
          🔥{streak}
        </span>
      )}
      {lv >= 1 && (
        <span className="font-bold" style={{ fontSize: size, color: levelColor(lv) }}>
          {levelIcon(lv)}
          {lv}
        </span>
      )}
      {show.map((b) => (
        <span key={b.id} title={b.name} style={{ fontSize: size + 2 }}>
          {b.e}
        </span>
      ))}
    </span>
  );
}

export function QuoteCard({ q }: { q: { text: string; by: string | null } }) {
  return (
    <div className="mb-4 rounded-2xl p-4" style={{ background: "#fff", borderLeft: `4px solid ${C.gold}` }}>
      <div className="text-sm leading-relaxed" style={{ color: C.ink, fontFamily: "Georgia, serif", fontStyle: "italic" }}>
        &ldquo;{q.text}&rdquo;
      </div>
      {q.by && (
        <div className="mt-1.5 text-xs font-semibold" style={{ color: C.gold, letterSpacing: 0.5 }}>
          {q.by}
        </div>
      )}
    </div>
  );
}

export function Overlay({ children, onClose, z = 85, align = "center" }: { children: React.ReactNode; onClose?: () => void; z?: number; align?: "center" | "end" }) {
  return (
    <div
      className={`fixed inset-0 flex ${align === "end" ? "items-end sm:items-center" : "items-center"} justify-center p-4`}
      style={{ background: "rgba(20,42,56,0.6)", zIndex: z }}
      onClick={onClose}
    >
      <div className="w-full max-w-sm rounded-2xl p-5" style={{ background: C.cream }} onClick={(e) => e.stopPropagation()}>
        {children}
      </div>
    </div>
  );
}

export const inputCls = "w-full rounded-xl border px-3 py-2.5 text-sm outline-none";
export const inputStyle = { borderColor: C.line, background: "#fff", color: C.ink } as const;
