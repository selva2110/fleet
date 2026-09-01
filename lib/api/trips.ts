import 'server-only'
import { apiDelete, apiGet, apiPost, SERVICE_URLS } from './http'
import { PlanRecommendation, PlanResult, Trip } from '../trips/types';

const base = () => `${SERVICE_URLS.trip()}/api/v1`

export async function listTrips(): Promise<Trip[]> {
  const res = await apiGet<{ data: Trip[] }>(`${base()}/trips?limit=500`)
  return res.data
}

export async function generatePlan(eventId: string): Promise<PlanResult> {
  return apiPost<PlanResult>(`${base()}/events/${eventId}/plan`)
}

export async function commitPlan(eventId: string, recs: PlanRecommendation[]): Promise<void> {
  await apiPost(`${base()}/events/${eventId}/commit`, { recommendations: recs })
}

export async function startTrip(tripId: string): Promise<void> {
  await apiPost(`${base()}/trips/${tripId}/start`)
}

export async function cancelTrip(tripId: string): Promise<void> {
  await apiPost(`${base()}/trips/${tripId}/cancel`)
}

export async function clearAllTrips(): Promise<{ cleared: number }> {
  return apiDelete<{ cleared: number }>(`${base()}/trips`)
}

export async function assignDriverToTrip(tripId: string, driverId: string): Promise<void> {
  await apiPost(`${base()}/trips/${tripId}/driver`, { driverId })
}

export async function startSimulation(): Promise<void> {
  await apiPost(`${base()}/simulation/start`)
}

export async function stopSimulation(): Promise<void> {
  await apiPost(`${base()}/simulation/stop`)
}

export async function replanTripByTripId(tripId: string): Promise<void> {
  await apiPost(`${base()}/trips/${tripId}/replan`)
}