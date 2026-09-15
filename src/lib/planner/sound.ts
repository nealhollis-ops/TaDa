/**
 * Check-off sound and buzz: a real "ta-da!".
 * Order of preference: Deb's recorded clip (NEXT_PUBLIC_TADA_URL), then the
 * device voice, then a soft synthesized chord. Sound is a bonus, never a blocker.
 */
const TADA_URL = process.env.NEXT_PUBLIC_TADA_URL ?? "";

let audioCtx: AudioContext | null = null;
let soundOn = true;
let tadaEl: HTMLAudioElement | null = null;

export const setSoundOn = (on: boolean) => {
  soundOn = on;
};
export const isSoundOn = () => soundOn;

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

export const sayTada = (big: boolean): boolean => {
  if (!soundOn) return false;
  if (TADA_URL) {
    try {
      tadaEl = tadaEl || new Audio(TADA_URL);
      tadaEl.currentTime = 0;
      void tadaEl.play();
      return true;
    } catch {
      /* fall through to the device voice */
    }
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
  } catch {
    return false;
  }
};

export const playChime = (big: boolean) => {
  if (!soundOn) return;
  if (sayTada(big)) return;
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
    soft(392.0, t, 0.22, 0.05, "triangle");
    const daAt = t + 0.2;
    const daLen = big ? 1.9 : 1.4;
    [261.63, 523.25, 659.25, 783.99].forEach((fr, i) => {
      soft(fr, daAt, daLen, i === 0 ? 0.08 : 0.11);
      soft(fr * 1.003, daAt, daLen, 0.04, "triangle");
    });
    if (big) soft(1046.5, daAt + 0.15, daLen, 0.06);
  } catch {
    /* sound is a bonus, never a blocker */
  }
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

// Full fanfare for badge milestones
export const playGrand = () => {
  if (!soundOn) return;
  try {
    const ac = ctx();
    if (!ac) return;
    const t = ac.currentTime;
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

/** Opening greeting: the recorded clip if we have it, else the device voice. */
export const greet = () => {
  if (!soundOn) return;
  if (TADA_URL) {
    try {
      tadaEl = tadaEl || new Audio(TADA_URL);
      tadaEl.currentTime = 0;
      void tadaEl.play().catch(() => {});
      return;
    } catch {
      /* fall through */
    }
  }
  try {
    if (!window.speechSynthesis) return;
    const u = new SpeechSynthesisUtterance("ta-daa!");
    u.rate = 0.95;
    u.pitch = 1.5;
    window.speechSynthesis.speak(u);
  } catch {
    /* greeting is a bonus */
  }
};
