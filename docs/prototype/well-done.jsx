import React, { useState, useEffect, useRef } from "react";
import {
  Circle, CheckCircle2, Plus, Trash2, MessageCircle, Users, BarChart3,
  CalendarDays, Send, Star, Pencil, X, Sun, CloudSun, Moon, RefreshCw,
  Trophy, HelpCircle, Heart, Sparkles, UserCircle, Mic, Wand2, Repeat, SmilePlus, Volume2, VolumeX
} from "lucide-react";

// ---------- brand: steel blue anchor, seafoam growth, coral CTA, amber tags, ice white canvas ----------
const C = {
  navy: "#2C6C8F", navy2: "#245B76", gold: "#C98F26", goldSoft: "#F4E6C6",
  cream: "#EBF5F3", coral: "#FF6B53", teal: "#53B29D",
  ink: "#243742", fade: "#7E9099", line: "#D8E5E3"
};

// Paste your welcome tour video embed link here (YouTube or Vimeo embed URL)
const TOUR_URL = "";

// Paste a link to a recorded "ta-da!" audio clip (mp3) and the app will use
// that exact human voice for every check-off and the opening greeting
const TADA_URL = "";

// Daily power lines. Marching orders for the day's list.
// Rooted in the Word underneath, worded for everyone.
// Named quotes are kept to ones with solid, well-documented attribution.
const QUOTES = [
  { text: "You were made to carry heavier things than today's list. So stop negotiating with it and start crossing it off.", by: null },
  { text: "Do what you can, with what you have, where you are.", by: "Theodore Roosevelt" },
  { text: "Nobody is coming to do your list for you, and that's actually good news. It means it's yours. Hit the first task and let momentum recruit the rest of you.", by: null },
  { text: "If there is no struggle, there is no progress.", by: "Frederick Douglass" },
  { text: "Fear didn't come standard with you. Power did. So grab the hardest thing on the list and do it first, while fear is still lacing its shoes.", by: null },
  { text: "Genius is one percent inspiration, ninety-nine percent perspiration.", by: "Thomas Edison" },
  { text: "The only way to lose today is to quit on it. Tired is allowed. Stopping is not. The reward lives on the far side of finished.", by: null },
  { text: "Don't count the days. Make the days count.", by: "Muhammad Ali" },
  { text: "You're doing a great work, so don't come down. Every distraction can wait. The work can't.", by: null },
  { text: "A dream doesn't become reality through magic; it takes sweat, determination and hard work.", by: "Colin Powell" },
  { text: "Treat the small tasks like auditions for the big ones, because that's exactly what they are. Faithful over little gets promoted over much.", by: null },
  { text: "That mountain on your list, the one you keep walking around? Speak to it, start it, and watch it shrink under your feet.", by: null },
  { text: "Knowing what to do has never once changed a life. Doing it is the whole game. Go be the one who actually does it.", by: null },
  { text: "Do your work so well it opens doors you never knocked on. Excellence always finds an audience.", by: null },
  { text: "Improvising keeps you busy without moving you. You have a list and you have daylight. Work the plan until it's done.", by: null },
  { text: "Push hard all week, then guard your day of rest like part of the job, because it is. Rest is maintenance on the machine.", by: null },
  { text: "Yesterday's unfinished business doesn't get a vote today. Run at this day like the finish line is in sight, because it is.", by: null },
  { text: "Two get more done than one. Say today's target out loud to your partner. A goal with a witness is twice as hard to drop.", by: null }
];

const BLOCKS = [
  { id: "morning", label: "Morning", Icon: Sun },
  { id: "afternoon", label: "Afternoon", Icon: CloudSun },
  { id: "evening", label: "Evening", Icon: Moon }
];

const PTYPES = {
  question: { label: "Question", color: "#53B29D", Icon: HelpCircle },
  win: { label: "Win", color: "#A9781F", Icon: Trophy },
  boost: { label: "Boost", color: "#FF6B53", Icon: Heart }
};

const REACTS = [
  { id: "heart", e: "❤️" },
  { id: "fire", e: "🔥" },
  { id: "up", e: "👍" },
  { id: "pray", e: "🙏" },
  { id: "smile", e: "😊" }
];

const WD = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const WDFULL = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const ord = n => {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return `${n}${s[(v - 20) % 10] || s[v] || s[0]}`;
};
const NOW = new Date();
const YEAR = NOW.getFullYear();
const MONTH = NOW.getMonth();
const DAYS = new Date(YEAR, MONTH + 1, 0).getDate();
const MONTH_NAME = NOW.toLocaleString("default", { month: "long" });
const MONTH_SHORT = NOW.toLocaleString("default", { month: "short" });

// Real calendar weeks for this month. Each week runs Monday through Sunday.
const WEEKINFO = (() => {
  const list = [];
  for (let d = 1; d <= DAYS; d++) {
    const monIdx = (new Date(YEAR, MONTH, d).getDay() + 6) % 7; // 0 means Monday
    if (d === 1 || monIdx === 0) {
      list.push({ start: d, end: d, days: [d] });
    } else {
      const wk = list[list.length - 1];
      wk.end = d;
      wk.days.push(d);
    }
  }
  list.forEach((wk, i) => {
    wk.w = i + 1;
    wk.label = `${MONTH_SHORT} ${wk.start}-${wk.end}`;
    wk.short = `${MONTH_SHORT} ${wk.start}`;
  });
  return list;
})();
const WEEKS = WEEKINFO.length;

const pad = n => String(n).padStart(2, "0");
const dstr = d => `${YEAR}-${pad(MONTH + 1)}-${pad(d)}`;
const todayStr = () => {
  const t = new Date();
  return `${t.getFullYear()}-${pad(t.getMonth() + 1)}-${pad(t.getDate())}`;
};
const weekOf = ds => {
  const d = parseInt(ds.slice(8), 10);
  const wk = WEEKINFO.find(x => d >= x.start && d <= x.end);
  return wk ? wk.w : 1;
};
const dayLabel = ds => {
  const d = parseInt(ds.slice(8), 10);
  return `${WD[new Date(YEAR, MONTH, d).getDay()]} ${d}`;
};
const slug = s => (s.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 24)) || "friend";
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
const ago = ts => {
  const m = Math.floor((Date.now() - ts) / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
};

// ---------- storage helpers ----------
const sget = async (k, sh = false) => {
  try {
    const r = await window.storage.get(k, sh);
    return r ? JSON.parse(r.value) : null;
  } catch {
    return null;
  }
};
const sset = async (k, v, sh = false) => {
  try {
    await window.storage.set(k, JSON.stringify(v), sh);
  } catch (e) {
    console.error("save failed", e);
  }
};

// Find the calendar day in a given week that lands on a chosen weekday
const anchorDayInWeek = (w, wd) => {
  const wk = WEEKINFO[w - 1];
  if (!wk) return null;
  const d = wk.days.find(x => new Date(YEAR, MONTH, x).getDay() === wd);
  return d || null;
};

// Check-off sound and buzz: a real "ta-da!"
let audioCtx = null;
let SOUND_ON = true;
// A human "ta-daa!": recorded clip first, then the device voice, then the soft chord
let tadaEl = null;
const sayTada = big => {
  if (!SOUND_ON) return false;
  if (TADA_URL) {
    try {
      tadaEl = tadaEl || new Audio(TADA_URL);
      tadaEl.currentTime = 0;
      tadaEl.play();
      return true;
    } catch (e) { /* fall through to the device voice */ }
  }
  try {
    if (!window.speechSynthesis) return false;
    const u = new SpeechSynthesisUtterance(big ? "ta-daaaa!" : "ta-daa!");
    u.rate = big ? 0.8 : 0.95;
    u.pitch = 1.5;
    u.volume = 1;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(u);
    return true;
  } catch (e) {
    return false;
  }
};

const playChime = big => {
  if (!SOUND_ON) return;
  if (sayTada(big)) return;
  try {
    audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === "suspended") audioCtx.resume();
    const t = audioCtx.currentTime;
    const soft = (freq, start, len, vol, type = "sine") => {
      const o = audioCtx.createOscillator();
      const g = audioCtx.createGain();
      o.type = type;
      o.frequency.value = freq;
      g.gain.setValueAtTime(0.0001, start);
      g.gain.linearRampToValueAtTime(vol, start + 0.05);
      g.gain.setValueAtTime(vol, start + Math.max(0.06, len * 0.35));
      g.gain.exponentialRampToValueAtTime(0.0001, start + len);
      o.connect(g);
      g.connect(audioCtx.destination);
      o.start(start);
      o.stop(start + len + 0.05);
    };
    // "ta": a soft, round pickup
    soft(392.0, t, 0.22, 0.12);
    soft(392.0, t, 0.22, 0.05, "triangle");
    // "daaa": a warm chord that blooms and fades slowly
    const daAt = t + 0.2;
    const daLen = big ? 1.9 : 1.4;
    [261.63, 523.25, 659.25, 783.99].forEach((fr, i) => {
      soft(fr, daAt, daLen, i === 0 ? 0.08 : 0.11);
      soft(fr * 1.003, daAt, daLen, 0.04, "triangle");
    });
    if (big) soft(1046.5, daAt + 0.15, daLen, 0.06);
  } catch (e) { /* sound is a bonus, never a blocker */ }
};
const buzz = big => {
  try {
    if (navigator.vibrate) navigator.vibrate(big ? [60, 60, 320, 80, 160] : [60, 60, 250]);
  } catch (e) { /* vibration is a bonus too */ }
};

// Full fanfare for badge milestones
const playGrand = () => {
  if (!SOUND_ON) return;
  try {
    audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === "suspended") audioCtx.resume();
    const t = audioCtx.currentTime;
    const note = (freq, start, len, vol, type = "sawtooth") => {
      const o = audioCtx.createOscillator();
      const f = audioCtx.createBiquadFilter();
      const g = audioCtx.createGain();
      o.type = type;
      o.frequency.value = freq;
      f.type = "lowpass";
      f.frequency.setValueAtTime(freq * 4, start);
      f.frequency.exponentialRampToValueAtTime(freq * 1.6, start + len);
      g.gain.setValueAtTime(0.0001, start);
      g.gain.exponentialRampToValueAtTime(vol, start + 0.02);
      g.gain.setValueAtTime(vol, start + len * 0.6);
      g.gain.exponentialRampToValueAtTime(0.0001, start + len);
      o.connect(f);
      f.connect(g);
      g.connect(audioCtx.destination);
      o.start(start);
      o.stop(start + len + 0.05);
    };
    note(392.0, t, 0.12, 0.16);
    note(523.25, t + 0.13, 0.12, 0.16);
    note(659.25, t + 0.26, 0.12, 0.16);
    note(783.99, t + 0.39, 0.15, 0.18);
    [523.25, 659.25, 783.99, 1046.5].forEach(fr => note(fr, t + 0.58, 1.7, 0.14));
    note(130.81, t + 0.58, 0.6, 0.24, "sine");
    note(1318.51, t + 1.1, 0.9, 0.09);
  } catch (e) { /* sound is a bonus */ }
};

// When a new month starts: drop last month's one-time tasks,
// then rebuild every weekly and monthly repeater for this month.
const CUR_PREFIX = `${YEAR}-${pad(MONTH + 1)}`;
const rollover = list => {
  const isOld = t => t.date && !t.date.startsWith(CUR_PREFIX);
  if (!list.some(isOld)) return list;
  const curW = weekOf(todayStr());
  const kept = list.filter(t => !isOld(t));
  const roots = {};
  list.forEach(t => {
    if (isOld(t) && (t.repeat === "weekly" || t.repeat === "monthly")) {
      const key = t.rootId || t.title;
      if (!roots[key]) roots[key] = t;
    }
  });
  const spawned = [];
  Object.values(roots).forEach(t => {
    const rootId = t.rootId || t.id;
    const anchor = t.anchor === undefined || t.anchor === null ? null : t.anchor;
    const block = t.block && t.block !== "auto" ? t.block : "auto";
    if (t.repeat === "monthly") {
      const date = anchor ? dstr(Math.min(anchor, DAYS)) : null;
      spawned.push({ id: uid(), title: t.title, big: !!t.big, date, block, week: date ? weekOf(date) : curW, done: false, doneAt: null, repeat: "monthly", rootId, anchor });
    } else {
      for (let w = curW; w <= WEEKS; w++) {
        const d = anchor !== null ? anchorDayInWeek(w, anchor) : null;
        if (anchor !== null && !d) continue;
        spawned.push({ id: uid(), title: t.title, big: !!t.big, date: d ? dstr(d) : null, block, week: w, done: false, doneAt: null, repeat: "weekly", rootId, anchor });
      }
    }
  });
  return [...kept, ...spawned];
};

// ---------- celebrations: five styles that take turns ----------
function Celebrate({ burst }) {
  const ref = useRef(null);
  useEffect(() => {
    if (!burst) return;
    const c = ref.current;
    if (!c) return;
    const W = window.innerWidth, H = window.innerHeight;
    c.width = W;
    c.height = H;
    const ctx = c.getContext("2d");
    const colors = ["#FF2D78", "#FF8A00", "#FFD500", "#2EE86B", "#00CFFF", "#2E7CFF", "#A855F7", "#FF4438", "#FF6B53", "#ffffff"];
    const mult = burst.big ? 1.9 : 1;
    const rand = (a, b) => a + Math.random() * (b - a);
    const col = () => colors[Math.floor(Math.random() * colors.length)];
    let parts = [];

    const fireworkBurst = () => {
      const cx = W * rand(0.15, 0.85), cy = H * rand(0.12, 0.5);
      const shade = col();
      for (let i = 0; i < 80 * mult; i++) {
        const a = Math.random() * Math.PI * 2, s = rand(3, 10.5);
        parts.push({ x: cx, y: cy, vx: Math.cos(a) * s, vy: Math.sin(a) * s, g: 0.045, life: 1, decay: rand(0.006, 0.01), r: rand(3, 6), col: i % 4 ? shade : col(), draw: "dot" });
      }
    };
    const confettiDrop = () => {
      for (let i = 0; i < 170 * mult; i++) {
        parts.push({ x: rand(0, W), y: rand(-H * 0.7, -10), vx: rand(-0.7, 0.7), vy: rand(2, 4.2), g: 0.015, life: 1, decay: 0.004, w: rand(8, 15), h: rand(5, 9), rot: rand(0, Math.PI * 2), vr: rand(-0.22, 0.22), sway: rand(0, Math.PI * 2), col: col(), draw: "rect" });
      }
    };
    const starPop = () => {
      const cx = W * rand(0.3, 0.7), cy = H * rand(0.25, 0.45);
      for (let i = 0; i < 44 * mult; i++) {
        const a = Math.random() * Math.PI * 2, s = rand(1.5, 7);
        parts.push({ x: cx, y: cy, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 1.2, g: 0.025, life: 1, decay: rand(0.005, 0.009), r: rand(7, 17), rot: rand(0, Math.PI * 2), vr: rand(-0.15, 0.15), col: col(), draw: "star" });
      }
    };
    const balloonLift = () => {
      for (let i = 0; i < 26 * mult; i++) {
        parts.push({ x: rand(0.05, 0.95) * W, y: H + rand(10, 240), vx: rand(-0.3, 0.3), vy: rand(-2.4, -1.2), g: 0, life: 1, decay: 0.005, r: rand(15, 28), sway: rand(0, Math.PI * 2), col: col(), draw: "balloon" });
      }
    };
    const streamerVolley = () => {
      [[0, W * 0.06], [1, W * 0.94]].forEach(([side, sx]) => {
        for (let i = 0; i < 38 * mult; i++) {
          const a = side === 0 ? rand(-Math.PI * 0.48, -Math.PI * 0.18) : rand(-Math.PI * 0.82, -Math.PI * 0.52);
          const s = rand(8, 15);
          parts.push({ x: sx, y: H, vx: Math.cos(a) * s, vy: Math.sin(a) * s, g: 0.09, life: 1, decay: 0.007, len: rand(12, 24), col: col(), draw: "streak" });
        }
      });
    };

    const schedule = ({
      fireworks: [[0, fireworkBurst], [22, fireworkBurst], [45, fireworkBurst], [70, fireworkBurst], [95, fireworkBurst]],
      confetti: [[0, confettiDrop], [45, confettiDrop], [90, confettiDrop]],
      stars: [[0, starPop], [30, starPop], [60, starPop], [90, starPop]],
      balloons: [[0, balloonLift], [40, balloonLift], [80, balloonLift]],
      streamers: [[0, streamerVolley], [35, streamerVolley], [70, streamerVolley], [105, streamerVolley]],
      grand: [[0, fireworkBurst], [12, confettiDrop], [22, fireworkBurst], [35, streamerVolley], [48, fireworkBurst], [60, confettiDrop], [75, fireworkBurst], [90, streamerVolley], [105, fireworkBurst]]
    })[burst.kind] || [[0, fireworkBurst]];

    const drawStar = p => {
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.beginPath();
      for (let k = 0; k < 5; k++) {
        const oa = (k * 2 * Math.PI) / 5 - Math.PI / 2;
        const ia = oa + Math.PI / 5;
        ctx.lineTo(Math.cos(oa) * p.r, Math.sin(oa) * p.r);
        ctx.lineTo(Math.cos(ia) * p.r * 0.45, Math.sin(ia) * p.r * 0.45);
      }
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    };

    let raf, tick = 0;
    const step = () => {
      schedule.forEach(([at, fn]) => { if (at === tick) fn(); });
      tick += 1;
      ctx.clearRect(0, 0, W, H);
      parts.forEach(p => {
        p.vy += p.g || 0;
        p.x += p.vx + (p.sway !== undefined ? Math.sin(tick / 12 + p.sway) * 0.8 : 0);
        p.y += p.vy;
        if (p.vr) p.rot += p.vr;
        p.life -= p.decay;
      });
      parts = parts.filter(p => p.life > 0 && p.y < H + 40);
      parts.forEach(p => {
        ctx.globalAlpha = Math.max(p.life, 0);
        ctx.fillStyle = p.col;
        if (p.draw === "rect") {
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate(p.rot);
          ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
          ctx.restore();
        } else if (p.draw === "star") {
          drawStar(p);
        } else if (p.draw === "balloon") {
          ctx.strokeStyle = p.col;
          ctx.globalAlpha = Math.max(p.life * 0.6, 0);
          ctx.beginPath();
          ctx.moveTo(p.x, p.y + p.r);
          ctx.lineTo(p.x, p.y + p.r + 18);
          ctx.stroke();
          ctx.globalAlpha = Math.max(p.life, 0);
          ctx.beginPath();
          ctx.ellipse(p.x, p.y, p.r * 0.8, p.r, 0, 0, Math.PI * 2);
          ctx.fill();
        } else if (p.draw === "streak") {
          const m = Math.hypot(p.vx, p.vy) || 1;
          ctx.strokeStyle = p.col;
          ctx.lineWidth = 4;
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(p.x - (p.vx / m) * p.len, p.y - (p.vy / m) * p.len);
          ctx.stroke();
        } else {
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
          ctx.fill();
        }
      });
      if ((parts.length || tick <= 110) && tick < 260) raf = requestAnimationFrame(step);
      else ctx.clearRect(0, 0, W, H);
    };
    step();
    return () => cancelAnimationFrame(raf);
  }, [burst]);
  return <canvas ref={ref} className="fixed inset-0 pointer-events-none" style={{ zIndex: 60 }} />;
}

function Bar({ pct, color = C.gold, h = 10, bg = "#DFEAE8" }) {
  return (
    <div className="w-full rounded-full overflow-hidden" style={{ background: bg, height: h }}>
      <div
        className="h-full rounded-full transition-all duration-700"
        style={{ width: `${Math.min(100, pct)}%`, background: color }}
      />
    </div>
  );
}

function Chip({ children, color = C.navy2, bg = "#EDF3F2" }) {
  return (
    <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ color, background: bg }}>
      {children}
    </span>
  );
}

