'use server'

import { db } from '@/lib/db'
import {
  centers,
  drivers,
  eventLog,
  events,
  mealDeliveries,
  participants,
  smsNotifications,
  trips,
  vehicles,
} from '@/lib/db/schema'
import {
  toCenter,
  toDriver,
  toEvent,
  toMealDelivery,
  toParticipant,
  toSmsNotification,
  toTrip,
  toVehicle,
} from '@/lib/db/mappers'
import { seedDatabase } from '@/lib/db/seed'
import { emit } from '@/lib/db/emit'
import type { DomainEvent } from '@/lib/events'
import { desc } from 'drizzle-orm'

export interface FleetSnapshot {
  centers: ReturnType<typeof toCenter>[]
  participants: ReturnType<typeof toParticipant>[]
  vehicles: ReturnType<typeof toVehicle>[]
  drivers: ReturnType<typeof toDriver>[]
  events: ReturnType<typeof toEvent>[]
  trips: ReturnType<typeof toTrip>[]
  mealDeliveries: ReturnType<typeof toMealDelivery>[]
  smsNotifications: ReturnType<typeof toSmsNotification>[]
  eventLog: DomainEvent[]
  seeded: boolean
}

export async function getSnapshot(): Promise<FleetSnapshot> {
  const [centerRows, partRows, vehRows, drvRows, evtRows, tripRows, mealRows, smsRows, logRows] =
    await Promise.all([
      db.select().from(centers),
      db.select().from(participants),
      db.select().from(vehicles),
      db.select().from(drivers),
      db.select().from(events),
      db.select().from(trips),
      db.select().from(mealDeliveries),
      db.select().from(smsNotifications),
      db.select().from(eventLog).orderBy(desc(eventLog.createdAt)).limit(200),
    ])

  // Auto-seed on first load if the database is empty.
  if (centerRows.length === 0) {
    await seedDatabase()
    return getSnapshot()
  }

  return {
    centers: centerRows.map(toCenter),
    participants: partRows.map(toParticipant),
    vehicles: vehRows.map(toVehicle),
    drivers: drvRows.map(toDriver),
    events: evtRows.map(toEvent),
    trips: tripRows.map(toTrip),
    mealDeliveries: mealRows.map(toMealDelivery),
    smsNotifications: smsRows.map(toSmsNotification),
    eventLog: logRows.map((r) => ({
      id: r.id,
      eventType: r.eventType as DomainEvent['eventType'],
      aggregateType: r.aggregateType as DomainEvent['aggregateType'],
      aggregateId: r.aggregateId,
      actorRole: r.actorRole,
      summary: r.summary,
      payload: r.payload,
      createdAt: r.createdAt.toISOString(),
    })),
    seeded: true,
  }
}

export async function reseedDatabase() {
  await seedDatabase()
  return getSnapshot()
}

export async function resetSimulation() {
  await emit({
    eventType: 'system.reset',
    aggregateType: 'system',
    summary: 'Simulation state reset by operator',
  })
  await seedDatabase()
  return getSnapshot()
}
