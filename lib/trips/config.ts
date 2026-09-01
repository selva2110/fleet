import { SortOption } from "@/components/data-view/data-view";
import { TripStatus } from "./types";

export class TripsConfig {
  static readonly GROUP_OPTIONS = [
    { value: "active", label: "trip.active" },
    { value: "planned", label: "trip.plasssigned" },
    { value: "completed", label: "e.completed" },
    { value: "cancelled", label: "meal.cancelled" },
  ];
  static readonly CREW_OPTIONS = [
    { value: "has-driver", label: "e.driverassigned" },
    { value: "no-driver", label: "trip.drivernotassign" },
    { value: "has-vehicle", label: "driver.vhassign" },
    { value: "no-vehicle", label: "driver.vhnotassign" },
  ];

  static readonly ACTIVE: TripStatus[] = [
    "EN_ROUTE",
    "PICKUP_IN_PROGRESS",
    "ONBOARD",
    "ARRIVED",
  ];
  static readonly PLANNED: TripStatus[] = ["PLANNED"];

  static readonly SORT_OPTIONS: SortOption[] = [
    { key: "tripNumber", label: "trip.no" },
    { key: "status", label: "common.status" },
    { key: "progress", label: "trip.progress" },
    { key: "riders", label: "trip.riders" },
    { key: "distanceKm", label: "meal.distance" },
  ];

  static readonly PLANNING_STEPS = [
    "planner.step_analyzing",
    "planner.step_matchingconstraints",
    "planner.step_grouping",
    "planner.step_optimizing",
    "planner.step_assigningdrivers",
    "planner.step_scoring",
  ];

  static readonly tripStatusMeta: Record<
    TripStatus,
    { label: string; cls: string; map: string }
  > = {
    PLANNED: {
      label: "trip.planned",
      cls: "bg-accent text-accent-foreground",
      map: "#3b82f6",
    },
    VEHICLE_ASSIGNED: {
      label: "trip.vehicleassigned",
      cls: "bg-primary/15 text-primary",
      map: "#6366f1",
    },
    DRIVER_ASSIGNED: {
      label: "Driver Assigned",
      cls: "bg-primary/15 text-primary",
      map: "#8b5cf6",
    },
    EN_ROUTE: {
      label: "trip.enroute",
      cls: "bg-primary/15 text-primary",
      map: "#0ea5e9",
    },
    PICKUP_IN_PROGRESS: {
      label: "trip.pickupinprogress",
      cls: "bg-primary/15 text-primary",
      map: "#0891b2",
    },
    ONBOARD: {
      label: "trip.onboard",
      cls: "bg-primary/15 text-primary",
      map: "#2563eb",
    },
    ARRIVED: {
      label: "trip.arrived",
      cls: "bg-success/20 text-success",
      map: "#16a34a",
    },
    COMPLETED: {
      label: "e.completed",
      cls: "bg-success/20 text-success",
      map: "#059669",
    },
    CANCELLED: {
      label: "meal.cancelled",
      cls: "bg-destructive/15 text-destructive",
      map: "#dc2626",
    },
  };
  static readonly STATUS_OPTIONS = Object.entries(this.tripStatusMeta).map(
    ([value, m]) => ({
      value,
      label: m.label,
    }),
  );
  static readonly LIVE_TRIP_STATUSES: TripStatus[] = [
    "EN_ROUTE",
    "PICKUP_IN_PROGRESS",
    "ONBOARD",
    "ARRIVED",
  ];

  static readonly DISPATCHED_STATUSES: TripStatus[] = [
    "EN_ROUTE",
    "PICKUP_IN_PROGRESS",
    "ONBOARD",
    "ARRIVED",
    "COMPLETED",
  ];

  static readonly ACTIVE_TRIPS: TripStatus[] = [
    "EN_ROUTE",
    "PICKUP_IN_PROGRESS",
    "ONBOARD",
    "ARRIVED",
  ];

  static readonly EVENT_START_DEADLINE = 43200000;
}
