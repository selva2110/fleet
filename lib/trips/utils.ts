import { FleetEvent } from "../events/types";
import { NotificationUtils } from "../notification/utils";
import { TripsConfig } from "./config";
import { PlanStatus, Trip } from "./types";

export class TripsUtils {
  static notificationsEnabled(event: FleetEvent): boolean {
    return (event.reminders?.length ?? 0) > 0;
  }

  static getResponseDeadline(event: FleetEvent): Date {
    if (event.registrationDeadline) {
      const explicit = new Date(event.registrationDeadline);
      if (!Number.isNaN(explicit.getTime())) return explicit;
    }
    const start = new Date(`${event.date}T${event.startTime || "00:00"}:00`);
    return new Date(start.getTime() - 60 * 60 * 1000);
  }

  static eventHasPlan(eventId: string, trips: Trip[]): boolean {
    return trips.some((t) => t.eventId === eventId && t.status !== "CANCELLED");
  }

  static getEventStart(event: FleetEvent): Date {
    return new Date(`${event.date}T${event.startTime || "00:00"}:00`);
  }

  static isEventDispatchable(
    event: FleetEvent,
    now: Date = new Date(),
  ): boolean {
    return now.getTime() < TripsUtils.getEventStart(event).getTime();
  }

  static getPlanStatus(
    event: FleetEvent,
    trips: Trip[],
    now: Date = new Date(),
  ): PlanStatus {
    const enabled = TripsUtils.notificationsEnabled(event);
    const deadline = TripsUtils.getResponseDeadline(event);
    const deadlinePassed = now.getTime() >= deadline.getTime();
    const eventTrips = trips.filter(
      (t) => t.eventId === event.id && t.status !== "CANCELLED",
    );
    const hasPlan = eventTrips.length > 0;
    const tripCount = eventTrips.length;
    const dispatched = eventTrips.some(
      (t) =>
        Boolean(t.startedAt) ||
        TripsConfig.DISPATCHED_STATUSES.includes(t.status),
    );

    let canGenerate = true;
    let blockedReasonKey: string | undefined;
    if (enabled && !deadlinePassed) {
      canGenerate = false;
      blockedReasonKey = "planner.awaitingresponsesuntil";
    }

    return {
      notificationsEnabled: enabled,
      deadline,
      deadlinePassed,
      hasPlan,
      tripCount,
      dispatched,
      canGenerate,
      blockedReasonKey,
    };
  }

  static sortValue(t: Trip, key: string): unknown {
    if (key === "riders") return Array.isArray(t.stops) ? t.stops.length : 0;
    return t[key as keyof Trip];
  }

  static canShowReplan(event: FleetEvent) {
    if (!event?.date || !event?.endTime) return true;
    const eventEnd = NotificationUtils.eventEndDateTime(event);
    if (!eventEnd) return true;
    const now = Date.now();
    const eventTime = eventEnd.getTime();
    return now <= eventTime;
  }
}
