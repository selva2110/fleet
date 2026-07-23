'use client';

import { useEffect, useRef } from 'react';
import { useTrips, useVehicles } from './hooks';
import { useFleetStore } from './store';
import { initSimVehicle, stepSimVehicle, type SimVehicle } from './simulation';
import type { LiveVehicleState } from './types';

const TICK_MS = 1000;
const SPEED_MULTIPLIER = 30;

export function useLiveTracking() {
  const { data: trips } = useTrips();
  const { data: vehicles } = useVehicles();
  const simRunning = useFleetStore((s) => s.simRunning);
  const setLiveVehicle = useFleetStore((s) => s.setLiveVehicle);
  const removeLiveVehicle = useFleetStore((s) => s.removeLiveVehicle);

  const simsRef = useRef<Record<string, SimVehicle>>({});
  const lastTickRef = useRef<number>(Date.now());
  const rafRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!trips || !vehicles) return;

    const activeTrips = trips.filter((t) => t.status === 'started' || t.status === 'assigned');
    const vehiclesById = new Map(vehicles.map((v) => [v.id, v]));
    const activeVehicleIds = new Set<string>();

    for (const trip of activeTrips) {
      const vehicle = vehiclesById.get(trip.vehicle_id);
      if (!vehicle) continue;
      activeVehicleIds.add(vehicle.id);

      if (!simsRef.current[vehicle.id]) {
        const sim = initSimVehicle(trip, vehicle);
        if (sim) simsRef.current[vehicle.id] = sim;
      }
    }

    for (const vid of Object.keys(simsRef.current)) {
      if (!activeVehicleIds.has(vid)) {
        delete simsRef.current[vid];
        removeLiveVehicle(vid);
      }
    }
  }, [trips, vehicles, removeLiveVehicle]);

  useEffect(() => {
    if (rafRef.current) {
      clearInterval(rafRef.current);
      rafRef.current = null;
    }

    if (!simRunning) return;

    lastTickRef.current = Date.now();
    rafRef.current = setInterval(() => {
      const now = Date.now();
      const deltaSeconds = ((now - lastTickRef.current) / 1000) * SPEED_MULTIPLIER;
      lastTickRef.current = now;

      const sims = simsRef.current;
      for (const vid of Object.keys(sims)) {
        const stepped = stepSimVehicle(sims[vid], deltaSeconds);
        sims[vid] = stepped;
        const live: LiveVehicleState = {
          vehicleId: vid,
          position: stepped.position,
          heading: stepped.heading,
          speedKmh: stepped.speedKmh,
          progress: stepped.progress,
          tripId: stepped.tripId,
          stopIndex: 0,
          status: stepped.completed ? 'available' : 'in_service',
          etaSeconds: stepped.etaSeconds,
        };
        setLiveVehicle(vid, live);
      }
    }, TICK_MS);

    return () => {
      if (rafRef.current) clearInterval(rafRef.current);
    };
  }, [simRunning, setLiveVehicle]);
}
