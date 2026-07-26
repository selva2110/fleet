'use server'

import { db } from '@/lib/db'
import { drivers, participants, trips, vehicles } from '@/lib/db/schema'
import { emit } from '@/lib/db/emit'
import { pointAlongPath } from '@/lib/geo'
import type { Trip, TripStop } from '@/lib/types'
import { eq, inArray, ne } from 'drizzle-orm'

// Playback speed: each planned minute of real travel time (from the route the
// planning engine computed) takes this many wall-clock seconds to animate, so
// a trip planned to take 40 minutes plays out proportionally longer than one
// planned to take 10 minutes, instead of every trip animating at the same
// fixed speed regardless of its real distance. The client ticks every ~2s;
// progress is derived from elapsed time so it stays consistent regardless of
// tick cadence.
const SIM_SECONDS_PER_PLANNED_MINUTE = 3
const MIN_TRIP_PLAYBACK_SECONDS = 20

function tripPlaybackSeconds(durationMinutes: number): number {
  return Math.max(MIN_TRIP_PLAYBACK_SECONDS, (durationMinutes || 20) * SIM_SECONDS_PER_PLANNED_MINUTE)
}

// Advances the whole simulation by one tick. This is the live-tracking engine:
// it is time-based (not tick-count based) so movement is smooth and resilient.
// Every meaningful state transition emits a persisted domain event.
export async function tickSimulation(speed = 1) {
  const activeTrips = await db
    .select()
    .from(trips)
    .where(ne(trips.status, 'cancelled'))

  const now = Date.now()

  for (const row of activeTrips) {
    if (row.status === 'cancelled') continue
    // Only trips that have been started move.
    if (!row.startedAt) continue

    // Demo trips (seeded) loop forever so the command center always has live
    // movement. Real dispatched trips complete normally and stay completed.
    const isDemoTrip = row.id.startsWith('trip-seed-')
    if (row.status === 'completed' && !isDemoTrip) continue

    const startedAt = new Date(row.startedAt).getTime()
    const elapsedSec = ((now - startedAt) / 1000) * speed
    const playbackSeconds = tripPlaybackSeconds(row.durationMinutes)

    // Once a seeded trip finishes its run (or is already completed), reset it
    // to the start so the live map keeps showing continuous movement.
    if (isDemoTrip && (row.status === 'completed' || elapsedSec >= playbackSeconds)) {
      const resetStops = (row.stops as TripStop[]).map((s) => ({ ...s, status: 'pending' as const }))
      const freshPath = row.routePath as Trip['routePath']
      await db
        .update(trips)
        .set({
          startedAt: new Date(now),
          lastTickAt: new Date(now),
          progress: 0,
          status: 'en-route',
          stops: resetStops,
          currentLocation: freshPath[0] ?? row.currentLocation,
          etaCenter: `${row.durationMinutes || 20} min`,
        })
        .where(eq(trips.id, row.id))
      const pids = resetStops.map((s) => s.participantId)
      if (pids.length) {
        await db
          .update(participants)
          .set({ status: 'vehicle-assigned' })
          .where(inArray(participants.id, pids))
      }
      continue
    }

    const nextProgress = Math.min(1, elapsedSec / playbackSeconds)
    const path = row.routePath as Trip['routePath']
    const stops = row.stops as TripStop[]
    const newLocation = pointAlongPath(path, nextProgress)

    const prevStatus = row.status
    let nextStatus: Trip['status'] = row.status
    const updatedStops = [...stops]

    // Each stop carries the real cumulative travel-time estimate the planner
    // computed for it (`etaMinutes`, e.g. "20 minutes from the vehicle's start
    // to pickup 1"). Its fraction of the trip's total planned duration is used
    // directly as the progress threshold at which that rider gets picked up —
    // so a pickup that's genuinely 20 minutes away in the plan reaches "picked
    // up" proportionally later than one that's 5 minutes away, instead of every
    // stop being spaced evenly regardless of actual distance.
    const totalPlannedMinutes = row.durationMinutes || 20
    const stopThresholds = updatedStops.map((s) =>
      totalPlannedMinutes > 0 ? Math.min(0.97, s.etaMinutes / totalPlannedMinutes) : 0,
    )
    const APPROACH_WINDOW = 0.08

    for (let i = 0; i < updatedStops.length; i++) {
      const stopThreshold = stopThresholds[i]
      if (nextProgress >= stopThreshold && updatedStops[i].status !== 'picked-up') {
        updatedStops[i] = { ...updatedStops[i], status: 'picked-up' }
        await db
          .update(participants)
          .set({ status: 'picked-up' })
          .where(eq(participants.id, updatedStops[i].participantId))
        await emit({
          eventType: 'trip.participant_picked_up',
          aggregateType: 'trip',
          aggregateId: row.id,
          actorRole: 'driver',
          summary: `${row.tripNumber}: picked up rider ${i + 1} of ${stops.length}`,
          payload: { participantId: updatedStops[i].participantId, order: i + 1 },
        })
      } else if (
        nextProgress >= Math.max(0, stopThreshold - APPROACH_WINDOW) &&
        updatedStops[i].status === 'pending'
      ) {
        updatedStops[i] = { ...updatedStops[i], status: 'approaching' }
      }
    }

    const allPickedUp = updatedStops.every((s) => s.status === 'picked-up' || s.status === 'skipped')
    const lastStopThreshold = stopThresholds.length ? stopThresholds[stopThresholds.length - 1] : 0

    if (nextProgress >= 1) {
      nextStatus = 'completed'
    } else if (allPickedUp && nextProgress >= lastStopThreshold) {
      nextStatus = 'onboard'
    } else if (updatedStops.some((s) => s.status === 'picked-up')) {
      nextStatus = 'pickup-in-progress'
    } else {
      nextStatus = 'en-route'
    }

    await db
      .update(trips)
      .set({
        progress: nextProgress,
        currentLocation: newLocation,
        stops: updatedStops,
        status: nextStatus,
        lastTickAt: new Date(now),
        etaCenter:
          nextProgress >= 1
            ? 'Arrived'
            : `${Math.max(1, Math.round((1 - nextProgress) * (row.durationMinutes || 20)))} min`,
      })
      .where(eq(trips.id, row.id))

    // Keep the assigned vehicle co-located with the trip.
    if (row.vehicleId) {
      const vehStatus =
        nextStatus === 'onboard'
          ? 'onboard'
          : nextStatus === 'completed'
            ? 'at-destination'
            : 'heading-to-pickup'
      await db
        .update(vehicles)
        .set({ location: newLocation, status: vehStatus })
        .where(eq(vehicles.id, row.vehicleId))
    }

    // Emit status-transition events (only when status actually changes).
    if (nextStatus !== prevStatus) {
      if (nextStatus === 'onboard') {
        await emit({
          eventType: 'trip.onboard',
          aggregateType: 'trip',
          aggregateId: row.id,
          actorRole: 'driver',
          summary: `${row.tripNumber}: all riders aboard, heading to center`,
        })
      } else if (nextStatus === 'completed') {
        await emit({
          eventType: 'trip.arrived',
          aggregateType: 'trip',
          aggregateId: row.id,
          actorRole: 'driver',
          summary: `${row.tripNumber}: arrived at destination center`,
        })
        await emit({
          eventType: 'trip.completed',
          aggregateType: 'trip',
          aggregateId: row.id,
          actorRole: 'system',
          summary: `${row.tripNumber}: trip completed`,
        })
        // Release vehicle & driver, mark riders dropped off.
        if (row.vehicleId) {
          await db.update(vehicles).set({ status: 'at-destination' }).where(eq(vehicles.id, row.vehicleId))
        }
        if (row.driverId) {
          await db.update(drivers).set({ status: 'available' }).where(eq(drivers.id, row.driverId))
        }
        const pids = updatedStops.map((s) => s.participantId)
        if (pids.length) {
          await db
            .update(participants)
            .set({ status: 'dropped-off' })
            .where(inArray(participants.id, pids))
        }
      }
    }
  }

  return { ok: true, tickedAt: new Date(now).toISOString() }
}

export async function startSimulation(actorRole = 'dispatcher') {
  // Auto-start any committed-but-not-started trips so the map comes alive.
  const now = new Date()
  const notStarted = await db.select().from(trips).where(ne(trips.status, 'cancelled'))
  for (const t of notStarted) {
    if (!t.startedAt && t.status !== 'completed') {
      await db
        .update(trips)
        .set({ status: 'en-route', startedAt: now, lastTickAt: now })
        .where(eq(trips.id, t.id))
    }
  }
  await emit({
    eventType: 'simulation.started',
    aggregateType: 'system',
    actorRole,
    summary: 'Live tracking started',
  })
}

export async function stopSimulation(actorRole = 'dispatcher') {
  await emit({
    eventType: 'simulation.stopped',
    aggregateType: 'system',
    actorRole,
    summary: 'Live tracking paused',
  })
}
