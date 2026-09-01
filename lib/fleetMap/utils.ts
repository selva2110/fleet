import { LatLng } from "../types";
import { TrafficResult } from "./types";

export class FleetmapUtils {
  static jitter(base: LatLng): LatLng {
    return {
      lat: base.lat + (Math.random() - 0.5) * 0.05,
      lng: base.lng + (Math.random() - 0.5) * 0.05,
    };
  }

  static isValidLatLng(value: unknown): value is LatLng {
    if (!value || typeof value !== "object") return false;
    const v = value as Record<string, unknown>;
    return (
      typeof v.lat === "number" &&
      typeof v.lng === "number" &&
      Number.isFinite(v.lat) &&
      Number.isFinite(v.lng) &&
      v.lat >= -90 &&
      v.lat <= 90 &&
      v.lng >= -180 &&
      v.lng <= 180
    );
  }

  static toLngLat(value: LatLng | null | undefined): [number, number] | null {
    if (!FleetmapUtils.isValidLatLng(value)) return null;
    return [value.lng, value.lat];
  }

  static toLineCoordinates(
    points: Array<LatLng | null | undefined>,
  ): [number, number][] {
    return points
      .map((point) => FleetmapUtils.toLngLat(point))
      .filter((point): point is [number, number] => point !== null);
  }

  static async fetchTrafficRoutes(points: LatLng[]): Promise<TrafficResult> {
    try {
      const response = await fetch("/api/traffic/route", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ points }),
      });
      const data = await response.json();
      return data;
    } catch (error) {
      throw error;
    }
  }

  static buildRoutePath1(points: LatLng[]): LatLng[] {
    const path: LatLng[] = [];
    for (let i = 0; i < points.length - 1; i++) {
      const a = points[i];
      const b = points[i + 1];
      path.push(a);
      // insert an L-shaped waypoint to mimic a street grid
      path.push({ lat: a.lat, lng: b.lng });
    }
    path.push(points[points.length - 1]);
    return path;
  }

  static async buildRoutePath(points: LatLng[]): Promise<LatLng[]> {
    if (points.length < 2) return points;
    try {
      const response = await fetch("/api/route", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ points }),
      });
      if (!response.ok) {
        return FleetmapUtils.buildRoutePath1(points);
      }
      const data = await response.json();
      if (!data.routePath?.length) {
        return FleetmapUtils.buildRoutePath1(points);
      }
      return data.routePath;
    } catch {
      return FleetmapUtils.buildRoutePath1(points);
    }
  }

  static isValidLocation(value: LatLng | null | undefined): value is LatLng {
    if (!value) return false;
    return (
      Number.isFinite(value.lat) &&
      Number.isFinite(value.lng) &&
      value.lat >= -90 &&
      value.lat <= 90 &&
      value.lng >= -180 &&
      value.lng <= 180
    );
  }

  static latlngToCoordinates(points: LatLng[]): string {
    return points.map((p) => `${p.lng},${p.lat}`).join(";");
  }
}
