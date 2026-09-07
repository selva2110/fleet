"use client";

// -----------------------------------------------------------------------------
// Driver Shifts — participant data access
//
// Components read participants through this SWR hook, mirroring
// lib/driver/hooks.ts and lib/vehicles/hooks.ts. There is no real backend for
// shift-scheduling participant fields yet (pickup/dropoff time, destination,
// recurring schedule days), so the fetcher has nothing to call and resolves
// empty — once that service exists, replace fetchShiftParticipants with a
// real lib/api call; the useShiftParticipants surface stays the same.
// -----------------------------------------------------------------------------

import useSWR from "swr";
import type { ShiftParticipant } from "./types";

export const SHIFT_PARTICIPANTS_KEY = "driver-shifts/participants";

const EMPTY_PARTICIPANTS: ShiftParticipant[] = [];

async function fetchShiftParticipants(): Promise<ShiftParticipant[]> {
  return EMPTY_PARTICIPANTS;
}

export function useShiftParticipants() {
  const { data, isLoading, mutate } = useSWR<ShiftParticipant[]>(
    SHIFT_PARTICIPANTS_KEY,
    fetchShiftParticipants,
  );
  return { participants: data ?? EMPTY_PARTICIPANTS, isLoading, mutate };
}
