"use client";

import { usePlanner } from "../store";
import { Bar, C } from "../ui";
import { taskWeek } from "@/lib/planner/tasks";
import { BADGE_CATALOG, levelFloor, levelIcon, levelOf, nextBadges, nextLevelAt } from "@/lib/planner/content";

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
      <Lifetime />
    </div>
  );
}

/**
 * Everything a member has earned since day one, in one place: streaks, totals,
 * Mountain Level with the climb to the next one, and every badge earned or
 * within reach. All of it comes from stats the app already keeps.
 */
function Lifetime() {
  const p = usePlanner();
  const s = p.stats;
  const hasPartner = p.myPartnerIds.length > 0;
  const level = levelOf(s.totalDone);
  const floor = levelFloor(s.totalDone);
  const next = nextLevelAt(s.totalDone);
  const climb = next > floor ? Math.min(100, ((s.totalDone - floor) / (next - floor)) * 100) : 100;
  const toGo = Math.max(0, next - s.totalDone);
  const upcoming = nextBadges(s, hasPartner);
  const tiles: [string, number, string][] = [
    ["🔥", s.streak, "day streak"],
    ["🏆", s.bestStreak, "longest streak"],
    ["", s.totalDone, "tasks finished"],
    ["⭐", s.bigDone, "big wins"],
  ];
  const minis = [`🎯 ${s.perfectWeeks} perfect ${s.perfectWeeks === 1 ? "week" : "weeks"}`, `🌅 ${s.morningDone} morning ${s.morningDone === 1 ? "finish" : "finishes"}`, `🕊️ ${s.encourages} ${s.encourages === 1 ? "encourage" : "encourages"}`];
  if (s.comebacks > 0) minis.push(`🦅 ${s.comebacks} ${s.comebacks === 1 ? "comeback" : "comebacks"}`);

  return (
    <div className="mt-2 rounded-2xl p-4" style={{ background: "#fff", border: `2px solid ${C.navy}` }}>
      <div className="mb-3 flex items-start justify-between gap-2">
        <div>
          <div className="text-xs font-bold uppercase" style={{ color: C.coral, letterSpacing: 0.6 }}>
            Lifetime
          </div>
          <div style={{ fontFamily: "Georgia, serif", fontSize: 20, color: C.ink }}>{p.me.name}</div>
        </div>
        <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-bold" style={{ background: C.navy, color: "#fff" }}>
          <span>{levelIcon(level)}</span>
          <span>Level {level}</span>
        </span>
      </div>

      <div className="mb-3 grid grid-cols-2 gap-2">
        {tiles.map(([e, n, label]) => (
          <div key={label} className="rounded-xl px-3 py-2.5" style={{ background: C.cream }}>
            <div className="flex items-baseline gap-1.5" style={{ fontFamily: "Georgia, serif", fontSize: 28, lineHeight: 1, color: C.ink, fontVariantNumeric: "tabular-nums" }}>
              {e && <span style={{ fontSize: 18 }}>{e}</span>}
              {n}
            </div>
            <div className="mt-1 text-xs" style={{ color: C.fade }}>
              {label}
            </div>
          </div>
        ))}
      </div>

      <div className="mb-3">
        <div className="mb-1.5 flex items-center justify-between text-xs" style={{ color: C.ink }}>
          <span>
            Level {level} &rarr; Level {level + 1}
          </span>
          <span>
            <b style={{ color: C.coral }}>{toGo}</b> more {toGo === 1 ? "task" : "tasks"}
          </span>
        </div>
        <Bar pct={climb} />
        <div className="mt-1 flex justify-between" style={{ fontSize: 10, color: C.fade, fontVariantNumeric: "tabular-nums" }}>
          <span>{floor}</span>
          <span>{next}</span>
        </div>
      </div>

      <div className="mb-3 flex flex-wrap gap-x-3 gap-y-1.5 text-xs" style={{ color: C.navy2 }}>
        {minis.map((m) => (
          <span key={m}>{m}</span>
        ))}
      </div>

      <div className="mb-1.5 text-xs font-bold uppercase" style={{ color: C.fade, letterSpacing: 0.5 }}>
        Badges &middot; {p.myBadges.length} of {BADGE_CATALOG.length}
      </div>
      {p.myBadges.length === 0 ? (
        <p className="mb-2 text-xs" style={{ color: C.fade }}>
          None yet. Your first is 10 Finished; it&rsquo;s closer than it looks.
        </p>
      ) : (
        <div className="mb-2 flex flex-wrap gap-1.5">
          {p.myBadges.map((b) => (
            <span key={b.id} className="inline-flex items-center gap-1 rounded-full py-0.5 pl-1.5 pr-2.5 text-xs font-semibold" style={{ background: C.goldSoft, color: C.goldDeep }}>
              <span style={{ fontSize: 13 }}>{b.e}</span>
              {b.name}
            </span>
          ))}
        </div>
      )}
      {upcoming.length > 0 && (
        <>
          <div className="mb-1.5 mt-2 text-xs font-bold uppercase" style={{ color: C.fade, letterSpacing: 0.5 }}>
            Next up
          </div>
          <div className="flex flex-wrap gap-1.5">
            {upcoming.map((b) => (
              <span key={b.id} className="inline-flex items-center gap-1 rounded-full py-0.5 pl-1.5 pr-2.5 text-xs font-semibold" style={{ background: C.mist, color: "#8A8A8A" }}>
                <span style={{ fontSize: 13, filter: "grayscale(1)", opacity: 0.6 }}>{b.e}</span>
                {b.name}
                <span className="ml-0.5 font-medium" style={{ fontSize: 10, opacity: 0.85 }}>
                  {b.have}/{b.target}
                </span>
              </span>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
