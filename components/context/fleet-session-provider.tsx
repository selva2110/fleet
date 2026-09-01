"use client";

// Cross-cutting, non-domain state that used to live on FleetProvider:
// the actor role stamped on mutation audit events, and the live-tracking
// simulation toggle. Domain data (vehicles, drivers, trips, ...) now lives in
// per-domain SWR hooks under lib/<domain>/hooks.ts instead of one shared
// snapshot context.

import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from "react";
import { useSWRConfig } from "swr";
import { getTrips, getEventLogRows } from "@/app/actions/data";
import { TRIPS_KEY } from "@/lib/trips/hooks";
import { EVENT_LOG_KEY } from "@/lib/events/hooks";
import type { Role } from "@/lib/types";

interface FleetSessionContextValue {
  role: Role;
  setRole: (r: Role) => void;
  simRunning: boolean;
  toggleSim: () => Promise<void>;
}

const FleetSessionContext = createContext<FleetSessionContextValue | null>(null);

export function FleetSessionProvider({ children }: { children: ReactNode }) {
  const { mutate } = useSWRConfig();
  const [role, setRole] = useState<Role>("dispatcher");
  const [simRunning, setSimRunning] = useState(false);

  const toggleSim = useCallback(async () => {
    setSimRunning((current) => !current);
    const [trips, eventLog] = await Promise.all([getTrips(), getEventLogRows()]);
    await mutate(TRIPS_KEY, trips, { revalidate: false });
    await mutate(EVENT_LOG_KEY, eventLog, { revalidate: false });
  }, [mutate]);

  return (
    <FleetSessionContext.Provider value={{ role, setRole, simRunning, toggleSim }}>
      {children}
    </FleetSessionContext.Provider>
  );
}

export function useFleetSession(): FleetSessionContextValue {
  const ctx = useContext(FleetSessionContext);
  if (!ctx) throw new Error("useFleetSession must be used within FleetSessionProvider");
  return ctx;
}
