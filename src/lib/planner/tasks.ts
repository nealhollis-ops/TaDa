/**
 * Pure task rules ported from the prototype: adding, editing, organizing,
 * repeating, streak math, month rollover, and the calendar-bar operations.
 * No React, no Supabase. The screens call these and then persist the result.
 */
import { anchorDayInWeek, dayOfMonth, dstr, monthInfo, monthOfDate, todayStr, uid, validDate, weekOf, weekdayOf, type MonthInfo } from "./calendar";
import type { Block, Repeat, Stats, Task } from "./types";

const BLOCKS: Block[] = ["auto", "morning", "afternoon", "evening"];
const isBlock = (b: unknown): b is Block => typeof b === "string" && BLOCKS.includes(b as Block);

export const taskWeek = (m: MonthInfo, t: Pick<Task, "date" | "week">) => (t.date ? weekOf(m, t.date) : t.week);

/** What ties the copies of a repeating task together. */
export const seriesKey = (t: Pick<Task, "id" | "rootId">) => t.rootId || t.id;

/** Every copy of a repeating task, the one in hand included. */
export const seriesOf = (list: Task[], t: Pick<Task, "id" | "rootId">) => list.filter((x) => seriesKey(x) === seriesKey(t));

/** Is this task one day of a run of days, rather than a task on its own? */
export const inSeries = (list: Task[], t: Pick<Task, "id" | "rootId">) => seriesOf(list, t).length > 1;

/** Which copies an edit reaches: never a finished day, never one already edited on its own. */
export type EditScope = "one" | "series";

/** Calendar days for a daily repeat from `fromDay` to month end (weekdays only when asked). */
export const dailyDays = (m: MonthInfo, fromDay: number, weekdaysOnly: boolean) => {
  const out: number[] = [];
  for (let d = Math.max(1, fromDay); d <= m.days; d++) {
    const dow = weekdayOf(m, d);
    if (weekdaysOnly && (dow === 0 || dow === 6)) continue;
    out.push(d);
  }
  return out;
};

export const isDaily = (r: Repeat) => r === "daily" || r === "weekdays";

const clampWeek = (m: MonthInfo, w: unknown, fallback: number) => Math.min(m.weekCount, Math.max(1, parseInt(String(w), 10) || fallback));

export type NewTaskForm = {
  title: string;
  day: string; // "auto" or a full YYYY-MM-DD date, which may sit in a later month
  week: string; // week number
  block: Block;
  big: boolean;
  repeat: Repeat;
  anchor: string; // "" or number
};

export const emptyForm = (week: number): NewTaskForm => ({ title: "", day: "auto", week: String(week), block: "auto", big: false, repeat: "none", anchor: "" });

const base = (m: MonthInfo, partial: Partial<Task> & { title: string }): Task => ({
  id: partial.id ?? uid(),
  rootId: partial.rootId ?? null,
  title: partial.title,
  big: !!partial.big,
  month: m.prefix,
  week: partial.week ?? 1,
  date: partial.date ?? null,
  block: partial.block ?? "auto",
  repeat: partial.repeat ?? "none",
  anchor: partial.anchor ?? null,
  done: false,
  doneAt: null,
  sort: partial.sort ?? Date.now(),
  carriedFrom: partial.carriedFrom ?? null,
  exception: partial.exception ?? false,
});

