import type { Trip, Vehicle } from './types';
import { bearing, haversineMeters, interpolate } from './geo';

export interface SimVehicle {
  vehicleId: string;
  tripId: string;
  route: [number, number][];
  segmentIndex: number;
  segmentFrac: number;
  position: [number, number];
  heading: number;
  speedKmh: number;
  progress: number;
  totalDistanceMeters: number;
  traveledMeters: number;
  etaSeconds: number | null;
  completed: boolean;
}

const SPEED_MPS = 11.1; // ~40 km/h average urban

function tripPath(trip: Trip, vehicle: Vehicle): [number, number][] | null {
  const start = vehicle.current_location?.coordinates;
  const route = trip.route_geojson?.coordinates;
  if (!start || !route || route.length === 0) return null;
  return [start, ...route];
}

function pathLength(path: [number, number][]): number {
  let total = 0;
  for (let i = 1; i < path.length; i++) total += haversineMeters(path[i - 1], path[i]);
  return total;
}

export function initSimVehicle(trip: Trip, vehicle: Vehicle): SimVehicle | null {
  const route = tripPath(trip, vehicle);
  if (!route || route.length < 2) return null;
  const total = pathLength(route);
  return {
    vehicleId: vehicle.id,
    tripId: trip.id,
    route,
    segmentIndex: 0,
    segmentFrac: 0,
    position: route[0],
    heading: bearing(route[0], route[1]),
    speedKmh: 40,
    progress: 0,
    totalDistanceMeters: total,
    traveledMeters: 0,
    etaSeconds: total / SPEED_MPS,
    completed: false,
  };
}

export function stepSimVehicle(sv: SimVehicle, deltaSeconds: number): SimVehicle {
  if (sv.completed) {
    return sv;
  }
  const move = SPEED_MPS * deltaSeconds;
  let remaining = move;
  let idx = sv.segmentIndex;
  let frac = sv.segmentFrac;

  while (remaining > 0 && idx < sv.route.length - 1) {
    const segStart = sv.route[idx];
    const segEnd = sv.route[idx + 1];
    const segLen = haversineMeters(segStart, segEnd);
    const remainingSeg = segLen * (1 - frac);
    if (remaining < remainingSeg) {
      frac += remaining / segLen;
      remaining = 0;
    } else {
      remaining -= remainingSeg;
      idx += 1;
      frac = 0;
    }
  }

  const completed = idx >= sv.route.length - 1;
  const traveled = Math.min(sv.totalDistanceMeters, sv.traveledMeters + move);
  const a = sv.route[Math.min(idx, sv.route.length - 1)];
  const b = sv.route[Math.min(idx + 1, sv.route.length - 1)];
  const position = completed ? sv.route[sv.route.length - 1] : interpolate(a, b, frac);
  const head = completed ? sv.heading : bearing(a, b);
  const remainingMeters = Math.max(0, sv.totalDistanceMeters - traveled);
  const etaSeconds = completed ? 0 : remainingMeters / SPEED_MPS;

  return {
    ...sv,
    segmentIndex: idx,
    segmentFrac: frac,
    position,
    heading: head,
    speedKmh: completed ? 0 : 40,
    progress: sv.totalDistanceMeters > 0 ? traveled / sv.totalDistanceMeters : 1,
    traveledMeters: traveled,
    etaSeconds,
    completed,
  };
}

export function nearestStopIndex(sv: SimVehicle, stops: { location: { coordinates: [number, number] } }[]): number {
  let best = 0;
  let bestDist = Infinity;
  for (let i = 0; i < stops.length; i++) {
    const d = haversineMeters(sv.position, stops[i].location.coordinates);
    if (d < bestDist) {
      bestDist = d;
      best = i;
    }
  }
  return best;
}