function Avatar({ src, name, size = 24 }) {
  const initial = (name || "?").trim().charAt(0).toUpperCase();
  return src ? (
    <img
      src={src}
      alt={name || "avatar"}
      className="rounded-full object-cover shrink-0"
      style={{ width: size, height: size }}
    />
  ) : (
    <div
      className="rounded-full flex items-center justify-center shrink-0 font-bold"
      style={{ width: size, height: size, background: C.navy2, color: C.cream, fontSize: size * 0.45 }}
    >
      {initial}
    </div>
  );
}

const renderRich = text =>
  String(text).split(/(@[\w'-]+)/g).map((part, i) =>
    part.startsWith("@")
      ? <span key={i} style={{ color: "#A9781F", fontWeight: 700 }}>{part}</span>
      : <React.Fragment key={i}>{part}</React.Fragment>
  );

// ---------- gamification ----------
const DEF_STATS = { streak: 0, bestStreak: 0, lastDoneDay: null, totalDone: 0, bigDone: 0, morningDone: 0, perfectWeeks: 0, perfectKeys: [], comebacks: 0, encourages: 0 };

const BADGE_CATALOG = [
  { id: "fire7", e: "🔥", name: "7 Day Fire", target: 7, val: s => s.bestStreak },
  { id: "fire21", e: "🔥", name: "21 Day Fire", target: 21, val: s => s.bestStreak },
  { id: "fire40", e: "🔥", name: "40 Day Fire", target: 40, val: s => s.bestStreak },
  { id: "fire70", e: "🔥", name: "70 Day Fire", target: 70, val: s => s.bestStreak },
  { id: "done10", e: "✅", name: "10 Finished", target: 10, val: s => s.totalDone },
  { id: "done50", e: "🏅", name: "50 Finished", target: 50, val: s => s.totalDone },
  { id: "done100", e: "🏆", name: "Century", target: 100, val: s => s.totalDone },
  { id: "done500", e: "👑", name: "500 Finished", target: 500, val: s => s.totalDone },
  { id: "big5", e: "⭐", name: "5 Big Wins", target: 5, val: s => s.bigDone },
  { id: "big25", e: "🌟", name: "25 Big Wins", target: 25, val: s => s.bigDone },
  { id: "big100", e: "⚔️", name: "Giant Slayer", target: 100, val: s => s.bigDone },
  { id: "sun25", e: "🌅", name: "First Light", target: 25, val: s => s.morningDone },
  { id: "week1", e: "🎯", name: "Perfect Week", target: 1, val: s => s.perfectWeeks },
  { id: "week4", e: "🥇", name: "4 Perfect Weeks", target: 4, val: s => s.perfectWeeks },
  { id: "dove", e: "🕊️", name: "Encourager", target: 25, val: s => s.encourages || 0 },
  { id: "eagle", e: "🦅", name: "Comeback", target: 1, val: s => s.comebacks || 0 },
  { id: "iron", e: "🤝", name: "Iron", target: 25, val: (s, hp) => (hp ? s.totalDone : 0) }
];

const BADGE_RANK = ["fire70", "big100", "done500", "fire40", "done100", "week4", "fire21", "big25", "done50", "iron", "eagle", "dove", "sun25", "week1", "fire7", "big5", "done10"];

const computeBadges = (s, hasPartner) => {
  const earned = BADGE_CATALOG.filter(b => b.val(s, hasPartner) >= b.target);
  earned.sort((a, b) => BADGE_RANK.indexOf(a.id) - BADGE_RANK.indexOf(b.id));
  return earned.map(b => ({ id: b.id, e: b.e, name: b.name }));
};

// Mountain Level: a second track built on tasks completed, not days
const LEVEL_STEPS = [10, 25, 50, 100, 175, 275, 400, 550, 750, 1000];
const levelOf = total => {
  let lv = 0;
  LEVEL_STEPS.forEach(s => { if (total >= s) lv += 1; });
  if (total > 1000) lv += Math.floor((total - 1000) / 300);
  return lv;
};
const nextLevelAt = total => {
  for (const s of LEVEL_STEPS) if (total < s) return s;
  const over = total - 1000;
  return 1000 + (Math.floor(over / 300) + 1) * 300;
};
const levelColor = lv =>
  lv >= 10 ? "#FF6B53" : lv >= 7 ? "#A9781F" : lv >= 4 ? "#245B76" : "#53B29D";
const levelIcon = lv =>
  lv >= 10 ? "🌋" : lv >= 7 ? "🏔️" : "⛰️";

function BadgeStrip({ streak, badges, level, size = 11 }) {
  const seen = [];
  const show = (badges || []).filter(b => {
    if (seen.includes(b.e)) return false;
    seen.push(b.e);
    return true;
  }).slice(0, 2);
  if ((!streak || streak < 2) && show.length === 0 && !(level >= 1)) return null;
  return (
    <span className="flex items-center gap-1 shrink-0">
      {streak >= 2 && (
        <span className="font-bold" style={{ fontSize: size, color: "#FF6B53" }}>🔥{streak}</span>
      )}
      {level >= 1 && (
        <span className="font-bold" style={{ fontSize: size, color: levelColor(level) }}>{levelIcon(level)}{level}</span>
      )}
      {show.map(b => (
        <span key={b.id} title={b.name} style={{ fontSize: size + 2 }}>{b.e}</span>
      ))}
    </span>
  );
}

// ---------- help content ----------
const HELP = [
  { id: "start", t: "Getting started", b: [
    "Enter your name on the welcome screen and you're in. Tap the circle icon at the top right to open your Account, where you can add a photo and your email.",
    "The app runs on the current calendar month. Weeks go Monday through Sunday, and Sunday is the built in rest day.",
    "A getting started checklist floats at the bottom right until you finish it: watch the tour, add a task, check one off, say hi in the community, and reach out for a partner. Finish all five and the confetti flies."
  ]},
  { id: "addtasks", t: "Adding tasks", b: [
    "Go to Plan and tap Add task. Type what needs doing, then either pick an exact day or let the app choose one for you inside the week you select.",
    "Pick a time block if you want: morning, afternoon, or evening. Check Big win for your major tasks. Big wins get bigger celebrations, and the app schedules them in mornings when it does the placing."
  ]},
  { id: "dump", t: "The brain dump", b: [
    "The navy card at the top of Plan called Pour it all out takes everything at once. Type the whole jumble, or tap the mic on your phone keyboard and just talk.",
    "Tap Make it into tasks. You'll get a preview list where you can star big wins or remove anything wrong. Then Add them to my month places every task on your calendar for you."
  ]},
  { id: "organize", t: "The Organize button", b: [
    "Organize places every unscheduled task on your lightest open day, spreading the load across the week. Sundays are left open on purpose.",
    "Tasks you gave an exact day, and repeating tasks pinned to a day, stay right where you put them."
  ]},
  { id: "voice", t: "Talking to the calendar", b: [
    "The bar under the header on Today, Plan, and Timeline is your voice control. Tap the round mic button, say the change, and stop talking. It runs the request on its own.",
    "Try things like: move the workbook to Thursday. Take the printer call off Tuesday. Mark the emails done. Add a dentist visit on the 22nd. You can also type into the bar and tap the arrow.",
    "When it isn't sure what you meant, it asks a question in the gold note instead of guessing, and nothing moves until it understands you."
  ]},
  { id: "repeat", t: "Repeating tasks", b: [
    "When adding or editing a task, choose Every week or Every month. Every week drops a copy into each remaining week of the month. Every month brings the task back when the calendar flips, without you doing anything.",
    "Pin a repeat to a day, like Every Monday or the 1st of every month, and the copies land on that exact day, with the pattern shown on a small badge on the task."
  ]},
  { id: "checkoff", t: "Checking things off", b: [
    "Tap the circle next to any task. You'll get a celebration on screen, a ta-da sound, and a buzz on phones that support it. Five celebration styles take turns, and big wins get the deluxe show.",
    "Tapped by accident? Tap it again and everything adjusts.",
    "Need it quiet? Tap the speaker icon in the header to mute every app sound. The visuals keep playing, and the app remembers your choice."
  ]},
  { id: "streaks", t: "Streaks and badges", b: [
    "Finish at least one task in a day and your streak grows. The flame with a number shows on Today and next to your name around the app.",
    "Sundays always count toward your streak. Saturdays count too, unless you scheduled tasks for that Saturday and left them undone.",
    "Badges live in the badge case here in Account. Locked ones show your progress toward them, and your top two show next to your name. Break a streak of three or more, then rebuild it, and the Comeback badge is yours.",
    "Tasks completed build your Mountain Level, shown as a small mountain with a number next to your name. Level 1 comes at 10 finished tasks, and the climb keeps going from there. The mountain changes as you rise: teal foothills to start, navy at level 4, a gold peak with a snow cap at level 7, and at level 10 it becomes a volcano.",
    "Every new badge and every new level sets off a full ceremony and posts the win to the community, so people can cheer for you."
  ]},
  { id: "partners", t: "Accountability partners", b: [
    "Partners see your weekly and monthly progress only. Nobody, partner included, ever sees your actual task list.",
    "Turn on I'm looking for a partner here in Account, and your name appears on everyone's Partners tab. Someone taps Ask to partner, you get a request with Accept and Decline, and accepting creates the partnership.",
    "Messaging works between partners only. With more than one partner, tap a name chip above the chat to switch threads. End partnership sits on every partner card."
  ]},
  { id: "teams", t: "Teams and Boss teams", b: [
    "On the Teams plan you can create named groups. Each team has its own member progress view and its own discussion room. Invite people by name, and they join from the invite card on their Partners tab.",
    "On the Boss plan, teams you create are boss teams. The owner assigns tasks with deadlines, sees every assignment and its status, and can remove assignments. Assigned work shows up on the member's Today tab marked Due today or Overdue.",
    "Inside a boss team, the hidden and private profile settings don't apply. Your boss and teammates can always open your profile, while everyone outside the team still sees only what your privacy settings allow.",
    "Even in a boss team, personal task lists stay personal. A boss sees the work the boss assigned.",
    "A boss can remove any member with the small X beside their name. You'll confirm first, and the member's unfinished assigned work drops into a holding tank inside the team, where you reassign each task or let it go. At launch, removing a member frees the seat the boss pays for.",
    "Boss plans include 7 member seats shared across all your boss teams, with extras at $9 a month each. One person on two of your teams uses one seat. The seat meter above your teams shows what's in use, and removing a member either frees an included seat or ends an extra charge on your next bill.",
    "Bosses also get a Your seats roster in Account: every seat holder with their photo, name, signup email, and which of your teams they're on."
  ]},
  { id: "community", t: "The community", b: [
    "Three rooms sit under Community: Questions, Wins, and Boosts. The tab you're on is the room you're posting in.",
    "The feed sorts three ways. Active is the default, and a fresh reply lifts a post back to the top, so good conversations stay alive. New shows posts in the order they were made. Top raises the most loved posts. The Milestones button hides or shows the automatic badge posts, and Show more loads the feed in batches.",
    "Replies stay tucked behind a count, like 3 replies, so the feed stays clean. Tap the count to open the conversation. Reply tags the poster with an @ for you, and the gold @ on any reply tags that person instead. The small gray smiley button opens reactions: heart, fire, thumbs up, prayer, and smile. Tap a reaction chip again to take yours back.",
    "Tap anyone's photo or name to open their profile: their bio, streak, best streak, Mountain Level, this month's progress, and every badge they've earned."
  ]},
  { id: "privacy", t: "Privacy and hiding", b: [
    "Check Keep me hidden here in Account and save. Your card leaves every list and nobody can find you by browsing. Progress numbers are the only thing the app ever shares about you, and hiding stops even that from being listed.",
    "Private profile is its own checkbox in Account. Turn it on and nobody can open your profile card, which keeps your badges, streaks, and bio to yourself. Your name and posts still show.",
    "New messages, reactions, and partner activity appear when you tap a refresh arrow or open the app again.",
    "Block anyone from their profile. Open a profile, tap Block this member, and their posts, replies, and messages vanish from your view. They're never notified. Unblock any time under Blocked members in your Account."
  ]},
  { id: "plans", t: "Plans and pricing", b: [
    "Standard is $17 a month or $170 a year with two months free. It holds the full planner, celebrations, community, and one accountability partner.",
    "Teams is $27 a month or $270 a year, adding unlimited partners and named groups. Boss is $97 a month or $970 a year with 7 member seats included and $9 a month per extra seat.",
    "Every new account starts with 14 days free, then rolls into Standard unless you choose a higher plan. Upgrades prorate, so unused time on your old plan counts toward the new one."
  ]},
  { id: "notifs", t: "Notifications", b: [
    "Notifications are on from day one. When you're away from the app, your device alerts you about new messages, partner requests, team invites, and freshly assigned work.",
    "Turn them off any time with the Notifications checkbox in Account, and flip them back on just as fast. Your browser or phone may ask for permission the first time, and alerts only work once you allow it."
  ]},
  { id: "faq", t: "Common questions", b: [
    "Q: Can anyone see my tasks?",
    "A: No. Partners and teammates see progress numbers only. In a boss team, the boss sees just the tasks the boss assigned.",
    "Q: Why didn't my streak break over the weekend?",
    "A: Sundays always count, and an unscheduled Saturday counts too. Rest was part of the design.",
    "Q: My partner's message isn't showing.",
    "A: Tap the refresh arrow on the Partners tab or open the app again, and it'll be there.",
    "Q: How do I move a task to a different day?",
    "A: Tap the pencil on the task, or just tell the calendar bar something like move it to Thursday.",
    "Q: How do I stop a repeating task?",
    "A: Tap its pencil, switch it to One time, and remove any leftover copies you don't want.",
    "Q: How do I turn the sound off?",
    "A: Tap the speaker icon in the header. The visuals keep playing, and sound stays off until you tap it again.",
    "Q: How do I reach a real person?",
    "A: Email clientcare@gettada.me and we'll take care of you."
  ]}
];

export default function App() {
  const [loading, setLoading] = useState(true);
  const [me, setMe] = useState(null);
  const [nameInput, setNameInput] = useState("");
  const [tasks, setTasks] = useState([]);
  const [view, setView] = useState("today");
  const [partners, setPartners] = useState([]);
  const [messages, setMessages] = useState([]);
  const [community, setCommunity] = useState([]);
  const [burst, setBurst] = useState(null);
  const [bigMsg, setBigMsg] = useState(false);
  const [ceremony, setCeremony] = useState(null);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ title: "", day: "auto", week: "1", block: "auto", big: false, repeat: "none", anchor: "" });
  const [editing, setEditing] = useState(null);
  const [msgText, setMsgText] = useState("");
  const [postText, setPostText] = useState("");
  const [postType, setPostType] = useState("win");
  const [replyFor, setReplyFor] = useState(null);
  const [replyText, setReplyText] = useState("");
  const [reactFor, setReactFor] = useState(null);
  const [openReplies, setOpenReplies] = useState([]);
  const [feedSort, setFeedSort] = useState("active");
  const [showMile, setShowMile] = useState(true);
  const [feedCount, setFeedCount] = useState(20);
  const [refreshing, setRefreshing] = useState(false);
  const [email, setEmail] = useState("");
  const [partner, setPartner] = useState("");
  const [hidden, setHidden] = useState(false);
  const [avatar, setAvatar] = useState("");
  const [stats, setStats] = useState(DEF_STATS);
  const [seeking, setSeeking] = useState(false);
  const [pairs, setPairs] = useState([]);
  const [requests, setRequests] = useState([]);
  const [chatWith, setChatWith] = useState(null);
  const [plan, setPlan] = useState("standard");
  const [teams, setTeams] = useState([]);
  const [teamMsgs, setTeamMsgs] = useState([]);
  const [openTeam, setOpenTeam] = useState(null);
  const [helpOpen, setHelpOpen] = useState(null);
  const [muted, setMuted] = useState(false);
  const [bio, setBio] = useState("");
  const [onb, setOnb] = useState({ tour: false, posted: false, done: false });
  const [onbOpen, setOnbOpen] = useState(false);
  const [showTour, setShowTour] = useState(false);
  const [viewProfile, setViewProfile] = useState(null);
  const [privProf, setPrivProf] = useState(false);
  const [blocked, setBlocked] = useState([]);
  const [confirmRemove, setConfirmRemove] = useState(null);
  const [notifOn, setNotifOn] = useState(true);
  const [teamName, setTeamName] = useState("");
  const [inviteText, setInviteText] = useState("");
  const [teamMsgText, setTeamMsgText] = useState("");
  const [assigned, setAssigned] = useState([]);
  const [assignTo, setAssignTo] = useState("");
  const [assignTitle, setAssignTitle] = useState("");
  const [assignDay, setAssignDay] = useState("none");
  const [acctName, setAcctName] = useState("");
  const [dumpText, setDumpText] = useState("");
  const [dumpBusy, setDumpBusy] = useState(false);
  const [dumpPreview, setDumpPreview] = useState([]);
  const [cmdText, setCmdText] = useState("");
  const [cmdBusy, setCmdBusy] = useState(false);
  const [cmdSay, setCmdSay] = useState("");
  const [listening, setListening] = useState(false);
  const chatEnd = useRef(null);
  const celebRef = useRef(0);
  const recogRef = useRef(null);
  const notifPrev = useRef(null);

  // ---------- shared data ----------
  const refreshShared = async () => {
    setRefreshing(true);
    try {
      const l = await window.storage.list("wd-progress-", true);
      const keys = (l && l.keys ? l.keys : []).slice(0, 10);
      const profs = [];
      for (const k of keys) {
        const p = await sget(k, true);
        if (p) profs.push(p);
      }
      profs.sort((a, b) => (b.updated || 0) - (a.updated || 0));
      setPartners(profs);
    } catch (e) { /* fine, partner list stays as is */ }
    const msgs = await sget("wd-messages", true);
    if (msgs) setMessages(msgs);
    const comm = await sget("wd-community", true);
    if (comm) setCommunity(comm);
    const prs = await sget("wd-pairs", true);
    if (prs) setPairs(prs);
    const rq = await sget("wd-requests", true);
    if (rq) setRequests(rq);
    const tms = await sget("wd-teams", true);
    if (tms) setTeams(tms);
    const tmm = await sget("wd-teammsgs", true);
    if (tmm) setTeamMsgs(tmm);
    const asg = await sget("wd-assigned", true);
    if (asg) setAssigned(asg);
    if (me) {
      const counts = {
        msgs: (msgs || messages).filter(m => slug(m.to || "") === slug(me)).length,
        reqs: (rq || requests).filter(r => slug(r.toName) === slug(me)).length,
        inv: (tms || teams).filter(t => (t.invites || []).some(n => slug(n) === slug(me))).length,
        asg: (asg || assigned).filter(a => slug(a.toName || "") === slug(me)).length
      };
      const prev = notifPrev.current;
      if (prev) {
        if (counts.msgs > prev.msgs) notify("TaDa", "You have a new message.");
        if (counts.reqs > prev.reqs) notify("TaDa", "Someone asked to be your accountability partner.");
        if (counts.inv > prev.inv) notify("TaDa", "You've been invited to a team.");
        if (counts.asg > prev.asg) notify("TaDa", "New work was assigned to you.");
      }
      notifPrev.current = counts;
    }
    setRefreshing(false);
  };

  useEffect(() => {
    (async () => {
      const mine = await sget("welldone-me");
      if (mine && mine.name) {
        setMe(mine.name);
        setTasks(rollover(mine.tasks || []));
        setEmail(mine.email || "");
        setPartner(mine.partner || "");
        setHidden(!!mine.hidden);
        setAvatar(mine.avatar || "");
        setStats({ ...DEF_STATS, ...(mine.stats || {}) });
        setMuted(!!mine.muted);
        setBio(mine.bio || "");
        setOnb({ tour: false, posted: false, done: false, ...(mine.onb || {}) });
        setPrivProf(!!mine.priv);
        setBlocked(mine.blocked || []);
        setNotifOn(mine.notif === undefined ? true : !!mine.notif);
        setSeeking(!!mine.seeking);
        setPlan(mine.plan || "standard");
        setAcctName(mine.name);
      }
      await refreshShared();
      setLoading(false);
    })();
  }, []);

  useEffect(() => {
    if (chatEnd.current) chatEnd.current.scrollIntoView({ behavior: "smooth" });
  }, [messages, view]);

  useEffect(() => { SOUND_ON = !muted; }, [muted]);

  const greetRef = useRef(false);
  useEffect(() => {
    if (loading || greetRef.current) return;
    greetRef.current = true;
    let spoke = false;
    const speak = () => {
      if (spoke || !SOUND_ON) return;
      if (TADA_URL) {
        try {
          tadaEl = tadaEl || new Audio(TADA_URL);
          tadaEl.currentTime = 0;
          tadaEl.play().then(() => { spoke = true; }).catch(() => {});
          return;
        } catch (e) { /* fall through */ }
      }
      try {
        if (!window.speechSynthesis) return;
        const u = new SpeechSynthesisUtterance("ta-daa!");
        u.rate = 0.95;
        u.pitch = 1.5;
        u.onstart = () => { spoke = true; };
        window.speechSynthesis.speak(u);
      } catch (e) { /* greeting is a bonus */ }
    };
    speak();
    const onFirstTap = () => {
      if (!spoke) speak();
      window.removeEventListener("pointerdown", onFirstTap);
    };
    window.addEventListener("pointerdown", onFirstTap);
    return () => window.removeEventListener("pointerdown", onFirstTap);
  }, [loading]);

  useEffect(() => {
    if (!me || !email) return;
    (async () => {
      const fresh = (await sget("wd-teams", true)) || [];
      let changed = false;
      const next = fresh.map(t => {
        if (t.kind === "boss" && (t.members || []).some(n => slug(n) === slug(me))) {
          const em = { ...(t.emails || {}) };
          if (em[slug(me)] !== email) {
            em[slug(me)] = email;
            changed = true;
            return { ...t, emails: em };
          }
        }
        return t;
      });
      if (changed) {
        await sset("wd-teams", next, true);
        setTeams(next);
      }
    })();
  }, [me, email, teams]);

  const publish = async (name, list, hid = hidden, seek = seeking, st = stats) => {
    const weeks = {};
    list.forEach(t => {
      const w = t.date ? weekOf(t.date) : t.week;
      if (!weeks[w]) weeks[w] = { done: 0, total: 0 };
      weeks[w].total += 1;
      if (t.done) weeks[w].done += 1;
    });
    await sset(`wd-progress-${slug(name)}`, {
      name,
      avatar: avatar || null,
      hidden: !!hid,
      seeking: !!seek && !hid,
      priv: !!privProf,
      streak: st.streak,
      bestStreak: st.bestStreak,
      badges: computeBadges(st, myPartnerNames.length > 0),
      bio: (bio || "").slice(0, 150),
      level: levelOf(st.totalDone),
      total: list.length,
      done: list.filter(t => t.done).length,
      weeks,
      updated: Date.now()
    }, true);
  };

  const persist = async (next, st = stats, name = me) => {
    setTasks(next);
    await sset("welldone-me", { name, email, partner, hidden, seeking, plan, avatar, muted, bio, onb, priv: privProf, blocked, notif: notifOn, stats: st, tasks: next });
    if (name) publish(name, next, hidden, seeking, st);
  };

  const start = async () => {
    const n = nameInput.trim();
    if (!n) return;
    setMe(n);
    setAcctName(n);
    try {
      if ("Notification" in window && Notification.permission === "default") Notification.requestPermission();
    } catch (e) { /* fine */ }
    await sset("welldone-me", { name: n, email, partner, hidden, seeking, plan, avatar, muted, bio, onb, priv: privProf, blocked, notif: notifOn, stats, tasks });
    publish(n, tasks);
    refreshShared();
  };

  // ---------- tasks ----------
  const bumpStats = (t, turningOn, list = tasks, base = stats) => {
    const s = { ...base, perfectKeys: [...(base.perfectKeys || [])] };
    const isMorning = t.block === "morning";
    if (turningOn) {
      s.totalDone += 1;
      if (t.big) s.bigDone += 1;
      if (isMorning) s.morningDone += 1;
      const td = todayStr();
      if (s.lastDoneDay !== td) {
        let credit = 1;
        let cont = false;
        if (s.lastDoneDay) {
          const dateOf = ds => new Date(parseInt(ds.slice(0, 4), 10), parseInt(ds.slice(5, 7), 10) - 1, parseInt(ds.slice(8), 10));
          const gap = Math.round((dateOf(td) - dateOf(s.lastDoneDay)) / 86400000);
          if (gap === 1) {
            cont = true;
          } else if (gap > 1 && gap <= 7) {
            cont = true;
            for (let i = 1; i < gap; i++) {
              const d = dateOf(s.lastDoneDay);
              d.setDate(d.getDate() + i);
              const ds = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
              const dow = d.getDay();
              const freeSaturday = dow === 6 && !list.some(x => x.date === ds && !x.done);
              if (dow === 0 || freeSaturday) continue;
              cont = false;
              break;
            }
            if (cont) credit = gap;
          }
        }
        if (cont) s.streak += credit;
        else {
          if (s.streak >= 3) s.comebacks += 1;
          s.streak = 1;
        }
        s.lastDoneDay = td;
        if (s.streak > s.bestStreak) s.bestStreak = s.streak;
      }
    } else {
      s.totalDone = Math.max(0, s.totalDone - 1);
      if (t.big) s.bigDone = Math.max(0, s.bigDone - 1);
      if (isMorning) s.morningDone = Math.max(0, s.morningDone - 1);
    }
    return s;
  };

  const toggle = t => {
    const turningOn = !t.done;
    const next = tasks.map(x =>
      x.id === t.id ? { ...x, done: turningOn, doneAt: turningOn ? Date.now() : null } : x
    );
    let s2 = bumpStats(t, turningOn, next);
    if (turningOn) {
      const wk = t.date ? weekOf(t.date) : t.week;
      const wt = next.filter(x => (x.date ? weekOf(x.date) : x.week) === wk);
      if (wt.length >= 3 && wt.every(x => x.done)) {
        const key = `${CUR_PREFIX}-w${wk}`;
        if (!s2.perfectKeys.includes(key)) {
          s2 = { ...s2, perfectKeys: [...s2.perfectKeys, key], perfectWeeks: s2.perfectWeeks + 1 };
        }
      }
    }
    setStats(s2);
    persist(next, s2);
    if (turningOn) {
      const nb = findNewBadge(stats, s2);
      const lvUp = levelOf(s2.totalDone) > levelOf(stats.totalDone) ? levelOf(s2.totalDone) : 0;
      if (nb) {
        fireCeremony(nb);
      } else if (lvUp) {
        fireCeremony({ id: `lvl${lvUp}`, e: "⛰️", name: `Mountain Level ${lvUp}` });
      } else {
        buzz(t.big);
        playChime(t.big);
        const kinds = ["fireworks", "confetti", "stars", "balloons", "streamers"];
        setBurst({ id: Date.now(), big: t.big, kind: kinds[celebRef.current % kinds.length] });
        celebRef.current += 1;
        if (t.big) {
          setBigMsg(true);
          setTimeout(() => setBigMsg(false), 2200);
        }
      }
    }
  };

  const addTask = () => {
    const title = form.title.trim();
    if (!title) return;
    const specific = form.day !== "auto";
    const date = specific ? dstr(parseInt(form.day, 10)) : null;
    const anchor = form.anchor === "" ? null : parseInt(form.anchor, 10);
    const solidBlock = form.block !== "auto" ? form.block : (form.big ? "morning" : "afternoon");
    const block = form.block !== "auto" ? form.block : (specific ? solidBlock : "auto");
    const tToday = new Date().getDate();
    const rootId = uid();
    const batch = [];

    if (form.repeat === "weekly" && anchor !== null) {
      for (let w = currentWeek; w <= WEEKS; w++) {
        const d = anchorDayInWeek(w, anchor);
        if (!d || (w === currentWeek && d < tToday)) continue;
        batch.push({ id: batch.length ? uid() : rootId, rootId, title, big: form.big, date: dstr(d), block: solidBlock, done: false, doneAt: null, week: w, repeat: "weekly", anchor });
      }
      if (!batch.length) {
        batch.push({ id: rootId, rootId, title, big: form.big, date: null, block: "auto", done: false, doneAt: null, week: currentWeek, repeat: "weekly", anchor });
      }
    } else if (form.repeat === "monthly" && anchor !== null) {
      const d = dstr(Math.min(anchor, DAYS));
      batch.push({ id: rootId, rootId, title, big: form.big, date: d, block: solidBlock, done: false, doneAt: null, week: weekOf(d), repeat: "monthly", anchor });
    } else {
      const base = {
        id: rootId, rootId, title, big: form.big, date, block, done: false, doneAt: null,
        week: specific ? weekOf(date) : parseInt(form.week, 10), repeat: form.repeat, anchor: null
      };
      batch.push(base);
      if (form.repeat === "weekly") {
        for (let w = currentWeek; w <= WEEKS; w++) {
          if (w === base.week) continue;
          batch.push({ id: uid(), rootId, title, big: form.big, date: null, block: "auto", done: false, doneAt: null, week: w, repeat: "weekly", anchor: null });
        }
      }
    }
    if (batch.length > 1) persist(organizeList([...tasks, ...batch]));
    else persist([...tasks, ...batch]);
    setForm({ title: "", day: "auto", week: form.week, block: "auto", big: false, repeat: "none", anchor: "" });
  };

  const organizeList = list => {
    const counts = {};
    list.forEach(t => { if (t.date) counts[t.date] = (counts[t.date] || 0) + 1; });
    const tToday = new Date().getDate();
    const next = list.map(t => ({ ...t }));
    const pending = next.filter(t => !t.date && !t.done);
    pending.sort((a, b) => (b.big ? 1 : 0) - (a.big ? 1 : 0));
    pending.forEach((t, i) => {
      const w = Math.min(WEEKS, Math.max(1, t.week || 1));
      const days = [...WEEKINFO[w - 1].days];
      let open = days.filter(d => new Date(YEAR, MONTH, d).getDay() !== 0 && d >= tToday);
      if (!open.length) open = days.filter(d => d >= tToday);
      if (!open.length) open = days.filter(d => new Date(YEAR, MONTH, d).getDay() !== 0);
      if (!open.length) open = days;
      let best = open[0];
      open.forEach(d => {
        if ((counts[dstr(d)] || 0) < (counts[dstr(best)] || 0)) best = d;
      });
      t.date = dstr(best);
      counts[t.date] = (counts[t.date] || 0) + 1;
      if (t.block === "auto") t.block = t.big ? "morning" : (i % 2 ? "evening" : "afternoon");
    });
    return next;
  };

  const organize = () => persist(organizeList(tasks));

  // Brain dump: free text (typed or dictated) becomes separate tasks
  const parseDump = async () => {
    const text = dumpText.trim();
    if (!text) return;
    setDumpBusy(true);
    let items = null;
    try {
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-6",
          max_tokens: 1000,
          messages: [{
            role: "user",
            content: `Someone poured out everything they need to get done this month. Today is ${MONTH_NAME} ${new Date().getDate()}. The month's weeks run Monday through Sunday: ${WEEKINFO.map(x => `week ${x.w} is ${x.label}`).join(", ")}. We're in week ${currentWeek}. Split their words into separate tasks. Respond with ONLY a JSON array, no other text and no code fences. Each item: {"title": short task in their own words, "week": a number from ${currentWeek} to ${WEEKS}, "big": true only if it sounds like a major project}. If their words hint at timing, honor it. Otherwise spread the tasks evenly across the remaining weeks. Their words: ${text}`
          }]
        })
      });
      const data = await response.json();
      const raw = data.content.map(i => i.text || "").join("\n").replace(/```json|```/g, "").trim();
      const arr = JSON.parse(raw);
      if (Array.isArray(arr)) {
        items = arr
          .filter(x => x && typeof x.title === "string" && x.title.trim())
          .map(x => ({
            title: x.title.trim().slice(0, 120),
            week: Math.min(WEEKS, Math.max(1, parseInt(x.week, 10) || currentWeek)),
            big: !!x.big
          }));
      }
    } catch (e) { /* fall through to the simple splitter */ }
    if (!items || !items.length) {
      const span = Math.max(1, WEEKS - currentWeek + 1);
      items = text
        .split(/\n|\.|,|;| and | then /i)
        .map(s => s.trim())
        .filter(s => s.length > 2)
        .map((title, i) => ({ title, week: currentWeek + (i % span), big: false }));
    }
    setDumpPreview(items);
    setDumpBusy(false);
  };

  const addDumped = () => {
    if (!dumpPreview.length) return;
    const fresh = dumpPreview.map(x => ({
      id: uid(), title: x.title, big: x.big, date: null, block: "auto",
      week: x.week, done: false, doneAt: null
    }));
    persist(organizeList([...tasks, ...fresh]));
    setDumpPreview([]);
    setDumpText("");
  };

  const notify = (title, body) => {
    try {
      if (!notifOn) return;
      if (!("Notification" in window)) return;
      if (Notification.permission !== "granted") return;
      if (!document.hidden) return;
      new Notification(title, { body });
    } catch (e) { /* alerts are a bonus */ }
  };

  const toggleNotif = () => {
    const next = !notifOn;
    setNotifOn(next);
    if (next) {
      try {
        if ("Notification" in window && Notification.permission === "default") Notification.requestPermission();
      } catch (e) { /* fine */ }
    }
    sset("welldone-me", { name: me, email, partner, hidden, seeking, plan, avatar, muted, bio, onb, priv: privProf, blocked, notif: next, stats, tasks });
  };

  const toggleMute = () => {
    const next = !muted;
    setMuted(next);
    SOUND_ON = !next;
    sset("welldone-me", { name: me, email, partner, hidden, seeking, plan, avatar, muted: next, bio, onb, priv: privProf, blocked, notif: notifOn, stats, tasks });
  };

  const onPickAvatar = e => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const c = document.createElement("canvas");
        const S = 96;
        c.width = S;
        c.height = S;
        const ctx = c.getContext("2d");
        const side = Math.min(img.width, img.height);
        const sx = (img.width - side) / 2;
        const sy = (img.height - side) / 2;
        ctx.drawImage(img, sx, sy, side, side, 0, 0, S, S);
        setAvatar(c.toDataURL("image/jpeg", 0.75));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  };

  const saveAccount = async () => {
    const n = acctName.trim() || me;
    const p = partner.trim();
    setMe(n);
    setPartner(p);
    await sset("welldone-me", { name: n, email: email.trim(), partner: p, hidden, seeking, plan, avatar, muted, bio: bio.slice(0, 150), onb, priv: privProf, blocked, notif: notifOn, stats, tasks });
    publish(n, tasks, hidden, seeking);
    setView("today");
  };

  // ---------- talk to the calendar ----------
  const validDate = d => {
    if (typeof d !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(d)) return null;
    if (!d.startsWith(CUR_PREFIX)) return null;
    const day = parseInt(d.slice(8), 10);
    return day >= 1 && day <= DAYS ? d : null;
  };
  const clampWeek = w => Math.min(WEEKS, Math.max(1, parseInt(w, 10) || currentWeek));

  const applyOps = ops => {
    let next = [...tasks];
    ops.forEach(o => {
      if (!o || typeof o !== "object") return;
      if (o.op === "add" && o.title) {
        const id = uid();
        const d = validDate(o.date);
        next.push({
          id, rootId: id, title: String(o.title).slice(0, 120), big: !!o.big,
          done: false, doneAt: null, date: d,
          block: BLOCKS.some(b => b.id === o.block) ? o.block : "auto",
          week: d ? weekOf(d) : clampWeek(o.week),
          repeat: ["weekly", "monthly"].includes(o.repeat) ? o.repeat : "none"
        });
        return;
      }
      if (!o.id) return;
      if (o.op === "remove") {
        next = next.filter(t => t.id !== o.id);
        return;
      }
      next = next.map(t => {
        if (t.id !== o.id) return t;
        if (o.op === "move") {
          const d = o.date === null ? null : validDate(o.date);
          return {
            ...t, date: d,
            week: d ? weekOf(d) : clampWeek(o.week || t.week),
            block: BLOCKS.some(b => b.id === o.block) ? o.block : t.block
          };
        }
        if (o.op === "edit") {
          return {
            ...t,
            title: o.title ? String(o.title).slice(0, 120) : t.title,
            big: o.big === undefined ? t.big : !!o.big,
            block: BLOCKS.some(b => b.id === o.block) ? o.block : t.block,
            repeat: ["weekly", "monthly", "none"].includes(o.repeat) ? o.repeat : t.repeat
          };
        }
        if (o.op === "complete") return { ...t, done: true, doneAt: Date.now() };
        if (o.op === "uncomplete") return { ...t, done: false, doneAt: null };
        return t;
      });
    });
    return next;
  };

  const runCommand = async (spoken) => {
    const text = (typeof spoken === "string" ? spoken : cmdText).trim();
    if (!text || cmdBusy) return;
    setCmdBusy(true);
    setCmdSay("");
    try {
      const brief = tasks.map(t => ({
        id: t.id, title: t.title, date: t.date,
        week: t.date ? weekOf(t.date) : t.week,
        block: t.block, done: t.done, big: !!t.big, repeat: t.repeat || "none"
      }));
      const tNow = new Date();
      const tmr = new Date(tNow.getFullYear(), tNow.getMonth(), tNow.getDate() + 1);
      const tmrStr = tmr.getMonth() === MONTH ? `${tmr.getFullYear()}-${pad(tmr.getMonth() + 1)}-${pad(tmr.getDate())}` : null;
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-6",
          max_tokens: 1000,
          messages: [{
            role: "user",
            content: `You manage someone's monthly planner. Today is ${todayStr()}. ${tmrStr ? `Tomorrow is ${tmrStr}. ` : ""}Weeks run Monday through Sunday: ${WEEKINFO.map(x => `week ${x.w} is ${x.label}`).join(", ")}. They said: "${text}". Their tasks: ${JSON.stringify(brief)}. Turn their request into operations. Respond ONLY with JSON, no code fences: {"ops":[...],"say":"one short friendly sentence about what you did"}. Allowed ops: {"op":"move","id":"...","date":"YYYY-MM-DD"} puts a task on a day (or use "date":null with "week":N to leave it unscheduled in that week), optional "block":"morning"|"afternoon"|"evening". {"op":"remove","id":"..."}. {"op":"add","title":"...","date":"YYYY-MM-DD" or "week":N,"block":...,"big":true,"repeat":"none"|"weekly"|"monthly"}. {"op":"edit","id":"...","title","big","block","repeat"}. {"op":"complete","id":"..."} and {"op":"uncomplete","id":"..."}. Match tasks loosely by meaning. All dates must fall inside this month. If nothing matches or the request is unclear, use "ops":[] and put a short question in "say".`
          }]
        })
      });
      const data = await response.json();
      const raw = data.content.map(i => i.text || "").join("\n").replace(/```json|```/g, "").trim();
      const out = JSON.parse(raw);
      const ops = Array.isArray(out.ops) ? out.ops : [];
      if (ops.length) persist(applyOps(ops));
      setCmdSay(out.say || (ops.length ? "Done." : "I couldn't match that to anything on the calendar."));
      if (ops.length) setCmdText("");
    } catch (e) {
      setCmdSay("That one didn't go through. Say it a little differently and I'll get it.");
    }
    setCmdBusy(false);
  };

  const startListening = () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
      setCmdSay("Voice listening isn't supported in this browser. Use the mic on your phone keyboard instead.");
      return;
    }
    if (listening && recogRef.current) {
      recogRef.current.stop();
      return;
    }
    const r = new SR();
    recogRef.current = r;
    r.lang = "en-US";
    r.interimResults = true;
    let finalText = "";
    r.onresult = ev => {
      let txt = "";
      for (let i = 0; i < ev.results.length; i++) txt += ev.results[i][0].transcript;
      setCmdText(txt);
      if (ev.results[ev.results.length - 1].isFinal) finalText = txt;
    };
    r.onend = () => {
      setListening(false);
      if (finalText.trim()) runCommand(finalText);
    };
    r.onerror = () => setListening(false);
    setListening(true);
    r.start();
  };

  const saveEdit = () => {
    const e = editing;
    if (!e || !e.title.trim()) return;
    const rootId = e.rootId || e.id;
    const title = e.title.trim();
    const anchor = e.anchor === undefined ? null : e.anchor;
    const tToday = new Date().getDate();
    const solidBlock = e.block && e.block !== "auto" ? e.block : (e.big ? "morning" : "afternoon");
    let next = tasks.map(t =>
      t.id === e.id ? { ...e, rootId, anchor, title, week: e.date ? weekOf(e.date) : e.week } : t
    );

    if (e.repeat === "weekly" && anchor !== null) {
      next = next.map(t => {
        if ((t.rootId || t.id) !== rootId || t.done) return t;
        const w = t.date ? weekOf(t.date) : t.week;
        const d = anchorDayInWeek(w, anchor);
        return d
          ? { ...t, title, repeat: "weekly", anchor, date: dstr(d), week: w, block: solidBlock, big: !!e.big }
          : { ...t, title, repeat: "weekly", anchor };
      });
      for (let w = currentWeek; w <= WEEKS; w++) {
        const d = anchorDayInWeek(w, anchor);
        if (!d || (w === currentWeek && d < tToday)) continue;
        const has = next.some(t => (t.rootId || t.id) === rootId && (t.date ? weekOf(t.date) : t.week) === w);
        if (!has) {
          next = [...next, { id: uid(), rootId, title, big: !!e.big, date: dstr(d), block: solidBlock, done: false, doneAt: null, week: w, repeat: "weekly", anchor }];
        }
      }
    } else if (e.repeat === "weekly") {
      for (let w = currentWeek; w <= WEEKS; w++) {
        const has = next.some(t => (t.rootId || t.id) === rootId && (t.date ? weekOf(t.date) : t.week) === w);
        if (!has) {
          next = [...next, { id: uid(), rootId, title, big: !!e.big, date: null, block: "auto", done: false, doneAt: null, week: w, repeat: "weekly", anchor: null }];
        }
      }
      next = organizeList(next);
    } else if (e.repeat === "monthly" && anchor !== null) {
      const d = dstr(Math.min(anchor, DAYS));
      next = next.map(t => t.id === e.id ? { ...t, date: d, week: weekOf(d), block: solidBlock } : t);
    }
    persist(next);
    setEditing(null);
  };

  const removeTask = id => {
    persist(tasks.filter(t => t.id !== id));
    setEditing(null);
  };

  // ---------- partner chat ----------
  const sendMsg = async () => {
    const text = msgText.trim();
    if (!text || !activeChat) return;
    setMsgText("");
    const fresh = (await sget("wd-messages", true)) || [];
    const next = [...fresh, { id: uid(), from: me, to: activeChat, text, ts: Date.now() }].slice(-200);
    await sset("wd-messages", next, true);
    setMessages(next);
  };

  // ---------- community ----------
  const addPost = async () => {
    const text = postText.trim();
    if (!text) return;
    setPostText("");
    const fresh = (await sget("wd-community", true)) || [];
    const next = [...fresh, {
      id: uid(), from: me, type: postType, text, ts: Date.now(), replies: []
    }].slice(-100);
    await sset("wd-community", next, true);
    setCommunity(next);
    if (!onb.posted) {
      const o2 = { ...onb, posted: true };
      setOnb(o2);
      sset("welldone-me", { name: me, email, partner, hidden, seeking, plan, avatar, muted, bio, onb: o2, priv: privProf, blocked, notif: notifOn, stats, tasks });
    }
    if (postType === "boost") bumpEncourage();
  };

  const addReply = async pid => {
    const text = replyText.trim();
    if (!text) return;
    const fresh = (await sget("wd-community", true)) || [];
    const next = fresh.map(p =>
      p.id === pid
        ? { ...p, replies: [...(p.replies || []), { id: uid(), from: me, text, ts: Date.now() }] }
        : p
    );
    await sset("wd-community", next, true);
    setCommunity(next);
    setReplyFor(null);
    setReplyText("");
    bumpEncourage();
  };

  const toggleReact = async (pid, rid) => {
    const mySlug = slug(me || "");
    const before = community.find(p => p.id === pid);
    const wasMine = !!(before && before.reactions && (before.reactions[rid] || []).includes(mySlug));
    const apply = list => list.map(p => {
      if (p.id !== pid) return p;
      const reactions = { ...(p.reactions || {}) };
      const arr = reactions[rid] || [];
      reactions[rid] = arr.includes(mySlug) ? arr.filter(x => x !== mySlug) : [...arr, mySlug];
      return { ...p, reactions };
    });
    // show it on screen instantly, then save behind the scenes
    setCommunity(apply(community));
    try {
      const fresh = (await sget("wd-community", true)) || [];
      const next = apply(fresh);
      await sset("wd-community", next, true);
      setCommunity(next);
    } catch (e) { /* the on-screen tap stands; the save retries on next action */ }
    if (!wasMine) bumpEncourage();
  };

  // ---------- partner requests and pairs ----------
  const pairedWith = name =>
    pairs.some(pr =>
      (slug(pr.aName) === slug(me || "") && slug(pr.bName) === slug(name)) ||
      (slug(pr.bName) === slug(me || "") && slug(pr.aName) === slug(name))
    ) || (partner && slug(partner) === slug(name));

  const sendRequest = async name => {
    const fresh = (await sget("wd-requests", true)) || [];
    const dup = fresh.some(r =>
      (slug(r.fromName) === slug(me) && slug(r.toName) === slug(name)) ||
      (slug(r.fromName) === slug(name) && slug(r.toName) === slug(me))
    );
    if (dup || pairedWith(name)) {
      setRequests(fresh);
      return;
    }
    const next = [...fresh, { id: uid(), fromName: me, toName: name, ts: Date.now() }].slice(-100);
    await sset("wd-requests", next, true);
    setRequests(next);
  };

  const acceptRequest = async req => {
    const freshR = (await sget("wd-requests", true)) || [];
    const nextR = freshR.filter(r => r.id !== req.id);
    await sset("wd-requests", nextR, true);
    setRequests(nextR);
    const freshP = (await sget("wd-pairs", true)) || [];
    const nextP = [...freshP, { id: uid(), aName: req.fromName, bName: req.toName, ts: Date.now() }].slice(-200);
    await sset("wd-pairs", nextP, true);
    setPairs(nextP);
  };

  const declineRequest = async req => {
    const freshR = (await sget("wd-requests", true)) || [];
    const nextR = freshR.filter(r => r.id !== req.id);
    await sset("wd-requests", nextR, true);
    setRequests(nextR);
  };

  const endPartnership = async name => {
    const freshP = (await sget("wd-pairs", true)) || [];
    const nextP = freshP.filter(pr => !(
      (slug(pr.aName) === slug(me) && slug(pr.bName) === slug(name)) ||
      (slug(pr.bName) === slug(me) && slug(pr.aName) === slug(name))
    ));
    await sset("wd-pairs", nextP, true);
    setPairs(nextP);
    if (partner && slug(partner) === slug(name)) setPartner("");
  };

  // ---------- teams (upgrade) ----------
  const TEAM_CAP = 50;

  const createTeam = async () => {
    const name = teamName.trim();
    if (!name) return;
    const fresh = (await sget("wd-teams", true)) || [];
    const next = [...fresh, { id: uid(), name: name.slice(0, 40), kind: plan === "boss" ? "boss" : "standard", ownerName: me, members: [me], invites: [], emails: { [slug(me)]: email || "" }, ts: Date.now() }].slice(-100);
    await sset("wd-teams", next, true);
    setTeams(next);
    setTeamName("");
  };

  const inviteToTeam = async (teamId, name) => {
    const who = name.trim();
    if (!who) return;
    const fresh = (await sget("wd-teams", true)) || [];
    const next = fresh.map(t => {
      if (t.id !== teamId) return t;
      const already = t.members.some(n => slug(n) === slug(who)) || (t.invites || []).some(n => slug(n) === slug(who));
      if (already || t.members.length + (t.invites || []).length >= TEAM_CAP) return t;
      return { ...t, invites: [...(t.invites || []), who] };
    });
    await sset("wd-teams", next, true);
    setTeams(next);
    setInviteText("");
  };

  const answerTeamInvite = async (teamId, join) => {
    const fresh = (await sget("wd-teams", true)) || [];
    const next = fresh.map(t => {
      if (t.id !== teamId) return t;
      const invites = (t.invites || []).filter(n => slug(n) !== slug(me));
      const members = join && t.members.length < TEAM_CAP && !t.members.some(n => slug(n) === slug(me))
        ? [...t.members, me]
        : t.members;
      const emails = join && t.kind === "boss"
        ? { ...(t.emails || {}), [slug(me)]: email || "" }
        : (t.emails || {});
      return { ...t, invites, members, emails };
    });
    await sset("wd-teams", next, true);
    setTeams(next);
  };

  const leaveTeam = async teamId => {
    const fresh = (await sget("wd-teams", true)) || [];
    const target = fresh.find(t => t.id === teamId);
    const next = target && slug(target.ownerName) === slug(me)
      ? fresh.filter(t => t.id !== teamId)
      : fresh.map(t => t.id === teamId ? { ...t, members: t.members.filter(n => slug(n) !== slug(me)) } : t);
    await sset("wd-teams", next, true);
    setTeams(next);
    if (openTeam === teamId) setOpenTeam(null);
  };

  const removeMember = async (teamId, name) => {
    const fresh = (await sget("wd-teams", true)) || [];
    const next = fresh.map(t => t.id === teamId ? { ...t, members: t.members.filter(n => slug(n) !== slug(name)) } : t);
    await sset("wd-teams", next, true);
    setTeams(next);
    const fa = (await sget("wd-assigned", true)) || [];
    const na = fa
      .filter(a => !(a.teamId === teamId && slug(a.toName || "") === slug(name) && a.done))
      .map(a =>
        a.teamId === teamId && slug(a.toName || "") === slug(name) && !a.done
          ? { ...a, toName: null }
          : a
      );
    await sset("wd-assigned", na, true);
    setAssigned(na);
  };

  const reassignTask = async (id, name) => {
    if (!name) return;
    const fresh = (await sget("wd-assigned", true)) || [];
    const next = fresh.map(a => a.id === id ? { ...a, toName: name } : a);
    await sset("wd-assigned", next, true);
    setAssigned(next);
  };

  const blockUser = name => {
    if (!name || slug(name) === slug(me || "")) return;
    if (blocked.some(n => slug(n) === slug(name))) return;
    const next = [...blocked, name];
    setBlocked(next);
    sset("welldone-me", { name: me, email, partner, hidden, seeking, plan, avatar, muted, bio, onb, priv: privProf, blocked: next, notif: notifOn, stats, tasks });
    setViewProfile(null);
  };

  const unblockUser = name => {
    const next = blocked.filter(n => slug(n) !== slug(name));
    setBlocked(next);
    sset("welldone-me", { name: me, email, partner, hidden, seeking, plan, avatar, muted, bio, onb, priv: privProf, blocked: next, notif: notifOn, stats, tasks });
  };

  const sendTeamMsg = async teamId => {
    const text = teamMsgText.trim();
    if (!text) return;
    setTeamMsgText("");
    const fresh = (await sget("wd-teammsgs", true)) || [];
    const next = [...fresh, { id: uid(), from: me, team: teamId, text, ts: Date.now() }].slice(-300);
    await sset("wd-teammsgs", next, true);
    setTeamMsgs(next);
  };

  // ---------- boss level: assigned work ----------
  const assignTask = async teamId => {
    const title = assignTitle.trim();
    if (!title || !assignTo) return;
    const fresh = (await sget("wd-assigned", true)) || [];
    const next = [...fresh, {
      id: uid(), teamId, toName: assignTo, fromName: me,
      title: title.slice(0, 120),
      date: assignDay === "none" ? null : dstr(parseInt(assignDay, 10)),
      done: false, doneAt: null, ts: Date.now()
    }].slice(-300);
    await sset("wd-assigned", next, true);
    setAssigned(next);
    setAssignTitle("");
  };

  const toggleAssigned = async a => {
    const turningOn = !a.done;
    const fresh = (await sget("wd-assigned", true)) || [];
    const next = fresh.map(x => x.id === a.id ? { ...x, done: turningOn, doneAt: turningOn ? Date.now() : null } : x);
    await sset("wd-assigned", next, true);
    setAssigned(next);
    const s2 = bumpStats({ block: null, big: false }, turningOn);
    setStats(s2);
    sset("welldone-me", { name: me, email, partner, hidden, seeking, plan, avatar, muted, bio, onb, priv: privProf, blocked, notif: notifOn, stats: s2, tasks });
    publish(me, tasks, hidden, seeking, s2);
    if (turningOn) {
      const nb = findNewBadge(stats, s2);
      const lvUp = levelOf(s2.totalDone) > levelOf(stats.totalDone) ? levelOf(s2.totalDone) : 0;
      if (nb) {
        fireCeremony(nb);
      } else if (lvUp) {
        fireCeremony({ id: `lvl${lvUp}`, e: "⛰️", name: `Mountain Level ${lvUp}` });
      } else {
        buzz(false);
        playChime(false);
        const kinds = ["fireworks", "confetti", "stars", "balloons", "streamers"];
        setBurst({ id: Date.now(), big: false, kind: kinds[celebRef.current % kinds.length] });
        celebRef.current += 1;
      }
    }
  };

  const removeAssigned = async id => {
    const fresh = (await sget("wd-assigned", true)) || [];
    const next = fresh.filter(x => x.id !== id);
    await sset("wd-assigned", next, true);
    setAssigned(next);
  };

  const bumpEncourage = () => {
    const s2 = { ...stats, encourages: (stats.encourages || 0) + 1 };
    setStats(s2);
    sset("welldone-me", { name: me, email, partner, hidden, seeking, plan, avatar, muted, bio, onb, priv: privProf, blocked, notif: notifOn, stats: s2, tasks });
    publish(me, tasks, hidden, seeking, s2);
    const nb = findNewBadge(stats, s2);
    if (nb) fireCeremony(nb);
  };

  const findNewBadge = (before, after) => {
    const hp = pairs.length > 0 || !!partner;
    const prev = computeBadges(before, hp);
    const now = computeBadges(after, hp);
    return now.find(b => !prev.some(p => p.id === b.id)) || null;
  };

  const announceMilestone = async b => {
    const fresh = (await sget("wd-community", true)) || [];
    const next = [...fresh, {
      id: uid(), from: me, type: "win", milestone: true,
      text: `${b.e} ${me} just earned the ${b.name} badge!`,
      ts: Date.now(), replies: []
    }].slice(-100);
    await sset("wd-community", next, true);
    setCommunity(next);
  };

  const fireCeremony = (b, opts = {}) => {
    setCeremony({
      id: Date.now(),
      badge: b,
      line1: opts.line1 || "New badge earned. This is a big deal.",
      line2: opts.line2 || "Your win was just posted so the community can cheer."
    });
    setBurst({ id: Date.now() + 1, big: true, kind: opts.kind || "grand" });
    playGrand();
    try { if (navigator.vibrate) navigator.vibrate([80, 50, 80, 50, 300, 100, 400]); } catch (e) { /* bonus */ }
    setTimeout(() => setCeremony(null), 4200);
    if (opts.announce !== false) announceMilestone(b);
  };

  // ---------- derived ----------
  const today = todayStr();
  const currentWeek = weekOf(today);
  const todays = tasks.filter(t => t.date === today);
  const todayDone = todays.filter(t => t.done).length;
  const monthTotal = tasks.length;
  const monthDone = tasks.filter(t => t.done).length;
  const weekRows = [];
  for (let w = 1; w <= WEEKS; w++) {
    const wt = tasks.filter(t => (t.date ? weekOf(t.date) : t.week) === w);
    weekRows.push({ w, total: wt.length, done: wt.filter(t => t.done).length });
  }
  const thisWeek = weekRows[currentWeek - 1] || { total: 0, done: 0 };
  const doy = Math.floor((Date.now() - new Date(YEAR, 0, 0).getTime()) / 86400000);
  const quote = QUOTES[doy % QUOTES.length];
  const profOf = name => partners.find(p => slug(p.name) === slug(name));
  const avatarOf = name => {
    if (slug(name || "") === slug(me || "")) return avatar;
    const p = profOf(name);
    return p ? p.avatar : null;
  };
  const myBadges = computeBadges(stats, pairs.length > 0 || !!partner);
  const stripFor = name => slug(name || "") === slug(me || "")
    ? { streak: stats.streak, badges: myBadges, level: levelOf(stats.totalDone) }
    : (profOf(name) || {});
  const isBlocked = name => blocked.some(n => slug(n) === slug(name || ""));
  const myPartnerNames = (() => {
    const names = [];
    pairs.forEach(pr => {
      if (slug(pr.aName) === slug(me || "")) names.push(pr.bName);
      else if (slug(pr.bName) === slug(me || "")) names.push(pr.aName);
    });
    if (partner && !names.some(n => slug(n) === slug(partner))) names.push(partner);
    return names;
  })();
  const activeChat = chatWith && myPartnerNames.some(n => slug(n) === slug(chatWith))
    ? chatWith
    : (myPartnerNames[0] || null);
  const thread = activeChat
    ? messages.filter(m =>
        !isBlocked(m.from) && (
        (slug(m.from) === slug(me || "")) && (slug(m.to || "") === slug(activeChat)) ||
        (slug(m.from) === slug(activeChat)) && (slug(m.to || "") === slug(me || ""))))
    : [];
  const incoming = requests.filter(r => slug(r.toName) === slug(me || ""));
  const outgoing = requests.filter(r => slug(r.fromName) === slug(me || ""));
  const seekers = partners.filter(p =>
    p.seeking && !p.hidden &&
    !isBlocked(p.name) &&
    slug(p.name) !== slug(me || "") &&
    !myPartnerNames.some(n => slug(n) === slug(p.name))
  );
  const myTeams = teams.filter(t => (t.members || []).some(n => slug(n) === slug(me || "")));
  const teamInvitesForMe = teams.filter(t => (t.invites || []).some(n => slug(n) === slug(me || "")));
  const inMyBossGroup = name =>
    teams.some(t =>
      t.kind === "boss" &&
      (t.members || []).some(n => slug(n) === slug(me || "")) &&
      (t.members || []).some(n => slug(n) === slug(name || ""))
    );
  const bossSeatNames = (() => {
    const set = [];
    teams.forEach(t => {
      if (t.kind === "boss" && slug(t.ownerName) === slug(me || "")) {
        (t.members || []).forEach(n => {
          if (slug(n) !== slug(me || "") && !set.some(x => slug(x) === slug(n))) set.push(n);
        });
      }
    });
    return set;
  })();
  const seatCount = bossSeatNames.length;
  const seatExtra = Math.max(0, seatCount - 7);
  const assignedToMe = assigned.filter(a =>
    slug(a.toName) === slug(me || "") && myTeams.some(t => t.id === a.teamId)
  );
  const onbItems = [
    { id: "tour", label: "Watch the welcome tour", done: !!onb.tour },
    { id: "task", label: "Add your first task", done: tasks.length > 0 },
    { id: "check", label: "Check one off", done: stats.totalDone > 0 },
    { id: "hello", label: "Say hi in the community", done: !!onb.posted },
    { id: "partner", label: "Reach out for a partner", done: myPartnerNames.length > 0 || outgoing.length > 0 }
  ];
  const onbDoneCount = onbItems.filter(i => i.done).length;

  useEffect(() => {
    if (me && !onb.done && onbDoneCount === onbItems.length) {
      const o2 = { ...onb, done: true };
      setOnb(o2);
      sset("welldone-me", { name: me, email, partner, hidden, seeking, plan, avatar, muted, bio, onb: o2, priv: privProf, blocked, notif: notifOn, stats, tasks });
      fireCeremony(
        { id: "onb", e: "🎉", name: "You're all set!" },
        { announce: false, kind: "confetti", line1: "Setup complete. Look at you go.", line2: "The whole app is yours now." }
      );
    }
  }, [onbDoneCount, me]);

  const QuoteCard = ({ q }) => (
    <div className="rounded-2xl p-4 mb-4" style={{ background: "#fff", borderLeft: `4px solid ${C.gold}` }}>
      <div
        className="text-sm leading-relaxed"
        style={{ color: C.ink, fontFamily: "Georgia, serif", fontStyle: "italic" }}
      >
        "{q.text}"
      </div>
      {q.by && (
        <div className="mt-1.5 text-xs font-semibold" style={{ color: C.gold, letterSpacing: 0.5 }}>
          {q.by}
        </div>
      )}
    </div>
  );

  const TaskRow = ({ t, showDay }) => (
    <div
      className="flex items-center gap-3 rounded-xl px-3 py-3 mb-2"
      style={{ background: "#fff", opacity: t.done ? 0.65 : 1 }}
    >
      <button onClick={() => toggle(t)} className="shrink-0">
        {t.done
          ? <CheckCircle2 size={24} style={{ color: C.teal }} />
          : <Circle size={24} style={{ color: C.fade }} />}
      </button>
      <div className="flex-1 min-w-0">
        <div
          className="text-sm font-medium truncate"
          style={{ color: C.ink, textDecoration: t.done ? "line-through" : "none" }}
        >
          {t.big && <Star size={13} className="inline mr-1" style={{ color: C.gold, fill: C.gold }} />}
          {t.title}
        </div>
        <div className="flex gap-1.5 mt-1 flex-wrap">
          {showDay && <Chip>{t.date ? dayLabel(t.date) : "Day TBD"}</Chip>}
          <Chip color={C.navy2} bg={C.goldSoft}>
            {t.block === "auto" ? "Time TBD" : BLOCKS.find(b => b.id === t.block).label}
          </Chip>
          {t.repeat === "weekly" && (
            <Chip color={C.teal} bg="#DDF0EA">
              {t.anchor === null || t.anchor === undefined ? "Weekly" : `Every ${WD[t.anchor]}`}
            </Chip>
          )}
          {t.repeat === "monthly" && (
            <Chip color={C.coral} bg="#FFE2DB">
              {t.anchor ? `Monthly, the ${ord(t.anchor)}` : "Monthly"}
            </Chip>
          )}
        </div>
      </div>
      <button onClick={() => setEditing({ ...t })} className="shrink-0 p-1">
        <Pencil size={16} style={{ color: C.fade }} />
      </button>
    </div>
  );

  // ---------- screens ----------
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: C.cream }}>
        <div className="text-center">
          <div style={{ fontFamily: "Georgia, serif", fontStyle: "italic", fontSize: 34, color: C.navy }}>
            TaDa<span style={{ color: C.gold }}>!</span>
          </div>
          <div className="mt-2 text-sm" style={{ color: C.fade }}>Setting up your month...</div>
        </div>
      </div>
    );
  }

  if (!me) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6" style={{ background: C.navy }}>
        <div className="w-full max-w-sm rounded-3xl p-8 text-center shadow-xl" style={{ background: C.cream }}>
          <div style={{ fontFamily: "Georgia, serif", fontStyle: "italic", fontSize: 40, color: C.navy }}>
            TaDa<span style={{ color: C.gold }}>!</span>
          </div>
          <p className="mt-3 text-sm leading-relaxed" style={{ color: C.ink }}>
            Plan your month once. Show up for today. Celebrate every win along the way.
          </p>
          <input
            className="mt-6 w-full rounded-xl px-4 py-3 text-center outline-none border"
            style={{ borderColor: C.line, background: "#fff", color: C.ink }}
            placeholder="Your first name"
            value={nameInput}
            onChange={e => setNameInput(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") start(); }}
          />
          <button
            onClick={start}
            className="mt-4 w-full rounded-xl py-3 font-semibold"
            style={{ background: C.coral, color: "#fff" }}
          >
            Let's go
          </button>
          <p className="mt-4 text-xs" style={{ color: C.fade }}>
            Your name shows on your progress card and posts, so partners know it's you.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: C.cream }}>
      {/* header */}
      <div
        className="sticky top-0 z-40 px-5 py-4 flex items-center justify-between shadow"
        style={{ background: C.navy }}
      >
        <div style={{ fontFamily: "Georgia, serif", fontStyle: "italic", fontSize: 24, color: C.cream }}>
          TaDa<span style={{ color: C.gold }}>!</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-sm" style={{ color: C.goldSoft }}>{MONTH_NAME} {YEAR}</div>
          <button onClick={toggleMute} aria-label="Sound">
            {muted
              ? <VolumeX size={20} style={{ color: C.fade }} />
              : <Volume2 size={20} style={{ color: C.cream }} />}
          </button>
          <button onClick={() => setView("account")} aria-label="Account">
            <UserCircle size={24} style={{ color: view === "account" ? C.gold : C.cream }} />
          </button>
        </div>
      </div>

      <div className="max-w-md mx-auto pb-24">

        {/* talk to the calendar */}
        {["today", "plan", "timeline"].includes(view) && (
          <div className="px-5 pt-4">
            <div className="flex gap-2">
              <button
                onClick={startListening}
                className="rounded-xl px-3"
                style={{ background: listening ? C.coral : C.navy }}
              >
                <Mic size={18} style={{ color: "#fff" }} className={listening ? "animate-pulse" : ""} />
              </button>
              <input
                className="flex-1 rounded-xl px-3 py-2.5 border outline-none text-sm"
                style={{ borderColor: listening ? C.coral : C.line, background: "#fff", color: C.ink }}
                placeholder={listening ? "Listening..." : "Tap the mic and say the change..."}
                value={cmdText}
                onChange={e => setCmdText(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") runCommand(); }}
              />
              <button
                onClick={runCommand}
                disabled={cmdBusy}
                className="rounded-xl px-4"
                style={{ background: C.gold, opacity: cmdBusy ? 0.7 : 1 }}
              >
                {cmdBusy
                  ? <RefreshCw size={18} className="animate-spin" style={{ color: C.navy }} />
                  : <Send size={18} style={{ color: C.navy }} />}
              </button>
            </div>
            {cmdSay && (
              <div className="mt-2 rounded-xl px-3 py-2 text-sm flex items-start gap-2" style={{ background: C.goldSoft, color: C.ink }}>
                <span className="flex-1">{cmdSay}</span>
                <button onClick={() => setCmdSay("")}>
                  <X size={14} style={{ color: C.fade }} />
                </button>
              </div>
            )}
          </div>
        )}

        {/* TODAY */}
        {view === "today" && (
          <div className="px-5 py-5">
            <QuoteCard q={quote} />
            <div className="flex items-end justify-between mb-1">
              <h2 className="text-lg font-bold" style={{ color: C.navy }}>Today, {dayLabel(today)}</h2>
              <span className="text-xs flex items-center gap-2" style={{ color: C.fade }}>
                {stats.streak >= 2 && <span className="font-bold" style={{ color: C.coral }}>🔥{stats.streak}</span>}
                <span>{todayDone} of {todays.length} done</span>
              </span>
            </div>
            <Bar pct={todays.length ? (todayDone / todays.length) * 100 : 0} color={C.teal} />
            <div className="mt-5">
              {todays.length === 0 && (
                <div className="rounded-2xl p-6 text-center text-sm" style={{ background: "#fff", color: C.fade }}>
                  Nothing scheduled today. Enjoy the margin, or head to Plan and add something.
                </div>
              )}
              {BLOCKS.map(({ id, label, Icon }) => {
                const bt = todays.filter(t => (t.block === "auto" ? "afternoon" : t.block) === id);
                if (!bt.length) return null;
                return (
                  <div key={id} className="mb-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Icon size={16} style={{ color: C.gold }} />
                      <span className="text-xs font-semibold" style={{ color: C.navy2 }}>{label}</span>
                    </div>
                    {bt.map(t => <TaskRow key={t.id} t={t} showDay={false} />)}
                  </div>
                );
              })}
            </div>
            {assignedToMe.filter(a => a.date && a.date <= today).length > 0 && (
              <div className="mb-4">
                <div className="flex items-center gap-2 mb-2">
                  <Star size={16} style={{ color: C.coral }} />
                  <span className="text-xs font-semibold" style={{ color: C.coral }}>Assigned to you</span>
                </div>
                {assignedToMe.filter(a => a.date && a.date <= today).map(a => {
                  const late = !a.done && a.date < today;
                  const team = teams.find(t => t.id === a.teamId);
                  return (
                    <div key={a.id} className="flex items-center gap-3 rounded-xl px-3 py-3 mb-2" style={{ background: "#fff", opacity: a.done ? 0.65 : 1 }}>
                      <button onClick={() => toggleAssigned(a)} className="shrink-0">
                        {a.done
                          ? <CheckCircle2 size={24} style={{ color: C.teal }} />
                          : <Circle size={24} style={{ color: late ? C.coral : C.fade }} />}
                      </button>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium truncate" style={{ color: C.ink, textDecoration: a.done ? "line-through" : "none" }}>
                          {a.title}
                        </div>
                        <div className="flex gap-1.5 mt-1 flex-wrap">
                          <Chip color={C.coral} bg="#FFE2DB">{team ? team.name : "Team"}</Chip>
                          <Chip>{late ? "Overdue" : "Due today"}</Chip>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            <div className="mt-2 rounded-2xl p-4" style={{ background: "#fff" }}>
              <div className="flex justify-between text-xs mb-2" style={{ color: C.fade }}>
                <span>This week, {WEEKINFO[currentWeek - 1].label}</span>
                <span>{thisWeek.done} of {thisWeek.total}</span>
              </div>
              <Bar pct={thisWeek.total ? (thisWeek.done / thisWeek.total) * 100 : 0} />
            </div>
          </div>
        )}

        {/* PLAN */}
        {view === "plan" && (
          <div className="px-5 py-5">
            <div className="flex gap-2 mb-3">
              <button
                onClick={() => setShowAdd(!showAdd)}
                className="flex-1 rounded-xl py-3 font-semibold flex items-center justify-center gap-2"
                style={{ background: C.coral, color: "#fff" }}
              >
                <Plus size={18} /> Add task
              </button>
              <button
                onClick={organize}
                className="flex-1 rounded-xl py-3 font-semibold flex items-center justify-center gap-2"
                style={{ background: C.gold, color: C.navy }}
              >
                <Sparkles size={18} /> Organize
              </button>
            </div>
            <p className="text-xs mb-4" style={{ color: C.fade }}>
              Organize places every unscheduled task on your lightest open day. Sundays are left open on purpose.
            </p>

            <div className="rounded-2xl p-4 mb-5" style={{ background: C.navy }}>
              <div className="flex items-center gap-2 mb-2">
                <Mic size={16} style={{ color: C.gold }} />
                <span className="text-sm font-bold" style={{ color: C.cream }}>Pour it all out</span>
              </div>
              <p className="text-xs mb-3" style={{ color: C.goldSoft }}>
                Type everything on your plate in one big jumble, or tap the mic on your phone keyboard
                and just talk. It gets split into tasks and placed on your calendar for you.
              </p>
              <textarea
                className="w-full rounded-xl px-3 py-2.5 outline-none text-sm resize-none"
                rows={4}
                style={{ background: "#fff", color: C.ink }}
                placeholder="Finish the workbook, record two videos, call about the printer, get the emails written..."
                value={dumpText}
                onChange={e => setDumpText(e.target.value)}
              />
              <button
                onClick={parseDump}
                disabled={dumpBusy}
                className="mt-2 w-full rounded-xl py-2.5 font-semibold flex items-center justify-center gap-2"
                style={{ background: C.gold, color: C.navy, opacity: dumpBusy ? 0.7 : 1 }}
              >
                <Wand2 size={16} /> {dumpBusy ? "Sorting it out..." : "Make it into tasks"}
              </button>

              {dumpPreview.length > 0 && (
                <div className="mt-3 rounded-xl p-3" style={{ background: "#fff" }}>
                  <div className="text-xs font-semibold mb-2" style={{ color: C.navy }}>
                    Found {dumpPreview.length} tasks. Tap the star for a big win, or remove anything wrong.
                  </div>
                  {dumpPreview.map((x, i) => (
                    <div key={i} className="flex items-center gap-2 py-1.5" style={{ borderBottom: `1px solid ${C.line}` }}>
                      <button onClick={() => setDumpPreview(dumpPreview.map((y, j) => j === i ? { ...y, big: !y.big } : y))}>
                        <Star size={15} style={{ color: C.gold, fill: x.big ? C.gold : "none" }} />
                      </button>
                      <span className="flex-1 text-sm truncate" style={{ color: C.ink }}>{x.title}</span>
                      <Chip>{WEEKINFO[x.week - 1] ? WEEKINFO[x.week - 1].short : `Wk ${x.week}`}</Chip>
                      <button onClick={() => setDumpPreview(dumpPreview.filter((_, j) => j !== i))}>
                        <X size={14} style={{ color: C.fade }} />
                      </button>
                    </div>
                  ))}
                  <button
                    onClick={addDumped}
                    className="mt-2 w-full rounded-xl py-2.5 font-semibold text-sm"
                    style={{ background: C.teal, color: "#fff" }}
                  >
                    Add them to my month
                  </button>
                </div>
              )}
            </div>

            {showAdd && (
              <div className="rounded-2xl p-4 mb-5" style={{ background: "#fff" }}>
                <input
                  className="w-full rounded-xl px-3 py-2.5 border outline-none text-sm mb-2"
                  style={{ borderColor: C.line, color: C.ink }}
                  placeholder="What needs to get done?"
                  value={form.title}
                  onChange={e => setForm({ ...form, title: e.target.value })}
                  onKeyDown={e => { if (e.key === "Enter") addTask(); }}
                />
                <div className="grid grid-cols-2 gap-2 mb-2">
                  <select
                    className="rounded-xl px-2 py-2.5 border text-sm"
                    style={{ borderColor: C.line, color: C.ink, background: "#fff" }}
                    value={form.day}
                    onChange={e => setForm({ ...form, day: e.target.value })}
                  >
                    <option value="auto">Pick my day for me</option>
                    {Array.from({ length: DAYS }, (_, i) => i + 1).map(d => (
                      <option key={d} value={d}>
                        {dayLabel(dstr(d))}{new Date(YEAR, MONTH, d).getDay() === 0 ? " (rest)" : ""}
                      </option>
                    ))}
                  </select>
                  <select
                    className="rounded-xl px-2 py-2.5 border text-sm"
                    style={{ borderColor: C.line, color: C.ink, background: "#fff" }}
                    value={form.block}
                    onChange={e => setForm({ ...form, block: e.target.value })}
                  >
                    <option value="auto">Any time block</option>
                    {BLOCKS.map(b => <option key={b.id} value={b.id}>{b.label}</option>)}
                  </select>
                </div>
                {form.day === "auto" && (
                  <select
                    className="w-full rounded-xl px-2 py-2.5 border text-sm mb-2"
                    style={{ borderColor: C.line, color: C.ink, background: "#fff" }}
                    value={form.week}
                    onChange={e => setForm({ ...form, week: e.target.value })}
                  >
                    {weekRows.map(({ w }) => <option key={w} value={w}>{WEEKINFO[w - 1].label}</option>)}
                  </select>
                )}
                <select
                  className="w-full rounded-xl px-2 py-2.5 border text-sm mb-2"
                  style={{ borderColor: C.line, color: C.ink, background: "#fff" }}
                  value={form.repeat}
                  onChange={e => setForm({ ...form, repeat: e.target.value, anchor: "" })}
                >
                  <option value="none">One time</option>
                  <option value="weekly">Every week</option>
                  <option value="monthly">Every month</option>
                </select>
                {form.repeat === "weekly" && (
                  <select
                    className="w-full rounded-xl px-2 py-2.5 border text-sm mb-2"
                    style={{ borderColor: C.line, color: C.ink, background: "#fff" }}
                    value={form.anchor}
                    onChange={e => setForm({ ...form, anchor: e.target.value })}
                  >
                    <option value="">Any day, let the app place it</option>
                    {[1, 2, 3, 4, 5, 6, 0].map(wd => (
                      <option key={wd} value={wd}>Every {WDFULL[wd]}</option>
                    ))}
                  </select>
                )}
                {form.repeat === "monthly" && (
                  <select
                    className="w-full rounded-xl px-2 py-2.5 border text-sm mb-2"
                    style={{ borderColor: C.line, color: C.ink, background: "#fff" }}
                    value={form.anchor}
                    onChange={e => setForm({ ...form, anchor: e.target.value })}
                  >
                    <option value="">Any day, let the app place it</option>
                    {Array.from({ length: DAYS }, (_, i) => i + 1).map(d => (
                      <option key={d} value={d}>The {ord(d)} of every month</option>
                    ))}
                  </select>
                )}
                <label className="flex items-center gap-2 text-sm mb-3" style={{ color: C.ink }}>
                  <input
                    type="checkbox"
                    checked={form.big}
                    onChange={e => setForm({ ...form, big: e.target.checked })}
                  />
                  Big win (extra fireworks)
                </label>
                <button
                  onClick={addTask}
                  className="w-full rounded-xl py-2.5 font-semibold"
                  style={{ background: C.teal, color: "#fff" }}
                >
                  Add to my month
                </button>
              </div>
            )}

            {weekRows.map(({ w }) => {
              const wt = tasks
                .filter(t => (t.date ? weekOf(t.date) : t.week) === w)
                .sort((a, b) => (a.date || "9").localeCompare(b.date || "9"));
              return (
                <div key={w} className="mb-5">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-bold" style={{ color: w === currentWeek ? C.gold : C.navy }}>
                      {WEEKINFO[w - 1].label}{w === currentWeek ? " (this week)" : ""}
                    </span>
                    <span className="text-xs" style={{ color: C.fade }}>
                      {wt.filter(t => t.done).length} of {wt.length} done
                    </span>
                  </div>
                  {wt.length === 0
                    ? (
                      <div className="text-xs rounded-xl p-3" style={{ background: "#fff", color: C.fade }}>
                        Nothing here yet.
                      </div>
                    )
                    : wt.map(t => <TaskRow key={t.id} t={t} showDay={true} />)}
                </div>
              );
            })}
          </div>
        )}

        {/* TIMELINE */}
        {view === "timeline" && (
          <div className="px-5 py-5">
            <div className="rounded-2xl p-5 mb-5 text-center" style={{ background: C.navy }}>
              <div className="text-xs mb-1" style={{ color: C.goldSoft }}>{MONTH_NAME} so far</div>
              <div style={{ color: C.gold, fontSize: 44, fontFamily: "Georgia, serif" }}>
                {monthTotal ? Math.round((monthDone / monthTotal) * 100) : 0}%
              </div>
              <div className="text-xs mb-3" style={{ color: C.cream }}>
                {monthDone} of {monthTotal} tasks complete
              </div>
              <Bar pct={monthTotal ? (monthDone / monthTotal) * 100 : 0} bg={C.navy2} />
            </div>
            {weekRows.map(({ w, total, done }) => {
              const pct = total ? Math.round((done / total) * 100) : 0;
              return (
                <div
                  key={w}
                  className="rounded-2xl p-4 mb-3"
                  style={{ background: "#fff", border: w === currentWeek ? `2px solid ${C.gold}` : "2px solid transparent" }}
                >
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-bold" style={{ color: C.navy }}>
                      {WEEKINFO[w - 1].label}{w === currentWeek ? " (you are here)" : ""}
                    </span>
                    <span className="text-xs" style={{ color: C.fade }}>{done} of {total} tasks, {pct}%</span>
                  </div>
                  <Bar pct={pct} color={pct === 100 && total ? C.teal : C.gold} />
                  {pct === 100 && total > 0 && (
                    <div className="text-xs mt-2 font-medium" style={{ color: C.teal }}>
                      Week complete. Take a bow.
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* PARTNERS */}
        {view === "partners" && (
          <div className="px-5 py-5">
            <QuoteCard q={QUOTES[QUOTES.length - 1]} />
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-bold" style={{ color: C.navy }}>Your circle</h2>
              <button onClick={refreshShared} className="p-2 rounded-full" style={{ background: "#fff" }}>
                <RefreshCw size={16} style={{ color: C.navy2 }} className={refreshing ? "animate-spin" : ""} />
              </button>
            </div>
            <p className="text-xs mb-3" style={{ color: C.fade }}>
              Partners see each other's weekly and monthly progress only. Nobody sees anyone's
              actual tasks. Not even a partner.
            </p>

            {(() => {
              const meProf = partners.find(p => slug(p.name) === slug(me || ""));
              const mpct = meProf && meProf.total ? Math.round((meProf.done / meProf.total) * 100) : 0;
              return meProf ? (
                <div className="rounded-2xl p-4 mb-3" style={{ background: C.goldSoft }}>
                  <div className="flex items-center gap-2 mb-2">
                    <Avatar src={avatar || meProf.avatar} name={meProf.name} size={28} />
                    <span className="text-sm font-bold" style={{ color: C.navy }}>{meProf.name} (you)</span>
                    <BadgeStrip streak={stats.streak} badges={myBadges} level={levelOf(stats.totalDone)} />
                    <span className="flex-1" />
                    <span className="text-xs" style={{ color: C.fade }}>{mpct}%</span>
                  </div>
                  <Bar pct={mpct} color={C.teal} bg="#fff" />
                </div>
              ) : null;
            })()}

            {incoming.length > 0 && (
              <div className="mb-3">
                <h3 className="text-sm font-bold mb-2" style={{ color: C.navy }}>Requests for you</h3>
                {incoming.map(r => (
                  <div key={r.id} className="rounded-2xl p-3 mb-2 flex items-center gap-2" style={{ background: "#fff", border: `1px solid ${C.gold}` }}>
                    <span className="flex-1 text-sm" style={{ color: C.ink }}>
                      <span className="font-bold">{r.fromName}</span> wants to be your accountability partner.
                    </span>
                    {plan !== "teams" && myPartnerNames.length >= 1 ? (
                      <button disabled className="rounded-xl px-3 py-1.5 text-xs font-semibold" style={{ background: "#EDF3F2", color: C.fade }}>
                        Upgrade to add
                      </button>
                    ) : (
                      <button onClick={() => acceptRequest(r)} className="rounded-xl px-3 py-1.5 text-xs font-semibold" style={{ background: C.teal, color: "#fff" }}>
                        Accept
                      </button>
                    )}
                    <button onClick={() => declineRequest(r)} className="rounded-xl px-2 py-1.5" style={{ background: "#EDF3F2" }}>
                      <X size={14} style={{ color: C.fade }} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <h3 className="text-sm font-bold mb-2" style={{ color: C.navy }}>Your partners</h3>
            {myPartnerNames.length === 0 && (
              <div className="rounded-2xl p-4 mb-3 text-sm" style={{ background: "#fff", color: C.fade }}>
                No partners yet. Ask someone below, or flip on "I'm looking for a partner" in your
                Account so others can choose you.
              </div>
            )}
            {myPartnerNames.map(name => {
              const p = profOf(name);
              const ppct = p && p.total ? Math.round((p.done / p.total) * 100) : 0;
              return (
                <div key={name} className="rounded-2xl p-4 mb-3" style={{ background: "#fff", border: `2px solid ${C.gold}` }}>
                  <div className="flex items-center gap-2 mb-2">
                    <button onClick={() => setViewProfile(name)} className="flex items-center gap-2">
                      <Avatar src={avatarOf(name)} name={name} size={28} />
                      <span className="text-sm font-bold" style={{ color: C.navy }}>{name}</span>
                    </button>
                    <BadgeStrip streak={stripFor(name).streak} badges={stripFor(name).badges} level={stripFor(name).level} />
                    <span className="flex-1" />
                    <span className="text-xs" style={{ color: C.fade }}>{p ? ago(p.updated || 0) : "no activity yet"}</span>
                  </div>
                  {p && p.bio && (
                    <p className="text-xs mb-2" style={{ color: C.fade, fontStyle: "italic" }}>{p.bio}</p>
                  )}
                  {p ? (
                    <div>
                      <div className="text-xs mb-1" style={{ color: C.ink }}>{p.done} of {p.total} this month, {ppct}%</div>
                      <Bar pct={ppct} color={C.teal} />
                      <div className="flex gap-1.5 mt-2">
                        {WEEKINFO.map(wk => {
                          const wd = (p.weeks && p.weeks[wk.w]) || { done: 0, total: 0 };
                          const wpct = wd.total ? (wd.done / wd.total) * 100 : 0;
                          return (
                            <div key={wk.w} className="flex-1">
                              <Bar pct={wpct} color={C.gold} h={6} />
                              <div className="text-center mt-0.5" style={{ fontSize: 9, color: C.fade }}>{wk.short}</div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ) : (
                    <div className="text-xs" style={{ color: C.fade }}>They haven't opened the app this month yet.</div>
                  )}
                  <button onClick={() => endPartnership(name)} className="text-xs mt-2" style={{ color: C.fade, textDecoration: "underline" }}>
                    End partnership
                  </button>
                </div>
              );
            })}

            <h3 className="text-sm font-bold mt-4 mb-2" style={{ color: C.navy }}>Looking for a partner</h3>
            {seekers.length === 0 ? (
              <div className="rounded-2xl p-4 mb-3 text-sm" style={{ background: "#fff", color: C.fade }}>
                Nobody has their hand raised right now. Raise yours in Account and someone can choose you.
              </div>
            ) : (
              seekers.map(p => {
                const asked = outgoing.some(r => slug(r.toName) === slug(p.name));
                return (
                  <div key={p.name} className="rounded-2xl p-3 mb-2 flex items-center gap-2" style={{ background: "#fff" }}>
                    <button onClick={() => setViewProfile(p.name)} className="flex-1 min-w-0 flex items-center gap-2 text-left">
                      <Avatar src={p.avatar} name={p.name} size={28} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold" style={{ color: C.navy }}>{p.name}</span>
                          <BadgeStrip streak={p.streak} badges={p.badges} level={p.level} />
                        </div>
                        {p.bio && <div className="text-xs truncate" style={{ color: C.fade, fontStyle: "italic" }}>{p.bio}</div>}
                      </div>
                    </button>
                    <button
                      onClick={() => sendRequest(p.name)}
                      disabled={asked || (plan !== "teams" && myPartnerNames.length >= 1)}
                      className="rounded-xl px-3 py-1.5 text-xs font-semibold"
                      style={{
                        background: asked || (plan !== "teams" && myPartnerNames.length >= 1) ? "#EDF3F2" : C.navy,
                        color: asked || (plan !== "teams" && myPartnerNames.length >= 1) ? C.fade : C.cream
                      }}
                    >
                      {asked ? "Asked" : (plan !== "teams" && myPartnerNames.length >= 1 ? "Upgrade to add" : "Ask to partner")}
                    </button>
                  </div>
                );
              })
            )}

            <h3 className="text-sm font-bold mt-5 mb-2" style={{ color: C.navy }}>Teams</h3>
            {plan !== "teams" ? (
              <div className="rounded-2xl p-4 mb-3" style={{ background: C.navy }}>
                <div className="text-sm font-bold mb-1" style={{ color: C.gold }}>Part of the Teams upgrade</div>
                <p className="text-xs mb-2" style={{ color: C.goldSoft }}>
                  Named groups with their own discussion, a team progress view, and more than one
                  accountability partner.
                </p>
                <button
                  onClick={() => setView("account")}
                  className="rounded-xl px-3 py-2 text-xs font-semibold"
                  style={{ background: C.gold, color: C.navy }}
                >
                  See the upgrade in Account
                </button>
              </div>
            ) : (
              <div>
                {teamInvitesForMe.map(t => (
                  <div key={t.id} className="rounded-2xl p-3 mb-2 flex items-center gap-2" style={{ background: "#fff", border: `1px solid ${C.gold}` }}>
                    <span className="flex-1 text-sm" style={{ color: C.ink }}>
                      You're invited to <span className="font-bold">{t.name}</span>.
                      {t.kind === "boss" && (
                        <span className="block text-xs mt-1" style={{ color: C.fade }}>
                          Boss team: the owner assigns tasks, sees their status, and sets deadlines.
                          Hidden and private settings don't apply inside this team, and your signup
                          email is shared with the team owner. Your personal task list stays yours.
                        </span>
                      )}
                    </span>
                    <button onClick={() => answerTeamInvite(t.id, true)} className="rounded-xl px-3 py-1.5 text-xs font-semibold" style={{ background: C.teal, color: "#fff" }}>
                      Join
                    </button>
                    <button onClick={() => answerTeamInvite(t.id, false)} className="rounded-xl px-2 py-1.5" style={{ background: "#EDF3F2" }}>
                      <X size={14} style={{ color: C.fade }} />
                    </button>
                  </div>
                ))}
                {plan === "boss" && (
                  <div className="rounded-2xl p-3 mb-3" style={{ background: "#fff" }}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="font-semibold" style={{ color: C.navy2 }}>Boss seats</span>
                      <span style={{ color: seatExtra > 0 ? C.coral : C.fade }}>
                        {seatCount} of 7 included{seatExtra > 0 ? `, ${seatExtra} extra at $9` : ""}
                      </span>
                    </div>
                    <Bar pct={Math.min(100, (seatCount / 7) * 100)} color={seatExtra > 0 ? C.coral : C.teal} h={6} />
                  </div>
                )}
                <div className="rounded-2xl p-3 mb-3 flex gap-2" style={{ background: "#fff" }}>
                  <input
                    className="flex-1 rounded-xl px-3 py-2 border outline-none text-sm"
                    style={{ borderColor: C.line, color: C.ink }}
                    placeholder={plan === "boss" ? "Name a new boss team..." : "Name a new team..."}
                    value={teamName}
                    onChange={e => setTeamName(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter") createTeam(); }}
                  />
                  <button onClick={createTeam} className="rounded-xl px-3 text-xs font-semibold" style={{ background: C.navy, color: C.cream }}>
                    Create
                  </button>
                </div>
                {myTeams.map(t => {
                  const open = openTeam === t.id;
                  const owner = slug(t.ownerName) === slug(me || "");
                  const tMsgs = teamMsgs.filter(m => m.team === t.id && !isBlocked(m.from));
                  return (
                    <div key={t.id} className="rounded-2xl p-4 mb-3" style={{ background: "#fff", border: `2px solid ${C.gold}` }}>
                      <button onClick={() => setOpenTeam(open ? null : t.id)} className="w-full flex justify-between items-center">
                        <span className="text-sm font-bold" style={{ color: C.navy }}>{t.name}</span>
                        <span className="text-xs" style={{ color: C.fade }}>{t.members.length} of {TEAM_CAP}</span>
                      </button>
                      {open && (
                        <div className="mt-3">
                          {t.members.map(n => {
                            const p = profOf(n);
                            const mpct = p && p.total ? Math.round((p.done / p.total) * 100) : 0;
                            return (
                              <div key={n} className="mb-2">
                                <div className="flex items-center gap-2 text-xs mb-1" style={{ color: C.ink }}>
                                  <button onClick={() => setViewProfile(n)} className="font-semibold text-left flex-1" style={{ color: C.ink }}>
                                    {n}{slug(n) === slug(me || "") ? " (you)" : ""}
                                  </button>
                                  <span style={{ color: C.fade }}>{p ? `${mpct}%` : "no data"}</span>
                                  {owner && slug(n) !== slug(me || "") && (
                                    <button onClick={() => setConfirmRemove({ teamId: t.id, name: n, teamName: t.name })} aria-label="Remove member">
                                      <X size={12} style={{ color: C.coral }} />
                                    </button>
                                  )}
                                </div>
                                <Bar pct={mpct} color={C.teal} h={6} />
                              </div>
                            );
                          })}
                          {owner && (
                            <div className="flex gap-2 mt-3">
                              <input
                                className="flex-1 rounded-xl px-3 py-2 border outline-none text-sm"
                                style={{ borderColor: C.line, color: C.ink }}
                                placeholder="Invite by name..."
                                value={inviteText}
                                onChange={e => setInviteText(e.target.value)}
                                onKeyDown={e => { if (e.key === "Enter") inviteToTeam(t.id, inviteText); }}
                              />
                              <button onClick={() => inviteToTeam(t.id, inviteText)} className="rounded-xl px-3 text-xs font-semibold" style={{ background: C.teal, color: "#fff" }}>
                                Invite
                              </button>
                            </div>
                          )}
                          {(t.invites || []).length > 0 && (
                            <p className="text-xs mt-2" style={{ color: C.fade }}>
                              Waiting on: {(t.invites || []).join(", ")}
                            </p>
                          )}
                          {t.kind === "boss" && (
                            <div className="mt-3">
                              <div className="text-xs font-semibold mb-2" style={{ color: C.coral }}>Assigned work</div>
                              {owner && (
                                <div className="rounded-xl p-3 mb-2" style={{ background: C.cream }}>
                                  <select
                                    className="w-full rounded-xl px-2 py-2 border text-sm mb-2"
                                    style={{ borderColor: C.line, background: "#fff", color: C.ink }}
                                    value={assignTo}
                                    onChange={e => setAssignTo(e.target.value)}
                                  >
                                    <option value="">Assign to...</option>
                                    {t.members.filter(n => slug(n) !== slug(me || "")).map(n => (
                                      <option key={n} value={n}>{n}</option>
                                    ))}
                                  </select>
                                  <input
                                    className="w-full rounded-xl px-3 py-2 border outline-none text-sm mb-2"
                                    style={{ borderColor: C.line, background: "#fff", color: C.ink }}
                                    placeholder="What needs doing?"
                                    value={assignTitle}
                                    onChange={e => setAssignTitle(e.target.value)}
                                  />
                                  <div className="flex gap-2">
                                    <select
                                      className="flex-1 rounded-xl px-2 py-2 border text-sm"
                                      style={{ borderColor: C.line, background: "#fff", color: C.ink }}
                                      value={assignDay}
                                      onChange={e => setAssignDay(e.target.value)}
                                    >
                                      <option value="none">No deadline</option>
                                      {Array.from({ length: DAYS }, (_, i) => i + 1).map(d => (
                                        <option key={d} value={d}>Due {dayLabel(dstr(d))}</option>
                                      ))}
                                    </select>
                                    <button onClick={() => assignTask(t.id)} className="rounded-xl px-3 text-xs font-semibold" style={{ background: C.coral, color: "#fff" }}>
                                      Assign
                                    </button>
                                  </div>
                                </div>
                              )}
                              {owner && (() => {
                                const tank = assigned.filter(a => a.teamId === t.id && !a.toName);
                                if (!tank.length) return null;
                                return (
                                  <div className="rounded-xl p-3 mb-2" style={{ background: "#FFE2DB", border: `1px solid ${C.coral}` }}>
                                    <div className="text-xs font-bold mb-2" style={{ color: C.coral }}>
                                      Holding tank: {tank.length} unassigned {tank.length === 1 ? "task" : "tasks"}
                                    </div>
                                    {tank.map(a => (
                                      <div key={a.id} className="flex items-center gap-2 mb-1.5">
                                        <div className="flex-1 min-w-0">
                                          <div className="text-xs font-medium truncate" style={{ color: C.ink }}>{a.title}</div>
                                          <div style={{ fontSize: 10, color: C.fade }}>{a.date ? `Due ${dayLabel(a.date)}` : "No deadline"}</div>
                                        </div>
                                        <select
                                          className="rounded-xl px-2 py-1 border text-xs"
                                          style={{ borderColor: C.line, background: "#fff", color: C.ink }}
                                          value=""
                                          onChange={e => reassignTask(a.id, e.target.value)}
                                        >
                                          <option value="">Reassign to...</option>
                                          {t.members.map(n => (
                                            <option key={n} value={n}>{n}{slug(n) === slug(me || "") ? " (you)" : ""}</option>
                                          ))}
                                        </select>
                                        <button onClick={() => removeAssigned(a.id)} aria-label="Delete task">
                                          <X size={12} style={{ color: C.fade }} />
                                        </button>
                                      </div>
                                    ))}
                                  </div>
                                );
                              })()}
                              {assigned.filter(a => a.teamId === t.id && a.toName && (owner || slug(a.toName) === slug(me || ""))).map(a => {
                                const late = !a.done && a.date && a.date < today;
                                const canToggle = owner || slug(a.toName) === slug(me || "");
                                return (
                                  <div key={a.id} className="flex items-center gap-2 rounded-xl px-3 py-2 mb-1.5" style={{ background: C.cream, opacity: a.done ? 0.65 : 1 }}>
                                    <button onClick={() => canToggle && toggleAssigned(a)} className="shrink-0">
                                      {a.done
                                        ? <CheckCircle2 size={18} style={{ color: C.teal }} />
                                        : <Circle size={18} style={{ color: late ? C.coral : C.fade }} />}
                                    </button>
                                    <div className="flex-1 min-w-0">
                                      <div className="text-xs font-medium truncate" style={{ color: C.ink, textDecoration: a.done ? "line-through" : "none" }}>
                                        {a.title}
                                      </div>
                                      <div className="flex gap-1 mt-0.5" style={{ fontSize: 10, color: late ? C.coral : C.fade }}>
                                        <span>{a.toName}</span>
                                        <span>·</span>
                                        <span>{a.date ? (late ? `Overdue, was ${dayLabel(a.date)}` : `Due ${dayLabel(a.date)}`) : "No deadline"}</span>
                                      </div>
                                    </div>
                                    {owner && (
                                      <button onClick={() => removeAssigned(a.id)} className="shrink-0">
                                        <X size={13} style={{ color: C.fade }} />
                                      </button>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          )}
                          <div className="rounded-xl p-2 mt-3" style={{ background: C.cream, maxHeight: 220, overflowY: "auto" }}>
                            {tMsgs.length === 0 && (
                              <div className="text-xs text-center py-3" style={{ color: C.fade }}>
                                The team room is quiet. Say something.
                              </div>
                            )}
                            {tMsgs.slice(-50).map(m => (
                              <div key={m.id} className="mb-2 flex items-start gap-1.5">
                                <Avatar src={avatarOf(m.from)} name={m.from} size={18} />
                                <span className="flex-1 text-sm" style={{ color: C.ink }}>
                                  <span className="text-xs font-bold" style={{ color: slug(m.from) === slug(me || "") ? C.gold : C.navy2 }}>{m.from}: </span>
                                  {renderRich(m.text)}
                                </span>
                              </div>
                            ))}
                          </div>
                          <div className="flex gap-2 mt-2">
                            <input
                              className="flex-1 rounded-xl px-3 py-2 border outline-none text-sm"
                              style={{ borderColor: C.line, background: "#fff", color: C.ink }}
                              placeholder={`Message ${t.name}...`}
                              value={teamMsgText}
                              onChange={e => setTeamMsgText(e.target.value)}
                              onKeyDown={e => { if (e.key === "Enter") sendTeamMsg(t.id); }}
                            />
                            <button onClick={() => sendTeamMsg(t.id)} className="rounded-xl px-3" style={{ background: C.gold }}>
                              <Send size={16} style={{ color: C.navy }} />
                            </button>
                          </div>
                          <button onClick={() => leaveTeam(t.id)} className="text-xs mt-2" style={{ color: C.fade, textDecoration: "underline" }}>
                            {owner ? "Delete this team" : "Leave this team"}
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            <h3 className="text-base font-bold mt-6 mb-1" style={{ color: C.navy }}>Messages</h3>
            <p className="text-xs mb-2" style={{ color: C.fade }}>
              Messaging is between partners only.
            </p>
            {myPartnerNames.length > 1 && (
              <div className="flex flex-wrap gap-2 mb-2">
                {myPartnerNames.map(n => (
                  <button
                    key={n}
                    onClick={() => setChatWith(n)}
                    className="text-xs px-3 py-1.5 rounded-full font-medium"
                    style={{
                      background: slug(activeChat || "") === slug(n) ? C.navy : "#fff",
                      color: slug(activeChat || "") === slug(n) ? C.cream : C.ink
                    }}
                  >
                    {n}
                  </button>
                ))}
              </div>
            )}
            <div className="rounded-2xl p-3 mb-3" style={{ background: "#fff", maxHeight: 300, overflowY: "auto" }}>
              {thread.length === 0 && (
                <div className="text-xs text-center py-4" style={{ color: C.fade }}>
                  {activeChat ? "No messages yet. Send the first one." : "Messaging unlocks when you have a partner."}
                </div>
              )}
              {thread.slice(-60).map(m => {
                const mine = slug(m.from) === slug(me);
                return (
                  <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"} items-end gap-1.5 mb-2`}>
                    {!mine && (
                      <button onClick={() => setViewProfile(m.from)}>
                        <Avatar src={avatarOf(m.from)} name={m.from} size={22} />
                      </button>
                    )}
                    <div className="max-w-xs rounded-2xl px-3 py-2" style={{ background: mine ? C.navy : C.cream }}>
                      {!mine && (
                        <div className="text-xs font-semibold mb-0.5" style={{ color: C.gold }}>{m.from}</div>
                      )}
                      <div className="text-sm" style={{ color: mine ? C.cream : C.ink }}>{renderRich(m.text)}</div>
                      <div className="text-right" style={{ color: mine ? C.goldSoft : C.fade, fontSize: 10 }}>
                        {ago(m.ts)}
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={chatEnd} />
            </div>
            <div className="flex gap-2">
              <input
                className="flex-1 rounded-xl px-3 py-2.5 border outline-none text-sm"
                style={{ borderColor: C.line, background: "#fff", color: C.ink }}
                placeholder={activeChat ? `Message ${activeChat}...` : "Add a partner to start messaging"}
                disabled={!activeChat}
                value={msgText}
                onChange={e => setMsgText(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") sendMsg(); }}
              />
              <button onClick={sendMsg} className="rounded-xl px-4" style={{ background: C.gold }}>
                <Send size={18} style={{ color: C.navy }} />
              </button>
            </div>
            <p className="text-xs mt-3" style={{ color: C.fade }}>
              New activity appears when you tap refresh or open the app again.
            </p>
          </div>
        )}

        {/* COMMUNITY */}
        {view === "community" && (
          <div className="px-5 py-5">
            <QuoteCard q={quote} />
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-bold" style={{ color: C.navy }}>Community</h2>
              <button onClick={refreshShared} className="p-2 rounded-full" style={{ background: "#fff" }}>
                <RefreshCw size={16} style={{ color: C.navy2 }} className={refreshing ? "animate-spin" : ""} />
              </button>
            </div>
            <div className="flex gap-2 mb-3">
              {Object.entries(PTYPES).map(([k, v]) => (
                <button
                  key={k}
                  onClick={() => setPostType(k)}
                  className="flex-1 flex items-center justify-center gap-1 text-xs px-2 py-2 rounded-xl font-semibold"
                  style={{
                    background: postType === k ? v.color : "#fff",
                    color: postType === k ? "#fff" : C.ink
                  }}
                >
                  <v.Icon size={14} /> {v.label}s
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2 mb-3 flex-wrap">
              {[["active", "Active"], ["new", "New"], ["top", "Top"]].map(([k, l]) => (
                <button
                  key={k}
                  onClick={() => { setFeedSort(k); setFeedCount(20); }}
                  className="text-xs px-3 py-1 rounded-full font-medium"
                  style={{ background: feedSort === k ? C.navy : "#fff", color: feedSort === k ? C.cream : C.ink }}
                >
                  {l}
                </button>
              ))}
              <button
                onClick={() => setShowMile(!showMile)}
                className="text-xs px-3 py-1 rounded-full font-medium ml-auto"
                style={{ background: showMile ? C.goldSoft : "#fff", color: C.ink, border: showMile ? `1px solid ${C.gold}` : "1px solid transparent" }}
              >
                Milestones {showMile ? "on" : "off"}
              </button>
            </div>
            <div className="rounded-2xl p-4 mb-4" style={{ background: "#fff" }}>
              <textarea
                className="w-full rounded-xl px-3 py-2.5 border outline-none text-sm resize-none"
                rows={2}
                style={{ borderColor: C.line, color: C.ink }}
                placeholder={
                  postType === "question" ? "Ask the group anything..."
                    : postType === "win" ? "Tell everyone what you finished..."
                      : "Drop a word that lifts someone up..."
                }
                value={postText}
                onChange={e => setPostText(e.target.value)}
              />
              <button
                onClick={addPost}
                className="mt-2 w-full rounded-xl py-2.5 font-semibold text-sm"
                style={{ background: PTYPES[postType].color, color: "#fff" }}
              >
                Post a {PTYPES[postType].label.toLowerCase()}
              </button>
            </div>

            {(() => {
              const lastAct = x => Math.max(x.ts || 0, ...((x.replies || []).map(r => r.ts || 0)), 0);
              const score = x => Object.values(x.reactions || {}).reduce((a, arr) => a + (arr || []).length, 0) + (x.replies || []).length * 2;
              const list = [...community]
                .filter(x => (x.type || "win") === postType)
                .filter(x => !isBlocked(x.from))
                .filter(x => showMile || !x.milestone)
                .sort((a, b) =>
                  feedSort === "new" ? b.ts - a.ts
                    : feedSort === "top" ? (score(b) - score(a)) || (b.ts - a.ts)
                      : lastAct(b) - lastAct(a)
                );
              return list.slice(0, feedCount).map(p => {
              const meta = PTYPES[p.type] || PTYPES.win;
              return (
                <div key={p.id} className="rounded-2xl p-4 mb-3" style={{ background: "#fff", border: p.milestone ? `2px solid ${C.gold}` : "2px solid transparent" }}>
                  <div className="flex items-center gap-2 mb-1">
                    <button onClick={() => setViewProfile(p.from)} className="flex items-center gap-2">
                      <Avatar src={avatarOf(p.from)} name={p.from} size={24} />
                      <span className="text-xs font-semibold" style={{ color: C.navy }}>{p.from}</span>
                    </button>
                    <BadgeStrip streak={stripFor(p.from).streak} badges={stripFor(p.from).badges} level={stripFor(p.from).level} />
                    {p.milestone && <Chip color={C.navy} bg={C.goldSoft}>Milestone</Chip>}
                    <meta.Icon size={13} style={{ color: meta.color }} />
                    <span className="text-xs ml-auto" style={{ color: C.fade }}>{ago(p.ts)}</span>
                  </div>
                  <div className="text-sm" style={{ color: C.ink }}>{renderRich(p.text)}</div>
                  <div className="flex items-center gap-2 mt-2 flex-wrap">
                    {REACTS.filter(r => ((p.reactions && p.reactions[r.id]) || []).length > 0).map(r => {
                      const arr = (p.reactions && p.reactions[r.id]) || [];
                      const mine = arr.includes(slug(me || ""));
                      return (
                        <button
                          key={r.id}
                          onClick={() => toggleReact(p.id, r.id)}
                          className="flex items-center gap-1 text-xs px-2 py-1 rounded-full"
                          style={{
                            background: mine ? C.goldSoft : "#EDF3F2",
                            border: mine ? `1px solid ${C.gold}` : "1px solid transparent",
                            color: C.ink
                          }}
                        >
                          <span>{r.e}</span>
                          <span className="font-semibold">{arr.length}</span>
                        </button>
                      );
                    })}
                    <button
                      onClick={() => setReactFor(reactFor === p.id ? null : p.id)}
                      className="flex items-center px-2 py-1 rounded-full"
                      style={{ background: "#fff", border: `1px solid ${C.line}` }}
                    >
                      <SmilePlus size={15} style={{ color: C.fade }} />
                    </button>
                  </div>
                  {reactFor === p.id && (
                    <div
                      className="flex items-center gap-1 mt-2 rounded-full px-2 py-1.5"
                      style={{ background: "#fff", border: `1px solid ${C.line}`, width: "fit-content" }}
                    >
                      {REACTS.map(r => (
                        <button
                          key={r.id}
                          onClick={() => { toggleReact(p.id, r.id); setReactFor(null); }}
                          className="px-1.5 py-0.5 rounded-full text-lg"
                        >
                          {r.e}
                        </button>
                      ))}
                    </div>
                  )}
                  {(() => {
                    const reps = (p.replies || []).filter(r => !isBlocked(r.from));
                    const rc = reps.length;
                    const open = openReplies.includes(p.id);
                    return (
                      <div>
                        <button
                          onClick={() => setOpenReplies(open ? openReplies.filter(x => x !== p.id) : [...openReplies, p.id])}
                          className="flex items-center gap-1 text-xs mt-2 font-medium"
                          style={{ color: C.teal }}
                        >
                          <MessageCircle size={13} />
                          {rc} {rc === 1 ? "reply" : "replies"}
                        </button>
                        {open && (
                          <div>
                            {reps.map(r => (
                              <div
                                key={r.id}
                                className="mt-2 ml-3 pl-3 py-1 text-sm flex items-start gap-2"
                                style={{ borderLeft: `2px solid ${C.line}`, color: C.ink }}
                              >
                                <button onClick={() => setViewProfile(r.from)}>
                                  <Avatar src={avatarOf(r.from)} name={r.from} size={18} />
                                </button>
                                <span className="flex-1">
                                  <span className="font-semibold" style={{ color: C.navy2 }}>{r.from}: </span>
                                  {renderRich(r.text)}
                                </span>
                                <button
                                  onClick={() => { setReplyFor(p.id); setReplyText(`@${r.from} `); }}
                                  className="text-xs font-bold shrink-0"
                                  style={{ color: C.gold }}
                                >
                                  @
                                </button>
                              </div>
                            ))}
                            {replyFor === p.id ? (
                              <div className="flex gap-2 mt-2">
                                <input
                                  className="flex-1 rounded-xl px-3 py-2 border outline-none text-sm"
                                  style={{ borderColor: C.line, color: C.ink }}
                                  placeholder="Write a reply..."
                                  value={replyText}
                                  onChange={e => setReplyText(e.target.value)}
                                  onKeyDown={e => { if (e.key === "Enter") addReply(p.id); }}
                                  autoFocus
                                />
                                <button onClick={() => addReply(p.id)} className="rounded-xl px-3" style={{ background: C.teal }}>
                                  <Send size={15} style={{ color: "#fff" }} />
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => { setReplyFor(p.id); setReplyText(`@${p.from} `); }}
                                className="text-xs mt-2 font-medium"
                                style={{ color: C.teal }}
                              >
                                Reply
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>
              );
              });
            })()}
            {(() => {
              const totalShown = community.filter(x => (x.type || "win") === postType && !isBlocked(x.from) && (showMile || !x.milestone)).length;
              return totalShown > feedCount ? (
                <button
                  onClick={() => setFeedCount(feedCount + 20)}
                  className="w-full rounded-xl py-2.5 mb-3 text-sm font-semibold"
                  style={{ background: "#fff", color: C.navy2 }}
                >
                  Show more posts
                </button>
              ) : null;
            })()}
            {community.filter(p => (p.type || "win") === postType && !isBlocked(p.from) && (showMile || !p.milestone)).length === 0 && (
              <div className="rounded-2xl p-6 text-center text-sm" style={{ background: "#fff", color: C.fade }}>
                {postType === "question"
                  ? "No questions yet. Ask the first one."
                  : postType === "win"
                    ? "No wins posted yet. Go earn one, then come brag a little."
                    : "No boosts yet. Drop a word that lifts somebody."}
              </div>
            )}
            <p className="text-xs mt-3" style={{ color: C.fade }}>
              Everyone who has this app's link shares this space and picks their own display name.
            </p>
          </div>
        )}
        {/* ACCOUNT */}
        {view === "account" && (
          <div className="px-5 py-5">
            <h2 className="text-lg font-bold mb-3" style={{ color: C.navy }}>Account</h2>

            <div className="rounded-2xl p-4 mb-4" style={{ background: "#fff" }}>
              <div className="text-xs font-semibold mb-2" style={{ color: C.navy2 }}>Your profile</div>
              <div className="flex items-center gap-3 mb-3">
                <Avatar src={avatar} name={acctName || me} size={56} />
                <div className="flex-1">
                  <label className="inline-block rounded-xl px-3 py-2 text-xs font-semibold cursor-pointer" style={{ background: C.navy, color: C.cream }}>
                    {avatar ? "Change photo" : "Add a photo"}
                    <input type="file" accept="image/*" className="hidden" onChange={onPickAvatar} />
                  </label>
                  {avatar && (
                    <button onClick={() => setAvatar("")} className="ml-2 text-xs" style={{ color: C.fade, textDecoration: "underline" }}>
                      Remove
                    </button>
                  )}
                  <p className="text-xs mt-1" style={{ color: C.fade }}>
                    Shows next to your messages and posts. Save to publish it.
                  </p>
                </div>
              </div>
              <input
                className="w-full rounded-xl px-3 py-2.5 border outline-none text-sm mb-2"
                style={{ borderColor: C.line, color: C.ink }}
                placeholder="Your name"
                value={acctName}
                onChange={e => setAcctName(e.target.value)}
              />
              <input
                className="w-full rounded-xl px-3 py-2.5 border outline-none text-sm"
                style={{ borderColor: C.line, color: C.ink }}
                placeholder="Email"
                value={email}
                onChange={e => setEmail(e.target.value)}
              />
              <textarea
                className="w-full rounded-xl px-3 py-2.5 border outline-none text-sm mt-2 resize-none"
                rows={2}
                maxLength={150}
                style={{ borderColor: C.line, color: C.ink }}
                placeholder="A mini bio, up to 150 characters. It shows where people pick partners."
                value={bio}
                onChange={e => setBio(e.target.value.slice(0, 150))}
              />
              <div className="text-right text-xs" style={{ color: C.fade }}>{bio.length}/150</div>
              <label className="flex items-start gap-2 text-sm mt-3" style={{ color: C.ink }}>
                <input
                  type="checkbox"
                  className="mt-0.5"
                  checked={hidden}
                  onChange={e => setHidden(e.target.checked)}
                />
                <span>
                  Keep me hidden. Your progress card stays out of everyone's open circle and
                  partner chips. Someone who types your exact name can still choose you.
                </span>
              </label>
              <label className="flex items-start gap-2 text-sm mt-3" style={{ color: C.ink }}>
                <input
                  type="checkbox"
                  className="mt-0.5"
                  checked={privProf}
                  onChange={e => setPrivProf(e.target.checked)}
                />
                <span>
                  Private profile. Nobody can open your profile card, so your badges, streaks,
                  and bio stay yours alone. Your name and posts still show.
                </span>
              </label>
              <label className="flex items-start gap-2 text-sm mt-3" style={{ color: C.ink }}>
                <input
                  type="checkbox"
                  className="mt-0.5"
                  checked={notifOn}
                  onChange={toggleNotif}
                />
                <span>
                  Notifications. Your device alerts you about new messages, partner requests,
                  team invites, and assigned work. On for everyone from day one, off with this
                  one tap, no save needed.
                </span>
              </label>
            </div>

            <div className="rounded-2xl p-4 mb-4" style={{ background: "#fff" }}>
              <div className="text-xs font-semibold mb-2" style={{ color: C.navy2 }}>Accountability partners</div>
              <label className="flex items-start gap-2 text-sm" style={{ color: C.ink }}>
                <input
                  type="checkbox"
                  className="mt-0.5"
                  checked={seeking}
                  onChange={e => setSeeking(e.target.checked)}
                />
                <span>
                  I'm looking for an accountability partner. Your name gets listed on the Partners
                  tab so others can choose you.
                </span>
              </label>
              <p className="text-xs mt-2" style={{ color: C.fade }}>
                Partnerships start with a request and an accept, and you can have more than one.
                Partners see your weekly and monthly progress only, never your actual tasks. The
                hidden setting above overrides this and keeps you off every list.
              </p>
            </div>

            {blocked.length > 0 && (
              <div className="rounded-2xl p-4 mb-4" style={{ background: "#fff" }}>
                <div className="text-xs font-semibold mb-2" style={{ color: C.navy2 }}>Blocked members</div>
                {blocked.map(n => (
                  <div key={n} className="flex items-center justify-between py-1.5" style={{ borderBottom: `1px solid ${C.line}` }}>
                    <span className="text-sm" style={{ color: C.ink }}>{n}</span>
                    <button onClick={() => unblockUser(n)} className="text-xs font-semibold" style={{ color: C.teal }}>
                      Unblock
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="rounded-2xl p-4 mb-4" style={{ background: "#fff" }}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-semibold" style={{ color: C.navy2 }}>Your badge case</span>
                {stats.streak >= 2 && <span className="text-xs font-bold" style={{ color: C.coral }}>🔥 {stats.streak} day streak</span>}
              </div>
              <div className="text-xs font-bold mb-1" style={{ color: levelColor(levelOf(stats.totalDone)) }}>
                {levelIcon(levelOf(stats.totalDone))} Mountain Level {levelOf(stats.totalDone)} · {stats.totalDone} tasks done, next level at {nextLevelAt(stats.totalDone)}
              </div>
              <p className="text-xs mb-3" style={{ color: C.fade }}>
                Your top two badges and your streak show next to your name everywhere. Sundays
                always count toward your streak. Saturdays count too, unless you scheduled that
                Saturday and left it undone.
              </p>
              <div className="grid grid-cols-4 gap-2">
                {BADGE_CATALOG.map(b => {
                  const cur = b.val(stats, pairs.length > 0 || !!partner);
                  const earned = cur >= b.target;
                  return (
                    <div key={b.id} className="rounded-xl p-2 text-center" style={{ background: earned ? C.goldSoft : "#ECF1EF", opacity: earned ? 1 : 0.45 }}>
                      <div style={{ fontSize: 20 }}>{b.e}</div>
                      <div className="font-semibold" style={{ fontSize: 9, color: C.navy }}>{b.name}</div>
                      {!earned && <div style={{ fontSize: 8, color: C.fade }}>{Math.min(cur, b.target)}/{b.target}</div>}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="rounded-2xl p-4 mb-4" style={{ background: C.navy }}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-bold" style={{ color: C.cream }}>Your plan</span>
                <Chip color={C.navy} bg={C.gold}>{plan === "boss" ? "Boss" : plan === "teams" ? "Teams" : "Standard"}</Chip>
              </div>
              <div className="flex gap-2 mb-2">
                {["standard", "teams", "boss"].map(pl => (
                  <button
                    key={pl}
                    onClick={() => setPlan(pl)}
                    className="flex-1 rounded-xl py-2 text-xs font-semibold"
                    style={{ background: plan === pl ? C.gold : C.navy2, color: plan === pl ? C.navy : C.cream }}
                  >
                    {pl === "standard" ? "Standard" : pl === "teams" ? "Teams" : "Boss"}
                  </button>
                ))}
              </div>
              <p className="text-xs" style={{ color: C.goldSoft }}>
                {plan === "standard"
                  ? "The full planner: voice control, celebrations, community, and one accountability partner. $17 a month, or $170 a year with two months free."
                  : plan === "teams"
                    ? "Everything in Standard plus unlimited partners and named team groups with their own discussion and progress view. $27 a month, or $270 a year with two months free."
                    : "Everything in Teams plus boss powers: assign tasks with deadlines, see every assignment and its status, manage the work, and message the team. $97 a month, or $970 a year, with 7 member seats included and $9 a month per extra seat."}
              </p>
              <p className="text-xs mt-2" style={{ color: C.goldSoft }}>
                Every new member starts with 14 days free, then rolls into Standard unless they
                choose a higher plan. Upgrades prorate automatically, so unused time on the old
                plan counts toward the new one. Real billing decides this at launch. The buttons
                preview each plan and save with your account.
              </p>
            </div>

            {plan === "boss" && bossSeatNames.length > 0 && (
              <div className="rounded-2xl p-4 mb-4" style={{ background: "#fff" }}>
                <div className="text-xs font-semibold mb-2" style={{ color: C.navy2 }}>Your seats</div>
                {bossSeatNames.map(n => {
                  const em = (() => {
                    for (const t of teams) {
                      if (t.kind === "boss" && slug(t.ownerName) === slug(me || "") && t.emails && t.emails[slug(n)]) return t.emails[slug(n)];
                    }
                    return null;
                  })();
                  const onTeams = teams
                    .filter(t => t.kind === "boss" && slug(t.ownerName) === slug(me || "") && (t.members || []).some(x => slug(x) === slug(n)))
                    .map(t => t.name);
                  return (
                    <div key={n} className="flex items-center gap-2 py-2" style={{ borderBottom: `1px solid ${C.line}` }}>
                      <Avatar src={avatarOf(n)} name={n} size={28} />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-bold" style={{ color: C.navy }}>{n}</div>
                        <div className="text-xs truncate" style={{ color: C.fade }}>
                          {em || "email not shared yet"} · {onTeams.join(", ")}
                        </div>
                      </div>
                    </div>
                  );
                })}
                <p className="text-xs mt-2" style={{ color: C.fade }}>
                  Emails appear once a member has opened the app after joining your team.
                </p>
              </div>
            )}

            <div className="rounded-2xl p-4 mb-4" style={{ background: "#fff" }}>
              <div className="text-xs font-semibold mb-1" style={{ color: C.navy2 }}>Help</div>
              <p className="text-xs mb-2" style={{ color: C.fade }}>
                Tap any topic for exact instructions.
              </p>
              {HELP.map(h => (
                <div key={h.id} style={{ borderBottom: `1px solid ${C.line}` }}>
                  <button
                    onClick={() => setHelpOpen(helpOpen === h.id ? null : h.id)}
                    className="w-full flex items-center justify-between py-2.5 text-left"
                  >
                    <span className="text-sm font-semibold" style={{ color: C.navy }}>{h.t}</span>
                    <span style={{ color: C.gold, fontSize: 16 }}>{helpOpen === h.id ? "\u2212" : "+"}</span>
                  </button>
                  {helpOpen === h.id && (
                    <div className="pb-3">
                      {h.b.map((p, i) => (
                        <p
                          key={i}
                          className="text-xs mb-2 leading-relaxed"
                          style={{
                            color: p.startsWith("Q: ") ? C.navy : C.ink,
                            fontWeight: p.startsWith("Q: ") ? 700 : 400,
                            marginBottom: p.startsWith("Q: ") ? 2 : 8
                          }}
                        >
                          {p}
                        </p>
                      ))}
                    </div>
                  )}
                </div>
              ))}
              <a
                href="mailto:clientcare@gettada.me"
                className="block w-full text-center rounded-xl py-2.5 mt-3 text-sm font-semibold"
                style={{ background: C.teal, color: "#fff", textDecoration: "none" }}
              >
                Email us: clientcare@gettada.me
              </a>
              <p className="text-xs mt-2 text-center" style={{ color: C.fade }}>
                Stuck on anything at all? Write in. A real person answers.
              </p>
            </div>

            <button
              onClick={saveAccount}
              className="w-full rounded-xl py-3 font-semibold"
              style={{ background: C.coral, color: "#fff" }}
            >
              Save my account
            </button>
          </div>
        )}
      </div>

      {/* bottom nav */}
      <div
        className="fixed bottom-0 left-0 right-0 flex justify-around py-2 border-t"
        style={{ background: C.navy, borderColor: C.navy2, zIndex: 50 }}
      >
        {[
          { id: "today", label: "Today", Icon: Sun },
          { id: "plan", label: "Plan", Icon: CalendarDays },
          { id: "timeline", label: "Timeline", Icon: BarChart3 },
          { id: "partners", label: "Partners", Icon: Users },
          { id: "community", label: "Community", Icon: MessageCircle }
        ].map(({ id, label, Icon }) => (
          <button key={id} onClick={() => setView(id)} className="flex flex-col items-center gap-0.5 px-2 py-1">
            <Icon size={20} style={{ color: view === id ? C.gold : C.fade }} />
            <span className="font-medium" style={{ fontSize: 10, color: view === id ? C.gold : C.fade }}>
              {label}
            </span>
          </button>
        ))}
      </div>

      {me && !onb.done && (
        <div className="fixed right-4" style={{ bottom: 72, zIndex: 55 }}>
          {onbOpen ? (
            <div className="rounded-2xl p-4 shadow-xl" style={{ background: "#fff", width: 260, border: `2px solid ${C.gold}` }}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-bold" style={{ color: C.navy }}>Getting started</span>
                <button onClick={() => setOnbOpen(false)}>
                  <X size={16} style={{ color: C.fade }} />
                </button>
              </div>
              {onbItems.map(i => (
                <button
                  key={i.id}
                  onClick={() => {
                    if (i.id === "tour") setShowTour(true);
                    else if (i.id === "task") { setView("plan"); setShowAdd(true); setOnbOpen(false); }
                    else if (i.id === "check") { setView("today"); setOnbOpen(false); }
                    else if (i.id === "hello") { setView("community"); setOnbOpen(false); }
                    else { setView("partners"); setOnbOpen(false); }
                  }}
                  className="w-full flex items-center gap-2 py-1.5 text-left"
                >
                  {i.done
                    ? <CheckCircle2 size={18} style={{ color: C.teal }} />
                    : <Circle size={18} style={{ color: C.fade }} />}
                  <span className="text-xs" style={{ color: i.done ? C.fade : C.ink, textDecoration: i.done ? "line-through" : "none" }}>
                    {i.label}
                  </span>
                </button>
              ))}
              <div className="mt-2">
                <Bar pct={(onbDoneCount / onbItems.length) * 100} h={6} />
              </div>
            </div>
          ) : (
            <button
              onClick={() => setOnbOpen(true)}
              className="rounded-full px-4 py-2.5 text-xs font-bold shadow-xl"
              style={{ background: C.gold, color: C.navy }}
            >
              Getting started · {onbDoneCount} of {onbItems.length}
            </button>
          )}
        </div>
      )}

      {showTour && (
        <div className="fixed inset-0 flex items-center justify-center p-5" style={{ background: "rgba(20,42,56,0.6)", zIndex: 85 }}>
          <div className="w-full max-w-sm rounded-2xl p-4" style={{ background: C.cream }}>
            <div className="flex items-center justify-between mb-2">
              <span className="font-bold" style={{ color: C.navy }}>Welcome tour</span>
              <button onClick={() => setShowTour(false)}>
                <X size={18} style={{ color: C.fade }} />
              </button>
            </div>
            {TOUR_URL ? (
              <iframe
                src={TOUR_URL}
                title="Welcome tour"
                className="w-full rounded-xl"
                style={{ height: 200, border: "none" }}
                allow="autoplay; fullscreen"
              />
            ) : (
              <div className="rounded-xl p-5 text-center text-sm" style={{ background: "#fff", color: C.fade }}>
                Your tour video lives right here. Record a short walkthrough, upload it unlisted to
                YouTube or Vimeo, and paste the embed link into TOUR_URL at the top of the code.
              </div>
            )}
            <button
              onClick={() => {
                const o2 = { ...onb, tour: true };
                setOnb(o2);
                sset("welldone-me", { name: me, email, partner, hidden, seeking, plan, avatar, muted, bio, onb: o2, priv: privProf, blocked, notif: notifOn, stats, tasks });
                setShowTour(false);
              }}
              className="mt-3 w-full rounded-xl py-2.5 font-semibold text-sm"
              style={{ background: C.teal, color: "#fff" }}
            >
              Mark the tour watched
            </button>
          </div>
        </div>
      )}

      {viewProfile && (() => {
        const pf = slug(viewProfile) === slug(me || "")
          ? { name: me, avatar, bio, streak: stats.streak, bestStreak: stats.bestStreak, badges: myBadges, level: levelOf(stats.totalDone), total: monthTotal, done: monthDone, seeking }
          : profOf(viewProfile);
        return (
          <div
            className="fixed inset-0 flex items-center justify-center p-5"
            style={{ background: "rgba(20,42,56,0.6)", zIndex: 85 }}
            onClick={() => setViewProfile(null)}
          >
            <div className="w-full max-w-sm rounded-2xl p-5" style={{ background: C.cream }} onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-3">
                <span className="font-bold" style={{ color: C.navy }}>Profile</span>
                <button onClick={() => setViewProfile(null)}>
                  <X size={18} style={{ color: C.fade }} />
                </button>
              </div>
              {pf ? (
                pf.priv && slug(pf.name || "") !== slug(me || "") && !inMyBossGroup(pf.name) ? (
                  <div className="text-center py-4">
                    <div className="flex justify-center mb-2">
                      <Avatar src={pf.avatar} name={pf.name} size={56} />
                    </div>
                    <div className="text-base font-bold" style={{ color: C.navy }}>{pf.name}</div>
                    <p className="text-xs mt-2" style={{ color: C.fade }}>This profile is private.</p>
                    {slug(pf.name || "") !== slug(me || "") && !isBlocked(pf.name) && (
                      <button
                        onClick={() => blockUser(pf.name)}
                        className="mt-3 rounded-xl px-4 py-2 text-xs font-semibold"
                        style={{ background: "#FFE2DB", color: C.coral }}
                      >
                        Block this member
                      </button>
                    )}
                  </div>
                ) : (
                <div>
                  <div className="flex items-center gap-3 mb-3">
                    <Avatar src={pf.avatar} name={pf.name} size={56} />
                    <div className="flex-1 min-w-0">
                      <div className="text-base font-bold" style={{ color: C.navy }}>
                        {pf.name}{slug(pf.name || "") === slug(me || "") ? " (you)" : ""}
                      </div>
                      {pf.bio && <div className="text-xs" style={{ color: C.fade, fontStyle: "italic" }}>{pf.bio}</div>}
                    </div>
                  </div>
                  <div className="flex gap-2 mb-3 flex-wrap">
                    <Chip color="#FF6B53" bg="#FFE2DB">🔥 {pf.streak || 0} day streak</Chip>
                    <Chip color={C.navy2} bg="#EDF3F2">Best {pf.bestStreak || 0}</Chip>
                    <Chip color={levelColor(pf.level || 0)} bg="#E2F1EC">{levelIcon(pf.level || 0)} Level {pf.level || 0}</Chip>
                  </div>
                  {pf.total > 0 && (
                    <div className="mb-3">
                      <div className="flex justify-between text-xs mb-1" style={{ color: C.fade }}>
                        <span>This month</span>
                        <span>{pf.done} of {pf.total}</span>
                      </div>
                      <Bar pct={pf.total ? (pf.done / pf.total) * 100 : 0} color={C.teal} />
                    </div>
                  )}
                  <div className="text-xs font-semibold mb-2" style={{ color: C.navy2 }}>Badges earned</div>
                  {(pf.badges || []).length === 0 ? (
                    <p className="text-xs" style={{ color: C.fade }}>No badges yet. The story is just starting.</p>
                  ) : (
                    <div className="grid grid-cols-4 gap-2">
                      {(pf.badges || []).map(b => (
                        <div key={b.id} className="rounded-xl p-2 text-center" style={{ background: C.goldSoft }}>
                          <div style={{ fontSize: 20 }}>{b.e}</div>
                          <div className="font-semibold" style={{ fontSize: 9, color: C.navy }}>{b.name}</div>
                        </div>
                      ))}
                    </div>
                  )}
                  {pf.seeking && slug(pf.name || "") !== slug(me || "") && !myPartnerNames.some(n => slug(n) === slug(pf.name)) && (
                    <button
                      onClick={() => { sendRequest(pf.name); setViewProfile(null); }}
                      className="mt-3 w-full rounded-xl py-2.5 text-sm font-semibold"
                      style={{ background: C.navy, color: C.cream }}
                    >
                      Ask to partner
                    </button>
                  )}
                  {slug(pf.name || "") !== slug(me || "") && (
                    isBlocked(pf.name) ? (
                      <button
                        onClick={() => unblockUser(pf.name)}
                        className="mt-2 w-full rounded-xl py-2 text-xs font-semibold"
                        style={{ background: "#EDF3F2", color: C.ink }}
                      >
                        Unblock {pf.name}
                      </button>
                    ) : (
                      <button
                        onClick={() => blockUser(pf.name)}
                        className="mt-2 w-full rounded-xl py-2 text-xs font-semibold"
                        style={{ background: "#FFE2DB", color: C.coral }}
                      >
                        Block this member
                      </button>
                    )
                  )}
                </div>
                )
              ) : (
                <p className="text-sm" style={{ color: C.fade }}>
                  Nothing to show yet. They'll appear here once they've been active.
                </p>
              )}
            </div>
          </div>
        );
      })()}

      {confirmRemove && (
        <div className="fixed inset-0 flex items-center justify-center p-5" style={{ background: "rgba(20,42,56,0.6)", zIndex: 90 }}>
          <div className="w-full max-w-sm rounded-2xl p-5" style={{ background: C.cream }}>
            <div className="font-bold mb-2" style={{ color: C.navy }}>Remove {confirmRemove.name}?</div>
            <p className="text-sm mb-2" style={{ color: C.ink }}>
              This cancels their seat on {confirmRemove.teamName}. Their unfinished assigned tasks
              move to the holding tank so you can hand them to someone else. This can't be undone.
            </p>
            {(() => {
              const stillOnAnother = teams.some(t =>
                t.kind === "boss" &&
                slug(t.ownerName) === slug(me || "") &&
                t.id !== confirmRemove.teamId &&
                (t.members || []).some(n => slug(n) === slug(confirmRemove.name))
              );
              return (
                <p className="text-xs mb-4" style={{ color: C.fade }}>
                  {stillOnAnother
                    ? "They're still on another of your teams, so their seat stays in use."
                    : seatExtra > 0
                      ? "This ends one $9 extra seat on your next bill."
                      : `This frees one of your 7 included seats. You'll be using ${Math.max(0, seatCount - 1)} of 7.`}
                </p>
              );
            })()}
            <div className="flex gap-2">
              <button
                onClick={() => setConfirmRemove(null)}
                className="flex-1 rounded-xl py-2.5 text-sm font-semibold"
                style={{ background: "#EDF3F2", color: C.ink }}
              >
                Keep them
              </button>
              <button
                onClick={() => { removeMember(confirmRemove.teamId, confirmRemove.name); setConfirmRemove(null); }}
                className="flex-1 rounded-xl py-2.5 text-sm font-semibold"
                style={{ background: C.coral, color: "#fff" }}
              >
                Yes, remove them
              </button>
            </div>
          </div>
        </div>
      )}

      <Celebrate burst={burst} />

      {bigMsg && (
        <div className="fixed inset-0 flex items-center justify-center pointer-events-none" style={{ zIndex: 70 }}>
          <div className="px-8 py-4 rounded-2xl text-center" style={{ background: "rgba(20,42,56,0.92)" }}>
            <div style={{ color: C.gold, fontFamily: "Georgia, serif", fontStyle: "italic", fontSize: 40 }}>
              Ta-Da!
            </div>
            <div style={{ color: C.cream, fontSize: 14 }}>Well done. That was a big one.</div>
          </div>
        </div>
      )}

      {ceremony && (
        <div className="fixed inset-0 flex items-center justify-center pointer-events-none" style={{ zIndex: 75, background: "rgba(20,42,56,0.35)" }}>
          <div className="text-center px-8 py-8 rounded-3xl mx-6" style={{ background: "rgba(20,42,56,0.96)", border: `3px solid ${C.gold}` }}>
            <div className="animate-bounce" style={{ fontSize: 72, lineHeight: 1 }}>{ceremony.badge.e}</div>
            <div className="mt-3" style={{ color: C.gold, fontFamily: "Georgia, serif", fontStyle: "italic", fontSize: 30 }}>
              {ceremony.badge.name}
            </div>
            <div className="mt-2 text-sm font-bold" style={{ color: C.cream }}>
              {ceremony.line1}
            </div>
            <div className="mt-1 text-xs" style={{ color: C.goldSoft }}>
              {ceremony.line2}
            </div>
          </div>
        </div>
      )}

      {editing && (
        <div
          className="fixed inset-0 flex items-end sm:items-center justify-center p-4"
          style={{ background: "rgba(20,42,56,0.55)", zIndex: 80 }}
        >
          <div className="w-full max-w-sm rounded-2xl p-5" style={{ background: C.cream }}>
            <div className="flex justify-between items-center mb-3">
              <span className="font-bold" style={{ color: C.navy }}>Edit task</span>
              <button onClick={() => setEditing(null)}>
                <X size={18} style={{ color: C.fade }} />
              </button>
            </div>
            <input
              className="w-full rounded-xl px-3 py-2.5 border outline-none text-sm mb-3"
              style={{ borderColor: C.line, background: "#fff", color: C.ink }}
              value={editing.title}
              onChange={e => setEditing({ ...editing, title: e.target.value })}
            />
            <div className="grid grid-cols-2 gap-2 mb-3">
              <select
                className="rounded-xl px-2 py-2.5 border text-sm"
                style={{ borderColor: C.line, background: "#fff", color: C.ink }}
                value={editing.date ? parseInt(editing.date.slice(8), 10) : "auto"}
                onChange={e => {
                  const v = e.target.value;
                  setEditing(v === "auto" ? { ...editing, date: null } : { ...editing, date: dstr(parseInt(v, 10)) });
                }}
              >
                <option value="auto">No day yet</option>
                {Array.from({ length: DAYS }, (_, i) => i + 1).map(d => (
                  <option key={d} value={d}>{dayLabel(dstr(d))}</option>
                ))}
              </select>
              <select
                className="rounded-xl px-2 py-2.5 border text-sm"
                style={{ borderColor: C.line, background: "#fff", color: C.ink }}
                value={editing.block === "auto" ? "afternoon" : editing.block}
                onChange={e => setEditing({ ...editing, block: e.target.value })}
              >
                {BLOCKS.map(b => <option key={b.id} value={b.id}>{b.label}</option>)}
              </select>
            </div>
            {!editing.date && (
              <select
                className="w-full rounded-xl px-2 py-2.5 border text-sm mb-3"
                style={{ borderColor: C.line, background: "#fff", color: C.ink }}
                value={editing.week}
                onChange={e => setEditing({ ...editing, week: parseInt(e.target.value, 10) })}
              >
                {weekRows.map(({ w }) => <option key={w} value={w}>{WEEKINFO[w - 1].label}</option>)}
              </select>
            )}
            <select
              className="w-full rounded-xl px-2 py-2.5 border text-sm mb-3"
              style={{ borderColor: C.line, background: "#fff", color: C.ink }}
              value={editing.repeat || "none"}
              onChange={e => setEditing({ ...editing, repeat: e.target.value, anchor: null })}
            >
              <option value="none">One time</option>
              <option value="weekly">Every week</option>
              <option value="monthly">Every month</option>
            </select>
            {editing.repeat === "weekly" && (
              <select
                className="w-full rounded-xl px-2 py-2.5 border text-sm mb-3"
                style={{ borderColor: C.line, background: "#fff", color: C.ink }}
                value={editing.anchor === null || editing.anchor === undefined ? "" : editing.anchor}
                onChange={e => setEditing({ ...editing, anchor: e.target.value === "" ? null : parseInt(e.target.value, 10) })}
              >
                <option value="">Any day, let the app place it</option>
                {[1, 2, 3, 4, 5, 6, 0].map(wd => (
                  <option key={wd} value={wd}>Every {WDFULL[wd]}</option>
                ))}
              </select>
            )}
            {editing.repeat === "monthly" && (
              <select
                className="w-full rounded-xl px-2 py-2.5 border text-sm mb-3"
                style={{ borderColor: C.line, background: "#fff", color: C.ink }}
                value={editing.anchor === null || editing.anchor === undefined ? "" : editing.anchor}
                onChange={e => setEditing({ ...editing, anchor: e.target.value === "" ? null : parseInt(e.target.value, 10) })}
              >
                <option value="">Any day, let the app place it</option>
                {Array.from({ length: DAYS }, (_, i) => i + 1).map(d => (
                  <option key={d} value={d}>The {ord(d)} of every month</option>
                ))}
              </select>
            )}
            <label className="flex items-center gap-2 text-sm mb-4" style={{ color: C.ink }}>
              <input
                type="checkbox"
                checked={!!editing.big}
                onChange={e => setEditing({ ...editing, big: e.target.checked })}
              />
              Big win
            </label>
            <div className="flex gap-2">
              <button
                onClick={() => removeTask(editing.id)}
                className="rounded-xl px-4 py-2.5"
                style={{ background: "#FFE2DB" }}
              >
                <Trash2 size={16} style={{ color: C.coral }} />
              </button>
              <button
                onClick={saveEdit}
                className="flex-1 rounded-xl py-2.5 font-semibold"
                style={{ background: C.navy, color: C.cream }}
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
