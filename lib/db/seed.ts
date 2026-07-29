import { db } from "./index";
import {
  centers,
  drivers,
  eventLog,
  events,
  mealDeliveries,
  participants,
  trips,
  vehicles,
} from "./schema";
import {
  seedCenters,
  seedDrivers,
  seedEvents,
  seedMealRuns,
  seedParticipants,
  seedVehicles,
} from "@/lib/mock-data";
import { buildRoutePath } from "@/lib/geo";
import { sql } from "drizzle-orm";
import type { LatLng, MealStop, TripStop } from "@/lib/types";

// Seeds the database from the deterministic mock dataset and creates a set of
// in-flight trips so the live map has movement on first load. Idempotent-ish:
// it truncates existing rows first so re-running produces a clean state.
export async function seedDatabase() {
  await db.execute(
    sql`TRUNCATE centers, participants, vehicles, drivers, events, trips, meal_deliveries, event_log RESTART IDENTITY`,
  );

  await db.insert(centers).values(
    seedCenters.map((c) => ({
      id: c.id,
      name: c.name,
      type: c.type,
      address: c.address,
      location: c.location,
      operatingHours: c.operatingHours,
      capacity: c.capacity,
    })),
  );

  await db.insert(participants).values(
    seedParticipants.map((p) => ({
      id: p.id,
      name: p.name,
      phone: p.phone,
      emergencyContact: p.emergencyContact,
      address: p.address,
      location: p.location,
      medicalNotes: p.medicalNotes,
      constraints: p.constraints,
      maxTravelMinutes: p.maxTravelMinutes,
      pickupWindow: p.pickupWindow,
      mobilityLevel: p.mobilityLevel,
      medicalPriority: p.medicalPriority,
      eligible: p.eligible,
      status: p.status,
      eventId: p.eventId,
    })),
  );

  await db.insert(vehicles).values(
    seedVehicles.map((v) => ({
      id: v.id,
      name: v.name,
      address: v.address,
      type: v.type,
      capacity: v.capacity,
      wheelchairCapacity: v.wheelchairCapacity,
      oxygenEquipment: v.oxygenEquipment,
      liftAvailable: v.liftAvailable,
      bariatricCapable: v.bariatricCapable,
      stretcherCapable: v.stretcherCapable,
      fuelType: v.fuelType,
      maintenanceStatus: v.maintenanceStatus,
      status: v.status,
      location: v.location,
    })),
  );

  await db.insert(drivers).values(
    seedDrivers.map((d) => ({
      id: d.id,
      name: d.name,
      phone: d.phone,
      address: d.address,
      location: d.location,
      license: d.license,
      certifications: d.certifications,
      assignedVehicleId: d.assignedVehicleId,
      status: d.status,
      rating: d.rating,
      shiftStart: d.shiftStart,
      shiftEnd: d.shiftEnd,
      shiftDays: d.shiftDays,
    })),
  );

  await db.insert(events).values(
    seedEvents.map((e) => ({
      id: e.id,
      name: e.name,
      type: e.type,
      centerId: e.centerId,
      date: e.date,
      startTime: e.startTime,
      endTime: e.endTime,
      expectedAttendance: e.expectedAttendance,
      participantIds: e.participantIds,
      roundTrip: e.roundTrip ?? false,
      returnTime: e.returnTime ?? null,
      status: e.status,
    })),
  );

  // Build a couple of active trips for the "active" event so the command center
  // has live vehicles moving on first load.
  const activeEvent = seedEvents.find((e) => e.status === "active");
  const now = new Date();
  if (activeEvent) {
    const center = seedCenters.find((c) => c.id === activeEvent.centerId)!;
    const eventParticipants = seedParticipants.filter((p) =>
      activeEvent.participantIds.includes(p.id),
    );
    const usableVehicles = seedVehicles.slice(0, 3);
    const usableDrivers = seedDrivers.slice(0, 3);

    // Split participants into groups per vehicle.
    const groups: (typeof eventParticipants)[] = [[], [], []];
    eventParticipants.forEach((p, i) => groups[i % 3].push(p));

    const tripRows = await Promise.all(
      groups
        .filter((g) => g.length > 0)
        .map(async (group, idx) => {
          const vehicle = usableVehicles[idx];
          const driver = usableDrivers[idx];
          const stops: TripStop[] = group.map((p, order) => ({
            participantId: p.id,
            location: p.location,
            order,
            etaMinutes: (order + 1) * 8,
            status: "pending" as const,
          }));
          const waypoints: LatLng[] = [
            vehicle.location,
            ...group.map((p) => p.location),
            center.location,
          ];
          const routePath = await buildRoutePath(waypoints);
          const progress = [0.15, 0.4, 0.62][idx] ?? 0.2;
          const pathIndex = Math.floor(progress * (routePath.length - 1));
          return {
            id: `trip-seed-${idx + 1}`,
            tripNumber: `TR-${1200 + idx + 1}`,
            eventId: activeEvent.id,
            vehicleId: vehicle.id,
            driverId: driver.id,
            stops,
            destinationCenterId: center.id,
            status: "en-route" as const,
            distanceKm: 6 + idx * 2,
            durationMinutes: 24 + idx * 6,
            etaCenter: `${20 - idx * 4} min`,
            progress,
            currentLocation: routePath[pathIndex] ?? vehicle.location,
            routePath,
            startedAt: now,
            lastTickAt: now,
          };
        }),
    );

    if (tripRows.length > 0) {
      await db.insert(trips).values(tripRows);
    }
  }

  // Meal-delivery runs: fleet collects meals from a center/kitchen and drops
  // them at participants' homes. Build a real OSRM route center -> homes.
  const mealRows = await Promise.all(
    seedMealRuns.map(async (run) => {
      const center = seedCenters.find((c) => c.id === run.centerId)!;
      const vehicle = seedVehicles.find((v) => v.id === run.vehicleId)!;
      const runParticipants = run.participantIds
        .map((id) => seedParticipants.find((p) => p.id === id))
        .filter((p): p is (typeof seedParticipants)[number] => Boolean(p));

      const stops: MealStop[] = runParticipants.map((p, order) => ({
        participantId: p.id,
        location: p.location,
        order,
        etaMinutes: (order + 1) * 7,
        mealCount: 1 + (order % 2),
        status:
          run.progress > (order + 1) / (runParticipants.length + 1)
            ? "delivered"
            : "pending",
      }));
      const totalMeals = stops.reduce((s, x) => s + x.mealCount, 0);

      const waypoints: LatLng[] = [
        center.location,
        ...runParticipants.map((p) => p.location),
      ];
      const routePath = await buildRoutePath(waypoints);
      const distanceKm =
        routePath.length > 1
          ? Math.round(
              routePath.reduce((acc, pt, i) => {
                if (i === 0) return 0;
                const a = routePath[i - 1];
                const dx = (pt.lat - a.lat) * 111;
                const dy = (pt.lng - a.lng) * 85;
                return acc + Math.sqrt(dx * dx + dy * dy);
              }, 0) * 10,
            ) / 10
          : 0;
      const pathIndex = Math.floor(run.progress * (routePath.length - 1));
      const active = run.status === "en-route" || run.status === "delivering";

      return {
        id: run.id,
        runNumber: run.runNumber,
        centerId: run.centerId,
        vehicleId: run.vehicleId,
        driverId: run.driverId,
        date: activeEvent?.date ?? new Date().toISOString().slice(0, 10),
        departTime: run.departTime,
        mealType: run.mealType,
        totalMeals,
        stops,
        status: run.status,
        distanceKm,
        durationMinutes: Math.round(distanceKm * 2.4 + stops.length * 3),
        progress: run.progress,
        currentLocation: routePath[pathIndex] ?? center.location,
        routePath,
        startedAt: active ? now : null,
        lastTickAt: active ? now : null,
      };
    }),
  );
  if (mealRows.length > 0) {
    await db.insert(mealDeliveries).values(mealRows);
  }

  await db.insert(eventLog).values({
    eventType: "system.seeded",
    aggregateType: "system",
    aggregateId: "system",
    actorRole: "system",
    summary: `Seeded ${seedCenters.length} centers, ${seedParticipants.length} participants, ${seedVehicles.length} vehicles, ${seedDrivers.length} drivers, ${seedEvents.length} events`,
    payload: {},
  });
}
