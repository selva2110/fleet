"use client";

import useSWR, { useSWRConfig } from "swr";
import { getDrivers } from "@/app/actions/data";
import { saveDriver as saveDriverAction, deleteDriver as deleteDriverAction } from "@/app/actions/crud";
import { useFleetSession } from "@/components/context/fleet-session-provider";
import { Driver, DriverInput } from "./types";

export const DRIVERS_KEY = "drivers";

const EMPTY_DRIVERS: Driver[] = [];

export function useDrivers() {
  const { data, isLoading, mutate } = useSWR<Driver[]>(DRIVERS_KEY, getDrivers);
  return { drivers: data ?? EMPTY_DRIVERS, isLoading, mutate };
}

export function useDriverMutations() {
  const { mutate } = useSWRConfig();
  const { role } = useFleetSession();

  async function saveDriver(input: DriverInput & { id?: string }) {
    await saveDriverAction(input, role);
    await mutate(DRIVERS_KEY);
  }

  async function deleteDriver(id: string, name: string) {
    await deleteDriverAction(id, name, role);
    await mutate(DRIVERS_KEY);
  }

  return { saveDriver, deleteDriver };
}
