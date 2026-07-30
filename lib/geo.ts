import type { LatLng } from './types'

// Map is centered on a dense urban grid so streets and routes render clearly.
export const MAP_CENTER: LatLng = { lat: 40.7359, lng: -73.9911 }
export const MAP_ZOOM = 13

const R = 6371 // km

export function haversineKm(a: LatLng, b: LatLng): number {
  const dLat = toRad(b.lat - a.lat)
  const dLng = toRad(b.lng - a.lng)
  const lat1 = toRad(a.lat)
  const lat2 = toRad(b.lat)
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2)
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)))
}

function toRad(deg: number): number {
  return (deg * Math.PI) / 180
}

// Rough urban travel time estimate (avg 26 km/h + a per-stop dwell allowance).
export function estimateMinutes(distanceKm: number, stops = 0): number {
  return Math.round((distanceKm / 26) * 60 + stops * 3)
}

// Compass bearing in degrees (0 = north, clockwise) from point a to point b.
export function bearingDegrees(a: LatLng, b: LatLng): number {
  const lat1 = toRad(a.lat)
  const lat2 = toRad(b.lat)
  const dLng = toRad(b.lng - a.lng)
  const y = Math.sin(dLng) * Math.cos(lat2)
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng)
  return (Math.atan2(y, x) * 180) / Math.PI
}

// Total length of a polyline in km.
export function pathLengthKm(path: LatLng[]): number {
  let total = 0
  for (let i = 1; i < path.length; i++) total += haversineKm(path[i - 1], path[i])
  return total
}

// Interpolate a point at fraction t (0..1) along a polyline.
export function pointAlongPath(path: LatLng[], t: number): LatLng {
  if (path.length === 0) return MAP_CENTER
  if (path.length === 1 || t <= 0) return path[0]
  if (t >= 1) return path[path.length - 1]
  const total = pathLengthKm(path)
  const target = total * t
  let acc = 0
  for (let i = 1; i < path.length; i++) {
    const seg = haversineKm(path[i - 1], path[i])
    if (acc + seg >= target) {
      const f = seg === 0 ? 0 : (target - acc) / seg
      return {
        lat: path[i - 1].lat + (path[i].lat - path[i - 1].lat) * f,
        lng: path[i - 1].lng + (path[i].lng - path[i - 1].lng) * f,
      }
    }
    acc += seg
  }
  return path[path.length - 1]
}

// Build a slightly jittered multi-point path between stops so routes look like
// they follow streets rather than straight lines.
export function buildRoutePath1(points: LatLng[]): LatLng[] {
  const path: LatLng[] = []
  for (let i = 0; i < points.length - 1; i++) {
    const a = points[i]
    const b = points[i + 1]
    path.push(a)
    // insert an L-shaped waypoint to mimic a street grid
    path.push({ lat: a.lat, lng: b.lng })
  }
  path.push(points[points.length - 1])
  return path
}

export function formatEta(minutesFromNow: number): string {
  const d = new Date(Date.now() + minutesFromNow * 60000)
  return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
}

export function parseClockTime(value: string): number {
  const [hours, minutes] = value.split(':').map(Number)
  return hours * 60 + (minutes || 0)
}

export function formatMinutesToClock(minutesFromMidnight: number): string {
  const d = new Date(2000, 0, 1, 0, 0)
  d.setMinutes(minutesFromMidnight)
  return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
}

// Clock time `minutesFromBase` minutes after a fixed reference instant (e.g. a
// trip's startedAt), so displayed pickup times stay fixed as time passes
// instead of drifting like a Date.now()-relative estimate would.
export function formatClockTime(baseMs: number, minutesFromBase: number): string {
  const d = new Date(baseMs + minutesFromBase * 60000)
  return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
}

// Fetch a road-following path from OSRM, but never throw or hang: on any
// failure (network error, rate limit, timeout) fall back to the synthetic
// grid path so callers always get usable geometry. Used for final/display
// routes — NOT for the planning engine's inner loop (see buildRoutePath1).
export async function buildRoutePath(points: LatLng[]): Promise<LatLng[]> {
  if (points.length < 2) return points

  const coordinates = points.map((p) => `${p.lng},${p.lat}`).join(';')
  const url =
    `https://router.project-osrm.org/route/v1/driving/${coordinates}` +
    `?overview=full&geometries=geojson`

  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 3500)
    const response = await fetch(url, { signal: controller.signal })
    clearTimeout(timeout)
    if (!response.ok) return buildRoutePath1(points)
    const data = await response.json()
    if (!data.routes?.length) return buildRoutePath1(points)
    return data.routes[0].geometry.coordinates.map(([lng, lat]: [number, number]) => ({
      lat,
      lng,
    }))
  } catch {
    return buildRoutePath1(points)
  }
}
