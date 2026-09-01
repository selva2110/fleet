'use server'

// Thin proxies to the backend services that now own this logic:
// vehicle-service, participant-service, driver-service, event-notification.
// See lib/api/*.ts for the actual HTTP clients.

import * as vehiclesApi from '@/lib/api/vehicles'
import * as participantsApi from '@/lib/api/participants'
import * as driversApi from '@/lib/api/drivers'
import * as eventsApi from '@/lib/api/events'
import * as catalogApi from '@/lib/api/catalog'
import * as usersApi from '@/lib/api/users'
import { emit } from '@/lib/api/events'
import { COIMBATORE_MAP_CENTER } from '@/lib/geo'
import { ParticipantInput } from '@/lib/participant/types';
import { EventInput, FleetEvent } from '@/lib/events/types';
import { VehicleInput } from '@/lib/vehicles/types';
import { DriverInput } from '@/lib/driver/types';
import { FleetmapUtils } from '@/lib/fleetMap/utils';
import { CareItemForm, CareItemTypeForm } from '@/lib/catalog/types';
import { UserForm } from '@/lib/user/types';

/* ----------------------------- Participants ----------------------------- */

export async function saveParticipant(input: ParticipantInput & { id?: string }, actorRole = 'admin') {
  const isNew = !input.id
  const participant = isNew
    ? await participantsApi.createParticipant({
        ...input,
        status: input.status ?? 'registered',
        location: input.location ?? FleetmapUtils.jitter(COIMBATORE_MAP_CENTER),
        eventId: null,
      })
    : await participantsApi.updateParticipant(input.id!, input)

  await emit({
    eventType: isNew ? 'participant.created' : 'participant.updated',
    aggregateType: 'participant',
    aggregateId: participant.id,
    actorRole,
    summary: `${isNew ? 'Added' : 'Updated'} participant ${input.name}`,
    payload: { participantDetails: participant },
  })
  return participant.id
}

export async function deleteParticipant(id: string, name: string, actorRole = 'admin') {
  await participantsApi.deleteParticipant(id)
  await emit({
    eventType: 'participant.deleted',
    aggregateType: 'participant',
    aggregateId: id,
    actorRole,
    summary: `Removed participant ${name}`,
  })
}


export async function saveVehicle(input: VehicleInput & { id?: string }, actorRole = 'admin') {
  const isNew = !input.id
  const vehicle = isNew
    ? await vehiclesApi.createVehicle({
        ...input,
        status: input.status ?? 'available',
        location: input.location ?? FleetmapUtils.jitter(COIMBATORE_MAP_CENTER),
      })
    : await vehiclesApi.updateVehicle(input.id!, input)

  await emit({
    eventType: isNew ? 'vehicle.created' : 'vehicle.updated',
    aggregateType: 'vehicle',
    aggregateId: vehicle.id,
    actorRole,
    summary: `${isNew ? 'Added' : 'Updated'} vehicle ${input.name}`,
    payload: { type: input.type, capacity: input.capacity },
  })
  return vehicle.id
}

export async function deleteVehicle(id: string, name: string, actorRole = 'admin') {
  await vehiclesApi.deleteVehicle(id)
  await emit({
    eventType: 'vehicle.deleted',
    aggregateType: 'vehicle',
    aggregateId: id,
    actorRole,
    summary: `Removed vehicle ${name}`,
  })
}

/* -------------------------------- Drivers -------------------------------- */

export async function saveDriver(input: DriverInput & { id?: string }, actorRole = 'admin') {
  const isNew = !input.id
  const driver = isNew
    ? await driversApi.createDriver({
        ...input,
        status: input.status ?? 'available',
        location: input.location ?? FleetmapUtils.jitter(COIMBATORE_MAP_CENTER),
        phone: input.mobile_number,
      })
    : await driversApi.updateDriver(input.id!, input)

  await emit({
    eventType: isNew ? 'driver.created' : 'driver.updated',
    aggregateType: 'driver',
    aggregateId: driver.id,
    actorRole,
    summary: `${isNew ? 'Added' : 'Updated'} driver ${input.name}`,
  })
  return driver.id
}

export async function deleteDriver(id: string, name: string, actorRole = 'admin') {
  await driversApi.deleteDriver(id)
  await emit({
    eventType: 'driver.deleted',
    aggregateType: 'driver',
    aggregateId: id,
    actorRole,
    summary: `Removed driver ${name}`,
  })
}

