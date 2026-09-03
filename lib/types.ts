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

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

export interface ListQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

export interface metaData {
  pageNumber: number;
  totalPages: number;
  totalElements: number;
  pageSize: number;
}
