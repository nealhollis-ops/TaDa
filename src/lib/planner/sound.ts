/**
 * Check-off sound and buzz: Deb's real "TaDa!".
 * The recording ships with the app at /audio/tada.mp3 (NEXT_PUBLIC_TADA_URL can
 * point somewhere else). If the clip cannot play (it has not loaded yet, or the
 * browser blocks audio before the first tap), the app stays quiet or plays the
 * soft chime. There is no synthesized voice anywhere.
 */
const TADA_URL = process.env.NEXT_PUBLIC_TADA_URL || "/audio/tada.mp3";

let audioCtx: AudioContext | null = null;
let soundOn = true;
let tadaEl: HTMLAudioElement | null = null;
let unlocked = false;

export const setSoundOn = (on: boolean) => {
  soundOn = on;
};
export const isSoundOn = () => soundOn;

const clip = () => {
  if (typeof window === "undefined") return null;
  if (!tadaEl) {
    tadaEl = new Audio(TADA_URL);
    tadaEl.preload = "auto";
  }
  return tadaEl;
};

/**
 * Browsers only allow sound after a user gesture. Call this from the first
 * tap so the clip is decoded and ready before the first check-off.
 */
export const primeSound = () => {
  const el = clip();
  if (!el || unlocked) return;
  unlocked = true;
  try {
    el.load();
  } catch {
    /* fine */
  }
};

type WebkitWindow = Window & { webkitAudioContext?: typeof AudioContext };

const ctx = () => {
  if (!audioCtx) {
    const AC = window.AudioContext || (window as WebkitWindow).webkitAudioContext;
    if (!AC) return null;
    audioCtx = new AC();
  }
  if (audioCtx.state === "suspended") audioCtx.resume();
  return audioCtx;
};

/** Play Deb's clip. Resolves true when playback started. */
export const sayTada = (): boolean => {
  if (!soundOn) return false;
  const el = clip();
  if (!el) return false;
  try {
    el.currentTime = 0;
    const p = el.play();
    if (p && typeof p.catch === "function") p.catch(() => {});
    return true;
  } catch {
    return false;
  }
};

/** Soft chime used only when the clip itself cannot play. */
const chime = (big: boolean) => {
  try {
    const ac = ctx();
    if (!ac) return;
    const t = ac.currentTime;
    const soft = (freq: number, start: number, len: number, vol: number, type: OscillatorType = "sine") => {
      const o = ac.createOscillator();
      const g = ac.createGain();
      o.type = type;
      o.frequency.value = freq;
      g.gain.setValueAtTime(0.0001, start);
      g.gain.linearRampToValueAtTime(vol, start + 0.05);
      g.gain.setValueAtTime(vol, start + Math.max(0.06, len * 0.35));
      g.gain.exponentialRampToValueAtTime(0.0001, start + len);
      o.connect(g);
      g.connect(ac.destination);
      o.start(start);
      o.stop(start + len + 0.05);
    };
    soft(392.0, t, 0.22, 0.12);
    const daAt = t + 0.2;
    const daLen = big ? 1.9 : 1.4;
    [261.63, 523.25, 659.25, 783.99].forEach((fr, i) => soft(fr, daAt, daLen, i === 0 ? 0.08 : 0.11));
  } catch {
    /* sound is a bonus, never a blocker */
  }
};

export const playChime = (big: boolean) => {
  if (!soundOn) return;
  if (sayTada()) return;
  chime(big);
};

export const buzz = (big: boolean) => {
  try {
    if (navigator.vibrate) navigator.vibrate(big ? [60, 60, 320, 80, 160] : [60, 60, 250]);
  } catch {
    /* vibration is a bonus too */
  }
};

export const buzzGrand = () => {
  try {
    if (navigator.vibrate) navigator.vibrate([80, 50, 80, 50, 300, 100, 400]);
  } catch {
    /* bonus */
  }
};

// Full fanfare for badge milestones: Deb's TaDa, then the brass.
export const playGrand = () => {
  if (!soundOn) return;
  sayTada();
  try {
    const ac = ctx();
    if (!ac) return;
    const t = ac.currentTime + 0.9;
    const note = (freq: number, start: number, len: number, vol: number, type: OscillatorType = "sawtooth") => {
      const o = ac.createOscillator();
      const f = ac.createBiquadFilter();
      const g = ac.createGain();
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
      g.connect(ac.destination);
      o.start(start);
      o.stop(start + len + 0.05);
    };
    note(392.0, t, 0.12, 0.16);
    note(523.25, t + 0.13, 0.12, 0.16);
    note(659.25, t + 0.26, 0.12, 0.16);
    note(783.99, t + 0.39, 0.15, 0.18);
    [523.25, 659.25, 783.99, 1046.5].forEach((fr) => note(fr, t + 0.58, 1.7, 0.14));
    note(130.81, t + 0.58, 0.6, 0.24, "sine");
    note(1318.51, t + 1.1, 0.9, 0.09);
  } catch {
    /* sound is a bonus */
  }
};

/** Opening greeting: Deb's clip, nothing else. */
export const greet = () => {
  if (!soundOn) return;
  sayTada();
};

/** Like greet, but reports whether the clip actually started (browsers block audio before the first tap). */
export const tryGreet = async (): Promise<boolean> => {
  if (!soundOn) return false;
  const el = clip();
  if (!el) return false;
  try {
    el.currentTime = 0;
    await el.play();
    return true;
  } catch {
    return false;
  }
};