/* -------------------------------- Events --------------------------------- */
export async function saveEvent(input: EventInput & { id?: string }, actorRole = 'admin') {
  const isNew = !input.id
  const id = await eventsApi.saveEvent(input)
  await emit({
    eventType: isNew ? 'event.created' : 'event.updated',
    aggregateType: 'event',
    aggregateId: id,
    actorRole,
    summary: `${isNew ? 'Created' : 'Updated'} event ${input.name}`,
    payload: { type: input.type, status: input.status },
  })
  return id
}

export async function deleteEvent(id: string, name: string, actorRole = 'admin') {
  await eventsApi.deleteEvent(id, name)
  await emit({
    eventType: 'event.deleted',
    aggregateType: 'event',
    aggregateId: id,
    actorRole,
    summary: `Deleted event ${name}`,
  })
}

export async function rescheduleEvent(id: string, newDate: string, actorRole = 'dispatcher') {
  await eventsApi.rescheduleEvent(id, newDate)
  await emit({
    eventType: 'event.updated',
    aggregateType: 'event',
    aggregateId: id,
    actorRole,
    summary: `Rescheduled event to ${newDate}`,
    payload: { date: newDate },
  })
}

export async function markEventReminderSent(eventId: string, reminders: FleetEvent['reminders']) {
  await eventsApi.markEventReminderSent(eventId, reminders ?? [])
  await emit({
    eventType: 'event.reminder.sent',
    aggregateType: 'event',
    aggregateId: eventId,
    actorRole: 'admin',
    summary: 'Sent reminder for event',
    payload: { reminders: (reminders ?? []).filter((reminder) => reminder.sent).length },
  })
}

export async function replanTripByEventId(eventId: string) {
  await eventsApi.replanTripByEventId(eventId)
  await emit({
    eventType: 'event.trips.replanned',
    aggregateType: 'event',
    aggregateId: eventId,
    actorRole: 'admin',
    summary: `Replan Trips for Event Id - ${eventId}`,
    payload: {},
  })
}

export async function saveCareItem(input: CareItemForm, id?: string) {
  const isNew = !id
  const careItem = isNew
    ? await catalogApi.saveCareItem(input)
    : await catalogApi.updateCareItem(input,id)
  await emit({
    eventType: isNew ? 'careItem.created' : 'careItem.updated',
    aggregateType: 'careItem',
    aggregateId: String(careItem.id),
    actorRole: 'admin',
    summary: `${isNew ? 'Added' : 'Updated'} CareItem ${input.name}`,
  })
  return careItem.id
}

export async function deleteCareItem(id: string, actorRole = 'admin') {
  await catalogApi.deleteCareItem(id)
  await emit({
    eventType: 'careItem.deleted',
    aggregateType: 'careItem',
    aggregateId: String(id),
    actorRole,
    summary: `Removed CareItem`,
  })
}

export async function saveCareItemType(input: CareItemTypeForm, id?: string) {
  const isNew = !id
  const careItemType = isNew
    ? await catalogApi.saveCareItemType(input)
    : await catalogApi.updateCareItemType(input, id)

  await emit({
    eventType: isNew ? 'careItemType.created' : 'careItemType.updated',
    aggregateType: 'careItemType',
    aggregateId: String(careItemType.id),
    actorRole: 'admin',
    summary: `${isNew ? 'Added' : 'Updated'} CareItemType ${input.name}`,
  })
  return careItemType.id
}

export async function deleteCareItemType(id: string, actorRole = 'admin') {
  await catalogApi.deleteCareItemType(id)
  await emit({
    eventType: 'careItemType.deleted',
    aggregateType: 'careItemType',
    aggregateId: String(id),
    actorRole,
    summary: `Removed CareItemType`,
  })
}

/* --------------------------------- Users --------------------------------- */

export async function saveUser(input: UserForm & { id?: string }, actorRole = 'admin') {
  const isNew = !input.id
  const { confirmPassword, password, ...rest } = input
  void confirmPassword
  const user = isNew
    ? await usersApi.createUser({
        ...rest,
        password,
      })
    : await usersApi.updateUser(input.id!, {
        ...rest,
        ...(password ? { password } : {}),
      })

  await emit({
    eventType: isNew ? 'user.created' : 'user.updated',
    aggregateType: 'user',
    aggregateId: user.id,
    actorRole,
    summary: `${isNew ? 'Added' : 'Updated'} user ${input.name}`,
    payload: { roleIds: input.roleIds, status: input.status },
  })
  return user.id
}

export async function deleteUser(id: string, name: string, actorRole = 'admin') {
  await usersApi.deleteUser(id)
  await emit({
    eventType: 'user.deleted',
    aggregateType: 'user',
    aggregateId: id,
    actorRole,
    summary: `Removed user ${name}`,
  })
}
