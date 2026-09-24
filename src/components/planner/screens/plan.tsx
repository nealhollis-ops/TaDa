"use client";

import { useEffect, useRef, useState } from "react";
import { Mic, Pencil, Plus, Sparkles, Star, Trash2, Wand2, X } from "lucide-react";
import { usePlanner } from "../store";
import { C, Chip, DayField, inputCls, inputStyle } from "../ui";
import { TaskRow } from "../task-row";
import { useDictation } from "../use-dictation";
import { Banner } from "../banner";
import { dateLabel, isRestDay, lastPickableDate, monthLabelIn, ord, pickableDates, WD, WDFULL } from "@/lib/planner/calendar";
import { BLOCK_META, blockLabel, blockMeta } from "@/lib/planner/content";
import { emptyForm, taskWeek, type NewTaskForm } from "@/lib/planner/tasks";
import type { DumpItem, Task } from "@/lib/planner/types";
import type { Block, Repeat } from "@/lib/planner/types";


export function PlanScreen() {
  const p = usePlanner();
  const m = p.month;
  const [form, setForm] = useState<NewTaskForm>(() => emptyForm(p.currentWeek));
  const [dumpText, setDumpText] = useState("");
  const [dumpBusy, setDumpBusy] = useState(false);
  const [dumpPreview, setDumpPreview] = useState<DumpItem[]>([]);
  const [tab, setTab] = useState<"active" | "completed">("active");
  const { listening: dumpListening, toggle: dumpMic } = useDictation(setDumpText, () => p.showToast("Talking isn’t supported in this browser. Use the mic on your phone keyboard instead."));
  // The form opens below the fold on a phone, and below the dump card now that
  // the buttons sit under it. Bring it to the member rather than making them
  // hunt for it. Also covers arriving from the getting-started checklist, which
  // opens the form and then lands on this screen.
  const addRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!p.showAdd) return;
    // Two things do not work here: scrollIntoView is inert because the h-full
    // root pins the document height, and a smooth scroll is swallowed by the
    // browser re-anchoring the page as the form is inserted. An instant scroll
    // lands every time.
    // A timeout rather than requestAnimationFrame: rAF never fires while the tab
    // is hidden, which would leave the form off screen for someone who opened it
    // and looked away. The 72px clears the sticky header.
    const t = setTimeout(() => {
      const el = addRef.current;
      if (!el) return;
      window.scrollTo(0, Math.max(0, el.getBoundingClientRect().top + window.scrollY - 72));
    }, 0);
    return () => clearTimeout(t);
  }, [p.showAdd]);
  const activeCount = p.tasks.filter((t) => !t.done).length;
  const completedCount = p.tasks.length - activeCount;
  const sel = "rounded-xl border px-2 py-2.5 text-sm";

  const add = () => {
    if (!form.title.trim()) return;
    p.addTask(form);
    setForm({ ...emptyForm(parseInt(form.week, 10) || p.currentWeek) });
  };

  const parse = async () => {
    const text = dumpText.trim();
    if (!text) return;
    setDumpBusy(true);
    setDumpPreview(await p.parseDump(text));
    setDumpBusy(false);
  };

  return (
    <div className="px-5 py-5">
      <Banner />
      <div className="mb-5 rounded-2xl p-4" style={{ background: C.navy }}>
        <div className="mb-2 flex items-center gap-2">
          <Mic size={16} style={{ color: C.gold }} />
          <span className="text-sm font-bold" style={{ color: C.cream }}>
            Pour it all out
          </span>
        </div>
        <p className="mb-3 text-xs" style={{ color: C.goldSoft }}>
          Type everything on your plate in one big jumble, or tap the mic and just talk. It gets split into tasks and placed on your calendar for you.
        </p>
        <div className="relative">
          <textarea
            className="w-full resize-none rounded-xl px-3 py-2.5 pr-12 text-sm outline-none"
            rows={4}
            style={{ background: "#fff", color: C.ink, borderColor: dumpListening ? C.coral : undefined }}
            placeholder={dumpListening ? "Listening, keep talking..." : "Finish the workbook, record two videos, call about the printer, get the emails written..."}
            value={dumpText}
            onChange={(e) => setDumpText(e.target.value)}
          />
          {/* The words land in the box and stay there; nothing is sorted until Make it into tasks. */}
          <button
            onClick={dumpMic}
            className="absolute right-2 top-2 rounded-lg p-2"
            style={{ background: dumpListening ? C.coral : C.mist }}
            aria-label={dumpListening ? "Stop listening" : "Talk instead of typing"}
            title={dumpListening ? "Stop listening" : "Talk instead of typing"}
          >
            <Mic size={16} style={{ color: dumpListening ? "#fff" : C.navy }} className={dumpListening ? "animate-pulse" : ""} />
          </button>
        </div>
        <button onClick={() => void parse()} disabled={dumpBusy} className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl py-2.5 font-semibold" style={{ background: C.gold, color: C.ink, opacity: dumpBusy ? 0.7 : 1 }}>
          <Wand2 size={16} /> {dumpBusy ? "Sorting it out..." : "Make it into tasks"}
        </button>
        {dumpPreview.length > 0 && (
          <div className="mt-3 rounded-xl p-3" style={{ background: "#fff" }}>
            <div className="mb-2 text-xs font-semibold" style={{ color: C.navy }}>
              Found {dumpPreview.length} tasks. Tap the star for a big win, pick a day or leave it on Auto, or remove anything wrong. Repeats and times of day come from your own words.
            </div>
            {dumpPreview.map((x, i) => (
              <div key={i} className="flex items-center gap-2 py-1.5" style={{ borderBottom: `1px solid ${C.line}` }}>
                <button onClick={() => setDumpPreview(dumpPreview.map((y, j) => (j === i ? { ...y, big: !y.big } : y)))} aria-label="Big win">
                  <Star size={15} style={{ color: C.gold, fill: x.big ? C.gold : "none" }} />
                </button>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm" style={{ color: C.ink, overflowWrap: "anywhere" }}>
                    {x.title}
                  </span>
                  {(x.block || (x.repeat && x.repeat !== "none")) && (
                    <span className="mt-0.5 flex flex-wrap gap-1">
                      {x.repeat && x.repeat !== "none" && <Chip color={C.goldDeep} bg={C.goldSoft}>{repeatLabel(x)}</Chip>}
                      {x.block && <Chip color={blockMeta(x.block)?.text ?? C.fade} bg={blockMeta(x.block)?.tint ?? C.mist}>{blockLabel(x.block)}</Chip>}
                    </span>
                  )}
                </span>
                {/* A plain list here, not a date field: the row has to show at a glance
                    which week Auto is sending the task to. */}
                <select
                  className="rounded-lg border px-1.5 py-1 text-xs"
                  style={{ ...inputStyle, color: x.date ? C.ink : C.fade, maxWidth: 124 }}
                  value={x.date ?? "auto"}
                  onChange={(e) => setDumpPreview(dumpPreview.map((y, j) => (j === i ? { ...y, date: e.target.value === "auto" ? null : e.target.value } : y)))}
                  aria-label="Due day"
                  disabled={!!x.repeat && x.repeat !== "none"}
                >
                  <option value="auto">Auto ({m.weeks[x.week - 1] ? m.weeks[x.week - 1].label : `Wk ${x.week}`})</option>
                  {pickableDates(m, p.today, x.date ?? null).map((d) => (
                    <option key={d.date} value={d.date}>
                      {d.label}
                    </option>
                  ))}
                </select>
                <button onClick={() => setDumpPreview(dumpPreview.filter((_, j) => j !== i))} aria-label="Remove">
                  <X size={14} style={{ color: C.fade }} />
                </button>
              </div>
            ))}
            <button
              onClick={() => {
                p.addDumped(dumpPreview);
                setDumpPreview([]);
                setDumpText("");
              }}
              className="mt-2 w-full rounded-xl py-2.5 text-sm font-semibold"
              style={{ background: C.teal, color: C.ink }}
            >
              Add them to my month
            </button>
          </div>
        )}
      </div>

      {/* Add task and Organize sit under the dump, where someone lands after
          pouring everything out and wants to place what is left. */}
      <div className="mb-3 flex gap-2">
        <button onClick={() => p.set("showAdd", !p.showAdd)} className="flex flex-1 items-center justify-center gap-2 rounded-xl py-3 font-semibold" style={{ background: C.coral, color: "#fff" }}>
          <Plus size={18} /> Add task
        </button>
        <button
          onClick={() => void p.organize()}
          disabled={p.organizing}
          className="flex flex-1 items-center justify-center gap-2 rounded-xl py-3 font-semibold"
          style={{ background: C.gold, color: C.ink, opacity: p.organizing ? 0.7 : 1 }}
        >
          <Sparkles size={18} className={p.organizing ? "animate-pulse" : ""} /> {p.organizing ? "Organizing..." : "Organize"}
        </button>
      </div>
      <p className="mb-2 text-xs" style={{ color: C.fade }}>
        <b style={{ color: C.ink }}>Add task</b> opens a short form: what needs doing, which day and time of day, and whether it repeats. Pick a day yourself or leave it to TaDa.
      </p>
      <p className="mb-4 text-xs" style={{ color: C.fade }}>
        <b style={{ color: C.ink }}>Organize</b> gives every task without a day one: the quietest day of the week it already sits in. Sundays stay open, and days you picked yourself are left alone.
      </p>
      {p.showAdd && (
        <div ref={addRef} className="mb-5 rounded-2xl p-4" style={{ background: "#fff" }}>
          <input
            className={`${inputCls} mb-2`}
            style={inputStyle}
            placeholder="What needs to get done?"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            onKeyDown={(e) => {
              if (e.key === "Enter") add();
            }}
          />
          <div className="mb-2 grid grid-cols-2 gap-2">
            <DayField
              value={form.day === "auto" ? null : form.day}
              onChange={(v) => setForm({ ...form, day: v ?? "auto" })}
              min={p.today}
              max={lastPickableDate(m)}
              noneLabel="Pick my day for me"
              ariaLabel="Day"
            />
            <select className={sel} style={inputStyle} value={form.block} onChange={(e) => setForm({ ...form, block: e.target.value as Block })}>
              <option value="auto">Any time block</option>
              {BLOCK_META.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.label}
                </option>
              ))}
            </select>
          </div>
          {/* The empty field means TaDa places it; a chosen day gets a nudge if it is the rest day. */}
          <p className="mb-2 text-xs" style={{ color: C.fade }}>
            {form.day === "auto"
              ? "Leave the day empty and TaDa picks a light day in the week you choose."
              : isRestDay(form.day)
                ? `${dateLabel(form.day, m)} is a Sunday, the built-in rest day. Yours if you want it.`
                : `Set for ${dateLabel(form.day, m)}.`}
          </p>
          {form.day === "auto" && (
            <select className={`${sel} mb-2 w-full`} style={inputStyle} value={form.week} onChange={(e) => setForm({ ...form, week: e.target.value })}>
              {m.weeks.map((w) => (
                <option key={w.w} value={w.w}>
                  {w.label}
                </option>
              ))}
            </select>
          )}
          <select className={`${sel} mb-2 w-full`} style={inputStyle} value={form.repeat} onChange={(e) => setForm({ ...form, repeat: e.target.value as Repeat, anchor: "" })}>
            <option value="none">One time</option>
            <option value="daily">Daily</option>
            <option value="weekdays">Daily (Mon - Fri)</option>
            <option value="weekly">Every week</option>
            <option value="monthly">Every month</option>
          </select>
          {form.repeat === "weekly" && (
            <select className={`${sel} mb-2 w-full`} style={inputStyle} value={form.anchor} onChange={(e) => setForm({ ...form, anchor: e.target.value })}>
              <option value="">Any day, let the app place it</option>
              {[1, 2, 3, 4, 5, 6, 0].map((wd) => (
                <option key={wd} value={wd}>
                  Every {WDFULL[wd]}
                </option>
              ))}
            </select>
          )}
          {form.repeat === "monthly" && (
            <select className={`${sel} mb-2 w-full`} style={inputStyle} value={form.anchor} onChange={(e) => setForm({ ...form, anchor: e.target.value })}>
              <option value="">Any day, let the app place it</option>
              {Array.from({ length: m.days }, (_, i) => i + 1).map((d) => (
                <option key={d} value={d}>
                  The {ord(d)} of every month
                </option>
              ))}
            </select>
          )}
          <label className="mb-3 flex items-center gap-2 text-sm" style={{ color: C.ink }}>
            <input type="checkbox" checked={form.big} onChange={(e) => setForm({ ...form, big: e.target.checked })} />
            Big win (extra fireworks)
          </label>
          <button onClick={add} className="w-full rounded-xl py-2.5 font-semibold" style={{ background: C.teal, color: C.ink }}>
            Add to my month
          </button>
        </div>
      )}

      <div className="mb-4 flex rounded-xl p-1" style={{ background: C.mist }}>
        {(
          [
            ["active", "Active", activeCount],
            ["completed", "Completed", completedCount],
          ] as const
        ).map(([id, label, n]) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 text-sm font-semibold"
            style={{ background: tab === id ? "#fff" : "transparent", color: tab === id ? C.ink : C.fade, boxShadow: tab === id ? "0 1px 2px rgba(17,17,17,0.12)" : "none" }}
          >
            {label}
            <span className="rounded-full px-1.5 text-[11px]" style={{ background: tab === id ? C.mist : "transparent", color: C.fade }}>
              {n}
            </span>
          </button>
        ))}
      </div>

      {m.weeks.map((wk) => {
        const all = p.tasks.filter((t) => taskWeek(m, t) === wk.w);
        const wt = all.filter((t) => (tab === "active" ? !t.done : t.done)).sort((a, b) => (a.date || "9").localeCompare(b.date || "9"));
        // On the Completed tab, weeks with nothing finished stay out of the way.
        if (tab === "completed" && wt.length === 0) return null;
        return (
          <div key={wk.w} className="mb-5">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm font-bold" style={{ color: wk.w === p.currentWeek ? C.coral : C.navy }}>
                {wk.label}
                {wk.w === p.currentWeek ? " (this week)" : ""}
              </span>
              <span className="text-xs" style={{ color: C.fade }}>
                {tab === "active" ? `${wt.length} to do, ${all.length - wt.length} done` : `${wt.length} done`}
              </span>
            </div>
            {wt.length === 0 ? (
              <div className="rounded-xl p-3 text-xs" style={{ background: "#fff", color: C.fade }}>
                {all.length === 0 ? "Nothing here yet." : "All done for this week. Take a bow."}
              </div>
            ) : (
              wt.map((t) => <TaskRow key={t.id} t={t} showDay={true} />)
            )}
          </div>
        );
      })}
      {tab === "completed" && completedCount === 0 && (
        <div className="rounded-2xl p-6 text-center text-sm" style={{ background: "#fff", color: C.fade }}>
          Nothing completed yet this month. Check something off on Today and it lands here.
        </div>
      )}

      {/* Anything dated past this month waits here until its month comes around. */}
      {tab === "active" && p.later.length > 0 && <LaterGroup />}
    </div>
  );
}

