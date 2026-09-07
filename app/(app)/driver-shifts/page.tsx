"use client";

import { useMemo, useState } from "react";
import {
  AlertTriangle,
  CalendarClock,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Plus,
  UserPlus,
  Users,
} from "lucide-react";
import { PageHeader, StatCard } from "@/components/common";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { useDriverShifts } from "@/lib/driver-shifts/store";
import {
  addDays,
  detectShiftConflicts,
  formatLongDate,
  isoDate,
  parseISO,
  shiftOccursOnDate,
  startOfWeek,
} from "@/lib/driver-shifts/logic";
import { SHIFT_STATUS_META } from "@/lib/driver-shifts/config";
import { useDrivers } from "@/lib/driver/hooks";
import { useVehicles } from "@/lib/vehicles/hooks";
import type {
  CalendarView,
  DriverShift,
  ShiftStatus,
} from "@/lib/driver-shifts/types";
import { ShiftWeekView } from "@/components/driver-shifts/shift-week-view";
import { ShiftDayView } from "@/components/driver-shifts/shift-day-view";
import { ShiftMonthView } from "@/components/driver-shifts/shift-month-view";
import { ShiftDrawer } from "@/components/driver-shifts/shift-drawer";
import { SelectField } from "@/components/crud/form-fields";

const VIEW_OPTIONS: { value: CalendarView; label: string }[] = [
  { value: "daily", label: "Day" },
  { value: "weekly", label: "Week" },
  { value: "monthly", label: "Month" },
];

const STATUS_FILTER = [
  { label: "All", value: "" },
  { label: "Active", value: "active" },
  { label: "Partial", value: "partial" },
  { label: "Full", value: "full" },
  { label: "Conflict", value: "conflict" },
  { label: "Draft", value: "draft" },
] satisfies { label: string; value: ShiftStatus | "" }[];

