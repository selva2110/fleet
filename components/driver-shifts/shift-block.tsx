"use client";

import { Truck, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { StatusBadge } from "@/components/common";
import { SHIFT_STATUS_META } from "@/lib/driver-shifts/config";
import { to12h } from "@/lib/driver-shifts/logic";
import { findDriver, findVehicle } from "@/lib/driver-shifts/mock-data";
import type { DriverShift } from "@/lib/driver-shifts/types";

export function ShiftStatusBadge({ status }: { status: DriverShift["status"] }) {
  const meta = SHIFT_STATUS_META[status];
  return <StatusBadge label={meta.label} cls={meta.cls} />;
}

/** Compact block used inside calendar cells and timelines. */
export function ShiftBlock({
  shift,
  onClick,
  dense = false,
  className,
}: {
  shift: DriverShift;
  onClick?: () => void;
  dense?: boolean;
  className?: string;
}) {
  const meta = SHIFT_STATUS_META[shift.status];
  const driver = findDriver(shift.driverId);
  const vehicle = findVehicle(shift.vehicleId);

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full flex-col gap-1 rounded-md border px-2 py-1.5 text-left transition-colors",
        meta.block,
        className,
      )}
    >
      <div className="flex items-center gap-1.5">
        <span className={cn("size-1.5 shrink-0 rounded-full", meta.dot)} />
        <span className="truncate text-xs font-semibold text-foreground">
          {driver?.name ?? shift.name}
        </span>
      </div>
      <span className="text-[11px] tabular-nums text-muted-foreground">
        {to12h(shift.startTime)} - {to12h(shift.endTime)}
      </span>
      {!dense ? (
        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-muted-foreground">
          {vehicle ? (
            <span className="inline-flex items-center gap-1">
              <Truck className="size-3" /> {vehicle.name}
            </span>
          ) : (
            <span className="italic">No vehicle</span>
          )}
          <span className="inline-flex items-center gap-1">
            <Users className="size-3" /> {shift.stops.length}/{shift.capacity}
          </span>
        </div>
      ) : null}
    </button>
  );
}
