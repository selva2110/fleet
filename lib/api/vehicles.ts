import "server-only";
import {
  apiDelete,
  apiGet,
  apiPatch,
  apiPost,
  apiPut,
  SERVICE_URLS,
} from "./http";
import {
  Vehicle,
  VehicleCreateInput,
  VehicleListResponse,
  VehicleQueryParams,
  VehicleResponse,
  VehicleStatistics,
  VehicleStatus,
} from "../vehicles/types";
import { ApiResponse, metaData } from "../types";
import { localToUtcIso, utcIsoToLocalDate } from "../date";

const base = () => `${SERVICE_URLS.vehicle()}/api/v1/vehicles`;

// The backend stores these two fields as *time.Time (UTC ISO), while the UI
// works with plain IST calendar dates ("YYYY-MM-DD").
function toVehicle(r: VehicleResponse): Vehicle {
  return {
    ...r,
    insuranceExpirationDate: utcIsoToLocalDate(r.insuranceExpirationDate),
    lastInspectionDate: utcIsoToLocalDate(r.lastInspectionDate),
  };
}

function toVehiclePayload<T extends Partial<Vehicle>>(
  input: T,
): T & {
  insuranceExpirationDate?: string | null;
  lastInspectionDate?: string | null;
} {
  const payload: T & {
    insuranceExpirationDate?: string | null;
    lastInspectionDate?: string | null;
  } = { ...input };
  if ("insuranceExpirationDate" in input) {
    payload.insuranceExpirationDate = localToUtcIso(
      input.insuranceExpirationDate,
    );
  }
  if ("lastInspectionDate" in input) {
    payload.lastInspectionDate = localToUtcIso(input.lastInspectionDate);
  }
  return payload;
}

export async function listVehicles(
  params: VehicleQueryParams,
): Promise<VehicleListResponse> {
  const searchParams = new URLSearchParams();
  if (params.page !== undefined) {
    searchParams.set("page", String(params.page));
  }
  if (params.limit !== undefined) {
    searchParams.set("limit", String(params.limit));
  }
  if (params.search) {
    searchParams.set("search", params.search);
  }
  if (params.sortBy) {
    searchParams.set("sortBy", params.sortBy);
  }
  if (params.sortOrder) {
    searchParams.set("sortOrder", params.sortOrder);
  }
  if (params.vehicleStatus?.length) {
    searchParams.set("status", params.vehicleStatus.join(","));
  }
  if (params.vehicleFuel?.length) {
    searchParams.set("fuel", params.vehicleFuel.join(","));
  }
  if (params.vehicleMaintenanceStatus?.length) {
    searchParams.set(
      "maintenanceStatus",
      params.vehicleMaintenanceStatus.join(","),
    );
  }
  if (params.vehicleCapacity?.length) {
    searchParams.set("capacity", params.vehicleCapacity.join(","));
  }
  if (params.vehicleType?.length) {
    searchParams.set("vehicleType", params.vehicleType.join(","));
  }
  const query = searchParams.toString();
  console.log(`${base()}${query ? `?${query}` : ""}`);
  const res = await apiGet<ApiResponse<VehicleResponse[]> & { metadata: metaData }>(
    `${base()}${query ? `?${query}` : ""}`,
  );
  return { ...res, data: res.data.map(toVehicle) };
}

export async function getVehicle(id: string): Promise<Vehicle> {
  return toVehicle(await apiGet<VehicleResponse>(`${base()}/${id}`));
}

export async function createVehicle(
  input: VehicleCreateInput,
): Promise<Vehicle> {
  return toVehicle(
    await apiPost<VehicleResponse>(base(), toVehiclePayload(input)),
  );
}

export async function updateVehicle(
  id: string,
  input: Partial<Omit<Vehicle, "id">>,
): Promise<Vehicle> {
  return toVehicle(
    await apiPut<VehicleResponse>(`${base()}/${id}`, toVehiclePayload(input)),
  );
}

export async function deleteVehicle(id: string): Promise<void> {
  await apiDelete(`${base()}/${id}`);
}

export async function updateVehicleStatus(
  id: string,
  status: VehicleStatus,
): Promise<Vehicle> {
  return await apiPatch<VehicleResponse>(`${base()}/${id}/status`, { status });
}

export async function getVehicleStatistics(): Promise<
  ApiResponse<VehicleStatistics>
> {
  const res = await apiGet<ApiResponse<VehicleStatistics>>(
    `${base()}/statistics`,
  );
  return res;
}
