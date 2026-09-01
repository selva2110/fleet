'use server'

// Thin proxies to event-notification, which now owns SMS campaign
// send/reminder logic and delegates actual delivery to notification-service.

import * as eventsApi from '@/lib/api/events'
import { assignParticipantToEvent } from '@/lib/api/participants'
import { emit } from '@/lib/api/events'
import { ReminderResult, SendNotificationsResponse } from '@/lib/notification/types';


export async function sendEventNotifications(
  eventId: string,
  _actorRole = 'dispatcher',
): Promise<SendNotificationsResponse> {
  const result = await eventsApi.sendEventNotifications(eventId)
  return {
    configured: true,
    total: result.recipients,
    sent: result.recipients,
    failed: 0,
    skipped: 0,
    message: result.message,
  }
}

export async function processDueReminders(_now: Date = new Date(), _actorRole = 'system'): Promise<ReminderResult> {
  const result = await eventsApi.processDueReminders()
  return {
    configured: true,
    processedEvents: result.processedEvents,
    reminders: result.remindersFired,
    sent: result.remindersFired,
    message: `Processed ${result.remindersFired} reminder wave(s) across ${result.processedEvents} event(s).`,
  }
}

// Manually (re-)applies transport assignment for every participant who has
// already responded "attending, need transport" for this event. Normally
// this happens automatically the moment a reply is recorded (see
// be/event-notification's trip-confirmation callback) — this is a manual
// re-sync for responses that arrived before a roster change, etc.
export async function assignTransportForResponders(
  eventId: string,
  actorRole = 'dispatcher',
): Promise<{ assigned: number }> {
  const responses = await eventsApi.getParticipantResponses(eventId)
  const responders = responses.filter((r) => r.is_participant === 'attending_transport')

  let assigned = 0
  for (const responder of responders) {
    await assignParticipantToEvent(responder.participant_id, eventId, 'scheduled')
    assigned += 1
  }

  await emit({
    eventType: 'notification.response',
    aggregateType: 'event',
    aggregateId: eventId,
    actorRole,
    summary: `Queued ${assigned} participant${assigned === 1 ? '' : 's'} for transport planning`,
    payload: { assigned },
  })

  return { assigned }
}
