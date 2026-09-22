"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Overlay, C } from "./ui";

/** The square we render into. Avatars never show larger than 56px, so 256 is plenty on a retina screen. */
const OUT = 256;
/** On-screen size of the crop window. Small enough for a 320px phone once the modal padding is taken off. */
const BOX = 244;
const MAX_ZOOM = 4;

type Placement = { x: number; y: number; zoom: number };

/**
 * Lets someone position and zoom a photo inside the circle before it is uploaded.
 * Drag to move, pinch or use the slider to zoom. What you see in the circle is
 * exactly what gets written, so an off-centre face no longer gets cropped away.
 */
export function AvatarCropper({ file, onCancel, onDone, onError }: { file: File; onCancel: () => void; onDone: (blob: Blob) => void; onError: (message: string) => void }) {
  // One object URL for the life of this cropper; the file never changes under it.
  const [url] = useState(() => URL.createObjectURL(file));
  const [nat, setNat] = useState<{ w: number; h: number } | null>(null);
  const [place, setPlace] = useState<Placement>({ x: 0, y: 0, zoom: 1 });
  const [busy, setBusy] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);
  const drag = useRef<{ id: number; x: number; y: number } | null>(null);
  const pinch = useRef<{ dist: number; zoom: number } | null>(null);
  const points = useRef(new Map<number, { x: number; y: number }>());

  useEffect(() => () => URL.revokeObjectURL(url), [url]);

  // Scale that makes the photo cover the square, the same starting point the old centre crop used.
  const base = nat ? BOX / Math.min(nat.w, nat.h) : 1;
  const dispW = nat ? nat.w * base * place.zoom : 0;
  const dispH = nat ? nat.h * base * place.zoom : 0;

  const clamp = useCallback(
    (p: Placement, w: number, h: number): Placement => {
      const maxX = Math.max(0, (w - BOX) / 2);
      const maxY = Math.max(0, (h - BOX) / 2);
      return { ...p, x: Math.min(maxX, Math.max(-maxX, p.x)), y: Math.min(maxY, Math.max(-maxY, p.y)) };
    },
    [],
  );

  const setZoom = useCallback(
    (z: number) => {
      const zoom = Math.min(MAX_ZOOM, Math.max(1, z));
      setPlace((p) => {
        if (!nat) return { ...p, zoom };
        const ratio = zoom / p.zoom;
        return clamp({ x: p.x * ratio, y: p.y * ratio, zoom }, nat.w * base * zoom, nat.h * base * zoom);
      });
    },
    [nat, base, clamp],
  );

  const onPointerDown = (e: React.PointerEvent) => {
    (e.target as Element).setPointerCapture(e.pointerId);
    points.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (points.current.size === 2) {
      const [a, b] = [...points.current.values()];
      pinch.current = { dist: Math.hypot(a.x - b.x, a.y - b.y), zoom: place.zoom };
      drag.current = null;
    } else {
      drag.current = { id: e.pointerId, x: e.clientX, y: e.clientY };
    }
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!points.current.has(e.pointerId)) return;
    points.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pinch.current && points.current.size >= 2) {
      const [a, b] = [...points.current.values()];
      const dist = Math.hypot(a.x - b.x, a.y - b.y);
      if (pinch.current.dist > 0) setZoom((pinch.current.zoom * dist) / pinch.current.dist);
      return;
    }
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    const dx = e.clientX - d.x;
    const dy = e.clientY - d.y;
    drag.current = { id: d.id, x: e.clientX, y: e.clientY };
    setPlace((p) => clamp({ ...p, x: p.x + dx, y: p.y + dy }, dispW, dispH));
  };

  const endPointer = (e: React.PointerEvent) => {
    points.current.delete(e.pointerId);
    if (points.current.size < 2) pinch.current = null;
    if (drag.current?.id === e.pointerId) drag.current = null;
  };

  const nudge = (dx: number, dy: number) => setPlace((p) => clamp({ ...p, x: p.x + dx, y: p.y + dy }, dispW, dispH));

  const onKeyDown = (e: React.KeyboardEvent) => {
    const step = e.shiftKey ? 20 : 5;
    if (e.key === "ArrowLeft") nudge(step, 0);
    else if (e.key === "ArrowRight") nudge(-step, 0);
    else if (e.key === "ArrowUp") nudge(0, step);
    else if (e.key === "ArrowDown") nudge(0, -step);
    else return;
    e.preventDefault();
  };

  const save = async () => {
    const img = imgRef.current;
    if (!img || !nat || busy) return;
    setBusy(true);
    try {
      const k = base * place.zoom;
      const sx = ((dispW - BOX) / 2 - place.x) / k;
      const sy = ((dispH - BOX) / 2 - place.y) / k;
      const side = BOX / k;
      const c = document.createElement("canvas");
      c.width = OUT;
      c.height = OUT;
      const ctx = c.getContext("2d");
      if (!ctx) throw new Error("no canvas");
      ctx.drawImage(img, sx, sy, side, side, 0, 0, OUT, OUT);
      const blob = await new Promise<Blob | null>((res) => c.toBlob(res, "image/jpeg", 0.82));
      if (!blob) throw new Error("encode failed");
      onDone(blob);
    } catch {
      onError("That photo couldn't be saved. Try a JPG or PNG under 5 MB.");
      setBusy(false);
    }
  };

  return (
    <Overlay onClose={onCancel}>
      <div className="mb-1 font-bold" style={{ color: C.navy }}>
        Position your photo
      </div>
      <p className="mb-3 text-xs" style={{ color: C.fade }}>
        Drag it around, pinch or slide to zoom. Whatever sits inside the circle is what everyone sees.
      </p>

      <div
        className="relative mx-auto overflow-hidden rounded-xl"
        style={{ width: BOX, height: BOX, background: C.navy, touchAction: "none", cursor: nat ? "grab" : "default" }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endPointer}
        onPointerCancel={endPointer}
        onKeyDown={onKeyDown}
        role="application"
        aria-label="Position your photo. Use the arrow keys to move it and the zoom slider to resize it."
        tabIndex={0}
      >
        {url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            ref={imgRef}
            src={url}
            alt=""
            draggable={false}
            onLoad={(e) => setNat({ w: e.currentTarget.naturalWidth, h: e.currentTarget.naturalHeight })}
            onError={() => onError("That file isn't an image we can read. Try a JPG or PNG.")}
            style={{
              position: "absolute",
              left: "50%",
              top: "50%",
              width: dispW || undefined,
              height: dispH || undefined,
              maxWidth: "none",
              transform: `translate(calc(-50% + ${place.x}px), calc(-50% + ${place.y}px))`,
              visibility: nat ? "visible" : "hidden",
            }}
          />
        )}
        {/* The ring is the crop. The spread shadow dims everything outside it, so the result is never a surprise. */}
        <div className="pointer-events-none absolute inset-0 rounded-full" style={{ boxShadow: "0 0 0 9999px rgba(17,17,17,0.55)", border: `2px solid ${C.gold}` }} />
      </div>

      <div className="mt-3 flex items-center gap-2">
        <span className="text-xs" style={{ color: C.fade }}>
          Zoom
        </span>
        <input
          type="range"
          min={1}
          max={MAX_ZOOM}
          step={0.01}
          value={place.zoom}
          onChange={(e) => setZoom(Number(e.target.value))}
          aria-label="Zoom"
          className="flex-1"
          style={{ accentColor: C.coral }}
        />
      </div>

      <div className="mt-3 flex gap-2">
        <button onClick={onCancel} className="flex-1 rounded-xl py-2.5 text-sm font-semibold" style={{ background: C.mist, color: C.ink }}>
          Cancel
        </button>
        <button onClick={() => void save()} disabled={!nat || busy} className="flex-1 rounded-xl py-2.5 text-sm font-semibold" style={{ background: C.teal, color: C.ink, opacity: !nat || busy ? 0.6 : 1 }}>
          {busy ? "Saving..." : "Use this photo"}
        </button>
      </div>
    </Overlay>
  );
}
