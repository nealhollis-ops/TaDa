"use client";

import { useEffect, useRef } from "react";

export type Burst = { id: number; big: boolean; kind: string };

type Part = {
  x: number; y: number; vx: number; vy: number; g: number; life: number; decay: number;
  r?: number; w?: number; h?: number; rot?: number; vr?: number; sway?: number; len?: number; col: string; draw: string;
};

/** Five celebration styles that take turns, plus the grand finale for ceremonies. */
export function Celebrate({ burst }: { burst: Burst | null }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    if (!burst) return;
    const c = ref.current;
    if (!c) return;
    const W = window.innerWidth;
    const H = window.innerHeight;
    c.width = W;
    c.height = H;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    const colors = ["#FF2D78", "#FF8A00", "#FFD500", "#2EE86B", "#00CFFF", "#2E7CFF", "#A855F7", "#FF4438", "#FF6B53", "#ffffff"];
    const mult = burst.big ? 1.9 : 1;
    const rand = (a: number, b: number) => a + Math.random() * (b - a);
    const col = () => colors[Math.floor(Math.random() * colors.length)];
    let parts: Part[] = [];

    const fireworkBurst = () => {
      const cx = W * rand(0.15, 0.85);
      const cy = H * rand(0.12, 0.5);
      const shade = col();
      for (let i = 0; i < 80 * mult; i++) {
        const a = Math.random() * Math.PI * 2;
        const s = rand(3, 10.5);
        parts.push({ x: cx, y: cy, vx: Math.cos(a) * s, vy: Math.sin(a) * s, g: 0.045, life: 1, decay: rand(0.006, 0.01), r: rand(3, 6), col: i % 4 ? shade : col(), draw: "dot" });
      }
    };
    const confettiDrop = () => {
      for (let i = 0; i < 170 * mult; i++) {
        parts.push({ x: rand(0, W), y: rand(-H * 0.7, -10), vx: rand(-0.7, 0.7), vy: rand(2, 4.2), g: 0.015, life: 1, decay: 0.004, w: rand(8, 15), h: rand(5, 9), rot: rand(0, Math.PI * 2), vr: rand(-0.22, 0.22), sway: rand(0, Math.PI * 2), col: col(), draw: "rect" });
      }
    };
    const starPop = () => {
      const cx = W * rand(0.3, 0.7);
      const cy = H * rand(0.25, 0.45);
      for (let i = 0; i < 44 * mult; i++) {
        const a = Math.random() * Math.PI * 2;
        const s = rand(1.5, 7);
        parts.push({ x: cx, y: cy, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 1.2, g: 0.025, life: 1, decay: rand(0.005, 0.009), r: rand(7, 17), rot: rand(0, Math.PI * 2), vr: rand(-0.15, 0.15), col: col(), draw: "star" });
      }
    };
    const balloonLift = () => {
      for (let i = 0; i < 26 * mult; i++) {
        parts.push({ x: rand(0.05, 0.95) * W, y: H + rand(10, 240), vx: rand(-0.3, 0.3), vy: rand(-2.4, -1.2), g: 0, life: 1, decay: 0.005, r: rand(15, 28), sway: rand(0, Math.PI * 2), col: col(), draw: "balloon" });
      }
    };
    const streamerVolley = () => {
      (
        [
          [0, W * 0.06],
          [1, W * 0.94],
        ] as const
      ).forEach(([side, sx]) => {
        for (let i = 0; i < 38 * mult; i++) {
          const a = side === 0 ? rand(-Math.PI * 0.48, -Math.PI * 0.18) : rand(-Math.PI * 0.82, -Math.PI * 0.52);
          const s = rand(8, 15);
          parts.push({ x: sx, y: H, vx: Math.cos(a) * s, vy: Math.sin(a) * s, g: 0.09, life: 1, decay: 0.007, len: rand(12, 24), col: col(), draw: "streak" });
        }
      });
    };

    const schedules: Record<string, [number, () => void][]> = {
      fireworks: [[0, fireworkBurst], [22, fireworkBurst], [45, fireworkBurst], [70, fireworkBurst], [95, fireworkBurst]],
      confetti: [[0, confettiDrop], [45, confettiDrop], [90, confettiDrop]],
      stars: [[0, starPop], [30, starPop], [60, starPop], [90, starPop]],
      balloons: [[0, balloonLift], [40, balloonLift], [80, balloonLift]],
      streamers: [[0, streamerVolley], [35, streamerVolley], [70, streamerVolley], [105, streamerVolley]],
      grand: [[0, fireworkBurst], [12, confettiDrop], [22, fireworkBurst], [35, streamerVolley], [48, fireworkBurst], [60, confettiDrop], [75, fireworkBurst], [90, streamerVolley], [105, fireworkBurst]],
    };
    const schedule = schedules[burst.kind] || [[0, fireworkBurst]];

    const drawStar = (p: Part) => {
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot ?? 0);
      ctx.beginPath();
      const r = p.r ?? 8;
      for (let k = 0; k < 5; k++) {
        const oa = (k * 2 * Math.PI) / 5 - Math.PI / 2;
        const ia = oa + Math.PI / 5;
        ctx.lineTo(Math.cos(oa) * r, Math.sin(oa) * r);
        ctx.lineTo(Math.cos(ia) * r * 0.45, Math.sin(ia) * r * 0.45);
      }
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    };

    let raf = 0;
    let tick = 0;
    const step = () => {
      schedule.forEach(([at, fn]) => {
        if (at === tick) fn();
      });
      tick += 1;
      ctx.clearRect(0, 0, W, H);
      parts.forEach((p) => {
        p.vy += p.g || 0;
        p.x += p.vx + (p.sway !== undefined ? Math.sin(tick / 12 + p.sway) * 0.8 : 0);
        p.y += p.vy;
        if (p.vr) p.rot = (p.rot ?? 0) + p.vr;
        p.life -= p.decay;
      });
      parts = parts.filter((p) => p.life > 0 && p.y < H + 40);
      parts.forEach((p) => {
        ctx.globalAlpha = Math.max(p.life, 0);
        ctx.fillStyle = p.col;
        if (p.draw === "rect") {
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate(p.rot ?? 0);
          ctx.fillRect(-(p.w ?? 8) / 2, -(p.h ?? 5) / 2, p.w ?? 8, p.h ?? 5);
          ctx.restore();
        } else if (p.draw === "star") {
          drawStar(p);
        } else if (p.draw === "balloon") {
          const r = p.r ?? 20;
          ctx.strokeStyle = p.col;
          ctx.globalAlpha = Math.max(p.life * 0.6, 0);
          ctx.beginPath();
          ctx.moveTo(p.x, p.y + r);
          ctx.lineTo(p.x, p.y + r + 18);
          ctx.stroke();
          ctx.globalAlpha = Math.max(p.life, 0);
          ctx.beginPath();
          ctx.ellipse(p.x, p.y, r * 0.8, r, 0, 0, Math.PI * 2);
          ctx.fill();
        } else if (p.draw === "streak") {
          const m = Math.hypot(p.vx, p.vy) || 1;
          ctx.strokeStyle = p.col;
          ctx.lineWidth = 4;
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(p.x - (p.vx / m) * (p.len ?? 16), p.y - (p.vy / m) * (p.len ?? 16));
          ctx.stroke();
        } else {
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.r ?? 4, 0, Math.PI * 2);
          ctx.fill();
        }
      });
      if ((parts.length || tick <= 110) && tick < 260) raf = requestAnimationFrame(step);
      else ctx.clearRect(0, 0, W, H);
    };
    step();
    return () => cancelAnimationFrame(raf);
  }, [burst]);
  return <canvas ref={ref} className="pointer-events-none fixed inset-0" style={{ zIndex: 60 }} />;
}
