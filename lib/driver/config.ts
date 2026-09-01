import { SortOption } from "@/components/data-view/data-view";
import { DriverStatus, LeaveStatus } from "./types";

export class DriversConfig {
  static readonly driverStatusMeta: Record<
    DriverStatus,
    { label: string; cls: string }
  > = {
    available: { label: "e.available", cls: "bg-success/20 text-success" },
    "on-trip": { label: "driver.onTrip", cls: "bg-primary/15 text-primary" },
    break: {
      label: "driver.onBreak",
      cls: "bg-warning/20 text-warning-foreground",
    },
    offline: { label: "e.offline", cls: "bg-muted text-muted-foreground" },
  };
  static readonly STATUS_OPTIONS = Object.entries(this.driverStatusMeta).map(
    ([value, m]) => ({
      value,
      label: m.label,
    }),
  );
  static readonly CERT_OPTIONS = [
    { value: "wheelchairAssist", label: "driver.whassist" },
    { value: "medicalTransport", label: "driver.medtrans" },
  ];
  static readonly ASSIGNMENT_OPTIONS = [
    { value: "assigned", label: "driver.vhassign" },
    { value: "unassigned", label: "driver.vhnotassign" },
  ];

  static readonly SORT_OPTIONS: SortOption[] = [
    { key: "name", label: "common.name" },
    { key: "rating", label: "driver.rating" },
    { key: "status", label: "common.status" },
    { key: "license", label: "driver.license" },
    { key: "shiftStart", label: "driver.shstart" },
  ];

  static readonly DISPATCHED_STATUSES = ["ONBOARD", "COMPLETED"];
  static readonly LEAVE_STATUSES: LeaveStatus[] = ["PENDING", "APPROVED", "REJECTED", "CANCELLED"];

   static readonly leaveStatusMeta: Record<
    LeaveStatus,
    { label: string; cls: string }
  > = {
    PENDING: {
      label: "driver.leavepending",
      cls: "bg-warning/20 text-warning-foreground",
    },
    APPROVED: {
      label: "driver.leaveapproved",
      cls: "bg-destructive/15 text-destructive",
    },
    REJECTED: {
      label: "driver.leaverejected",
      cls: "bg-muted text-muted-foreground",
    },
    CANCELLED: {
      label: "driver.leavecancelled",
      cls: "bg-muted text-muted-foreground",
    },
  };
  static readonly LEAVE_STATUS_OPTIONS = Object.entries(
    this.leaveStatusMeta,
  ).map(([value, m]) => ({
    value,
    label: m.label,
  }));

  static readonly AVAILABILITY_SORT_OPTIONS: SortOption[] = [
    { key: "name", label: "common.name" },
    { key: "shiftStart", label: "driver.shstart" },
    { key: "status", label: "common.status" },
  ];

  static readonly STATUS_SEVERITY: Record<LeaveStatus, number> = {
    APPROVED: 3,
    PENDING: 2,
    REJECTED: 1,
    CANCELLED: 0,
  };

  static readonly STATUS_CELL_CLS: Record<LeaveStatus, string> = {
    APPROVED: "border-destructive/40 bg-destructive/10",
    PENDING: "border-warning/50 bg-warning/15",
    REJECTED: "border-border bg-muted/40",
    CANCELLED: "border-border bg-muted/40",
  };

  static readonly STATUS_COUNT_CLS: Record<LeaveStatus, string> = {
    APPROVED: "bg-destructive text-destructive-foreground",
    PENDING: "bg-warning text-warning-foreground",
    REJECTED: "bg-muted-foreground/60 text-background",
    CANCELLED: "bg-muted-foreground/60 text-background",
  };

  WEEKDAY_LABELS = [
    "day.sun",
    "day.mon",
    "day.tue",
    "day.wed",
    "day.thu",
    "day.fri",
    "day.sat",
  ];
  static readonly MAX_MONTHS = 12;
  static readonly MAX_EVENT_LANES = 3;
}
