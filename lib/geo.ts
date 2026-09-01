import type { LatLng } from "./types";

// Map is centered on a dense urban grid so streets and routes render clearly.
export const MAP_CENTER: LatLng = { lat: 37.7839436, lng: -122.4192113 };
export const COIMBATORE_MAP_CENTER: LatLng = { lat: 10.6580, lng: 77.0083 };
export const MAP_ZOOM = 13;

const R = 6371; // km

export function haversineKm(a: LatLng, b: LatLng): number {
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

// Rough urban travel time estimate (avg 26 km/h + a per-stop dwell allowance).
export function estimateMinutes(distanceKm: number, stops = 0): number {
  return Math.round((distanceKm / 26) * 60 + stops * 3);
}

// Compass bearing in degrees (0 = north, clockwise) from point a to point b.
export function bearingDegrees(a: LatLng, b: LatLng): number {
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const dLng = toRad(b.lng - a.lng);
  const y = Math.sin(dLng) * Math.cos(lat2);
  const x =
    Math.cos(lat1) * Math.sin(lat2) -
    Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);
  return (Math.atan2(y, x) * 180) / Math.PI;
}

// Total length of a polyline in km.
export function pathLengthKm(path: LatLng[]): number {
  let total = 0;
  for (let i = 1; i < path.length; i++)
    total += haversineKm(path[i - 1], path[i]);
  return total;
}

// Interpolate a point at fraction t (0..1) along a polyline.
export function pointAlongPath(path: LatLng[], t: number): LatLng {
  if (path.length === 0) return COIMBATORE_MAP_CENTER;
  if (path.length === 1 || t <= 0) return path[0];
  if (t >= 1) return path[path.length - 1];
  const total = pathLengthKm(path);
  const target = total * t;
  let acc = 0;
  for (let i = 1; i < path.length; i++) {
    const seg = haversineKm(path[i - 1], path[i]);
    if (acc + seg >= target) {
      const f = seg === 0 ? 0 : (target - acc) / seg;
      return {
        lat: path[i - 1].lat + (path[i].lat - path[i - 1].lat) * f,
        lng: path[i - 1].lng + (path[i].lng - path[i - 1].lng) * f,
      };
    }
    acc += seg;
  }
  return path[path.length - 1];
}

export function formatEta(minutesFromNow: number): string {
  const d = new Date(Date.now() + minutesFromNow * 60000);
  return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

export function parseClockTime(value: string): number {
  const [hours, minutes] = value.split(":").map(Number);
  return hours * 60 + (minutes || 0);
}

export function formatMinutesToClock(minutesFromMidnight: number): string {
  const d = new Date(2000, 0, 1, 0, 0);
  d.setMinutes(minutesFromMidnight);
  return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

// Clock time `minutesFromBase` minutes after a fixed reference instant (e.g. a
// trip's startedAt), so displayed pickup times stay fixed as time passes
// instead of drifting like a Date.now()-relative estimate would.
export function formatClockTime(
  baseMs: number,
  minutesFromBase: number,
): string {
  const d = new Date(baseMs + minutesFromBase * 60000);
  return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}
