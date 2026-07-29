'use server'

import { db } from '@/lib/db'
import { centers, drivers, mealDeliveries, participants, vehicles } from '@/lib/db/schema'
import { emit } from '@/lib/db/emit'
import { buildRoutePath } from '@/lib/geo'
import type { LatLng, MealStop, MealDelivery } from '@/lib/types'
import { eq } from 'drizzle-orm'

function newId(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}-${Math.floor(Math.random() * 1000)}`
}

// Rough great-circle-ish distance for a polyline in km (matches seed math).
function pathDistanceKm(path: LatLng[]): number {
  if (path.length < 2) return 0
  let km = 0
  for (let i = 1; i < path.length; i++) {
    const a = path[i - 1]
    const b = path[i]
    const dx = (b.lat - a.lat) * 111
    const dy = (b.lng - a.lng) * 85
    km += Math.sqrt(dx * dx + dy * dy)
  }
  return Math.round(km * 10) / 10
}

export interface MealDeliveryInput {
  centerId: string
  vehicleId: string | null
  driverId: string | null
  date: string
  departTime: string
  mealType: MealDelivery['mealType']
  participantIds: string[]
  mealsPerStop?: Record<string, number>
}

// Creates a meal-delivery run: fleet picks meals up at a center/kitchen and
// drops them at each participant's home. Builds a real OSRM route.
export async function createMealDelivery(input: MealDeliveryInput, actorRole = 'operations') {
  const [centerRow] = await db.select().from(centers).where(eq(centers.id, input.centerId))
  if (!centerRow) return null

  const partRows = input.participantIds.length
    ? (await db.select().from(participants)).filter((p) => input.participantIds.includes(p.id))
    : []

  const stops: MealStop[] = partRows.map((p, order) => ({
    participantId: p.id,
    location: p.location,
    order,
    etaMinutes: (order + 1) * 7,
    mealCount: input.mealsPerStop?.[p.id] ?? 1,
    status: 'pending',
  }))
  const totalMeals = stops.reduce((s, x) => s + x.mealCount, 0)

  const waypoints: LatLng[] = [centerRow.location, ...partRows.map((p) => p.location)]
  const routePath = await buildRoutePath(waypoints)
  const distanceKm = pathDistanceKm(routePath)
  const durationMinutes = Math.round(distanceKm * 2.4 + stops.length * 3)

  const id = newId('meal')
  const runNumber = `MD-${Math.floor(1000 + Math.random() * 9000)}`
  await db.insert(mealDeliveries).values({
    id,
    runNumber,
    centerId: input.centerId,
    vehicleId: input.vehicleId,
    driverId: input.driverId,
    date: input.date,
    departTime: input.departTime,
    mealType: input.mealType,
    totalMeals,
    stops,
    status: 'scheduled',
    distanceKm,
    durationMinutes,
    progress: 0,
    currentLocation: centerRow.location,
    routePath,
    startedAt: null,
    lastTickAt: null,
  })

  if (input.vehicleId) {
    await db.update(vehicles).set({ status: 'assigned' }).where(eq(vehicles.id, input.vehicleId))
  }
  if (input.driverId) {
    await db.update(drivers).set({ status: 'on-trip' }).where(eq(drivers.id, input.driverId))
  }

  await emit({
    eventType: 'meal.created',
    aggregateType: 'meal',
    aggregateId: id,
    actorRole,
    summary: `Meal run ${runNumber} created — ${totalMeals} meals to ${stops.length} stop${stops.length === 1 ? '' : 's'}`,
    payload: { runNumber, totalMeals, stops: stops.length, mealType: input.mealType },
  })
  return id
}

export async function startMealDelivery(id: string, actorRole = 'dispatcher') {
  const now = new Date()
  const [row] = await db.select().from(mealDeliveries).where(eq(mealDeliveries.id, id))
  if (!row) return
  await db
    .update(mealDeliveries)
    .set({ status: 'en-route', startedAt: now, lastTickAt: now, progress: 0 })
    .where(eq(mealDeliveries.id, id))
  if (row.vehicleId) {
    await db.update(vehicles).set({ status: 'heading-to-pickup' }).where(eq(vehicles.id, row.vehicleId))
  }
  await emit({
    eventType: 'meal.started',
    aggregateType: 'meal',
    aggregateId: id,
    actorRole,
    summary: `Meal run ${row.runNumber} started — en route to first drop-off`,
  })
}

export async function cancelMealDelivery(id: string, actorRole = 'dispatcher') {
  const [row] = await db.select().from(mealDeliveries).where(eq(mealDeliveries.id, id))
  if (!row) return
  await db.update(mealDeliveries).set({ status: 'cancelled' }).where(eq(mealDeliveries.id, id))
  if (row.vehicleId) {
    await db.update(vehicles).set({ status: 'available' }).where(eq(vehicles.id, row.vehicleId))
  }
  if (row.driverId) {
    await db.update(drivers).set({ status: 'available' }).where(eq(drivers.id, row.driverId))
  }
  await emit({
    eventType: 'meal.cancelled',
    aggregateType: 'meal',
    aggregateId: id,
    actorRole,
    summary: `Meal run ${row.runNumber} cancelled`,
  })
}
