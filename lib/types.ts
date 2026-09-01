// Cross-cutting primitives shared across domains. Domain-specific types live
// under lib/<domain>/types.ts; data fetching/mutation lives in
// lib/<domain>/hooks.ts (per-domain SWR hooks) instead of one shared snapshot.

export type Role =
  | "admin"
  | "dispatcher"
  | "operations"
  | "driver"
  | "center"
  | "participant"
  | "caregiver";

export type LatLng = { lat: number; lng: number };

export interface SelectOptions {
  label: string;
  value: string;
}
