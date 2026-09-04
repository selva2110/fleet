// -----------------------------------------------------------------------------
// Driver Shifts — pure business logic (isolated from UI)
//
// Recurrence expansion, participant matching, match scoring and conflict
// detection all live here as deterministic pure functions. Swap the mock
// callers for API responses later; these signatures can stay.
// -----------------------------------------------------------------------------

import type {
  Conflict,
  DriverRecommendation,
  DriverShift,
  MatchFactor,
  MatchResult,
  Recurrence,
  ShiftDriver,
  ShiftParticipant,
  ShiftStop,
  ShiftVehicle,
  Weekday,
} from "./types";
import { SHIFT_DRIVERS, SHIFT_VEHICLES } from "./mock-data";

const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const WEEKDAY_FULL = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const NTH_LABELS: Record<number, string> = { 1: "First", 2: "Second", 3: "Third", 4: "Fourth", [-1]: "Last" };

// --- time helpers ------------------------------------------------------------

/** "HH:mm" -> minutes since midnight. */
export function toMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
}

export function minutesToTime(mins: number): string {
  const clamped = ((mins % 1440) + 1440) % 1440;
  const h = Math.floor(clamped / 60);
  const m = clamped % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export function to12h(time: string): string {
  const [hStr, mStr] = time.split(":");
  const h = Number(hStr);
  const suffix = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 || 12;
  return `${h12}:${(mStr ?? "00").padStart(2, "0")} ${suffix}`;
}

export function isoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function parseISO(date: string): Date {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

export function addDays(date: string, n: number): string {
  const d = parseISO(date);
  d.setDate(d.getDate() + n);
  return isoDate(d);
}

export function startOfWeek(date: string): string {
  const d = parseISO(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return isoDate(d);
}

/** Minutes overlap between [aStart,aEnd) and [bStart,bEnd) in the same day. */
export function overlapMinutes(aStart: number, aEnd: number, bStart: number, bEnd: number): number {
  return Math.max(0, Math.min(aEnd, bEnd) - Math.max(aStart, bStart));
}

// --- recurrence --------------------------------------------------------------

/** Which weekday ordinal (1st, 2nd, ... or -1 last) a date is within its month. */
function nthWeekOfMonth(d: Date): number {
  return Math.ceil(d.getDate() / 7);
}
function isLastWeekdayOfMonth(d: Date): boolean {
  const test = new Date(d);
  test.setDate(test.getDate() + 7);
  return test.getMonth() !== d.getMonth();
}

/** Does a shift occur on the given calendar date, per its recurrence + range? */
export function shiftOccursOnDate(shift: DriverShift, date: string): boolean {
  if (shift.status === "cancelled") return false;
  if (date < shift.startDate) return false;
  if (shift.endDate && date > shift.endDate) return false;

  const d = parseISO(date);
  const r = shift.recurrence;

  switch (r.type) {
    case "one-time":
      return date === shift.startDate;
    case "daily": {
      const diffDays = Math.round((d.getTime() - parseISO(shift.startDate).getTime()) / 86400000);
      return diffDays >= 0 && diffDays % Math.max(1, r.interval) === 0;
    }
    case "weekly": {
      if (!r.weekdays.includes(d.getDay() as Weekday)) return false;
      const weeks = Math.floor(
        (parseISO(startOfWeek(date)).getTime() - parseISO(startOfWeek(shift.startDate)).getTime()) / (7 * 86400000),
      );
      return weeks >= 0 && weeks % Math.max(1, r.interval) === 0;
    }
    case "monthly": {
      if (r.monthlyMode === "day-of-month") return d.getDate() === r.monthDay;
      if (d.getDay() !== r.nthWeekday) return false;
      if (r.nthWeek === -1) return isLastWeekdayOfMonth(d);
      return nthWeekOfMonth(d) === r.nthWeek;
    }
    default:
      return false;
  }
}

/** All dates in [rangeStart, rangeEnd] (inclusive) the shift occurs on. */
export function expandOccurrences(shift: DriverShift, rangeStart: string, rangeEnd: string): string[] {
  const out: string[] = [];
  let cursor = rangeStart;
  let guard = 0;
  while (cursor <= rangeEnd && guard < 400) {
    if (shiftOccursOnDate(shift, cursor)) out.push(cursor);
    cursor = addDays(cursor, 1);
    guard += 1;
  }
  return out;
}

/** Human-readable recurrence sentence for the summary line. */
export function describeRecurrence(r: Recurrence, startDate: string, endDate: string | null): string {
  const from = formatLongDate(startDate);
  const through = endDate ? ` through ${formatLongDate(endDate)}` : "";
  const every = r.interval > 1 ? `${r.interval} ` : "";

  switch (r.type) {
    case "one-time":
      return `One time on ${from}`;
    case "daily":
      return `Repeats every ${every}day${r.interval > 1 ? "s" : ""} from ${from}${through}`;
    case "weekly": {
      const days = [...r.weekdays].sort((a, b) => a - b);
      const label = describeWeekdays(days);
      return `Repeats every ${every}week${r.interval > 1 ? "s" : ""} on ${label} from ${from}${through}`;
    }
    case "monthly": {
      if (r.monthlyMode === "day-of-month") {
        return `Repeats on day ${r.monthDay} of every ${every}month${r.interval > 1 ? "s" : ""} from ${from}${through}`;
      }
      return `Repeats on the ${NTH_LABELS[r.nthWeek]} ${WEEKDAY_FULL[r.nthWeekday]} of every ${every}month${r.interval > 1 ? "s" : ""} from ${from}${through}`;
    }
    default:
      return "";
  }
}

export function describeRecurrenceShort(r: Recurrence): string {
  switch (r.type) {
    case "one-time":
      return "One time";
    case "daily":
      return r.interval > 1 ? `Every ${r.interval} days` : "Daily";
    case "weekly":
      return describeWeekdays([...r.weekdays].sort((a, b) => a - b));
    case "monthly":
      return r.monthlyMode === "day-of-month"
        ? `Monthly · day ${r.monthDay}`
        : `Monthly · ${NTH_LABELS[r.nthWeek]} ${WEEKDAY_LABELS[r.nthWeekday]}`;
    default:
      return "";
  }
}

function describeWeekdays(days: number[]): string {
  if (days.length === 0) return "no days";
  const isMonFri = days.length === 5 && [1, 2, 3, 4, 5].every((d) => days.includes(d));
  if (isMonFri) return "Monday through Friday";
  const isEveryDay = days.length === 7;
  if (isEveryDay) return "every day";
  return days.map((d) => WEEKDAY_LABELS[d]).join(", ");
}

export function formatLongDate(date: string): string {
  return parseISO(date).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}

// --- participant matching ----------------------------------------------------

/**
 * Deterministic candidate matching. Produces a 0-100 score and a factor
 * breakdown. A single blocking factor (schedule/time/capacity) makes a
 * participant ineligible with a clear reason.
 */
export function matchParticipantToShift(
  participant: ShiftParticipant,
  shift: DriverShift,
  vehicle: ShiftVehicle | null,
  driver: ShiftDriver | null,
  occupiedSeats: number,
): MatchResult {
  const shiftStart = toMinutes(shift.startTime);
  const shiftEnd = toMinutes(shift.endTime);
  const pickup = toMinutes(participant.pickupTime);
  const dropoff = toMinutes(participant.dropoffTime);

  const factors: MatchFactor[] = [];

  // Schedule match: shift must run on at least one of participant's days.
  const shiftDays = shift.recurrence.type === "weekly" ? shift.recurrence.weekdays : [0, 1, 2, 3, 4, 5, 6];
  const scheduleOverlap = participant.scheduleDays.filter((d) => shiftDays.includes(d));
  const scheduleMatch = scheduleOverlap.length > 0;
  factors.push({
    key: "schedule",
    label: "Schedule Match",
    pass: scheduleMatch,
    detail: scheduleMatch ? undefined : "Participant days fall outside shift days",
  });

  // Time match: pickup + dropoff inside the shift window.
  const pickupInside = pickup >= shiftStart && pickup <= shiftEnd;
  const dropoffInside = dropoff >= shiftStart && dropoff <= shiftEnd;
  const timeMatch = pickupInside && dropoffInside;
  factors.push({
    key: "time",
    label: "Time Match",
    pass: timeMatch,
    detail: !pickupInside
      ? "Pickup occurs outside the driver's shift"
      : !dropoffInside
        ? "Drop-off occurs outside the driver's shift"
        : undefined,
  });

  // Driver availability.
  const driverOk = !!driver && driver.status !== "offline";
  factors.push({
    key: "driver",
    label: "Driver Availability",
    pass: driverOk,
    detail: driverOk ? undefined : driver ? "Driver is offline" : "No driver assigned",
  });

  // Vehicle capacity.
  const capacityOk = occupiedSeats < shift.capacity;
  factors.push({
    key: "capacity",
    label: "Vehicle Capacity",
    pass: capacityOk,
    detail: capacityOk ? undefined : "Shift is at full capacity",
  });

  // Route / vehicle compatibility (wheelchair need vs vehicle capability).
  const routeOk = !participant.wheelchair || !!vehicle?.wheelchairAccessible;
  factors.push({
    key: "route",
    label: "Route Compatibility",
    pass: routeOk,
    detail: routeOk ? undefined : "Requires a wheelchair-accessible vehicle",
  });

  // Blocking factors: schedule, time, capacity. Driver/route are soft-ish but
  // route with a wheelchair mismatch also blocks.
  const blocking = factors.find(
    (f) => !f.pass && (f.key === "schedule" || f.key === "time" || f.key === "capacity" || f.key === "route"),
  );

  const passCount = factors.filter((f) => f.pass).length;
  const baseScore = Math.round((passCount / factors.length) * 100);

  // Reward tight time fit for a little score texture (deterministic).
  const windowFit = shiftEnd > shiftStart ? 1 - Math.abs(pickup - shiftStart) / (shiftEnd - shiftStart) : 0;
  const score = blocking ? Math.min(baseScore, 55) : Math.max(70, Math.min(99, baseScore - 5 + Math.round(windowFit * 12)));

  return {
    eligible: !blocking,
    score,
    factors,
    reason: blocking?.detail,
  };
}

/** Seats currently used by a shift's stops. */
export function seatsUsed(shift: DriverShift): number {
  return shift.stops.length;
}

// --- conflict detection ------------------------------------------------------

export function detectShiftConflicts(shift: DriverShift, allShifts: DriverShift[]): Conflict[] {
  const conflicts: Conflict[] = [];
  const start = toMinutes(shift.startTime);
  const end = toMinutes(shift.endTime);

  // Driver double-booking: another active shift on shared days that overlaps.
  if (shift.driverId) {
    for (const other of allShifts) {
      if (other.id === shift.id || other.driverId !== shift.driverId) continue;
      if (other.status === "cancelled") continue;
      if (!sharesAnyDay(shift, other)) continue;
      const oStart = toMinutes(other.startTime);
      const oEnd = toMinutes(other.endTime);
      if (overlapMinutes(start, end, oStart, oEnd) > 0) {
        conflicts.push({
          type: "shift-overlap",
          severity: "error",
          message: `Driver already has "${other.name}" from ${to12h(other.startTime)} - ${to12h(other.endTime)} on overlapping days.`,
        });
        break;
      }
    }
  }

  // Vehicle double-booking.
  if (shift.vehicleId) {
    for (const other of allShifts) {
      if (other.id === shift.id || other.vehicleId !== shift.vehicleId) continue;
      if (other.status === "cancelled") continue;
      if (!sharesAnyDay(shift, other)) continue;
      const oStart = toMinutes(other.startTime);
      const oEnd = toMinutes(other.endTime);
      if (overlapMinutes(start, end, oStart, oEnd) > 0) {
        conflicts.push({
          type: "vehicle-unavailable",
          severity: "warning",
          message: `Vehicle ${shift.vehicleId} is also booked on "${other.name}" during an overlapping window.`,
        });
        break;
      }
    }
  }

  // Capacity.
  if (shift.stops.length > shift.capacity) {
    conflicts.push({
      type: "capacity-exceeded",
      severity: "error",
      message: `Assigned ${shift.stops.length} participants but capacity is ${shift.capacity}.`,
    });
  }

  // Stops outside the shift window.
  for (const stop of shift.stops) {
    if (toMinutes(stop.pickupTime) < start) {
      conflicts.push({ type: "pickup-outside-shift", severity: "error", message: `Pickup for a stop (${to12h(stop.pickupTime)}) is before the shift starts.` });
      break;
    }
    if (toMinutes(stop.dropoffTime) > end) {
      conflicts.push({ type: "dropoff-outside-shift", severity: "error", message: `Drop-off for a stop (${to12h(stop.dropoffTime)}) is after the shift ends.` });
      break;
    }
  }

  return conflicts;
}

function sharesAnyDay(a: DriverShift, b: DriverShift): boolean {
  const aDays = a.recurrence.type === "weekly" ? a.recurrence.weekdays : [0, 1, 2, 3, 4, 5, 6];
  const bDays = b.recurrence.type === "weekly" ? b.recurrence.weekdays : [0, 1, 2, 3, 4, 5, 6];
  return aDays.some((d) => bDays.includes(d));
}

/** Can this participant be added to this stop-set without conflict? */
export function assignmentConflict(
  participant: ShiftParticipant,
  shift: DriverShift,
): Conflict | null {
  if (shift.stops.some((s) => s.participantId === participant.id)) {
    return { type: "participant-assigned", severity: "warning", message: `${participant.name} is already assigned to this shift.` };
  }
  if (shift.stops.length >= shift.capacity) {
    return { type: "capacity-exceeded", severity: "error", message: `Shift is at full capacity (${shift.capacity}).` };
  }
  const start = toMinutes(shift.startTime);
  const end = toMinutes(shift.endTime);
  if (toMinutes(participant.pickupTime) < start) {
    return { type: "pickup-outside-shift", severity: "error", message: "Pickup occurs before the shift starts." };
  }
  if (toMinutes(participant.dropoffTime) > end) {
    return { type: "dropoff-outside-shift", severity: "error", message: "Drop-off occurs after the shift ends." };
  }
  return null;
}

// --- driver recommendations --------------------------------------------------

export function recommendDrivers(
  participant: ShiftParticipant,
  shifts: DriverShift[],
): DriverRecommendation[] {
  return SHIFT_DRIVERS.map((driver) => {
    // Find the driver's shift that best fits, else evaluate against a synthetic
    // window from the driver's own availability.
    const driverShift = shifts.find((s) => s.driverId === driver.id && s.status !== "cancelled");
    const vehicle = SHIFT_VEHICLES.find((v) => v.id === (driverShift?.vehicleId ?? driver.homeVehicleId)) ?? null;
    const syntheticShift: DriverShift =
      driverShift ??
      ({
        id: `virtual-${driver.id}`,
        name: "Availability",
        driverId: driver.id,
        vehicleId: driver.homeVehicleId,
        startDate: isoDate(new Date()),
        endDate: null,
        startTime: driver.shiftStart,
        endTime: driver.shiftEnd,
        timezone: "America/Chicago",
        capacity: vehicle?.capacity ?? 4,
        recurrence: { type: "weekly", interval: 1, weekdays: driver.availableDays, monthDay: 1, monthlyMode: "day-of-month", nthWeek: 1, nthWeekday: 1 },
        stops: [],
        status: "active",
      } as DriverShift);

    const occupied = driverShift ? driverShift.stops.length : 0;
    const match = matchParticipantToShift(participant, syntheticShift, vehicle, driver, occupied);
    const seatsAvailable = (vehicle?.capacity ?? syntheticShift.capacity) - occupied;

    return { driver, match, seatsAvailable, distanceMiles: driver.distanceMiles };
  })
    .sort((a, b) => {
      if (a.match.eligible !== b.match.eligible) return a.match.eligible ? -1 : 1;
      if (b.match.score !== a.match.score) return b.match.score - a.match.score;
      return a.distanceMiles - b.distanceMiles;
    });
}

/** Build a stop from a participant (used when assigning). */
export function stopFromParticipant(p: ShiftParticipant): ShiftStop {
  return {
    participantId: p.id,
    pickupTime: p.pickupTime,
    dropoffTime: p.dropoffTime,
    pickupAddress: p.pickupAddress,
    destination: p.destination,
    travelMinutes: p.travelMinutes,
  };
}

/** Recompute a status from a shift's assignment + conflict state. */
export function deriveStatus(shift: DriverShift, allShifts: DriverShift[]): DriverShift["status"] {
  if (shift.status === "cancelled" || shift.status === "draft") return shift.status;
  const conflicts = detectShiftConflicts(shift, allShifts);
  if (conflicts.some((c) => c.severity === "error")) return "conflict";
  if (shift.stops.length === 0) return "active";
  if (shift.stops.length >= shift.capacity) return "full";
  return "partial";
}
