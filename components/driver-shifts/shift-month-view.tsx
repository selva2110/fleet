"use client";

import { cn } from "@/lib/utils";
import {
  addDays,
  detectShiftConflicts,
  isoDate,
  parseISO,
  shiftOccursOnDate,
} from "@/lib/driver-shifts/logic";
import type { DriverShift } from "@/lib/driver-shifts/types";

const WEEK_HEADS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export function ShiftMonthView({
  anchorDate,
  shifts,
  onSelectDate,
}: {
  anchorDate: string;
  shifts: DriverShift[];
  onSelectDate: (date: string) => void;
}) {
  const anchor = parseISO(anchorDate);
  const year = anchor.getFullYear();
  const month = anchor.getMonth();

  const first = new Date(year, month, 1);
  // Grid starts on the Monday on/before the 1st.
  const firstDay = first.getDay();
  const lead = firstDay === 0 ? 6 : firstDay - 1;
  const gridStart = addDays(isoDate(first), -lead);

  const cells = Array.from({ length: 42 }, (_, i) => addDays(gridStart, i));
  const today = new Date();
  const todayIso = isoDate(today);

  const active = shifts.filter((s) => s.status !== "cancelled");

  return (
    <div className="p-2">
      <div className="grid grid-cols-7">
        {WEEK_HEADS.map((d) => (
          <div key={d} className="px-2 py-1.5 text-center text-[11px] font-semibold uppercase text-muted-foreground">
            {d}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {cells.map((date) => {
          const d = parseISO(date);
          const inMonth = d.getMonth() === month;
          const isToday = date === todayIso;

          const dayShifts = active.filter((s) => shiftOccursOnDate(s, date));
          const conflicts = dayShifts.filter(
            (s) => detectShiftConflicts(s, shifts).some((c) => c.severity === "error"),
          ).length;
          const participants = dayShifts.reduce((sum, s) => sum + s.stops.length, 0);

          return (
            <button
              type="button"
              key={date}
              onClick={() => onSelectDate(date)}
              className={cn(
                "flex min-h-20 flex-col gap-1 rounded-md border border-border p-1.5 text-left transition-colors hover:border-primary/50 hover:bg-accent",
                !inMonth && "opacity-40",
                isToday && "border-primary bg-primary/5",
              )}
            >
              <span
                className={cn(
                  "text-xs font-semibold tabular-nums",
                  isToday ? "text-primary" : "text-foreground",
                )}
              >
                {d.getDate()}
              </span>
              {dayShifts.length > 0 ? (
                <div className="flex flex-col gap-0.5">
                  <span className="rounded bg-primary/10 px-1 py-0.5 text-[10px] font-medium text-primary">
                    {dayShifts.length} {dayShifts.length === 1 ? "shift" : "shifts"}
                  </span>
                  {conflicts > 0 ? (
                    <span className="rounded bg-destructive/10 px-1 py-0.5 text-[10px] font-medium text-destructive">
                      {conflicts} conflict{conflicts === 1 ? "" : "s"}
                    </span>
                  ) : null}
                  {participants > 0 ? (
                    <span className="text-[10px] text-muted-foreground">{participants} participants</span>
                  ) : null}
                </div>
              ) : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}
