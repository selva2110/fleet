import 'server-only'
import { apiDelete, apiGet, apiPost, apiPut, SERVICE_URLS } from './http'
import { Center, CenterListResponse, CenterResponse, EmitInput, EventInput, EventReminder, FleetEvent } from '../events/types';
import { DomainEventLogRow, ReminderSweepResult, SendNotificationsResult, SmsNotification, SmsResponseCode } from '../notification/types';
import { ParticipantResponseRow } from '../participant/types';
import { localToUtcParts, utcToLocalParts } from '../date';

function toCenter(r: CenterResponse): Center {
  const { createdAt: _c, updatedAt: _u, ...rest } = r
  return rest
}

// The backend stores an event's date/startTime/endTime/returnTime as UTC.
// The UI works in the browser's local time throughout, so every event is
// converted at this boundary: local -> UTC on the way out, UTC -> local on
// the way in.
function fromLocalEvent<T extends Pick<FleetEvent, 'date' | 'startTime' | 'endTime' | 'returnTime'>>(
  event: T,
): T {
  const { date, time: startTime } = localToUtcParts(event.date, event.startTime)
  const endTime = localToUtcParts(event.date, event.endTime).time
  const returnTime = event.returnTime ? localToUtcParts(event.date, event.returnTime).time : event.returnTime
  return { ...event, date, startTime, endTime, returnTime }
}

function toLocalEvent<T extends Pick<FleetEvent, 'date' | 'startTime' | 'endTime' | 'returnTime'>>(event: T): T {
  const { date, time: startTime } = utcToLocalParts(event.date, event.startTime)
  const endTime = utcToLocalParts(event.date, event.endTime).time
  const returnTime = event.returnTime ? utcToLocalParts(event.date, event.returnTime).time : event.returnTime
  return { ...event, date, startTime, endTime, returnTime }
}

const eventBase = () => `${SERVICE_URLS.event()}/event`
const centerBase = () => `${SERVICE_URLS.participant()}/api/v1`

function newId(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}-${Math.floor(Math.random() * 1000)}`
}

export async function listEvents(): Promise<FleetEvent[]> {
  const res = await apiGet<{ events: FleetEvent[] }>(`${eventBase()}/get-all-events`)
  return res.events.map(toLocalEvent)
}

//Not used Anywhere
export async function getEvent(id: string): Promise<FleetEvent> {
  return toLocalEvent(await apiGet<FleetEvent>(`${eventBase()}/get-by-id/${id}`))
}

export async function saveEvent(input: EventInput & { id?: string }): Promise<string> {
  const isNew = !input.id
  const body = { ...fromLocalEvent(input), id: input.id ?? newId('evt') }
  const res = isNew
    ? await apiPost<{ id: string }>(`${eventBase()}/save-event`, body)
    : await apiPut<{ id: string }>(`${eventBase()}/update-event/${body.id}`, body)
  return res.id
}

export async function deleteEvent(id: string, name: string): Promise<void> {
  await apiDelete(`${eventBase()}/delete-event`, { id, name })
}

export async function rescheduleEvent(id: string, newDate: string): Promise<void> {
  await apiPut(`${eventBase()}/rescheule-event`, { id, newDate: localToUtcParts(newDate).date })
}

export async function markEventReminderSent(eventId: string, reminders: EventReminder[]): Promise<void> {
  await apiPut(`${eventBase()}/mark-event-reminder`, { eventId, reminders })
}

export async function sendEventNotifications(eventId: string): Promise<SendNotificationsResult> {
  return apiPost<SendNotificationsResult>(`${eventBase()}/send-notifications/${eventId}`)
}

export async function processDueReminders(): Promise<ReminderSweepResult> {
  return apiPost<ReminderSweepResult>(`${eventBase()}/process-due-reminders`)
}

export async function getEventLog(limit = 200): Promise<DomainEventLogRow[]> {
  const res = await apiGet<{ eventLog: DomainEventLogRow[] }>(`${eventBase()}/event-log?limit=${limit}`)
  return res.eventLog
}

export async function getParticipantResponses(eventId: string): Promise<ParticipantResponseRow[]> {
  const res = await apiGet<{ responses: ParticipantResponseRow[] }>(`${eventBase()}/responses/${eventId}`)
  return res.responses
}

export async function replanTripByEventId(eventId: string): Promise<void> {
  await apiPost(`${eventBase()}/replan-trip/${eventId}`);
}

const RESPONSE_CODES: SmsResponseCode[] = ['attending_self', 'attending_transport', 'not_attending']

// Adapts event-notification's participant_response rows to the frontend's
// existing SmsNotification shape, so components built against that type
// (app/responses/page.tsx, components/events/event-detail.tsx,
// components/aurora/use-aurora-data.ts) don't need to change. Delivery-status
// granularity (queued/sent/delivered) isn't tracked at this layer — only
// whether a response was recorded — so deliveryStatus is a best-effort
// approximation, not a live Twilio status.
export function toSmsNotifications(rows: ParticipantResponseRow[]): SmsNotification[] {
  return rows.map((row) => {
    const response = RESPONSE_CODES.includes(row.is_participant as SmsResponseCode)
      ? (row.is_participant as SmsResponseCode)
      : null
    return {
      id: String(row.event_participant_id),
      eventId: row.event_id,
      participantId: row.participant_id,
      phone: '',
      messageSid: null,
      deliveryStatus: response ? 'received' : 'sent',
      response,
      responseBody: row.is_participant || null,
      respondedAt: response ? row.created_at : null,
      sentAt: row.created_at,
      updatedAt: row.created_at,
    }
  })
}

// Fetches participant responses for every rostered event and flattens them
// into one SmsNotification[] list, for the full-fleet snapshot.
export async function getAllParticipantResponses(events: FleetEvent[]): Promise<SmsNotification[]> {
  const all = await Promise.all(events.map((event) => getParticipantResponses(event.id).catch(() => [])))
  return toSmsNotifications(all.flat())
}

// Appends an audit-log row to the shared event_log table. Domains with no
// dedicated backend audit trail of their own (vehicles, participants,
// drivers — event-notification and trip-service write their own rows
// directly) call this from the frontend instead.
export async function emit(input: EmitInput): Promise<void> {
  await apiPost(`${eventBase()}/event-log`, input)
}

/* ----------------------------------- Centers ------------------------------------ */

export async function listCenters(): Promise<Center[]> {
  const res = await apiGet<CenterListResponse>(`${centerBase()}/centers?limit=200`)
  return res.data.map(toCenter)
}

//Not used Anywhere
export async function getCenter(id: string): Promise<Center> {
  return toCenter(await apiGet<CenterResponse>(`${centerBase()}/centers/${id}`))
}
