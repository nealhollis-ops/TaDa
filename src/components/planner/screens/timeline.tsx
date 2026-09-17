"use client";

import { usePlanner } from "../store";
import { Bar, C } from "../ui";
import { taskWeek } from "@/lib/planner/tasks";

export function TimelineScreen() {
  const p = usePlanner();
  const monthTotal = p.tasks.length;
  const monthDone = p.tasks.filter((t) => t.done).length;
  return (
    <div className="px-5 py-5">
      <div className="mb-5 rounded-2xl p-5 text-center" style={{ background: C.navy }}>
        <div className="mb-1 text-xs" style={{ color: C.goldSoft }}>
          {p.month.name} so far
        </div>
        <div style={{ color: "#fff", fontSize: 44, fontFamily: "Georgia, serif" }}>{monthTotal ? Math.round((monthDone / monthTotal) * 100) : 0}%</div>
        <div className="mb-3 text-xs" style={{ color: C.cream }}>
          {monthDone} of {monthTotal} tasks complete
        </div>
        <Bar pct={monthTotal ? (monthDone / monthTotal) * 100 : 0} bg={C.navy2} />
      </div>
      {p.month.weeks.map((wk) => {
        const wt = p.tasks.filter((t) => taskWeek(p.month, t) === wk.w);
        const total = wt.length;
        const done = wt.filter((t) => t.done).length;
        const pct = total ? Math.round((done / total) * 100) : 0;
        return (
          <div key={wk.w} className="mb-3 rounded-2xl p-4" style={{ background: "#fff", border: wk.w === p.currentWeek ? `2px solid ${C.coral}` : "2px solid transparent" }}>
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm font-bold" style={{ color: C.navy }}>
                {wk.label}
                {wk.w === p.currentWeek ? " (you are here)" : ""}
              </span>
              <span className="text-xs" style={{ color: C.fade }}>
                {done} of {total} tasks, {pct}%
              </span>
            </div>
            <Bar pct={pct} color={pct === 100 && total ? C.teal : C.gold} />
            {pct === 100 && total > 0 && (
              <div className="mt-2 text-xs font-medium" style={{ color: C.teal }}>
                Week complete. Take a bow.
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
