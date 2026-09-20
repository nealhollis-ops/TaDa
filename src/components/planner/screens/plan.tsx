"use client";

import { useState } from "react";
import { Mic, Plus, Sparkles, Star, Wand2, X } from "lucide-react";
import { usePlanner } from "../store";
import { C, inputCls, inputStyle } from "../ui";
import { TaskRow } from "../task-row";
import { dayLabel, dstr, ord, pickableDays, WDFULL, weekdayOf } from "@/lib/planner/calendar";
import { BLOCK_META } from "@/lib/planner/content";
import { emptyForm, taskWeek, type NewTaskForm } from "@/lib/planner/tasks";
import type { Block, Repeat } from "@/lib/planner/types";

type DumpItem = { title: string; week: number; big: boolean; date?: string | null };

export function PlanScreen() {
  const p = usePlanner();
  const m = p.month;
  const [form, setForm] = useState<NewTaskForm>(() => emptyForm(p.currentWeek));
  const [dumpText, setDumpText] = useState("");
  const [dumpBusy, setDumpBusy] = useState(false);
  const [dumpPreview, setDumpPreview] = useState<DumpItem[]>([]);
  const [tab, setTab] = useState<"active" | "completed">("active");
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
      <div className="mb-3 flex gap-2">
        <button onClick={() => p.set("showAdd", !p.showAdd)} className="flex flex-1 items-center justify-center gap-2 rounded-xl py-3 font-semibold" style={{ background: C.coral, color: "#fff" }}>
          <Plus size={18} /> Add task
        </button>
        <button onClick={p.organize} className="flex flex-1 items-center justify-center gap-2 rounded-xl py-3 font-semibold" style={{ background: C.gold, color: C.ink }}>
          <Sparkles size={18} /> Organize
        </button>
      </div>
      <p className="mb-4 text-xs" style={{ color: C.fade }}>
        <b style={{ color: C.ink }}>Add task</b> opens a short form: what needs doing, which day and time of day, and whether it repeats. Pick a day yourself or leave it to TaDa.
        <br />
        <b style={{ color: C.ink }}>Organize</b> places every unscheduled task on your lightest open day. Sundays are left open on purpose.
      </p>

      <div className="mb-5 rounded-2xl p-4" style={{ background: C.navy }}>
        <div className="mb-2 flex items-center gap-2">
          <Mic size={16} style={{ color: C.gold }} />
          <span className="text-sm font-bold" style={{ color: C.cream }}>
            Pour it all out
          </span>
        </div>
        <p className="mb-3 text-xs" style={{ color: C.goldSoft }}>
          Type everything on your plate in one big jumble, or tap the mic on your phone keyboard and just talk. It gets split into tasks and placed on your calendar for you.
        </p>
        <textarea
          className="w-full resize-none rounded-xl px-3 py-2.5 text-sm outline-none"
          rows={4}
          style={{ background: "#fff", color: C.ink }}
          placeholder="Finish the workbook, record two videos, call about the printer, get the emails written..."
          value={dumpText}
          onChange={(e) => setDumpText(e.target.value)}
        />
        <button onClick={() => void parse()} disabled={dumpBusy} className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl py-2.5 font-semibold" style={{ background: C.gold, color: C.ink, opacity: dumpBusy ? 0.7 : 1 }}>
          <Wand2 size={16} /> {dumpBusy ? "Sorting it out..." : "Make it into tasks"}
        </button>
        {dumpPreview.length > 0 && (
          <div className="mt-3 rounded-xl p-3" style={{ background: "#fff" }}>
            <div className="mb-2 text-xs font-semibold" style={{ color: C.navy }}>
              Found {dumpPreview.length} tasks. Tap the star for a big win, pick a day or leave it on Auto, or remove anything wrong.
            </div>
            {dumpPreview.map((x, i) => (
              <div key={i} className="flex items-center gap-2 py-1.5" style={{ borderBottom: `1px solid ${C.line}` }}>
                <button onClick={() => setDumpPreview(dumpPreview.map((y, j) => (j === i ? { ...y, big: !y.big } : y)))} aria-label="Big win">
                  <Star size={15} style={{ color: C.gold, fill: x.big ? C.gold : "none" }} />
                </button>
                <span className="flex-1 truncate text-sm" style={{ color: C.ink }}>
                  {x.title}
                </span>
                <select
                  className="rounded-lg border px-1.5 py-1 text-xs"
                  style={{ ...inputStyle, color: x.date ? C.ink : C.fade, maxWidth: 112 }}
                  value={x.date ? String(parseInt(x.date.slice(-2), 10)) : "auto"}
                  onChange={(e) => setDumpPreview(dumpPreview.map((y, j) => (j === i ? { ...y, date: e.target.value === "auto" ? null : dstr(m, parseInt(e.target.value, 10)) } : y)))}
                  aria-label="Due day"
                >
                  <option value="auto">Auto ({m.weeks[x.week - 1] ? m.weeks[x.week - 1].short : `Wk ${x.week}`})</option>
                  {pickableDays(m, p.today, x.date ?? null).map((d) => (
                    <option key={d} value={d}>
                      Due {dayLabel(m, dstr(m, d))}
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

      {p.showAdd && (
        <div className="mb-5 rounded-2xl p-4" style={{ background: "#fff" }}>
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
            <select className={sel} style={inputStyle} value={form.day} onChange={(e) => setForm({ ...form, day: e.target.value })}>
              <option value="auto">Pick my day for me</option>
              {pickableDays(m, p.today).map((d) => (
                <option key={d} value={d}>
                  {dayLabel(m, dstr(m, d))}
                  {weekdayOf(m, d) === 0 ? " (rest)" : ""}
                </option>
              ))}
            </select>
            <select className={sel} style={inputStyle} value={form.block} onChange={(e) => setForm({ ...form, block: e.target.value as Block })}>
              <option value="auto">Any time block</option>
              {BLOCK_META.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.label}
                </option>
              ))}
            </select>
          </div>
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
    </div>
  );
}
