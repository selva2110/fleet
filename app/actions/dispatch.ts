'use server'

// Thin proxies to trip-service, which now owns the planning engine, dispatch
// orchestration, and round-trip mirroring logic that used to live here.

import * as tripsApi from '@/lib/api/trips'
import { PlanRecommendation, PlanResult } from '@/lib/trips/types';

export async function generatePlan(eventId: string, _actorRole = 'operations'): Promise<PlanResult> {
  return tripsApi.generatePlan(eventId)
}

export async function commitPlan(eventId: string, recs: PlanRecommendation[], _actorRole = 'dispatcher') {
  await tripsApi.commitPlan(eventId, recs)
}

export async function startTrip(tripId: string, _actorRole = 'dispatcher') {
  await tripsApi.startTrip(tripId)
}

export async function cancelTrip(tripId: string, _actorRole = 'dispatcher') {
  await tripsApi.cancelTrip(tripId)
}

export async function clearAllTrips(_actorRole = 'dispatcher') {
  return tripsApi.clearAllTrips()
}

export async function assignDriverToTrip(tripId: string, driverId: string, _actorRole = 'dispatcher') {
  await tripsApi.assignDriverToTrip(tripId, driverId)
}

export async function replanTripByTripId(tripId:string) {
  return tripsApi.replanTripByTripId(tripId)
}