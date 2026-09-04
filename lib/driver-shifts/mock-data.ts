// -----------------------------------------------------------------------------
// Driver Shifts — isolated mock data
//
// Everything here is fake, seeded, and deliberately kept in one file so it can
// be replaced by real API services later without touching UI or logic. No real
// patient / participant information is used.
// -----------------------------------------------------------------------------

import type {
  DriverShift,
  ShiftDriver,
  ShiftParticipant,
  ShiftVehicle,
  Weekday,
} from "./types";

const MON_FRI: Weekday[] = [1, 2, 3, 4, 5];
const MON_WED_FRI: Weekday[] = [1, 3, 5];
const TUE_THU: Weekday[] = [2, 4];

export const SHIFT_VEHICLES: ShiftVehicle[] = [
  { id: "VAN-102", name: "VAN-102", type: "Wheelchair Van", capacity: 8, wheelchairAccessible: true, status: "available" },
  { id: "VAN-103", name: "VAN-103", type: "Van", capacity: 10, wheelchairAccessible: false, status: "available" },
  { id: "VAN-105", name: "VAN-105", type: "Wheelchair Van", capacity: 6, wheelchairAccessible: true, status: "assigned" },
  { id: "SEDAN-201", name: "SEDAN-201", type: "Sedan", capacity: 3, wheelchairAccessible: false, status: "available" },
  { id: "MTV-301", name: "MTV-301", type: "Medical Transport", capacity: 4, wheelchairAccessible: true, status: "maintenance" },
];

export const SHIFT_DRIVERS: ShiftDriver[] = [
  { id: "DRV-01", name: "James Carter", phone: "(713) 555-0101", status: "available", rating: 4.8, shiftStart: "06:00", shiftEnd: "14:00", availableDays: MON_FRI, distanceMiles: 4.2, homeVehicleId: "VAN-102" },
  { id: "DRV-02", name: "Maria Lopez", phone: "(713) 555-0102", status: "available", rating: 4.6, shiftStart: "08:00", shiftEnd: "16:00", availableDays: MON_FRI, distanceMiles: 6.7, homeVehicleId: "VAN-103" },
  { id: "DRV-03", name: "Robert Smith", phone: "(713) 555-0103", status: "on-trip", rating: 4.3, shiftStart: "10:00", shiftEnd: "18:00", availableDays: MON_WED_FRI, distanceMiles: 8.1, homeVehicleId: "VAN-105" },
  { id: "DRV-04", name: "David Wilson", phone: "(713) 555-0104", status: "available", rating: 4.9, shiftStart: "07:00", shiftEnd: "15:00", availableDays: MON_FRI, distanceMiles: 3.4, homeVehicleId: "SEDAN-201" },
  { id: "DRV-05", name: "Maria Johnson", phone: "(713) 555-0105", status: "break", rating: 4.5, shiftStart: "12:00", shiftEnd: "20:00", availableDays: TUE_THU, distanceMiles: 11.9, homeVehicleId: null },
];

export const SHIFT_PARTICIPANTS: ShiftParticipant[] = [
  { id: "P-1024", code: "P-1024", name: "Alice Nguyen", pickupTime: "08:00", dropoffTime: "09:00", pickupAddress: "123 Main Street", destination: "Memorial Hospital", scheduleDays: MON_FRI, requiredVehicleType: "Wheelchair Van", wheelchair: true, travelMinutes: 45 },
  { id: "P-1041", code: "P-1041", name: "Robert Diaz", pickupTime: "09:30", dropoffTime: "10:30", pickupAddress: "45 Oak Street", destination: "Houston Medical Center", scheduleDays: MON_WED_FRI, requiredVehicleType: "Van", wheelchair: false, travelMinutes: 40 },
  { id: "P-1088", code: "P-1088", name: "Grace Miller", pickupTime: "07:15", dropoffTime: "08:00", pickupAddress: "980 Pine Avenue", destination: "Sunrise Dialysis", scheduleDays: MON_FRI, requiredVehicleType: "Wheelchair Van", wheelchair: true, travelMinutes: 30 },
  { id: "P-1091", code: "P-1091", name: "Samuel Reed", pickupTime: "10:00", dropoffTime: "11:00", pickupAddress: "12 Cedar Court", destination: "Westside Clinic", scheduleDays: TUE_THU, requiredVehicleType: "Sedan", wheelchair: false, travelMinutes: 35 },
  { id: "P-1102", code: "P-1102", name: "Linda Park", pickupTime: "11:30", dropoffTime: "12:15", pickupAddress: "77 Maple Drive", destination: "Memorial Hospital", scheduleDays: MON_FRI, requiredVehicleType: "Van", wheelchair: false, travelMinutes: 30 },
  { id: "P-1115", code: "P-1115", name: "Henry Adams", pickupTime: "13:00", dropoffTime: "14:00", pickupAddress: "301 Birch Lane", destination: "Cardiology Center", scheduleDays: MON_WED_FRI, requiredVehicleType: "Medical Transport", wheelchair: true, travelMinutes: 50 },
  { id: "P-1120", code: "P-1120", name: "Nancy Cruz", pickupTime: "08:45", dropoffTime: "09:30", pickupAddress: "58 Elm Street", destination: "Sunrise Dialysis", scheduleDays: MON_FRI, requiredVehicleType: "Wheelchair Van", wheelchair: true, travelMinutes: 30 },
  { id: "P-1133", code: "P-1133", name: "George Bell", pickupTime: "15:00", dropoffTime: "16:00", pickupAddress: "410 Walnut Way", destination: "Rehab Institute", scheduleDays: MON_FRI, requiredVehicleType: "Van", wheelchair: false, travelMinutes: 40 },
  { id: "P-1147", code: "P-1147", name: "Olivia Turner", pickupTime: "09:00", dropoffTime: "09:45", pickupAddress: "22 Spruce Blvd", destination: "Westside Clinic", scheduleDays: TUE_THU, requiredVehicleType: "Sedan", wheelchair: false, travelMinutes: 25 },
  { id: "P-1158", code: "P-1158", name: "Frank Wright", pickupTime: "07:30", dropoffTime: "08:30", pickupAddress: "63 Ash Street", destination: "Memorial Hospital", scheduleDays: MON_FRI, requiredVehicleType: "Wheelchair Van", wheelchair: true, travelMinutes: 45 },
];

