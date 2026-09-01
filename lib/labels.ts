import type { Role } from "./types";

export const ROLES: { id: Role; label: string; short: string }[] = [
  { id: "dispatcher", label: "common.dispatcher", short: "common.dispatcher" },
];

// The signed-in dispatcher operating the console.
export const DISPATCHER_NAME = "Cameron Brooks";

/**
 * Human-friendly display name for an activity/event actor role. The dispatcher
 * role resolves to the named operator so activity feeds read as real people.
 */
export function actorDisplayName(role?: string): string {
  switch (role) {
    case "dispatcher":
      return DISPATCHER_NAME;
    case "driver":
      return "common.driver";
    case "participant":
      return "common.actormember";
    case "operations":
      return "user.roleOperations";
    case "admin":
      return "common.actoradministrator";
    case "system":
      return "common.actorsystem";
    default:
      return role ? role.charAt(0).toUpperCase() + role.slice(1) : "common.actorsystem";
  }
}

// --- US unit formatting -------------------------------------------------
// Distances are stored internally in kilometers; the UI displays US units (miles).
const KM_TO_MILES = 0.621371;

export function kmToMiles(km: number): number {
  return km * KM_TO_MILES;
}

/** Format a kilometer value as US miles, e.g. formatMiles(19.7) -> "12.2 mi" */
export function formatMiles(km: number, digits = 1): string {
  const miles = kmToMiles(km).toLocaleString("en-US", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
  return `${miles} mi`;
}

const DAY_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/** Format working-day indices (0=Sun..6=Sat) as "Mon–Fri" style text. */
export function formatShiftDays(days: number[]): string {
  if (days.length === 7) return "driver.everyday";
  if (days.length === 0) return "driver.nodaysset";
  const sorted = [...days].sort();
  const isWeekdays = sorted.length === 5 && sorted.every((d, i) => d === i + 1);
  if (isWeekdays) return "driver.monfri";
  return sorted.map((d) => DAY_SHORT[d]).join(", ");
}
