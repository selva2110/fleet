'use server'

import { db } from '@/lib/db'
import { centers, drivers, events, participants, trips, vehicles } from '@/lib/db/schema'
import { toCenter, toDriver, toParticipant, toVehicle } from '@/lib/db/mappers'
import { emit } from '@/lib/db/emit'
import { planTransportation } from '@/lib/planning-engine'
import type { PlanRecommendation, PlanResult, Trip } from '@/lib/types'
import { eq, inArray } from 'drizzle-orm'

// Runs the planning engine against live DB data for an event and records that a
// plan was generated. Returns recommendations (and anyone the planner could not
// place) for the UI to display.
export async function generatePlan(
  eventId: string,
  actorRole = 'operations',
): Promise<PlanResult> {
  const EMPTY: PlanResult = { recommendations: [], unassigned: [] }
  const [evtRows, allVehicles, allDrivers, allCenters] = await Promise.all([
    db.select().from(events).where(eq(events.id, eventId)),
    db.select().from(vehicles),
    db.select().from(drivers),
    db.select().from(centers),
  ])
  const evt = evtRows[0]
  if (!evt) return EMPTY

  // Participants for this event that are not already committed to a trip.
  const committedTrips = await db.select().from(trips)
  const committedPids = new Set(
    committedTrips
      .filter((t) => t.status !== 'cancelled')
      .flatMap((t) => (t.stops as Trip['stops']).map((s) => s.participantId)),
  )
  const partRows = evt.participantIds.length
    ? await db.select().from(participants).where(inArray(participants.id, evt.participantIds))
    : []
  const alreadyAssignedReasons: PlanResult['unassigned'] = partRows
    .filter((p) => committedPids.has(p.id))
    .map((p) => ({
      participantId: p.id,
      reason: `${p.name} is already assigned to an event`,
    }))
  const pending = partRows.map(toParticipant).filter((p) => !committedPids.has(p.id))

  const center = allCenters.map(toCenter).find((c) => c.id === evt.centerId)
  if (!center || pending.length === 0) return EMPTY

  const plan = await planTransportation({
    participants: pending,
    vehicles: allVehicles.map(toVehicle),
    drivers: allDrivers.map(toDriver),
    center,
    eventDate: evt.date,
    eventStartTime: evt.startTime,
  })
  const allUnassigned = [...plan.unassigned, ...alreadyAssignedReasons]

  await emit({
    eventType: 'plan.generated',
    aggregateType: 'plan',
    aggregateId: eventId,
    actorRole,
    summary: `Generated ${plan.recommendations.length} route${plan.recommendations.length === 1 ? '' : 's'} for ${evt.name}${plan.unassigned.length ? ` (${plan.unassigned.length} unassigned)` : ''}`,
    payload: {
      routes: plan.recommendations.length,
      participants: pending.length,
      unassigned: plan.unassigned.length,
      unassignedReason: allUnassigned,
    },
  })

  return {
    ...plan,
    unassigned: allUnassigned,
  }
}

// Commits selected plan recommendations into real trips and emits the full
// chain of dispatch events. Also flips vehicle/driver/participant statuses.
export async function commitPlan(
  eventId: string,
  recs: PlanRecommendation[],
  actorRole = 'dispatcher',
) {
  const evtRows = await db.select().from(events).where(eq(events.id, eventId))
  const evt = evtRows[0]
  if (!evt) return

  let counter = Date.now() % 10000
  for (const rec of recs) {
    const tripId = `trip-${Date.now().toString(36)}-${counter++}`
    const tripNumber = `TR-${counter}`
    const startLocationRows = await db
      .select()
      .from(vehicles)
      .where(eq(vehicles.id, rec.vehicleId))
    const startLocation = startLocationRows[0]?.location ?? rec.routePath[0]

    await db.insert(trips).values({
      id: tripId,
      tripNumber,
      eventId,
      vehicleId: rec.vehicleId,
      driverId: rec.driverId || null,
      stops: rec.stops,
      destinationCenterId: evt.centerId,
      status: rec.driverId ? 'driver-assigned' : 'vehicle-assigned',
      distanceKm: rec.distanceKm,
      durationMinutes: rec.durationMinutes,
      etaCenter: `${rec.durationMinutes} min`,
      progress: 0,
      currentLocation: startLocation,
      routePath: rec.routePath,
      startedAt: null,
      lastTickAt: null,
    })

    // Side effects: mark vehicle assigned, driver on-trip, participants scheduled.
    await db.update(vehicles).set({ status: 'assigned' }).where(eq(vehicles.id, rec.vehicleId))
    if (rec.driverId) {
      await db.update(drivers).set({ status: 'on-trip' }).where(eq(drivers.id, rec.driverId))
    }
    if (rec.participantIds.length) {
      await db
        .update(participants)
        .set({ status: 'vehicle-assigned' })
        .where(inArray(participants.id, rec.participantIds))
    }

    await emit({
      eventType: 'trip.created',
      aggregateType: 'trip',
      aggregateId: tripId,
      actorRole,
      summary: `Trip ${tripNumber} created (${rec.participantIds.length} riders)`,
      payload: { vehicleId: rec.vehicleId, driverId: rec.driverId, tripNumber },
    })
    if (rec.driverId) {
      await emit({
        eventType: 'trip.driver_assigned',
        aggregateType: 'trip',
        aggregateId: tripId,
        actorRole,
        summary: `Driver assigned to ${tripNumber}`,
        payload: { driverId: rec.driverId },
      })
    }
  }

  await db.update(events).set({ status: 'active' }).where(eq(events.id, eventId))
  await emit({
    eventType: 'plan.committed',
    aggregateType: 'event',
    aggregateId: eventId,
    actorRole,
    summary: `Committed ${recs.length} trip${recs.length === 1 ? '' : 's'} for ${evt.name}`,
    payload: { trips: recs.length },
  })
}