/** Turn the Add task form into the rows to insert (repeats fan out into copies). */
export function buildNewTasks(m: MonthInfo, form: NewTaskForm, currentWeek: number): Task[] {
  const title = form.title.trim();
  if (!title) return [];
  const specific = form.day !== "auto";
  const date = specific ? form.day : null;
  const anchor = form.anchor === "" ? null : parseInt(form.anchor, 10);
  const solidBlock: Block = form.block !== "auto" ? form.block : form.big ? "morning" : "afternoon";
  const block: Block = form.block !== "auto" ? form.block : specific ? solidBlock : "auto";
  // A chosen date may sit in a later month; everything below is built against
  // the month that date belongs to, so month and week are stamped correctly.
  const tm = date ? monthOfDate(date) : m;
  const sameMonth = tm.prefix === m.prefix;
  const tToday = sameMonth ? new Date().getDate() : 1;
  const fromWeek = sameMonth ? currentWeek : 1;
  const rootId = uid();
  const batch: Task[] = [];

  if (isDaily(form.repeat)) {
    // One copy per remaining day (weekdays only for Mon - Fri), starting today or on the chosen day.
    const start = specific && date ? dayOfMonth(date) : tToday;
    dailyDays(tm, start, form.repeat === "weekdays").forEach((d) => {
      batch.push(base(tm, { id: batch.length ? uid() : rootId, rootId, title, big: form.big, date: dstr(tm, d), block: solidBlock, week: weekOf(tm, dstr(tm, d)), repeat: form.repeat, anchor: null }));
    });
    if (!batch.length) batch.push(base(m, { id: rootId, rootId, title, big: form.big, date: null, block: "auto", week: currentWeek, repeat: form.repeat, anchor: null }));
  } else if (form.repeat === "weekly" && anchor !== null) {
    for (let w = fromWeek; w <= tm.weekCount; w++) {
      const d = anchorDayInWeek(tm, w, anchor);
      if (!d || (sameMonth && w === currentWeek && d < tToday)) continue;
      batch.push(base(tm, { id: batch.length ? uid() : rootId, rootId, title, big: form.big, date: dstr(tm, d), block: solidBlock, week: w, repeat: "weekly", anchor }));
    }
    if (!batch.length) {
      batch.push(base(m, { id: rootId, rootId, title, big: form.big, date: null, block: "auto", week: currentWeek, repeat: "weekly", anchor }));
    }
  } else if (form.repeat === "monthly" && anchor !== null) {
    const d = dstr(tm, Math.min(anchor, tm.days));
    batch.push(base(tm, { id: rootId, rootId, title, big: form.big, date: d, block: solidBlock, week: weekOf(tm, d), repeat: "monthly", anchor }));
  } else {
    const first = base(tm, {
      id: rootId, rootId, title, big: form.big, date, block,
      week: specific && date ? weekOf(tm, date) : parseInt(form.week, 10), repeat: form.repeat, anchor: null,
    });
    batch.push(first);
    if (form.repeat === "weekly") {
      for (let w = fromWeek; w <= tm.weekCount; w++) {
        if (w === first.week) continue;
        batch.push(base(tm, { rootId, title, big: form.big, date: null, block: "auto", week: w, repeat: "weekly", anchor: null }));
      }
    }
  }
  return batch;
}

/** Place every unscheduled, unfinished task on its lightest open day. Sundays stay open. */
export function organizeList(m: MonthInfo, list: Task[]): Task[] {
  const counts: Record<string, number> = {};
  list.forEach((t) => {
    if (t.date) counts[t.date] = (counts[t.date] || 0) + 1;
  });
  const tToday = new Date().getDate();
  const next = list.map((t) => ({ ...t }));
  const pending = next.filter((t) => !t.date && !t.done);
  pending.sort((a, b) => (b.big ? 1 : 0) - (a.big ? 1 : 0));
  pending.forEach((t, i) => {
    const w = Math.min(m.weekCount, Math.max(1, t.week || 1));
    const days = [...m.weeks[w - 1].days];
    let open = days.filter((d) => weekdayOf(m, d) !== 0 && d >= tToday);
    if (!open.length) open = days.filter((d) => d >= tToday);
    if (!open.length) open = days.filter((d) => weekdayOf(m, d) !== 0);
    if (!open.length) open = days;
    let best = open[0];
    open.forEach((d) => {
      if ((counts[dstr(m, d)] || 0) < (counts[dstr(m, best)] || 0)) best = d;
    });
    t.date = dstr(m, best);
    counts[t.date] = (counts[t.date] || 0) + 1;
    if (t.block === "auto") t.block = t.big ? "morning" : i % 2 ? "evening" : "afternoon";
  });
  return next;
}

