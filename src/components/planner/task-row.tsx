"use client";

import { CheckCircle2, Circle, Pencil, Star } from "lucide-react";
import { usePlanner } from "./store";
import { C, Chip } from "./ui";
import { dayLabel, monthLabel, ord, WD } from "@/lib/planner/calendar";
import { blockLabel, blockMeta } from "@/lib/planner/content";
import type { Task } from "@/lib/planner/types";

export function TaskRow({ t, showDay }: { t: Task; showDay: boolean }) {
  const p = usePlanner();
  return (
    <div className="mb-2 flex items-center gap-3 rounded-xl px-3 py-3" style={{ background: "#fff", opacity: t.done ? 0.65 : 1 }}>
      <button onClick={() => p.toggleTask(t)} className="shrink-0" aria-label={t.done ? "Mark not done" : "Mark done"}>
        {t.done ? <CheckCircle2 size={24} style={{ color: C.teal }} /> : <Circle size={24} style={{ color: C.fade }} />}
      </button>
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium" style={{ color: C.ink, textDecoration: t.done ? "line-through" : "none" }}>
          {t.big && <Star size={13} className="mr-1 inline" style={{ color: C.gold, fill: C.gold }} />}
          {t.title}
        </div>
        <div className="mt-1 flex flex-wrap gap-1.5">
          {showDay && <Chip>{t.date ? dayLabel(p.month, t.date) : "Day TBD"}</Chip>}
          <Chip color={blockMeta(t.block)?.text ?? C.fade} bg={blockMeta(t.block)?.tint ?? C.mist}>
            {t.block === "auto" ? "Time TBD" : blockLabel(t.block)}
          </Chip>
          {t.carriedFrom && (
            <Chip color={C.fade} bg={C.mist}>
              From {monthLabel(t.carriedFrom)}
            </Chip>
          )}
          {t.repeat === "daily" && (
            <Chip color={C.goldDeep} bg={C.goldSoft}>
              Daily
            </Chip>
          )}
          {t.repeat === "weekdays" && (
            <Chip color={C.goldDeep} bg={C.goldSoft}>
              Mon - Fri
            </Chip>
          )}
          {t.repeat === "weekly" && (
            <Chip color={C.goldDeep} bg={C.goldSoft}>
              {t.anchor === null || t.anchor === undefined ? "Weekly" : `Every ${WD[t.anchor]}`}
            </Chip>
          )}
          {t.repeat === "monthly" && (
            <Chip color={C.coral} bg="#FDE2E2">
              {t.anchor ? `Monthly, the ${ord(t.anchor)}` : "Monthly"}
            </Chip>
          )}
        </div>
      </div>
      <button onClick={() => p.set("editing", { ...t })} className="shrink-0 p-1" aria-label="Edit task">
        <Pencil size={16} style={{ color: C.fade }} />
      </button>
    </div>
  );
}
