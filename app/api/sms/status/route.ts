import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { smsNotifications } from '@/lib/db/schema'
import { emit } from '@/lib/db/emit'
import { validateTwilioSignature } from '@/lib/sms/twilio'
import type { SmsDeliveryStatus } from '@/lib/types'

// Twilio delivery status callback. Configured per-message via statusCallback.
// Twilio sends application/x-www-form-urlencoded with MessageSid + MessageStatus.

function mapStatus(raw: string): SmsDeliveryStatus {
  switch (raw) {
    case 'delivered':
      return 'delivered'
    case 'undelivered':
      return 'undelivered'
    case 'failed':
      return 'failed'
    case 'sent':
      return 'sent'
    default:
      return 'queued'
  }
}

export async function POST(req: Request) {
  const form = await req.formData()
  const params: Record<string, string> = {}
  for (const [k, v] of form.entries()) params[k] = String(v)

  const signature = req.headers.get('x-twilio-signature')
  if (!validateTwilioSignature(signature, req.url, params)) {
    return new Response('Invalid signature', { status: 403 })
  }

  const sid = params.MessageSid || params.SmsSid
  const status = params.MessageStatus || params.SmsStatus
  if (!sid || !status) return new Response('ok', { status: 200 })

  const mapped = mapStatus(status)
  const [row] = await db
    .select()
    .from(smsNotifications)
    .where(eq(smsNotifications.messageSid, sid))

  if (row) {
    await db
      .update(smsNotifications)
      .set({ deliveryStatus: mapped, updatedAt: new Date() })
      .where(eq(smsNotifications.id, row.id))

    if (mapped === 'delivered' || mapped === 'failed' || mapped === 'undelivered') {
      await emit({
        eventType: mapped === 'delivered' ? 'notification.delivered' : 'notification.failed',
        aggregateType: 'event',
        aggregateId: row.eventId,
        actorRole: 'system',
        summary: `SMS ${mapped} for a participant`,
        payload: { participantId: row.participantId, status: mapped },
      })
    }
  }

  return new Response('ok', { status: 200 })
}
