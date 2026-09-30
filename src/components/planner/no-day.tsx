"use client";

import { CalendarDays } from "lucide-react";
import { TaskRow } from "./task-row";
import { C } from "./ui";
import type { Task } from "@/lib/planner/types";

/**
 * Work nobody has given a day to.
 *
 * A task with no day belongs to no day and to no week, so it used to have
 * nowhere to be read: invisible on Today, and buried inside a week on Plan
 * where it had been filed by guesswork. It gets its own section at the foot of
 * both screens instead, shaped like the Later group for the same reason: these
 * are the tasks waiting on a decision, not part of the run of the month.
 */
export function NoDayGroup({ tasks, note }: { tasks: Task[]; note: string }) {
  if (!tasks.length) return null;
  return (
    <div className="mt-6">
      <div className="mb-2 flex items-center justify-between">
        <span className="flex items-center gap-2 text-sm font-bold" style={{ color: C.navy }}>
          <CalendarDays size={15} style={{ color: C.fade }} />
          No day yet
        </span>
        <span className="text-xs" style={{ color: C.fade }}>
          {tasks.length} waiting
        </span>
      </div>
      <p className="mb-2 text-xs" style={{ color: C.fade }}>
        {note}
      </p>
      {tasks.map((t) => (
        <TaskRow key={t.id} t={t} showDay={false} />
      ))}
    </div>
  );
}
