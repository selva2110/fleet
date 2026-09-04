"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, CalendarRange, CheckCircle2, Info } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  TextField,
  NumberField,
  SelectField,
  DaysOfWeekField,
} from "@/components/crud/form-fields";
import { useDriverShifts } from "@/lib/driver-shifts/store";
import {
  RECURRENCE_OPTIONS,
  NTH_WEEK_OPTIONS,
  TIMEZONE_OPTIONS,
} from "@/lib/driver-shifts/config";
import {
  describeRecurrence,
  detectShiftConflicts,
  isoDate,
  toMinutes,
} from "@/lib/driver-shifts/logic";
import { SHIFT_DRIVERS, SHIFT_VEHICLES } from "@/lib/driver-shifts/mock-data";
import type {
  DriverShift,
  MonthlyMode,
  NthWeek,
  Recurrence,
  RecurrenceType,
  Weekday,
} from "@/lib/driver-shifts/types";

function blankRecurrence(): Recurrence {
  return {
    type: "weekly",
    interval: 1,
    weekdays: [1, 2, 3, 4, 5],
    monthDay: 1,
    monthlyMode: "day-of-month",
    nthWeek: 1,
    nthWeekday: 1,
  };
}

interface FormState {
  name: string;
  driverId: string;
  vehicleId: string;
  startDate: string;
  endDate: string;
  startTime: string;
  endTime: string;
  timezone: string;
  capacity: number;
  recurrence: Recurrence;
  notes: string;
}

function toForm(shift: DriverShift | null): FormState {
  if (!shift) {
    return {
      name: "",
      driverId: "",
      vehicleId: "",
      startDate: isoDate(new Date()),
      endDate: "",
      startTime: "08:00",
      endTime: "16:00",
      timezone: "America/Chicago",
      capacity: 8,
      recurrence: blankRecurrence(),
      notes: "",
    };
  }
  return {
    name: shift.name,
    driverId: shift.driverId ?? "",
    vehicleId: shift.vehicleId ?? "",
    startDate: shift.startDate,
    endDate: shift.endDate ?? "",
    startTime: shift.startTime,
    endTime: shift.endTime,
    timezone: shift.timezone,
    capacity: shift.capacity,
    recurrence: shift.recurrence,
    notes: shift.notes ?? "",
  };
}

