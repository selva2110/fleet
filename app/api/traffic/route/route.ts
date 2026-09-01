import { NextResponse } from "next/server";
import type { LatLng } from "@/lib/types";
import { TrafficResult } from "@/lib/fleetMap/types";
import { FleetmapUtils } from "@/lib/fleetMap/utils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Resolve a driving route between the supplied points using the Mapbox
 * Directions API. Uses the traffic-aware `driving-traffic` profile so the
 * returned travel time reflects live conditions, and derives the delay by
 * comparing against the free-flow `driving` duration. Falls back gracefully to
 * OSRM geometry (no traffic) when no Mapbox token is configured.
 */
export async function POST(request: Request) {
  let points: LatLng[] = [];
  try {
    const body = (await request.json()) as { points?: unknown };
    if (Array.isArray(body.points)) {
      points = body.points.filter(FleetmapUtils.isValidLatLng);
    }
  } catch {
    return NextResponse.json({ available: false } satisfies TrafficResult);
  }

  if (points.length < 2) {
    return NextResponse.json({ available: false } satisfies TrafficResult);
  }

  const token = "pk.eyJ1Ijoic2l2YS1kaGFybWFyYWoiLCJhIjoiY21zNXR1dmhlMDBoMjM1cTRmb25veHRtdCJ9.W_F1SaLw8-6t3tiYNZmzEw";
  const coordinates = FleetmapUtils.latlngToCoordinates(points);

  if (token && points.length <= 25) {
    try {
      const base = `https://api.mapbox.com/directions/v5/mapbox`;
      const params = `geometries=geojson&overview=full&access_token=${token}`;
      const [trafficRes, plainRes] = await Promise.all([
        fetch(`${base}/driving-traffic/${coordinates}?${params}`, {
          cache: "no-store",
        }),
        fetch(`${base}/driving/${coordinates}?${params}`, {
          cache: "no-store",
        }),
      ]);

      if (trafficRes.ok) {
        const trafficData = await trafficRes.json();
        const route = trafficData.routes?.[0];
        if (route?.geometry?.coordinates?.length) {
          const routePath: LatLng[] = route.geometry.coordinates.map(
            ([lng, lat]: [number, number]) => ({ lat, lng }),
          );
          const travelTimeMinutes = Math.round(route.duration / 60);

          let trafficDelayMinutes = 0;
          if (plainRes.ok) {
            const plainData = await plainRes.json();
            const freeFlow = plainData.routes?.[0]?.duration;
            if (typeof freeFlow === "number") {
              trafficDelayMinutes = Math.max(
                0,
                Math.round((route.duration - freeFlow) / 60),
              );
            }
          }

          return NextResponse.json({
            available: true,
            routePath,
            travelTimeMinutes,
            trafficDelayMinutes,
            updatedAt: new Date().toISOString(),
          } satisfies TrafficResult);
        }
      }
    } catch (error) {
      console.error("[v0] mapbox directions failed", error);
    }
  }

  // Fallback: OSRM geometry without live traffic so the route still renders.
  try {
    const url =
      `https://router.project-osrm.org/route/v1/driving/${coordinates}` +
      `?overview=full&geometries=geojson`;
    const response = await fetch(url, { cache: "no-store" });
    if (response.ok) {
      const data = await response.json();
      const route = data.routes?.[0];
      if (route?.geometry?.coordinates?.length) {
        const routePath: LatLng[] = route.geometry.coordinates.map(
          ([lng, lat]: [number, number]) => ({ lat, lng }),
        );
        return NextResponse.json({
          available: false,
          routePath,
          travelTimeMinutes: Math.round(route.duration / 60),
          updatedAt: new Date().toISOString(),
        } satisfies TrafficResult);
      }
    }
  } catch (error) {
    console.error("[v0] osrm fallback failed", error);
  }

  return NextResponse.json({ available: false } satisfies TrafficResult);
}