export default function DriverShiftsPage() {
  const { shifts, unassignedParticipantIds } = useDriverShifts();
  const { drivers } = useDrivers();
  const { vehicles } = useVehicles();

  const [view, setView] = useState<CalendarView>("weekly");
  const [anchor, setAnchor] = useState<string>(() => isoDate(new Date()));
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<ShiftStatus | "">("");
  const [driverFilter, setDriverFilter] = useState<string>("");
  const [vehicleFilter, setVehicleFilter] = useState<string>("");

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<DriverShift | null>(null);

  const filtered = useMemo(() => {
    return shifts.filter((s) => {
      if (statusFilter !== "" && s.status !== statusFilter) return false;
      if (driverFilter !== "" && s.driverId !== driverFilter) return false;
      // if (vehicleFilter !== "all" && s.vehicleId !== vehicleFilter) return false;
      if (query.trim()) {
        const q = query.toLowerCase();
        const driver = drivers.find((d) => d.id === s.driverId);
        const hay = `${driver?.name ?? ""}`;
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [shifts, statusFilter, driverFilter, vehicleFilter, query, drivers]);

  const stats = useMemo(() => {
    const active = shifts.filter((s) => s.status !== "cancelled");
    const todayIso = isoDate(new Date());
    const todayShifts = active.filter((s) => shiftOccursOnDate(s, todayIso));
    const conflicts = active.filter((s) =>
      detectShiftConflicts(s, shifts).some((c) => c.severity === "error"),
    ).length;
    const assigned = active.reduce((sum, s) => sum + s.stops.length, 0);
    return {
      today: todayShifts.length,
      conflicts,
      assigned,
      unassigned: unassignedParticipantIds.length,
    };
  }, [shifts, unassignedParticipantIds]);

  function openCreate() {
    setEditing(null);
    setDrawerOpen(true);
  }
  function openEdit(shift: DriverShift) {
    setEditing(shift);
    setDrawerOpen(true);
  }

  function shiftRange(dir: 1 | -1) {
    if (view === "daily") setAnchor((a) => addDays(a, dir));
    else if (view === "weekly") setAnchor((a) => addDays(a, dir * 7));
    else {
      const d = parseISO(anchor);
      d.setMonth(d.getMonth() + dir);
      setAnchor(isoDate(d));
    }
  }

  const rangeLabel = useMemo(() => {
    if (view === "daily") {
      return parseISO(anchor).toLocaleDateString("en-US", {
        weekday: "long",
        month: "long",
        day: "numeric",
      });
    }
    if (view === "weekly") {
      const start = startOfWeek(anchor);
      const end = addDays(start, 6);
      return `${parseISO(start).toLocaleDateString("en-US", { month: "short", day: "numeric" })} - ${parseISO(end).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`;
    }
    return parseISO(anchor).toLocaleDateString("en-US", {
      month: "long",
      year: "numeric",
    });
  }, [view, anchor]);

  const DRIVER_OPTIONS = [
    { value: "", label: "All Drivers" },
    ...drivers.map((item) => ({
      label: item.name,
      value: item.id,
    })),
  ];

  const VEHICLE_OPTIONS = [
    { value: "", label: "All Vehicles" },
    ...vehicles.map((item) => ({
      label: item.name,
      value: item.id,
    })),
  ];

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Driver Shifts"
        description="Create, schedule and staff recurring driver shifts, then map participants onto each run."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button onClick={openCreate}>
              <Plus className="size-4" />
              New Shift
            </Button>
          </div>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4 px-6">
        <StatCard
          icon={CalendarClock}
          label="Shifts Today"
          value={stats.today}
          tone="primary"
        />
        <StatCard
          icon={Users}
          label="Participants Assigned"
          value={stats.assigned}
          tone="success"
        />
        <StatCard
          icon={UserPlus}
          label="Unassigned Participants"
          value={stats.unassigned}
          tone="warning"
        />
        <StatCard
          icon={AlertTriangle}
          label="Shifts in Conflict"
          value={stats.conflicts}
          tone="danger"
        />
      </div>

      {/* Filters */}
      <Card className="flex flex-col gap-3 p-3 mx-5">
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
          <Input
            placeholder="Search shift, driver or vehicle..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="h-9"
          />
          <SelectField
            label=""
            value={statusFilter}
            onChange={(v) => setStatusFilter(v as ShiftStatus | "")}
            options={STATUS_FILTER}
          />
          <SelectField
            label=""
            value={driverFilter}
            onChange={(v) => setDriverFilter(v ?? "")}
            options={DRIVER_OPTIONS}
          />
          <SelectField
            label=""
            value={vehicleFilter}
            onChange={(v) => setVehicleFilter(v ?? "")}
            options={VEHICLE_OPTIONS}
          />
        </div>
      </Card>

      {/* Calendar toolbar */}
      <Card className="overflow-hidden p-0 mx-6">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-3">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              className="size-8"
              onClick={() => shiftRange(-1)}
              aria-label="Previous"
            >
              <ChevronLeft className="size-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setAnchor(isoDate(new Date()))}
            >
              Today
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="size-8"
              onClick={() => shiftRange(1)}
              aria-label="Next"
            >
              <ChevronRight className="size-4" />
            </Button>
            <span className="ml-1 inline-flex items-center gap-2 text-sm font-semibold text-foreground">
              <CalendarDays className="size-4 text-muted-foreground" />
              {rangeLabel}
            </span>
          </div>
          <div className="inline-flex rounded-md border border-border p-0.5">
            {VIEW_OPTIONS.map((v) => (
              <button
                key={v.value}
                type="button"
                onClick={() => setView(v.value)}
                className={cn(
                  "rounded px-3 py-1 text-sm font-medium transition-colors",
                  view === v.value
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {v.label}
              </button>
            ))}
          </div>
        </div>

        {view === "weekly" ? (
          <ShiftWeekView
            anchorDate={anchor}
            shifts={filtered}
            onSelectShift={openEdit}
          />
        ) : view === "daily" ? (
          <ShiftDayView
            date={anchor}
            shifts={filtered}
            onSelectShift={openEdit}
          />
        ) : (
          <ShiftMonthView
            anchorDate={anchor}
            shifts={filtered}
            onSelectDate={(date) => {
              setAnchor(date);
              setView("daily");
            }}
          />
        )}
      </Card>

      <p className="text-xs text-muted-foreground text-right pr-6 pb-3">
        Showing {filtered.length} of {shifts.length} shifts ·{" "}
        {formatLongDate(anchor)}
      </p>

      <ShiftDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        editing={editing}
      />
    </div>
  );
}
