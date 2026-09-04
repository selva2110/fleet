"use client";

import { cn } from "@/lib/utils";
import { addDays, parseISO, shiftOccursOnDate, startOfWeek, to12h } from "@/lib/driver-shifts/logic";
import { findDriver, findVehicle } from "@/lib/driver-shifts/mock-data";
import { SHIFT_STATUS_META } from "@/lib/driver-shifts/config";
import type { DriverShift } from "@/lib/driver-shifts/types";

const DAY_LABELS = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];

export function ShiftWeekView({
  anchorDate,
  shifts,
  onSelectShift,
}: {
  anchorDate: string;
  shifts: DriverShift[];
  onSelectShift: (shift: DriverShift) => void;
}) {
  const weekStart = startOfWeek(anchorDate);
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const today = new Date();
  const todayIso = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

  const visibleShifts = shifts.filter((s) => s.status !== "cancelled");

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[720px]">
        {/* Header row */}
        <div className="grid grid-cols-[180px_repeat(7,1fr)] border-b border-border bg-muted/40">
          <div className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Driver / Shift
          </div>
          {days.map((d, i) => {
            const date = parseISO(d);
            const isToday = d === todayIso;
            return (
              <div
                key={d}
                className={cn(
                  "border-l border-border px-2 py-2 text-center",
                  isToday && "bg-primary/10",
                )}
              >
                <div className="text-[11px] font-semibold uppercase text-muted-foreground">
                  {DAY_LABELS[i]}
                </div>
                <div className={cn("text-sm font-semibold tabular-nums", isToday ? "text-primary" : "text-foreground")}>
                  {date.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                </div>
              </div>
            );
          })}
        </div>

        {/* Shift rows */}
        {visibleShifts.length === 0 ? (
          <div className="px-3 py-10 text-center text-sm text-muted-foreground">
            No shifts scheduled for this week.
          </div>
        ) : (
          visibleShifts.map((shift) => {
            const driver = findDriver(shift.driverId);
            const vehicle = findVehicle(shift.vehicleId);
            return (
              <div
                key={shift.id}
                className="grid grid-cols-[180px_repeat(7,1fr)] border-b border-border last:border-b-0"
              >
                <div className="flex flex-col justify-center px-3 py-2">
                  <span className="truncate text-sm font-medium text-foreground">
                    {driver?.name ?? shift.name}
                  </span>
                  <span className="text-[11px] tabular-nums text-muted-foreground">
                    {to12h(shift.startTime)} - {to12h(shift.endTime)}
                  </span>
                  {vehicle ? (
                    <span className="text-[11px] text-muted-foreground">{vehicle.name}</span>
                  ) : null}
                </div>
                {days.map((d) => {
                  const occurs = shiftOccursOnDate(shift, d);
                  const meta = SHIFT_STATUS_META[shift.status];
                  const isToday = d === todayIso;
                  return (
                    <div
                      key={d}
                      className={cn("border-l border-border p-1.5", isToday && "bg-primary/5")}
                    >
                      {occurs ? (
                        <button
                          type="button"
                          onClick={() => onSelectShift(shift)}
                          className={cn(
                            "flex h-full min-h-12 w-full flex-col justify-center gap-0.5 rounded-md border px-1.5 py-1 text-left transition-colors",
                            meta.block,
                          )}
                        >
                          <span className="flex items-center gap-1">
                            <span className={cn("size-1.5 shrink-0 rounded-full", meta.dot)} />
                            <span className="truncate text-[11px] font-semibold text-foreground">
                              {shift.stops.length}/{shift.capacity}
                            </span>
                          </span>
                          <span className="truncate text-[10px] text-muted-foreground">
                            {meta.label}
                          </span>
                        </button>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