export function ShiftDrawer({
  open,
  onOpenChange,
  editing,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing: DriverShift | null;
}) {
  const { shifts, upsertShift } = useDriverShifts();
  const [form, setForm] = useState<FormState>(() => toForm(editing));
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (open) {
      setForm(toForm(editing));
      setErrors({});
    }
  }, [open, editing]);

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) => {
    setForm((f) => ({ ...f, [k]: v }));
    setErrors((e) => (e[k as string] ? { ...e, [k as string]: "" } : e));
  };
  const setRec = <K extends keyof Recurrence>(k: K, v: Recurrence[K]) =>
    setForm((f) => ({ ...f, recurrence: { ...f.recurrence, [k]: v } }));

  // Build a candidate shift from the form for live conflict detection.
  const candidate = useMemo<DriverShift>(() => {
    return {
      id: editing?.id ?? "candidate",
      name: form.name || "Untitled shift",
      driverId: form.driverId || null,
      vehicleId: form.vehicleId || null,
      startDate: form.startDate,
      endDate: form.endDate || null,
      startTime: form.startTime,
      endTime: form.endTime,
      timezone: form.timezone,
      capacity: form.capacity,
      recurrence: form.recurrence,
      stops: editing?.stops ?? [],
      status: editing?.status ?? "draft",
    };
  }, [form, editing]);

  const conflicts = useMemo(
    () => detectShiftConflicts(candidate, shifts),
    [candidate, shifts],
  );

  const recurrenceSummary = useMemo(
    () => describeRecurrence(form.recurrence, form.startDate, form.endDate || null),
    [form.recurrence, form.startDate, form.endDate],
  );

  function validate(): boolean {
    const next: Record<string, string> = {};
    if (!form.name.trim()) next.name = "Shift name is required.";
    if (!form.startDate) next.startDate = "Start date is required.";
    if (!form.startTime) next.startTime = "Start time is required.";
    if (!form.endTime) next.endTime = "End time is required.";
    if (form.startTime && form.endTime && toMinutes(form.endTime) <= toMinutes(form.startTime)) {
      next.endTime = "End time must be after the start time.";
    }
    if (form.endDate && form.endDate < form.startDate) {
      next.endDate = "End date cannot be before the start date.";
    }
    if (form.recurrence.type === "weekly" && form.recurrence.weekdays.length === 0) {
      next.weekdays = "Select at least one weekday.";
    }
    if (form.capacity < 1) next.capacity = "Capacity must be at least 1.";
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function save(asDraft: boolean) {
    if (!validate()) return;
    const hasErrorConflict = conflicts.some((c) => c.severity === "error");
    const status: DriverShift["status"] = asDraft
      ? "draft"
      : hasErrorConflict
        ? "conflict"
        : editing?.status && editing.status !== "draft"
          ? editing.status
          : candidate.stops.length >= form.capacity && candidate.stops.length > 0
            ? "full"
            : candidate.stops.length > 0
              ? "partial"
              : "active";
    upsertShift({ ...candidate, id: editing?.id ?? `SHF-${Date.now()}`, status });
    onOpenChange(false);
  }

  const driverOptions = [
    { value: "", label: "Unassigned" },
    ...SHIFT_DRIVERS.map((d) => ({ value: d.id, label: d.name })),
  ];
  const vehicleOptions = [
    { value: "", label: "Unassigned" },
    ...SHIFT_VEHICLES.map((v) => ({ value: v.id, label: `${v.name} · ${v.type}` })),
  ];
  const recurrenceOptions = RECURRENCE_OPTIONS.map((r) => ({ value: r.value, label: r.label }));
  const tzOptions = TIMEZONE_OPTIONS.map((t) => ({ value: t, label: t.replace("America/", "") }));

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="flex w-full flex-col gap-0 p-0 sm:max-w-xl">
        <SheetHeader className="border-b border-border">
          <SheetTitle>{editing ? "Edit Shift" : "Create Shift"}</SheetTitle>
        </SheetHeader>

        <div className="flex flex-1 flex-col gap-5 overflow-y-auto p-4">
          {/* Details */}
          <section className="flex flex-col gap-3">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Shift Details
            </h3>
            <TextField
              label="Shift name"
              value={form.name}
              placeholder="e.g. Morning Dialysis Run"
              onChange={(v) => set("name", v)}
              required
              error={errors.name}
            />
            <div className="grid gap-3 sm:grid-cols-2">
              <SelectField
                label="Driver"
                value={form.driverId}
                options={driverOptions}
                onChange={(v) => set("driverId", v)}
              />
              <SelectField
                label="Vehicle"
                value={form.vehicleId}
                options={vehicleOptions}
                onChange={(v) => set("vehicleId", v)}
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <TextField
                label="Start time"
                type="time"
                value={form.startTime}
                onChange={(v) => set("startTime", v)}
                required
                error={errors.startTime}
              />
              <TextField
                label="End time"
                type="time"
                value={form.endTime}
                onChange={(v) => set("endTime", v)}
                required
                error={errors.endTime}
              />
              <NumberField
                label="Capacity"
                value={form.capacity}
                min={1}
                onChange={(v) => set("capacity", v)}
                error={errors.capacity}
              />
            </div>
            <SelectField
              label="Timezone"
              value={form.timezone}
              options={tzOptions}
              onChange={(v) => set("timezone", v)}
            />
          </section>

          {/* Recurrence */}
          <section className="flex flex-col gap-3">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Recurrence
            </h3>
            <div className="grid gap-3 sm:grid-cols-2">
              <SelectField
                label="Repeat"
                value={form.recurrence.type}
                options={recurrenceOptions}
                onChange={(v) => setRec("type", v as RecurrenceType)}
              />
              {form.recurrence.type !== "one-time" ? (
                <NumberField
                  label={`Every N ${form.recurrence.type === "daily" ? "days" : form.recurrence.type === "weekly" ? "weeks" : "months"}`}
                  value={form.recurrence.interval}
                  min={1}
                  onChange={(v) => setRec("interval", Math.max(1, v))}
                />
              ) : null}
            </div>

            {form.recurrence.type === "weekly" ? (
              <DaysOfWeekField
                label="On these days"
                value={form.recurrence.weekdays}
                onChange={(v) => setRec("weekdays", v as Weekday[])}
                error={errors.weekdays}
              />
            ) : null}

            {form.recurrence.type === "monthly" ? (
              <div className="flex flex-col gap-3 rounded-md border border-border p-3">
                <div className="flex flex-col gap-2">
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="radio"
                      name="monthlyMode"
                      checked={form.recurrence.monthlyMode === "day-of-month"}
                      onChange={() => setRec("monthlyMode", "day-of-month" as MonthlyMode)}
                    />
                    On day of month
                  </label>
                  {form.recurrence.monthlyMode === "day-of-month" ? (
                    <div className="pl-6">
                      <NumberField
                        label="Day (1-31)"
                        value={form.recurrence.monthDay}
                        min={1}
                        onChange={(v) => setRec("monthDay", Math.min(31, Math.max(1, v)))}
                      />
                    </div>
                  ) : null}
                </div>
                <div className="flex flex-col gap-2">
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="radio"
                      name="monthlyMode"
                      checked={form.recurrence.monthlyMode === "nth-weekday"}
                      onChange={() => setRec("monthlyMode", "nth-weekday" as MonthlyMode)}
                    />
                    On the Nth weekday
                  </label>
                  {form.recurrence.monthlyMode === "nth-weekday" ? (
                    <div className="grid gap-3 pl-6 sm:grid-cols-2">
                      <SelectField
                        label="Week"
                        value={String(form.recurrence.nthWeek)}
                        options={NTH_WEEK_OPTIONS.map((o) => ({ value: String(o.value), label: o.label }))}
                        onChange={(v) => setRec("nthWeek", Number(v) as NthWeek)}
                      />
                      <SelectField
                        label="Weekday"
                        value={String(form.recurrence.nthWeekday)}
                        options={[
                          { value: "1", label: "Monday" },
                          { value: "2", label: "Tuesday" },
                          { value: "3", label: "Wednesday" },
                          { value: "4", label: "Thursday" },
                          { value: "5", label: "Friday" },
                          { value: "6", label: "Saturday" },
                          { value: "0", label: "Sunday" },
                        ]}
                        onChange={(v) => setRec("nthWeekday", Number(v) as Weekday)}
                      />
                    </div>
                  ) : null}
                </div>
              </div>
            ) : null}

            <div className="grid gap-3 sm:grid-cols-2">
              <TextField
                label="Series start date"
                type="date"
                value={form.startDate}
                onChange={(v) => set("startDate", v)}
                required
                error={errors.startDate}
              />
              <TextField
                label="Series end date (optional)"
                type="date"
                value={form.endDate}
                onChange={(v) => set("endDate", v)}
                error={errors.endDate}
              />
            </div>

            <div className="flex items-start gap-2 rounded-md border border-primary/30 bg-primary/5 px-3 py-2 text-sm text-foreground">
              <CalendarRange className="mt-0.5 size-4 shrink-0 text-primary" />
              <span>{recurrenceSummary}</span>
            </div>
          </section>

          {/* Notes */}
          <section className="flex flex-col gap-3">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Notes
            </h3>
            <textarea
              value={form.notes}
              onChange={(e) => set("notes", e.target.value)}
              rows={2}
              placeholder="Optional dispatcher notes..."
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
            />
          </section>

          {/* Live conflict detection */}
          <section className="flex flex-col gap-2">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Conflict Check
            </h3>
            {conflicts.length === 0 ? (
              <div className="flex items-center gap-2 rounded-md border border-success/40 bg-success/10 px-3 py-2 text-sm text-foreground">
                <CheckCircle2 className="size-4 text-success" />
                No scheduling conflicts detected.
              </div>
            ) : (
              <ul className="flex flex-col gap-2">
                {conflicts.map((c, i) => (
                  <li
                    key={i}
                    className={cn(
                      "flex items-start gap-2 rounded-md border px-3 py-2 text-sm",
                      c.severity === "error"
                        ? "border-destructive/40 bg-destructive/10 text-foreground"
                        : "border-warning/50 bg-warning/10 text-foreground",
                    )}
                  >
                    {c.severity === "error" ? (
                      <AlertTriangle className="mt-0.5 size-4 shrink-0 text-destructive" />
                    ) : (
                      <Info className="mt-0.5 size-4 shrink-0 text-warning" />
                    )}
                    <span>{c.message}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        <SheetFooter className="border-t border-border">
          <Button variant="outline" onClick={() => save(true)}>
            Save as Draft
          </Button>
          <Button onClick={() => save(false)}>
            {editing ? "Save Changes" : "Create Shift"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
