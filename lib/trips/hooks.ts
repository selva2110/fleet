"use client";

import useSWR, { useSWRConfig } from "swr";
import { getTrips } from "@/app/actions/data";
import { replanTripByEventId as replanTripByEventIdAction } from "@/app/actions/crud";
import {
  generatePlan as generatePlanAction,
  commitPlan as commitPlanAction,
  startTrip as startTripAction,
  cancelTrip as cancelTripAction,
  clearAllTrips as clearAllTripsAction,
  assignDriverToTrip as assignDriverAction,
  replanTripByTripId as replanTripByTripIdAction,
} from "@/app/actions/dispatch";
import { useFleetSession } from "@/components/context/fleet-session-provider";
import { EVENTS_KEY, EVENT_LOG_KEY } from "@/lib/events/hooks";
import { DRIVERS_KEY } from "@/lib/driver/hooks";
import { PlanRecommendation, Trip } from "./types";

export const TRIPS_KEY = "trips";

// Stable reference so callers relying on it (e.g. useMemo/useEffect deps)
// don't re-fire on every render while SWR has no data yet.
const EMPTY_TRIPS: Trip[] = [];

// Live dispatch data — command-center/planner/trips pages want this to poll;
// vehicles/drivers/participants/catalog never mount this hook so they never pay for it.
export function useTrips() {
  const { data, isLoading, mutate } = useSWR<Trip[]>(TRIPS_KEY, getTrips, {
    refreshInterval: 10000,
  });
  return { trips: data ?? EMPTY_TRIPS, isLoading, mutate };
}

export function useDispatchActions() {
  const { mutate } = useSWRConfig();
  const { role } = useFleetSession();

  // Read-only recommendation compute — nothing to invalidate.
  const generatePlan = (eventId: string) => generatePlanAction(eventId, role);

  async function commitPlan(eventId: string, recs: PlanRecommendation[]) {
    await commitPlanAction(eventId, recs, role);
    await Promise.all([mutate(TRIPS_KEY), mutate(EVENTS_KEY), mutate(EVENT_LOG_KEY)]);
  }

  async function cancelTrip(tripId: string) {
    await cancelTripAction(tripId, role);
    await Promise.all([mutate(TRIPS_KEY), mutate(EVENT_LOG_KEY)]);
  }

  async function clearAllTrips() {
    await clearAllTripsAction(role);
    await Promise.all([mutate(TRIPS_KEY), mutate(EVENT_LOG_KEY)]);
  }

  async function startTrip(tripId: string) {
    await startTripAction(tripId, role);
    await Promise.all([mutate(TRIPS_KEY), mutate(EVENT_LOG_KEY)]);
  }

  async function assignDriver(tripId: string, driverId: string) {
    await assignDriverAction(tripId, driverId, role);
    await Promise.all([mutate(TRIPS_KEY), mutate(DRIVERS_KEY), mutate(EVENT_LOG_KEY)]);
  }

  async function replanTripByEventId(eventId: string) {
    await replanTripByEventIdAction(eventId);
    await Promise.all([mutate(TRIPS_KEY), mutate(EVENTS_KEY), mutate(EVENT_LOG_KEY)]);
  }

  async function replanTripByTripId(tripId: string) {
    await replanTripByTripIdAction(tripId);
    await Promise.all([mutate(TRIPS_KEY), mutate(EVENT_LOG_KEY)]);
  }

  return {
    generatePlan,
    commitPlan,
    cancelTrip,
    clearAllTrips,
    startTrip,
    assignDriver,
    replanTripByEventId,
    replanTripByTripId,
  };
}
