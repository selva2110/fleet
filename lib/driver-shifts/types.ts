// -----------------------------------------------------------------------------
// Driver Shifts — domain model
//
// This module is a self-contained prototype domain. All data is mock/local
// (see mock-data.ts) and all business logic (recurrence, participant matching,
// conflict detection) lives in logic.ts, deliberately isolated from the UI so
// it can later be swapped for real API calls without touching components.
// -----------------------------------------------------------------------------

export type CalendarView = "daily" | "weekly" | "monthly";

export type RecurrenceType = "one-time" | "daily" | "weekly" | "monthly";

/** Weekday index matches JS Date#getDay(): 0 = Sunday .. 6 = Saturday. */
export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export type MonthlyMode = "day-of-month" | "nth-weekday";

export type NthWeek = 1 | 2 | 3 | 4 | -1; // -1 = last

export interface Recurrence {
  type: RecurrenceType;
  /** Repeat every N days / weeks / months (>= 1). Ignored for one-time. */
  interval: number;
  /** Weekly: the weekdays the shift runs on. */
  weekdays: Weekday[];
  /** Monthly (day-of-month): the calendar day, 1..31. */
  monthDay: number;
  /** Monthly mode selector. */
  monthlyMode: MonthlyMode;
  /** Monthly (nth-weekday): e.g. the "first Monday". */
  nthWeek: NthWeek;
  nthWeekday: Weekday;
}

export type ShiftStatus =
  | "active"
  | "draft"
  | "full"
  | "conflict"
  | "partial"
  | "cancelled";

/** A single participant stop mapped onto a shift, in pickup order. */
export interface ShiftStop {
  participantId: string;
  /** 24h "HH:mm" wall-clock times within the shift window. */
  pickupTime: string;
  dropoffTime: string;
  pickupAddress: string;
  destination: string;
  /** Estimated travel minutes pickup -> dropoff. */
  travelMinutes: number;
}

export interface DriverShift {
  id: string;
  name: string;
  driverId: string | null;
  vehicleId: string | null;
  /** IST calendar dates, "YYYY-MM-DD". endDate bounds the recurrence. */
  startDate: string;
  endDate: string | null;
  /** 24h "HH:mm". */
  startTime: string;
  endTime: string;
  timezone: string;
  capacity: number;
  recurrence: Recurrence;
  /** Ordered participant stops assigned to this shift. */
  stops: ShiftStop[];
  status: ShiftStatus;
  notes?: string;
}

export type DriverShiftInput = Omit<DriverShift, "id" | "status" | "stops"> & {
  id?: string;
  status?: ShiftStatus;
  stops?: ShiftStop[];
};

// --- Mock reference entities (isolated; mirror the app's real shapes loosely) --

export interface ShiftDriver {
  id: string;
  name: string;
  phone: string;
  status: "available" | "on-trip" | "break" | "offline";
  rating: number;
  /** 24h "HH:mm" availability window. */
  shiftStart: string;
  shiftEnd: string;
  /** Weekdays the driver is generally available (getDay index). */
  availableDays: Weekday[];
  /** Miles from a notional depot, used for recommendation distance. */
  distanceMiles: number;
  homeVehicleId: string | null;
}

export type ShiftVehicleType =
  | "Van"
  | "Wheelchair Van"
  | "Sedan"
  | "Medical Transport";

export interface ShiftVehicle {
  id: string;
  name: string;
  type: ShiftVehicleType;
  capacity: number;
  wheelchairAccessible: boolean;
  status: "available" | "assigned" | "maintenance";
}

export interface ShiftParticipant {
  id: string;
  code: string;
  name: string;
  /** Preferred pickup / dropoff wall-clock times, 24h "HH:mm". */
  pickupTime: string;
  dropoffTime: string;
  pickupAddress: string;
  destination: string;
  /** Weekdays this participant needs transport (getDay index). */
  scheduleDays: Weekday[];
  requiredVehicleType: ShiftVehicleType;
  wheelchair: boolean;
  travelMinutes: number;
}

// --- Matching / conflicts -----------------------------------------------------

export interface MatchFactor {
  key: string;
  label: string;
  pass: boolean;
  detail?: string;
}

export interface MatchResult {
  eligible: boolean;
  /** 0..100 deterministic score. */
  score: number;
  factors: MatchFactor[];
  /** First blocking reason when not eligible. */
  reason?: string;
}

export type ConflictType =
  | "shift-overlap"
  | "driver-unavailable"
  | "vehicle-unavailable"
  | "participant-assigned"
  | "capacity-exceeded"
  | "pickup-outside-shift"
  | "dropoff-outside-shift";

export interface Conflict {
  type: ConflictType;
  message: string;
  severity: "error" | "warning";
}

export interface DriverRecommendation {
  driver: ShiftDriver;
  match: MatchResult;
  seatsAvailable: number;
  distanceMiles: number;
}

/** Scope selector used when editing/cancelling a recurring shift. */
export type RecurrenceEditScope = "occurrence" | "following" | "series";
