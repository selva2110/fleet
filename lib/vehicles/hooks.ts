"use client";

import useSWR, { useSWRConfig } from "swr";
import { getVehicles } from "@/app/actions/data";
import { saveVehicle as saveVehicleAction, deleteVehicle as deleteVehicleAction } from "@/app/actions/crud";
import { useFleetSession } from "@/components/context/fleet-session-provider";
import { Vehicle, VehicleInput } from "./types";

export const VEHICLES_KEY = "vehicles";

const EMPTY_VEHICLES: Vehicle[] = [];

export function useVehicles() {
  const { data, isLoading, mutate } = useSWR<Vehicle[]>(VEHICLES_KEY, getVehicles);
  return { vehicles: data ?? EMPTY_VEHICLES, isLoading, mutate };
}

export function useVehicleMutations() {
  const { mutate } = useSWRConfig();
  const { role } = useFleetSession();

  async function saveVehicle(input: VehicleInput & { id?: string }) {
    await saveVehicleAction(input, role);
    await mutate(VEHICLES_KEY);
  }

  async function deleteVehicle(id: string, name: string) {
    await deleteVehicleAction(id, name, role);
    await mutate(VEHICLES_KEY);
  }

  return { saveVehicle, deleteVehicle };
}
