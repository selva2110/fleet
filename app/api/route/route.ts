import { TrafficResult } from "@/lib/fleetMap/types";
import { FleetmapUtils } from "@/lib/fleetMap/utils";
import { LatLng } from "@/lib/types";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const { points } = (await request.json()) as {
      points: LatLng[];
    };
    if (!Array.isArray(points) || points.length < 2) {
      return NextResponse.json(
        { error: "At least 2 points are required" },
        { status: 400 },
      );
    }
    const coordinates = FleetmapUtils.latlngToCoordinates(points);
    const url =
      `https://router.project-osrm.org/route/v1/driving/${coordinates}` +
      `?overview=full&geometries=geojson`;
    const response = await fetch(url, { cache: "no-store" });
    if (response.ok) {
      const data = await response.json();
      const route = data.routes?.[0];
      if (route?.geometry?.coordinates?.length) {
        const path: LatLng[] = route.geometry.coordinates.map(
          ([lng, lat]: [number, number]) => ({ lat, lng }),
        );
        return NextResponse.json({
          available: false,
          routePath: path,
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
