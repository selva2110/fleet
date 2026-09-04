"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
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
import { SHIFT_DRIVERS, SHIFT_VEHICLES } from "@/lib/driver-shifts/mock-data";
import { SHIFT_STATUS_META } from "@/lib/driver-shifts/config";
import type { CalendarView, DriverShift, ShiftStatus } from "@/lib/driver-shifts/types";
import { ShiftWeekView } from "@/components/driver-shifts/shift-week-view";
import { ShiftDayView } from "@/components/driver-shifts/shift-day-view";
import { ShiftMonthView } from "@/components/driver-shifts/shift-month-view";
import { ShiftDrawer } from "@/components/driver-shifts/shift-drawer";

const VIEW_OPTIONS: { value: CalendarView; label: string }[] = [
  { value: "daily", label: "Day" },
  { value: "weekly", label: "Week" },
  { value: "monthly", label: "Month" },
];

const STATUS_FILTER: (ShiftStatus | "all")[] = ["all", "active", "partial", "full", "conflict", "draft"];

export default function DriverShiftsPage() {
  const { shifts, unassignedParticipantIds } = useDriverShifts();

  const [view, setView] = useState<CalendarView>("weekly");
  const [anchor, setAnchor] = useState<string>(() => isoDate(new Date()));
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<ShiftStatus | "all">("all");
  const [driverFilter, setDriverFilter] = useState<string>("all");
  const [vehicleFilter, setVehicleFilter] = useState<string>("all");

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<DriverShift | null>(null);

  const filtered = useMemo(() => {
    return shifts.filter((s) => {
      if (statusFilter !== "all" && s.status !== statusFilter) return false;
      if (driverFilter !== "all" && s.driverId !== driverFilter) return false;
      if (vehicleFilter !== "all" && s.vehicleId !== vehicleFilter) return false;
      if (query.trim()) {
        const q = query.toLowerCase();
        const driver = SHIFT_DRIVERS.find((d) => d.id === s.driverId);
        const hay = `${s.name} ${driver?.name ?? ""} ${s.vehicleId ?? ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [shifts, statusFilter, driverFilter, vehicleFilter, query]);

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
    return parseISO(anchor).toLocaleDateString("en-US", { month: "long", year: "numeric" });
  }, [view, anchor]);

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Driver Shifts"
        subtitle="Create, schedule and staff recurring driver shifts, then map participants onto each run."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" asChild>
              <Link href="/driver-shifts/unassigned">
                <UserPlus className="size-4" />
                Unassigned
                {stats.unassigned > 0 ? (
                  <span className="ml-1 rounded-full bg-warning/20 px-1.5 text-xs font-semibold text-warning-foreground">
                    {stats.unassigned}
                  </span>
                ) : null}
              </Link>
            </Button>
            <Button onClick={openCreate}>
              <Plus className="size-4" />
              New Shift
            </Button>
          </div>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={CalendarClock} label="Shifts Today" value={stats.today} tone="primary" />
        <StatCard icon={Users} label="Participants Assigned" value={stats.assigned} tone="success" />
        <StatCard icon={UserPlus} label="Unassigned Participants" value={stats.unassigned} tone="warning" />
        <StatCard icon={AlertTriangle} label="Shifts in Conflict" value={stats.conflicts} tone="danger" />
      </div>

      {/* Filters */}
      <Card className="flex flex-col gap-3 p-3">
        <div className="flex flex-wrap items-center gap-2">
          <Input
            placeholder="Search shift, driver or vehicle..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="h-9 max-w-64"
          />
          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as ShiftStatus | "all")}>
            <SelectTrigger className="h-9 w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUS_FILTER.map((s) => (
                <SelectItem key={s} value={s}>
                  {s === "all" ? "All statuses" : SHIFT_STATUS_META[s].label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={driverFilter} onValueChange={setDriverFilter}>
            <SelectTrigger className="h-9 w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All drivers</SelectItem>
              {SHIFT_DRIVERS.map((d) => (
                <SelectItem key={d.id} value={d.id}>
                  {d.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={vehicleFilter} onValueChange={setVehicleFilter}>
            <SelectTrigger className="h-9 w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All vehicles</SelectItem>
              {SHIFT_VEHICLES.map((v) => (
                <SelectItem key={v.id} value={v.id}>
                  {v.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </Card>

      {/* Calendar toolbar */}
      <Card className="overflow-hidden p-0">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-3">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" className="size-8" onClick={() => shiftRange(-1)} aria-label="Previous">
              <ChevronLeft className="size-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={() => setAnchor(isoDate(new Date()))}>
              Today
            </Button>
            <Button variant="outline" size="icon" className="size-8" onClick={() => shiftRange(1)} aria-label="Next">
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
          <ShiftWeekView anchorDate={anchor} shifts={filtered} onSelectShift={openEdit} />
        ) : view === "daily" ? (
          <ShiftDayView date={anchor} shifts={filtered} onSelectShift={openEdit} />
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

      <p className="text-xs text-muted-foreground">
        Showing {filtered.length} of {shifts.length} shifts · {formatLongDate(anchor)}
      </p>

      <ShiftDrawer open={drawerOpen} onOpenChange={setDrawerOpen} editing={editing} />
    </div>
  );
}
