'use client';

import { create } from 'zustand';
import type { LiveVehicleState } from './types';

interface FleetStore {
  liveVehicles: Record<string, LiveVehicleState>;
  selectedVehicleId: string | null;
  selectedTripId: string | null;
  simRunning: boolean;
  setLiveVehicle: (id: string, state: LiveVehicleState) => void;
  removeLiveVehicle: (id: string) => void;
  selectVehicle: (id: string | null) => void;
  selectTrip: (id: string | null) => void;
  setSimRunning: (running: boolean) => void;
  resetLive: () => void;
}

export const useFleetStore = create<FleetStore>((set) => ({
  liveVehicles: {},
  selectedVehicleId: null,
  selectedTripId: null,
  simRunning: true,
  setLiveVehicle: (id, state) =>
    set((s) => ({ liveVehicles: { ...s.liveVehicles, [id]: state } })),
  removeLiveVehicle: (id) =>
    set((s) => {
      const next = { ...s.liveVehicles };
      delete next[id];
      return { liveVehicles: next };
    }),
  selectVehicle: (id) => set({ selectedVehicleId: id }),
  selectTrip: (id) => set({ selectedTripId: id }),
  setSimRunning: (running) => set({ simRunning: running }),
  resetLive: () => set({ liveVehicles: {} }),
}));
