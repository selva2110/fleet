// -----------------------------------------------------------------------------
// Driver Shifts — presentation config (badge tones, view metadata)
// -----------------------------------------------------------------------------

import type { RecurrenceType, ShiftStatus } from "./types";

export const SHIFT_STATUS_META: Record<
  ShiftStatus,
  { label: string; cls: string; block: string; dot: string }
> = {
  active: {
    label: "Active",
    cls: "bg-success/15 text-success",
    block: "border-success/40 bg-success/10 hover:bg-success/15",
    dot: "bg-success",
  },
  draft: {
    label: "Draft",
    cls: "bg-muted text-muted-foreground",
    block: "border-border bg-muted/60 hover:bg-muted border-dashed",
    dot: "bg-muted-foreground",
  },
  full: {
    label: "Full",
    cls: "bg-primary/15 text-primary",
    block: "border-primary/40 bg-primary/10 hover:bg-primary/15",
    dot: "bg-primary",
  },
  partial: {
    label: "Partially Assigned",
    cls: "bg-warning/20 text-warning-foreground",
    block: "border-warning/50 bg-warning/15 hover:bg-warning/25",
    dot: "bg-warning",
  },
  conflict: {
    label: "Conflict",
    cls: "bg-destructive/15 text-destructive",
    block: "border-destructive/50 bg-destructive/10 hover:bg-destructive/15",
    dot: "bg-destructive",
  },
  cancelled: {
    label: "Cancelled",
    cls: "bg-muted text-muted-foreground line-through",
    block: "border-border bg-muted/40 opacity-60",
    dot: "bg-muted-foreground",
  },
};

export const RECURRENCE_OPTIONS: { value: RecurrenceType; label: string; hint: string }[] = [
  { value: "one-time", label: "One Time", hint: "A single, non-repeating shift" },
  { value: "daily", label: "Daily", hint: "Repeat every N days" },
  { value: "weekly", label: "Weekly", hint: "Repeat on selected weekdays" },
  { value: "monthly", label: "Monthly", hint: "Repeat by month day or weekday" },
];

export const WEEKDAY_OPTIONS: { value: number; short: string; label: string }[] = [
  { value: 1, short: "Mon", label: "Monday" },
  { value: 2, short: "Tue", label: "Tuesday" },
  { value: 3, short: "Wed", label: "Wednesday" },
  { value: 4, short: "Thu", label: "Thursday" },
  { value: 5, short: "Fri", label: "Friday" },
  { value: 6, short: "Sat", label: "Saturday" },
  { value: 0, short: "Sun", label: "Sunday" },
];

export const NTH_WEEK_OPTIONS = [
  { value: 1, label: "First" },
  { value: 2, label: "Second" },
  { value: 3, label: "Third" },
  { value: 4, label: "Fourth" },
  { value: -1, label: "Last" },
];

export const TIMEZONE_OPTIONS = [
  "America/Chicago",
  "America/New_York",
  "America/Denver",
  "America/Los_Angeles",
  "America/Phoenix",
];

/** Hour rows for day/week timelines. */
export const DAY_HOURS = Array.from({ length: 24 }, (_, i) => i);
