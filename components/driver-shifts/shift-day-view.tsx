"use client";

import { ArrowDownRight, MapPin, Truck, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { shiftOccursOnDate, to12h, toMinutes } from "@/lib/driver-shifts/logic";
import { findDriver, findParticipant, findVehicle } from "@/lib/driver-shifts/mock-data";
import { SHIFT_STATUS_META } from "@/lib/driver-shifts/config";
import type { DriverShift } from "@/lib/driver-shifts/types";

const HOURS = Array.from({ length: 24 }, (_, i) => i);

function hourLabel(h: number): string {
  const suffix = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 || 12;
  return `${h12} ${suffix}`;
}

export function ShiftDayView({
  date,
  shifts,
  onSelectShift,
}: {
  date: string;
  shifts: DriverShift[];
  onSelectShift: (shift: DriverShift) => void;
}) {
  const dayShifts = shifts
    .filter((s) => s.status !== "cancelled" && shiftOccursOnDate(s, date))
    .sort((a, b) => toMinutes(a.startTime) - toMinutes(b.startTime));

  if (dayShifts.length === 0) {
    return (
      <div className="px-3 py-10 text-center text-sm text-muted-foreground">
        No shifts scheduled for this day.
      </div>
    );
  }

  return (
    <div className="max-h-[560px] overflow-y-auto">
      {HOURS.map((h) => {
        const startingHere = dayShifts.filter((s) => Math.floor(toMinutes(s.startTime) / 60) === h);
        return (
          <div key={h} className="grid grid-cols-[64px_1fr] border-b border-border/60">
            <div className="px-2 py-2 text-right text-[11px] font-medium tabular-nums text-muted-foreground">
              {hourLabel(h)}
            </div>
            <div className="min-h-12 border-l border-border px-2 py-1.5">
              <div className="flex flex-col gap-2">
                {startingHere.map((shift) => {
                  const driver = findDriver(shift.driverId);
                  const vehicle = findVehicle(shift.vehicleId);
                  const meta = SHIFT_STATUS_META[shift.status];
                  return (
                    <div key={shift.id} className="flex flex-col gap-1.5">
                      <button
                        type="button"
                        onClick={() => onSelectShift(shift)}
                        className={cn(
                          "flex flex-col gap-1 rounded-md border px-3 py-2 text-left transition-colors",
                          meta.block,
                        )}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
                            <span className={cn("size-2 rounded-full", meta.dot)} />
                            {driver?.name ?? shift.name}
                          </span>
                          <span className="text-[11px] tabular-nums text-muted-foreground">
                            {to12h(shift.startTime)} - {to12h(shift.endTime)}
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-muted-foreground">
                          <span>{shift.name}</span>
                          {vehicle ? (
                            <span className="inline-flex items-center gap-1">
                              <Truck className="size-3" /> {vehicle.name}
                            </span>
                          ) : null}
                          <span className="inline-flex items-center gap-1">
                            <Users className="size-3" /> {shift.stops.length}/{shift.capacity}
                          </span>
                        </div>
                      </button>

                      {/* Participant pickups/dropoffs within this shift */}
                      {shift.stops.map((stop) => {
                        const p = findParticipant(stop.participantId);
                        return (
                          <div
                            key={stop.participantId}
                            className="ml-3 flex flex-col gap-1 border-l-2 border-dashed border-border pl-3"
                          >
                            <div className="flex items-start gap-2">
                              <MapPin className="mt-0.5 size-3 shrink-0 text-success" />
                              <div className="min-w-0">
                                <p className="text-xs font-medium text-foreground">
                                  {p?.name ?? stop.participantId}
                                  <span className="ml-1.5 font-normal text-muted-foreground">Pickup</span>
                                </p>
                                <p className="truncate text-[11px] text-muted-foreground">
                                  {to12h(stop.pickupTime)} · {stop.pickupAddress}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-start gap-2">
                              <ArrowDownRight className="mt-0.5 size-3 shrink-0 text-primary" />
                              <div className="min-w-0">
                                <p className="text-xs font-medium text-foreground">
                                  {stop.destination}
                                  <span className="ml-1.5 font-normal text-muted-foreground">Drop-off</span>
                                </p>
                                <p className="truncate text-[11px] text-muted-foreground">
                                  {to12h(stop.dropoffTime)}
                                </p>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
