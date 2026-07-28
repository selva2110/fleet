import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { events, participants, smsNotifications } from '@/lib/db/schema'
import { emit } from '@/lib/db/emit'
import { toEvent } from '@/lib/db/mappers'
import { validateTwilioSignature } from '@/lib/sms/twilio'
import {
  RESPONSE_META,
  eventStartDateTime,
  isResponseWindowOpen,
  parseSmsResponse,
} from '@/lib/notifications'

// Twilio inbound message webhook (configure on the phone number). Receives the
// participant's reply, records the latest response against the nearest open
// program notification, and replies with a TwiML confirmation.

function twiml(message: string) {
  const escaped = message
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
  return new Response(
    `<?xml version="1.0" encoding="UTF-8"?><Response><Message>${escaped}</Message></Response>`,
    { status: 200, headers: { 'Content-Type': 'text/xml' } },
  )
}

function digits(phone: string) {
  return phone.replace(/\D/g, '').slice(-10)
}

export async function POST(req: Request) {
  const form = await req.formData()
  const params: Record<string, string> = {}
  for (const [k, v] of form.entries()) params[k] = String(v)

  const signature = req.headers.get('x-twilio-signature')
  if (!validateTwilioSignature(signature, req.url, params)) {
    return new Response('Invalid signature', { status: 403 })
  }

  const from = params.From ?? ''
  const body = params.Body ?? ''
  const code = parseSmsResponse(body)

  if (!from) return twiml('Sorry, we could not read your number.')
  if (!code) {
    return twiml('Please reply 1 (attending, own transport), 2 (attending, need transport), or 3 (not attending).')
  }

  // Match notifications for this phone by comparing the last 10 digits.
  const fromDigits = digits(from)
  const allRows = await db.select().from(smsNotifications)
  const matched = allRows.filter((r) => digits(r.phone) === fromDigits)

  if (matched.length === 0) {
    return twiml('We could not find an active program notification for your number.')
  }

  // Resolve each matched notification's event, keep those still open, then pick
  // the one whose event starts soonest.
  const now = new Date()
  const open: { row: (typeof matched)[number]; startMs: number }[] = []
  for (const row of matched) {
    const [evRow] = await db.select().from(events).where(eq(events.id, row.eventId))
    if (!evRow) continue
    const event = toEvent(evRow)
    if (!isResponseWindowOpen(event, now)) continue
    const start = eventStartDateTime(event)
    open.push({ row, startMs: start ? start.getTime() : Number.MAX_SAFE_INTEGER })
  }

  if (open.length === 0) {
    return twiml('The response window for your program has closed. Please contact your scheduler.')
  }

  open.sort((a, b) => a.startMs - b.startMs)
  const target = open[0].row

  await db
    .update(smsNotifications)
    .set({
      response: code,
      responseBody: body.slice(0, 500),
      respondedAt: now,
      deliveryStatus: 'received',
      updatedAt: now,
    })
    .where(eq(smsNotifications.id, target.id))

  // Transport is assigned only for participants who said they need it.
  if (code === 'attending_transport') {
    await db
      .update(participants)
      .set({ eventId: target.eventId, status: 'scheduled' })
      .where(eq(participants.id, target.participantId))
  } else {
    // Own-transport or not-attending: remove any prior transport assignment
    // for this event so we don't plan a ride they don't need.
    const [p] = await db.select().from(participants).where(eq(participants.id, target.participantId))
    if (p && p.eventId === target.eventId) {
      await db
        .update(participants)
        .set({ eventId: null, status: 'registered' })
        .where(eq(participants.id, target.participantId))
    }
  }

  await emit({
    eventType: 'notification.response',
    aggregateType: 'event',
    aggregateId: target.eventId,
    actorRole: 'participant',
    summary: `Participant responded: ${RESPONSE_META[code].label}`,
    payload: { participantId: target.participantId, response: code },
  })

  const confirmation: Record<typeof code, string> = {
    attending_self: 'Thanks! We have you attending with your own transport.',
    attending_transport: 'Thanks! We have you attending and will arrange transport.',
    not_attending: 'Thanks for letting us know you will not attend.',
  }
  return twiml(confirmation[code] + ' Reply again to update before the deadline.')
}