/** "Daily", "Mon - Fri", "Every Fri", "Monthly" - what the dump heard in their words. */
function repeatLabel(x: DumpItem) {
  if (x.repeat === "daily") return "Daily";
  if (x.repeat === "weekdays") return "Mon - Fri";
  if (x.repeat === "monthly") return "Monthly";
  return x.weekday != null ? `Every ${WD[x.weekday]}` : "Weekly";
}

function LaterGroup() {
  const p = usePlanner();
  const months = Array.from(new Set(p.later.map((t) => t.month))).sort();
  return (
    <div className="mt-6">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-sm font-bold" style={{ color: C.navy }}>
          Later
        </span>
        <span className="text-xs" style={{ color: C.fade }}>
          {p.later.length} waiting
        </span>
      </div>
      <p className="mb-2 text-xs" style={{ color: C.fade }}>
        Dated past this month. Each one moves into its own month when that month starts.
      </p>
      {months.map((mp) => (
        <div key={mp} className="mb-3">
          <div className="mb-1 text-xs font-semibold" style={{ color: C.navy2 }}>
            {monthLabelIn(mp, p.month)}
          </div>
          {collapseRepeats(p.later.filter((t) => t.month === mp)).map(({ t, count }) => (
            <LaterRow key={t.id} t={t} count={count} />
          ))}
        </div>
      ))}
    </div>
  );
}

