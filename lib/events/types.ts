import { LatLng } from "../types";

export interface FleetEvent {
  id: string;
  name: string;
  type: EventType;
  centerId: string;
  date: string;
  startTime: string;
  endTime: string;
  expectedAttendance: number;
  participantIds: string[];
  status: EventStatus;
  // When true the event needs both an outbound (home -> center) and a return
  // (center -> home) journey. Transport is assigned for both legs together.
  roundTrip?: boolean;
  // Time the return leg departs the center (only meaningful when roundTrip).
  returnTime?: string | null;
  // ISO datetime after which SMS responses are no longer accepted. When unset,
  // the app falls back to one hour before the event start time.
  registrationDeadline?: string | null;
  reminders?: EventReminder[];
  tripCreationFailedReason?: string;
}

export type EventType =
  | "Dialysis Session"
  | "Clinical Appointment"
  | "Vaccination Camp"
  | "Community Program"
  | "Therapy Session"
  | "Rehabilitation Session"
  | "Health Screening";

export type EventStatus =
  | "draft"
  | "scheduled"
  | "planning"
  | "active"
  | "completed"
  | "registered"
  | "offline"
  | "available";

export interface EventReminder {
  id: string;
  offsetMinutes: number;
  scheduledAt: string;
  sent: boolean;
}

export type CenterType =
  | "Hospital"
  | "Clinic"
  | "Dialysis Center"
  | "Rehabilitation Center"
  | "Community Hall"
  | "Senior Care Center"
  | "Therapy Center";

export interface Center {
  id: string;
  name: string;
  type: CenterType;
  address: string;
  location: LatLng;
  operatingHours: string;
  capacity: number;
}

export interface CenterResponse extends Center {
  createdAt: string;
  updatedAt: string;
}

export interface CenterListResponse {
  data: CenterResponse[];
  total: number;
}

export type EventInput = Omit<FleetEvent, "id">;

export interface SeedMealRun {
  id: string;
  runNumber: string;
  centerId: string;
  vehicleId: string;
  driverId: string;
  departTime: string;
  mealType: "Breakfast" | "Lunch" | "Dinner";
  participantIds: string[];
  status:
    | "scheduled"
    | "preparing"
    | "loaded"
    | "en-route"
    | "delivering"
    | "completed";
  progress: number;
}

export interface DomainEvent {
  id: number;
  eventType: DomainEventType;
  aggregateType: AggregateType;
  aggregateId: string;
  actorRole: string;
  summary: string;
  payload: Record<string, unknown>;
  createdAt: string;
}

export interface EmitInput {
  eventType: DomainEventType;
  aggregateType: AggregateType;
  aggregateId?: string;
  actorRole?: string;
  summary: string;
  payload?: Record<string, unknown>;
}

// Domain event catalogue for the event-driven architecture.
// Every state change in the platform is expressed as a domain event that is
// (1) appended to the `event_log` table in Postgres for debugging/audit and
// (2) used to drive side effects. This is the single source of truth for the
// event vocabulary.

export type DomainEventType =
  // Entity lifecycle
  | "event.created"
  | "event.updated"
  | "event.deleted"
  | "event.reminder.sent"
  | "event.trips.replanned"
  | "notification.sent"
  | "notification.delivered"
  | "notification.failed"
  | "notification.response"
  | "participant.created"
  | "participant.updated"
  | "participant.deleted"
  | "participant.medReport.created"
  | "participant.medreport.updated"
  | "vehicle.created"
  | "vehicle.updated"
  | "vehicle.deleted"
  | "driver.created"
  | "driver.updated"
  | "driver.deleted"
  // Dispatch lifecycle
  | "plan.generated"
  | "plan.committed"
  | "plan.blocked"
  | "trip.created"
  | "trip.dispatched"
  | "trip.driver_assigned"
  | "trip.started"
  | "trip.start_blocked"
  | "trip.pickup_reached"
  | "trip.participant_picked_up"
  | "trip.onboard"
  | "trip.arrived"
  | "trip.completed"
  | "trip.cancelled"
  | "trips.cleared_all"
  // Live tracking
  | "trip.location_updated"
  | "vehicle.location_updated"
  // Meal delivery
  | "meal.created"
  | "meal.started"
  | "meal.updated"
  | "meal.cancelled"
  | "meal.delivered"
  // System
  | "simulation.started"
  | "simulation.stopped"
  | "system.seeded"
  | "system.reset"
  //Care Item
  | "careItem.created"
  | "careItem.updated"
  | "careItem.deleted"
  //Care Item Type
  | "careItemType.created"
  | "careItemType.updated"
  | "careItemType.deleted"
  //User
  | "user.created"
  | "user.updated"
  | "user.deleted";

export type AggregateType =
  | "event"
  | "participant"
  | "vehicle"
  | "driver"
  | "trip"
  | "plan"
  | "meal"
  | "system"
  | "careItem"
  | "careItemType"
  | "user";

export type EventsTab = "events" | "meal-delivery" | "catalog";