export async function startTrip(tripId: string, actorRole = 'dispatcher') {
  const now = new Date()
  await db
    .update(trips)
    .set({ status: 'en-route', startedAt: now, lastTickAt: now, progress: 0 })
    .where(eq(trips.id, tripId))
  const t = (await db.select().from(trips).where(eq(trips.id, tripId)))[0]
  if (t?.vehicleId) {
    await db.update(vehicles).set({ status: 'heading-to-pickup' }).where(eq(vehicles.id, t.vehicleId))
  }
  await emit({
    eventType: 'trip.started',
    aggregateType: 'trip',
    aggregateId: tripId,
    actorRole,
    summary: `Trip ${t?.tripNumber ?? tripId} started — en route to first pickup`,
  })
}

export async function cancelTrip(tripId: string, actorRole = 'dispatcher') {
  const t = (await db.select().from(trips).where(eq(trips.id, tripId)))[0]
  if (!t) return
  await db.update(trips).set({ status: 'cancelled' }).where(eq(trips.id, tripId))
  if (t.vehicleId) {
    await db.update(vehicles).set({ status: 'available' }).where(eq(vehicles.id, t.vehicleId))
  }
  if (t.driverId) {
    await db.update(drivers).set({ status: 'available' }).where(eq(drivers.id, t.driverId))
  }
  const pids = (t.stops as Trip['stops']).map((s) => s.participantId)
  if (pids.length) {
    await db
      .update(participants)
      .set({ status: 'registered' })
      .where(inArray(participants.id, pids))
  }
  await emit({
    eventType: 'trip.cancelled',
    aggregateType: 'trip',
    aggregateId: tripId,
    actorRole,
    summary: `Trip ${t.tripNumber} cancelled`,
  })
}

// Removes every trip (planned, active, or completed) and releases whatever
// vehicles/drivers/participants they were holding back to their idle states —
// the same release logic as cancelTrip, applied to the whole fleet at once.
// Unlike reseedDatabase(), this leaves centers/participants/vehicles/drivers/
// events untouched; it only clears trips.
export async function clearAllTrips(actorRole = 'dispatcher') {
  const allTrips = await db.select().from(trips)
  if (allTrips.length === 0) return { cleared: 0 }

  const vehicleIds = [...new Set(allTrips.map((t) => t.vehicleId).filter((id): id is string => !!id))]
  const driverIds = [...new Set(allTrips.map((t) => t.driverId).filter((id): id is string => !!id))]
  const participantIds = [
    ...new Set(allTrips.flatMap((t) => (t.stops as Trip['stops']).map((s) => s.participantId))),
  ]

  if (vehicleIds.length) {
    await db.update(vehicles).set({ status: 'available' }).where(inArray(vehicles.id, vehicleIds))
  }
  if (driverIds.length) {
    await db.update(drivers).set({ status: 'available' }).where(inArray(drivers.id, driverIds))
  }
  if (participantIds.length) {
    await db.update(participants).set({ status: 'registered' }).where(inArray(participants.id, participantIds))
  }

  await db.delete(trips)

  await emit({
    eventType: 'trips.cleared_all',
    aggregateType: 'system',
    actorRole,
    summary: `Cleared ${allTrips.length} trip${allTrips.length === 1 ? '' : 's'} and released their vehicles/drivers/participants`,
    payload: { count: allTrips.length },
  })

  return { cleared: allTrips.length }
}

export async function assignDriverToTrip(
  tripId: string,
  driverId: string,
  actorRole = 'dispatcher',
) {
  const t = (await db.select().from(trips).where(eq(trips.id, tripId)))[0]
  if (!t) return
  await db
    .update(trips)
    .set({ driverId, status: t.status === 'vehicle-assigned' ? 'driver-assigned' : t.status })
    .where(eq(trips.id, tripId))
  await db.update(drivers).set({ status: 'on-trip' }).where(eq(drivers.id, driverId))
  await emit({
    eventType: 'trip.driver_assigned',
    aggregateType: 'trip',
    aggregateId: tripId,
    actorRole,
    summary: `Driver assigned to ${t.tripNumber}`,
    payload: { driverId },
  })
}