/** A repeat fans out into one row per day; out here it reads as a single line with a count. */
function collapseRepeats(list: Task[]): { t: Task; count: number }[] {
  const byRoot = new Map<string, Task[]>();
  for (const t of [...list].sort((a, b) => (a.date || "9").localeCompare(b.date || "9"))) {
    const key = t.repeat === "none" ? t.id : t.rootId || t.id;
    byRoot.set(key, [...(byRoot.get(key) ?? []), t]);
  }
  return [...byRoot.values()].map((rows) => ({ t: rows[0], count: rows.length }));
}

function LaterRow({ t, count }: { t: Task; count: number }) {
  const p = usePlanner();
  return (
    <div className="mb-2 flex items-start gap-3 rounded-xl px-3 py-3" style={{ background: "#fff" }}>
      <div className="min-w-0 flex-1">
        <div className="text-sm font-medium" style={{ color: C.ink, overflowWrap: "anywhere" }}>
          {t.big && <Star size={13} className="mr-1 inline" style={{ color: C.gold, fill: C.gold }} />}
          {t.title}
        </div>
        <div className="mt-1 flex flex-wrap gap-1.5">
          <Chip color={C.goldDeep} bg={C.goldSoft}>{t.date ? dateLabel(t.date, p.month) : "Day TBD"}</Chip>
          <Chip color={blockMeta(t.block)?.text ?? C.fade} bg={blockMeta(t.block)?.tint ?? C.mist}>
            {t.block === "auto" ? "Time TBD" : blockLabel(t.block)}
          </Chip>
          {count > 1 && (
            <Chip color={C.goldDeep} bg={C.goldSoft}>
              {count} days
            </Chip>
          )}
        </div>
      </div>
      <button onClick={() => p.set("editing", t)} aria-label="Edit task">
        <Pencil size={16} style={{ color: C.fade }} />
      </button>
      <button onClick={() => p.removeLater(t.id)} aria-label="Remove task">
        <Trash2 size={16} style={{ color: C.fade }} />
      </button>
    </div>
  );
}
