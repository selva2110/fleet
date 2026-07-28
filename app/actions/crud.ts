'use server'

import { db } from '@/lib/db'
import { drivers, events, participants, vehicles } from '@/lib/db/schema'
import { emit } from '@/lib/db/emit'
import { MAP_CENTER } from '@/lib/geo'
import type {
  Driver,
  EventReminder,
  FleetEvent,
  Participant,
  Vehicle,
} from '@/lib/types'
import { eq } from 'drizzle-orm'

function newId(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}-${Math.floor(Math.random() * 1000)}`
}

const DEFAULT_REMINDER_OFFSETS_MINUTES = [240]

function buildEventReminders(
  input: Pick<FleetEvent, 'date' | 'startTime'> & { reminders?: EventReminder[] },
): EventReminder[] {
  const reminderOffsets = Array.isArray(input.reminders) && input.reminders.length > 0
    ? input.reminders
        .map((reminder) => Number(reminder?.offsetMinutes))
        .filter((value): value is number => Number.isFinite(value) && value > 0)
    : DEFAULT_REMINDER_OFFSETS_MINUTES

  if (!input.date || !input.startTime) return []

  const [hours, minutes] = input.startTime.split(':').map((part) => Number.parseInt(part, 10))
  if ([hours, minutes].some((value) => Number.isNaN(value))) return []

  const startDateTime = new Date(`${input.date}T${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:00`)
  if (Number.isNaN(startDateTime.getTime())) return []

  return reminderOffsets.map((offsetMinutes, index) => {
    const scheduledAt = new Date(startDateTime.getTime() - offsetMinutes * 60_000)
    return {
      id: `${input.date}-${input.startTime}-${offsetMinutes}-${index}`,
      offsetMinutes,
      scheduledAt: scheduledAt.toISOString(),
      sent: false,
    }
  })
}

/* ----------------------------- Participants ----------------------------- */

export type ParticipantInput = Omit<Participant, 'id' | 'location' | 'status'> & {
  location?: Participant['location']
  status?: Participant['status']
}

export async function saveParticipant(
  input: ParticipantInput & { id?: string },
  actorRole = 'admin',
) {
  const isNew = !input.id
  const id = input.id ?? newId('p')
  const location = input.location ?? jitter(MAP_CENTER)
  const values = {
    id,
    name: input.name,
    phone: input.phone,
    emergencyContact: input.emergencyContact,
    address: input.address,
    location,
    medicalNotes: input.medicalNotes,
    constraints: input.constraints,
    maxTravelMinutes: input.maxTravelMinutes,
    pickupWindow: input.pickupWindow,
    mobilityLevel: input.mobilityLevel,
    medicalPriority: input.medicalPriority,
    eligible: input.eligible,
    status: input.status ?? ('registered' as Participant['status']),
    eventId: input.eventId,
  }

  if (isNew) {
    await db.insert(participants).values(values)
  } else {
    await db.update(participants).set(values).where(eq(participants.id, id))
  }

  await emit({
    eventType: isNew ? 'participant.created' : 'participant.updated',
    aggregateType: 'participant',
    aggregateId: id,
    actorRole,
    summary: `${isNew ? 'Added' : 'Updated'} participant ${input.name}`,
    payload: { mobilityLevel: input.mobilityLevel, medicalPriority: input.medicalPriority },
  })
  return id
}

export async function deleteParticipant(id: string, name: string, actorRole = 'admin') {
  await db.delete(participants).where(eq(participants.id, id))
  await emit({
    eventType: 'participant.deleted',
    aggregateType: 'participant',
    aggregateId: id,
    actorRole,
    summary: `Removed participant ${name}`,
  })
}

/* ------------------------------- Vehicles -------------------------------- */

export type VehicleInput = Omit<Vehicle, 'id' | 'location' | 'status'> & {
  address: Vehicle['address']
  location?: Vehicle['location']
  status?: Vehicle['status']
}

export async function saveVehicle(
  input: VehicleInput & { id?: string },
  actorRole = 'admin',
) {
  const isNew = !input.id
  const id = input.id ?? newId('v')
  const values = {
    id,
    name: input.name,
    address: input.address,
    type: input.type,
    capacity: input.capacity,
    wheelchairCapacity: input.wheelchairCapacity,
    oxygenEquipment: input.oxygenEquipment,
    liftAvailable: input.liftAvailable,
    bariatricCapable: input.bariatricCapable,
    stretcherCapable: input.stretcherCapable,
    fuelType: input.fuelType,
    maintenanceStatus: input.maintenanceStatus,
    status: input.status ?? ('available' as Vehicle['status']),
    location: input.location ?? jitter(MAP_CENTER),
    imageUrl: input.imageUrl ?? null,
  }
  if (isNew) {
    await db.insert(vehicles).values(values)
  } else {
    await db.update(vehicles).set(values).where(eq(vehicles.id, id))
  }
  await emit({
    eventType: isNew ? 'vehicle.created' : 'vehicle.updated',
    aggregateType: 'vehicle',
    aggregateId: id,
    actorRole,
    summary: `${isNew ? 'Added' : 'Updated'} vehicle ${input.name}`,
    payload: { type: input.type, capacity: input.capacity },
  })
  return id
}

export async function deleteVehicle(id: string, name: string, actorRole = 'admin') {
  await db.delete(vehicles).where(eq(vehicles.id, id))
  await emit({
    eventType: 'vehicle.deleted',
    aggregateType: 'vehicle',
    aggregateId: id,
    actorRole,
    summary: `Removed vehicle ${name}`,
  })
}

/* -------------------------------- Drivers -------------------------------- */

export type DriverInput = Omit<Driver, 'id' | 'status' | 'location'> & {
  location?: Driver['location']
  status?: Driver['status']
}

export async function saveDriver(
  input: DriverInput & { id?: string },
  actorRole = 'admin',
) {
  const isNew = !input.id
  const id = input.id ?? newId('d')
  const values = {
    id,
    name: input.name,
    phone: input.phone,
    address: input.address,
    location: input.location ?? jitter(MAP_CENTER),
    license: input.license,
    certifications: input.certifications,
    assignedVehicleId: input.assignedVehicleId,
    status: input.status ?? ('available' as Driver['status']),
    rating: input.rating,
    shiftStart: input.shiftStart,
    shiftEnd: input.shiftEnd,
    shiftDays: input.shiftDays,
    imageUrl: input.imageUrl ?? null,
  }
  if (isNew) {
    await db.insert(drivers).values(values)
  } else {
    await db.update(drivers).set(values).where(eq(drivers.id, id))
  }
  await emit({
    eventType: isNew ? 'driver.created' : 'driver.updated',
    aggregateType: 'driver',
    aggregateId: id,
    actorRole,
    summary: `${isNew ? 'Added' : 'Updated'} driver ${input.name}`,
  })
  return id
}

export async function deleteDriver(id: string, name: string, actorRole = 'admin') {
  await db.delete(drivers).where(eq(drivers.id, id))
  await emit({
    eventType: 'driver.deleted',
    aggregateType: 'driver',
    aggregateId: id,
    actorRole,
    summary: `Removed driver ${name}`,
  })
}

/* -------------------------------- Events --------------------------------- */

export type EventInput = Omit<FleetEvent, 'id'>

export async function saveEvent(
  input: EventInput & { id?: string },
  actorRole = 'admin',
) {
  const isNew = !input.id
  const id = input.id ?? newId('evt')
  const reminders = buildEventReminders({
    date: input.date,
    startTime: input.startTime,
    reminders: input.reminders,
  })
  const values = {
    id,
    name: input.name,
    type: input.type,
    centerId: input.centerId,
    date: input.date,
    startTime: input.startTime,
    endTime: input.endTime,
    expectedAttendance: input.expectedAttendance,
    participantIds: input.participantIds,
    reminders,
    status: input.status,
  }
  if (isNew) {
    await db.insert(events).values(values)
  } else {
    await db.update(events).set(values).where(eq(events.id, id))
  }
  await emit({
    eventType: isNew ? 'event.created' : 'event.updated',
    aggregateType: 'event',
    aggregateId: id,
    actorRole,
    summary: `${isNew ? 'Created' : 'Updated'} event ${input.name}`,
    payload: { type: input.type, status: input.status, reminders: reminders.length },
  })
  return id
}

export async function deleteEvent(id: string, name: string, actorRole = 'admin') {
  await db.delete(events).where(eq(events.id, id))
  await emit({
    eventType: 'event.deleted',
    aggregateType: 'event',
    aggregateId: id,
    actorRole,
    summary: `Deleted event ${name}`,
  })
}

export async function markEventReminderSent(eventId: string, reminders: EventReminder[]) {
  await db.update(events).set({ reminders }).where(eq(events.id, eventId))
  await emit({
    eventType: 'event.reminder.sent',
    aggregateType: 'event',
    aggregateId: eventId,
    actorRole: 'admin',
    summary: 'Sent reminder for event',
    payload: { reminders: reminders.filter((reminder) => reminder.sent).length },
  })
}

function jitter(base: { lat: number; lng: number }) {
  return {
    lat: base.lat + (Math.random() - 0.5) * 0.05,
    lng: base.lng + (Math.random() - 0.5) * 0.05,
  }
}
