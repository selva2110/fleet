'use server'

import { and, eq } from 'drizzle-orm'
import { headers } from 'next/headers'
import { db } from '@/lib/db'
import { events, participants, smsNotifications } from '@/lib/db/schema'
import { emit } from '@/lib/db/emit'
import { sendSms, twilioConfigured } from '@/lib/sms/twilio'
import { buildNotificationMessage, responseCutoff } from '@/lib/notifications'
import { toEvent } from '@/lib/db/mappers'

function newId(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}-${Math.floor(Math.random() * 1e6).toString(36)}`
}

async function getBaseUrl(): Promise<string> {
  const h = await headers()
  const host = h.get('x-forwarded-host') ?? h.get('host')
  const proto = h.get('x-forwarded-proto') ?? 'https'
  if (host) return `${proto}://${host}`
  return process.env.NEXT_PUBLIC_APP_URL ?? ''
}

export interface SendNotificationsResult {
  configured: boolean
  total: number
  sent: number
  failed: number
  skipped: number
  message: string
}

// Sends bulk SMS program notifications to every rostered participant with a
// phone number. Re-running updates existing rows instead of duplicating.
export async function sendEventNotifications(
  eventId: string,
  actorRole = 'dispatcher',
): Promise<SendNotificationsResult> {
  const [eventRow] = await db.select().from(events).where(eq(events.id, eventId))
  if (!eventRow) {
    return { configured: twilioConfigured(), total: 0, sent: 0, failed: 0, skipped: 0, message: 'Event not found' }
  }
  const event = toEvent(eventRow)

  const roster = event.participantIds
  const allParticipants = await db.select().from(participants)
  const recipients = allParticipants.filter(
    (p) => roster.includes(p.id) && p.eligible && p.phone && p.phone.trim().length > 0,
  )

  if (!twilioConfigured()) {
    return {
      configured: false,
      total: recipients.length,
      sent: 0,
      failed: 0,
      skipped: recipients.length,
      message: 'Twilio is not configured. Add TWILIO_* environment variables to send SMS.',
    }
  }

  const base = await getBaseUrl()
  const statusCallback = base ? `${base}/api/sms/status` : undefined
  const cutoff = responseCutoff(event)

  let sent = 0
  let failed = 0

  const body = (centerName: string) =>
    buildNotificationMessage({
      eventName: event.name,
      centerName,
      date: event.date,
      startTime: event.startTime,
      cutoff,
    })

  // Resolve center name once.
  const centerName = await resolveCenterName(event.centerId)

  for (const p of recipients) {
    const result = await sendSms({ to: p.phone, body: body(centerName), statusCallback })
    const now = new Date()
    const [existing] = await db
      .select()
      .from(smsNotifications)
      .where(and(eq(smsNotifications.eventId, eventId), eq(smsNotifications.participantId, p.id)))

    const values = {
      messageSid: result.sid,
      phone: p.phone,
      deliveryStatus: result.ok ? ('sent' as const) : ('failed' as const),
      sentAt: now,
      updatedAt: now,
    }

    if (existing) {
      await db
        .update(smsNotifications)
        .set({ ...values, response: null, responseBody: null, respondedAt: null })
        .where(eq(smsNotifications.id, existing.id))
    } else {
      await db.insert(smsNotifications).values({
        id: newId('sms'),
        eventId,
        participantId: p.id,
        ...values,
      })
    }

    if (result.ok) sent += 1
    else failed += 1
  }

  // Publish a draft/planning event once notifications go out.
  if (event.status === 'draft' || event.status === 'planning') {
    await db.update(events).set({ status: 'scheduled' }).where(eq(events.id, eventId))
  }

  await emit({
    eventType: 'notification.sent',
    aggregateType: 'event',
    aggregateId: eventId,
    actorRole,
    summary: `Sent ${sent} SMS notification${sent === 1 ? '' : 's'} for ${event.name}`,
    payload: { sent, failed, total: recipients.length },
  })

  return {
    configured: true,
    total: recipients.length,
    sent,
    failed,
    skipped: 0,
    message: `Sent ${sent} of ${recipients.length} notifications${failed ? ` (${failed} failed)` : ''}.`,
  }
}

async function resolveCenterName(centerId: string): Promise<string> {
  const { centers } = await import('@/lib/db/schema')
  const [row] = await db.select().from(centers).where(eq(centers.id, centerId))
  return row?.name ?? ''
}

// Assigns transport to every participant whose latest response is
// "attending_transport" by queueing them onto the event for the planner.
export async function assignTransportForResponders(
  eventId: string,
  actorRole = 'dispatcher',
): Promise<{ assigned: number }> {
  const rows = await db
    .select()
    .from(smsNotifications)
    .where(and(eq(smsNotifications.eventId, eventId), eq(smsNotifications.response, 'attending_transport')))

  let assigned = 0
  for (const row of rows) {
    await db
      .update(participants)
      .set({ eventId, status: 'scheduled' })
      .where(eq(participants.id, row.participantId))
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