/** Streak, totals, and comeback math for one check-off (or un-check). */
export function bumpStats(t: { block: Block | null; big: boolean }, turningOn: boolean, list: Task[], baseStats: Stats): Stats {
  const s: Stats = { ...baseStats, perfectKeys: [...(baseStats.perfectKeys || [])] };
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
        const dateOf = (ds: string) => new Date(parseInt(ds.slice(0, 4), 10), parseInt(ds.slice(5, 7), 10) - 1, parseInt(ds.slice(8), 10));
        const gap = Math.round((dateOf(td).getTime() - dateOf(s.lastDoneDay).getTime()) / 86400000);
        if (gap === 1) {
          cont = true;
        } else if (gap > 1 && gap <= 7) {
          cont = true;
          for (let i = 1; i < gap; i++) {
            const d = dateOf(s.lastDoneDay);
            d.setDate(d.getDate() + i);
            const ds = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
            const dow = d.getDay();
            const freeSaturday = dow === 6 && !list.some((x) => x.date === ds && !x.done);
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
}

/** Perfect week check after a check-off: 3+ tasks in the week, all done. */
export function creditPerfectWeek(m: MonthInfo, list: Task[], t: Task, stats: Stats): Stats {
  const wk = taskWeek(m, t);
  const wt = list.filter((x) => taskWeek(m, x) === wk);
  if (wt.length >= 3 && wt.every((x) => x.done)) {
    const key = `${m.prefix}-w${wk}`;
    if (!stats.perfectKeys.includes(key)) {
      return { ...stats, perfectKeys: [...stats.perfectKeys, key], perfectWeeks: stats.perfectWeeks + 1 };
    }
  }
  return stats;
}

/** Apply the Edit task sheet, including repeat fan-out. */
export function applyEdit(m: MonthInfo, tasks: Task[], e: Task, currentWeek: number, scope: EditScope = "series"): Task[] {
  // Editing one day of a run leaves the rest alone and marks this day an
  // exception, so a later series edit does not undo the member's choice.
  if (scope === "one") {
    const week = e.date ? weekOf(m, e.date) : e.week;
    return tasks.map((t) => (t.id === e.id ? { ...e, title: e.title.trim(), week, exception: inSeries(tasks, e) ? true : t.exception } : t));
  }
  const rootId = e.rootId || e.id;
  const title = e.title.trim();
  const anchor = e.anchor === undefined ? null : e.anchor;
  const tToday = new Date().getDate();
  const solidBlock: Block = e.block && e.block !== "auto" ? e.block : e.big ? "morning" : "afternoon";
  let next = tasks.map((t) => (t.id === e.id ? { ...e, rootId, anchor, title, week: e.date ? weekOf(m, e.date) : e.week } : t));

  if (isDaily(e.repeat)) {
    // Edits ripple to every unfinished copy; missing days from today onward are filled in.
    next = next.map((t) => (seriesKey(t) === rootId && !t.done && !(t.exception && t.id !== e.id) ? { ...t, title, big: !!e.big, repeat: e.repeat, anchor: null, block: e.block } : t));
    const have = new Set(next.filter((t) => (t.rootId || t.id) === rootId).map((t) => t.date));
    dailyDays(m, tToday, e.repeat === "weekdays").forEach((d) => {
      const ds = dstr(m, d);
      if (!have.has(ds)) next = [...next, base(m, { rootId, title, big: !!e.big, date: ds, block: solidBlock, week: weekOf(m, ds), repeat: e.repeat, anchor: null })];
    });
  } else if (e.repeat === "weekly" && anchor !== null) {
    next = next.map((t) => {
      if (seriesKey(t) !== rootId || t.done || (t.exception && t.id !== e.id)) return t;
      const w = taskWeek(m, t);
      const d = anchorDayInWeek(m, w, anchor);
      return d
        ? { ...t, title, repeat: "weekly" as Repeat, anchor, date: dstr(m, d), week: w, block: solidBlock, big: !!e.big }
        : { ...t, title, repeat: "weekly" as Repeat, anchor };
    });
    for (let w = currentWeek; w <= m.weekCount; w++) {
      const d = anchorDayInWeek(m, w, anchor);
      if (!d || (w === currentWeek && d < tToday)) continue;
      const has = next.some((t) => (t.rootId || t.id) === rootId && taskWeek(m, t) === w);
      if (!has) next = [...next, base(m, { rootId, title, big: !!e.big, date: dstr(m, d), block: solidBlock, week: w, repeat: "weekly", anchor })];
    }
  } else if (e.repeat === "weekly") {
    for (let w = currentWeek; w <= m.weekCount; w++) {
      const has = next.some((t) => (t.rootId || t.id) === rootId && taskWeek(m, t) === w);
      if (!has) next = [...next, base(m, { rootId, title, big: !!e.big, date: null, block: "auto", week: w, repeat: "weekly", anchor: null })];
    }
    next = organizeList(m, next);
  } else if (e.repeat === "monthly" && anchor !== null) {
    const d = dstr(m, Math.min(anchor, m.days));
    next = next.map((t) => (t.id === e.id ? { ...t, date: d, week: weekOf(m, d), block: solidBlock } : t));
  }
  return next;
}

/** Ops the calendar bar (Claude) is allowed to return. */
export type CalendarOp =
  | { op: "add"; title: string; date?: string | null; week?: number; block?: Block; big?: boolean; repeat?: Repeat }
  | { op: "remove"; id: string }
  | { op: "move"; id: string; date?: string | null; week?: number; block?: Block }
  | { op: "edit"; id: string; title?: string; big?: boolean; block?: Block; repeat?: Repeat }
  | { op: "complete"; id: string }
  | { op: "uncomplete"; id: string };

export function applyOps(m: MonthInfo, tasks: Task[], ops: unknown[], currentWeek: number): Task[] {
  let next = [...tasks];
  ops.forEach((raw) => {
    if (!raw || typeof raw !== "object") return;
    const o = raw as Record<string, unknown>;
    if (o.op === "add" && typeof o.title === "string" && o.title.trim()) {
      const d = validDate(m, o.date);
      next.push(
        base(m, {
          title: o.title.slice(0, 120),
          big: !!o.big,
          date: d,
          block: isBlock(o.block) ? o.block : "auto",
          week: d ? weekOf(m, d) : clampWeek(m, o.week, currentWeek),
          repeat: o.repeat === "weekly" || o.repeat === "monthly" || o.repeat === "daily" || o.repeat === "weekdays" ? o.repeat : "none",
        }),
      );
      return;
    }
    if (typeof o.id !== "string") return;
    const id = o.id;
    if (o.op === "remove") {
      next = next.filter((t) => t.id !== id);
      return;
    }
    next = next.map((t) => {
      if (t.id !== id) return t;
      if (o.op === "move") {
        const d = o.date === null ? null : validDate(m, o.date);
        return { ...t, date: d, week: d ? weekOf(m, d) : clampWeek(m, o.week ?? t.week, t.week), block: isBlock(o.block) ? o.block : t.block };
      }
      if (o.op === "edit") {
        return {
          ...t,
          title: typeof o.title === "string" && o.title.trim() ? o.title.slice(0, 120) : t.title,
          big: o.big === undefined ? t.big : !!o.big,
          block: isBlock(o.block) ? o.block : t.block,
          repeat: o.repeat === "weekly" || o.repeat === "monthly" || o.repeat === "none" || o.repeat === "daily" || o.repeat === "weekdays" ? o.repeat : t.repeat,
        };
      }
      if (o.op === "complete") return { ...t, done: true, doneAt: new Date().toISOString() };
      if (o.op === "uncomplete") return { ...t, done: false, doneAt: null };
      return t;
    });
  });
  return next;
}

/**
 * Month flip: given last month's repeating tasks and this month's list,
 * spawn the copies that this month is missing. History is never deleted.
 */
export function spawnRepeaters(m: MonthInfo, previous: Task[], current: Task[]): Task[] {
  const curW = weekOf(m, todayStr());
  const roots: Record<string, Task> = {};
  previous.forEach((t) => {
    if (t.repeat === "weekly" || t.repeat === "monthly" || isDaily(t.repeat)) {
      const key = t.rootId || t.id;
      if (!roots[key]) roots[key] = t;
    }
  });
  const spawned: Task[] = [];
  Object.values(roots).forEach((t) => {
    const rootId = t.rootId || t.id;
    if (current.some((c) => (c.rootId || c.id) === rootId)) return; // already carried over
    const anchor = t.anchor ?? null;
    const block: Block = t.block && t.block !== "auto" ? t.block : "auto";
    if (isDaily(t.repeat)) {
      dailyDays(m, 1, t.repeat === "weekdays").forEach((d) => {
        const ds = dstr(m, d);
        spawned.push(base(m, { title: t.title, big: !!t.big, date: ds, block: block === "auto" ? (t.big ? "morning" : "afternoon") : block, week: weekOf(m, ds), repeat: t.repeat, rootId, anchor: null }));
      });
    } else if (t.repeat === "monthly") {
      const date = anchor ? dstr(m, Math.min(anchor, m.days)) : null;
      spawned.push(base(m, { title: t.title, big: !!t.big, date, block, week: date ? weekOf(m, date) : curW, repeat: "monthly", rootId, anchor }));
    } else {
      for (let w = curW; w <= m.weekCount; w++) {
        const d = anchor !== null ? anchorDayInWeek(m, w, anchor) : null;
        if (anchor !== null && !d) continue;
        spawned.push(base(m, { title: t.title, big: !!t.big, date: d ? dstr(m, d) : null, block, week: w, repeat: "weekly", rootId, anchor }));
      }
    }
  });
  return spawned;
}

/**
 * Month flip, part two: unfinished one-time tasks from last month come along as
 * undated tasks in the current week, marked with the month they came from, so
 * Organize can place them. The original stays in last month's history. A task
 * already carried (its id shows as a rootId here) is never carried twice.
 */
export function carryUnfinished(m: MonthInfo, previous: Task[], current: Task[]): Task[] {
  const curW = weekOf(m, todayStr());
  const already = new Set(current.map((c) => c.rootId).filter(Boolean));
  return previous
    .filter((t) => !t.done && t.repeat === "none" && !already.has(t.id))
    .sort((a, b) => (a.date || "9").localeCompare(b.date || "9") || a.sort - b.sort)
    .map((t, i) => base(m, { title: t.title, big: !!t.big, date: null, block: t.block && t.block !== "auto" ? t.block : "auto", week: curW, repeat: "none", rootId: t.id, anchor: null, carriedFrom: t.month, sort: Date.now() + i }));
}

export const currentMonth = () => monthInfo(new Date());