// Weekday-anchored dates so the seeded shifts always land on the current week
// regardless of when the prototype is opened.
function isoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Monday of the current week (local). */
function currentMonday(): Date {
  const now = new Date();
  const day = now.getDay(); // 0..6
  const diff = day === 0 ? -6 : 1 - day; // back to Monday
  const mon = new Date(now);
  mon.setDate(now.getDate() + diff);
  mon.setHours(0, 0, 0, 0);
  return mon;
}

const monday = currentMonday();
const WEEK_START = isoDate(monday);
const seriesEnd = new Date(monday);
seriesEnd.setMonth(seriesEnd.getMonth() + 3);
const SERIES_END = isoDate(seriesEnd);

function weekly(weekdays: Weekday[]) {
  return {
    type: "weekly" as const,
    interval: 1,
    weekdays,
    monthDay: 1,
    monthlyMode: "day-of-month" as const,
    nthWeek: 1 as const,
    nthWeekday: 1 as Weekday,
  };
}

export const SEED_SHIFTS: DriverShift[] = [
  {
    id: "SHF-1001",
    name: "Morning Dialysis Run",
    driverId: "DRV-01",
    vehicleId: "VAN-102",
    startDate: WEEK_START,
    endDate: SERIES_END,
    startTime: "06:00",
    endTime: "14:00",
    timezone: "America/Chicago",
    capacity: 8,
    recurrence: weekly(MON_FRI),
    status: "partial",
    stops: [
      { participantId: "P-1088", pickupTime: "07:15", dropoffTime: "08:00", pickupAddress: "980 Pine Avenue", destination: "Sunrise Dialysis", travelMinutes: 30 },
      { participantId: "P-1024", pickupTime: "08:00", dropoffTime: "09:00", pickupAddress: "123 Main Street", destination: "Memorial Hospital", travelMinutes: 45 },
    ],
  },
  {
    id: "SHF-1002",
    name: "Midday Clinic Circuit",
    driverId: "DRV-02",
    vehicleId: "VAN-103",
    startDate: WEEK_START,
    endDate: SERIES_END,
    startTime: "08:00",
    endTime: "16:00",
    timezone: "America/Chicago",
    capacity: 10,
    recurrence: weekly(MON_WED_FRI),
    status: "active",
    stops: [
      { participantId: "P-1041", pickupTime: "09:30", dropoffTime: "10:30", pickupAddress: "45 Oak Street", destination: "Houston Medical Center", travelMinutes: 40 },
      { participantId: "P-1102", pickupTime: "11:30", dropoffTime: "12:15", pickupAddress: "77 Maple Drive", destination: "Memorial Hospital", travelMinutes: 30 },
    ],
  },
  {
    id: "SHF-1003",
    name: "Afternoon Rehab Shuttle",
    driverId: "DRV-03",
    vehicleId: "VAN-105",
    startDate: WEEK_START,
    endDate: SERIES_END,
    startTime: "10:00",
    endTime: "18:00",
    timezone: "America/Chicago",
    capacity: 6,
    recurrence: weekly(TUE_THU),
    status: "conflict",
    stops: [
      { participantId: "P-1115", pickupTime: "13:00", dropoffTime: "14:00", pickupAddress: "301 Birch Lane", destination: "Cardiology Center", travelMinutes: 50 },
    ],
  },
  {
    id: "SHF-1004",
    name: "Early Bird Transport",
    driverId: "DRV-04",
    vehicleId: "SEDAN-201",
    startDate: WEEK_START,
    endDate: SERIES_END,
    startTime: "07:00",
    endTime: "15:00",
    timezone: "America/Chicago",
    capacity: 3,
    recurrence: weekly(MON_FRI),
    status: "active",
    stops: [
      { participantId: "P-1147", pickupTime: "09:00", dropoffTime: "09:45", pickupAddress: "22 Spruce Blvd", destination: "Westside Clinic", travelMinutes: 25 },
    ],
  },
  {
    id: "SHF-1005",
    name: "Wheelchair Priority Line",
    driverId: null,
    vehicleId: null,
    startDate: WEEK_START,
    endDate: SERIES_END,
    startTime: "06:30",
    endTime: "12:30",
    timezone: "America/Chicago",
    capacity: 6,
    recurrence: weekly(MON_FRI),
    status: "draft",
    stops: [],
  },
];

export function findDriver(id: string | null | undefined) {
  return SHIFT_DRIVERS.find((d) => d.id === id) ?? null;
}
export function findVehicle(id: string | null | undefined) {
  return SHIFT_VEHICLES.find((v) => v.id === id) ?? null;
}
export function findParticipant(id: string | null | undefined) {
  return SHIFT_PARTICIPANTS.find((p) => p.id === id) ?? null;
}
