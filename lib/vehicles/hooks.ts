"use client";

import useSWR, { useSWRConfig } from "swr";
import { getVehicles, getVehicleStats } from "@/app/actions/data";
import {
  saveVehicle as saveVehicleAction,
  deleteVehicle as deleteVehicleAction,
} from "@/app/actions/crud";
import { useFleetSession } from "@/components/context/fleet-session-provider";
import {
  Vehicle,
  VehicleInput,
  VehicleListResponse,
  VehicleQueryParams,
  VehicleStatistics,
} from "./types";
import { ApiResponse } from "../types";

export const VEHICLES_KEY = "vehicles";
export const VEHICLE_STATS_KEY = "vehicle-stats";

const EMPTY_VEHICLES: Vehicle[] = [];

export function useVehicles(params: VehicleQueryParams = {}) {
  const key: [string, VehicleQueryParams?] = [VEHICLES_KEY, params];
  const { data, isLoading, mutate } = useSWR<VehicleListResponse, Error>(
    key,
    async ([, queryParams]: [string, VehicleQueryParams?]) =>
      (await getVehicles(queryParams ?? {})) as VehicleListResponse,
  );
  return {
    vehicles: data?.data ?? EMPTY_VEHICLES,
    pagination: data
      ? {
          page: data.metadata?.pageNumber ?? 0,
          limit: data.metadata?.pageSize ?? 0,
          total: data.metadata?.totalElements ?? 0,
          totalPages: data.metadata?.totalPages ?? 0,
        }
      : undefined,
    isLoading,
    mutate,
  };
}

export function useVehicleStats() {
  const { data, isLoading, error } = useSWR<ApiResponse<VehicleStatistics>>(
    VEHICLE_STATS_KEY,
    getVehicleStats,
  );

  return {
    stats: data?.data,
    isLoading,
    error,
  };
}

function isVehiclesKey(key: unknown) {
  return Array.isArray(key) && key[0] === VEHICLES_KEY;
}

export function useVehicleMutations() {
  const { mutate } = useSWRConfig();
  const { role } = useFleetSession();

  async function saveVehicle(input: VehicleInput & { id?: string }) {
    await saveVehicleAction(input, role);
    await mutate(isVehiclesKey);
    await mutate(VEHICLE_STATS_KEY);
  }

  async function deleteVehicle(id: string, name: string) {
    await deleteVehicleAction(id, name, role);
    await mutate(isVehiclesKey);
    await mutate(VEHICLE_STATS_KEY);
  }

  return { saveVehicle, deleteVehicle };
}
