/**
 * Calendar rules from the prototype: the app runs on the current calendar
 * month, weeks run Monday through Sunday, Sunday is the rest day.
 * Everything here is pure so it can be used on the server and in the browser.
 */

export const WD = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
export const WDFULL = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export const ord = (n: number) => {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return `${n}${s[(v - 20) % 10] || s[v] || s[0]}`;
};

export const pad = (n: number) => String(n).padStart(2, "0");

export type WeekInfo = { w: number; start: number; end: number; days: number[]; label: string; short: string };

export type MonthInfo = {
  year: number;
  month: number; // 0-based
  days: number;
  name: string;
  short: string;
  prefix: string; // 'YYYY-MM'
  weeks: WeekInfo[];
  weekCount: number;
};

/** Build the month model for any date (defaults to now). */
export function monthInfo(at: Date = new Date()): MonthInfo {
  const year = at.getFullYear();
  const month = at.getMonth();
  const days = new Date(year, month + 1, 0).getDate();
  const name = at.toLocaleString("default", { month: "long" });
  const short = at.toLocaleString("default", { month: "short" });
  const weeks: WeekInfo[] = [];
  for (let d = 1; d <= days; d++) {
    const monIdx = (new Date(year, month, d).getDay() + 6) % 7; // 0 means Monday
    if (d === 1 || monIdx === 0) {
      weeks.push({ w: weeks.length + 1, start: d, end: d, days: [d], label: "", short: "" });
    } else {
      const wk = weeks[weeks.length - 1];
      wk.end = d;
      wk.days.push(d);
    }
  }
  weeks.forEach((wk) => {
    wk.label = `${short} ${wk.start}-${wk.end}`;
    wk.short = `${short} ${wk.start}`;
  });
  return { year, month, days, name, short, prefix: `${year}-${pad(month + 1)}`, weeks, weekCount: weeks.length };
}

export const dstr = (m: MonthInfo, d: number) => `${m.prefix}-${pad(d)}`;

/**
 * Days of the month still worth offering in a day picker: today onward, so
 * nobody schedules into the past by accident. `keep` is a date already on the
 * task, which stays listed even when it has gone by.
 */
export const pickableDays = (m: MonthInfo, today: string, keep: string | null = null): number[] => {
  const from = today.startsWith(m.prefix) ? parseInt(today.slice(8), 10) : today > m.prefix ? m.days + 1 : 1;
  const days = Array.from({ length: m.days }, (_, i) => i + 1).filter((d) => d >= from);
  const kept = keep && keep.startsWith(m.prefix) ? parseInt(keep.slice(8), 10) : null;
  if (kept && !days.includes(kept)) days.unshift(kept);
  return days;
};

/**
 * How far ahead a day picker will go. The pickers are real date fields rather
 * than long lists, so this is only a sanity rail on the calendar, not a scroll
 * the member has to work through.
 */
export const PICK_MONTHS_AHEAD = 12;

/** The month model for the month a date string belongs to. */
export const monthOfDate = (ds: string) => monthInfo(new Date(parseInt(ds.slice(0, 4), 10), parseInt(ds.slice(5, 7), 10) - 1, 1));

/** 'YYYY-MM' n months after a month model. */
export const monthPrefixAhead = (m: MonthInfo, n: number) => {
  const d = new Date(m.year, m.month + n, 1);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
};

/** "Mon 22" inside the current month, "Thu Oct 3" once it is a different one. */
export const pickLabel = (mi: MonthInfo, ds: string, withMonth: boolean) => {
  const d = dayOfMonth(ds);
  const wd = WD[new Date(mi.year, mi.month, d).getDay()];
  return withMonth ? `${wd} ${mi.short} ${d}` : `${wd} ${d}`;
};

/** A date's label wherever it sits, for showing a task's day outside the current month. */
export const dateLabel = (ds: string, current: MonthInfo) => {
  const mi = monthOfDate(ds);
  return pickLabel(mi, ds, mi.prefix !== current.prefix);
};

/** The last date a picker will accept: the end of the month PICK_MONTHS_AHEAD out. */
export const lastPickableDate = (m: MonthInfo, monthsAhead = PICK_MONTHS_AHEAD) => {
  const mi = monthInfo(new Date(m.year, m.month + monthsAhead, 1));
  return dstr(mi, mi.days);
};

/** Sunday is the built-in rest day, worth saying out loud when someone picks one. */
export const isRestDay = (ds: string) => {
  const mi = monthOfDate(ds);
  return weekdayOf(mi, dayOfMonth(ds)) === 0;
};

export const todayStr = () => {
  const t = new Date();
  return `${t.getFullYear()}-${pad(t.getMonth() + 1)}-${pad(t.getDate())}`;
};

export const dayOfMonth = (ds: string) => parseInt(ds.slice(8), 10);

export const weekOf = (m: MonthInfo, ds: string) => {
  const d = dayOfMonth(ds);
  const wk = m.weeks.find((x) => d >= x.start && d <= x.end);
  return wk ? wk.w : 1;
};

export const dayLabel = (m: MonthInfo, ds: string) => {
  const d = dayOfMonth(ds);
  return `${WD[new Date(m.year, m.month, d).getDay()]} ${d}`;
};

export const weekdayOf = (m: MonthInfo, d: number) => new Date(m.year, m.month, d).getDay();

/** Find the calendar day in a given week that lands on a chosen weekday, or null. */
export const anchorDayInWeek = (m: MonthInfo, w: number, wd: number) => {
  const wk = m.weeks[w - 1];
  if (!wk) return null;
  return wk.days.find((x) => weekdayOf(m, x) === wd) ?? null;
};

/** Is this date string inside the given month and a real day? */
export const validDate = (m: MonthInfo, d: unknown): string | null => {
  if (typeof d !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(d)) return null;
  if (!d.startsWith(m.prefix)) return null;
  const day = dayOfMonth(d);
  return day >= 1 && day <= m.days ? d : null;
};

export const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 24) || "friend";

export const ago = (ts: number | string) => {
  const t = typeof ts === "string" ? new Date(ts).getTime() : ts;
  const m = Math.floor((Date.now() - t) / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
};

export const uid = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
      });

/** Previous month's 'YYYY-MM' relative to a month model. */
export const previousMonthPrefix = (m: MonthInfo) => {
  const d = new Date(m.year, m.month - 1, 1);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
};

/** Day of the year (1-366) for a 'YYYY-MM-DD' string. Pure, so it is safe during render. */
export const dayOfYear = (ds: string) => {
  const y = parseInt(ds.slice(0, 4), 10);
  const mo = parseInt(ds.slice(5, 7), 10) - 1;
  const d = parseInt(ds.slice(8, 10), 10);
  return Math.floor((Date.UTC(y, mo, d) - Date.UTC(y, 0, 0)) / 86400000);
};

/** "2026-09" -> "September" */
export const monthLabel = (prefix: string) => {
  const [y, m] = prefix.split("-").map((n) => parseInt(n, 10));
  if (!y || !m) return prefix;
  return new Date(y, m - 1, 1).toLocaleString("en-US", { month: "long" });
};
