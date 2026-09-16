"use client";

import { CheckCircle2, Circle, CloudSun, Moon, Star, Sun } from "lucide-react";
import { usePlanner } from "../store";
import { Bar, C, Chip, QuoteCard } from "../ui";
import { TaskRow } from "../task-row";
import { dayLabel } from "@/lib/planner/calendar";
import { taskWeek } from "@/lib/planner/tasks";

const BLOCKS = [
  { id: "morning", label: "Morning", Icon: Sun },
  { id: "afternoon", label: "Afternoon", Icon: CloudSun },
  { id: "evening", label: "Evening", Icon: Moon },
];

export function TodayScreen() {
  const p = usePlanner();
  const todays = p.tasks.filter((t) => t.date === p.today);
  const todayDone = todays.filter((t) => t.done).length;
  const wt = p.tasks.filter((t) => taskWeek(p.month, t) === p.currentWeek);
  const thisWeek = { total: wt.length, done: wt.filter((t) => t.done).length };
  const due = p.assignedToMe.filter((a) => a.date && a.date <= p.today);

  return (
    <div className="px-5 py-5">
      <QuoteCard q={p.quote} />
      <div className="mb-1 flex items-end justify-between">
        <h2 className="text-lg font-bold" style={{ color: C.navy }}>
          Today, {dayLabel(p.month, p.today)}
        </h2>
        <span className="flex items-center gap-2 text-xs" style={{ color: C.fade }}>
          {p.stats.streak >= 2 && (
            <span className="font-bold" style={{ color: C.coral }}>
              🔥{p.stats.streak}
            </span>
          )}
          <span>
            {todayDone} of {todays.length} done
          </span>
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
          const bt = todays.filter((t) => (t.block === "auto" ? "afternoon" : t.block) === id);
          if (!bt.length) return null;
          return (
            <div key={id} className="mb-4">
              <div className="mb-2 flex items-center gap-2">
                <Icon size={16} style={{ color: C.gold }} />
                <span className="text-xs font-semibold" style={{ color: C.navy2 }}>
                  {label}
                </span>
              </div>
              {bt.map((t) => (
                <TaskRow key={t.id} t={t} showDay={false} />
              ))}
            </div>
          );
        })}
      </div>
      {due.length > 0 && (
        <div className="mb-4">
          <div className="mb-2 flex items-center gap-2">
            <Star size={16} style={{ color: C.coral }} />
            <span className="text-xs font-semibold" style={{ color: C.coral }}>
              Assigned to you
            </span>
          </div>
          {due.map((a) => {
            const late = !a.done && !!a.date && a.date < p.today;
            const team = p.teams.find((t) => t.id === a.teamId);
            return (
              <div key={a.id} className="mb-2 flex items-center gap-3 rounded-xl px-3 py-3" style={{ background: "#fff", opacity: a.done ? 0.65 : 1 }}>
                <button onClick={() => void p.toggleAssigned(a)} className="shrink-0" aria-label="Toggle assigned task">
                  {a.done ? <CheckCircle2 size={24} style={{ color: C.teal }} /> : <Circle size={24} style={{ color: late ? C.coral : C.fade }} />}
                </button>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium" style={{ color: C.ink, textDecoration: a.done ? "line-through" : "none" }}>
                    {a.title}
                  </div>
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    <Chip color={C.coral} bg="#FFE4E9">
                      {team ? team.name : "Team"}
                    </Chip>
                    <Chip>{late ? "Overdue" : "Due today"}</Chip>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
      <div className="mt-2 rounded-2xl p-4" style={{ background: "#fff" }}>
        <div className="mb-2 flex justify-between text-xs" style={{ color: C.fade }}>
          <span>This week, {p.month.weeks[p.currentWeek - 1].label}</span>
          <span>
            {thisWeek.done} of {thisWeek.total}
          </span>
        </div>
        <Bar pct={thisWeek.total ? (thisWeek.done / thisWeek.total) * 100 : 0} />
      </div>
    </div>
  );
}
