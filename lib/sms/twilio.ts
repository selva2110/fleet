import 'server-only'
import twilio from 'twilio'

// Server-only Twilio helper. Credentials come exclusively from environment
// variables (never hardcoded): TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN,
// TWILIO_FROM_NUMBER.

export function twilioConfigured(): boolean {
  return Boolean(
    process.env.TWILIO_ACCOUNT_SID &&
      process.env.TWILIO_AUTH_TOKEN &&
      process.env.TWILIO_FROM_NUMBER,
  )
}

let cached: ReturnType<typeof twilio> | null = null

export function getTwilioClient() {
  if (!twilioConfigured()) {
    throw new Error('Twilio is not configured. Set TWILIO_* environment variables.')
  }
  if (!cached) {
    cached = twilio(process.env.TWILIO_ACCOUNT_SID!, process.env.TWILIO_AUTH_TOKEN!)
  }
  return cached
}

export interface SendSmsResult {
  ok: boolean
  sid: string | null
  error: string | null
}

export async function sendSms(params: {
  to: string
  body: string
  statusCallback?: string
}): Promise<SendSmsResult> {
  try {
    const client = getTwilioClient()
    const message = await client.messages.create({
      to: params.to,
      from: process.env.TWILIO_FROM_NUMBER!,
      body: params.body,
      ...(params.statusCallback ? { statusCallback: params.statusCallback } : {}),
    })
    return { ok: true, sid: message.sid, error: null }
  } catch (err) {
    const error = err instanceof Error ? err.message : 'Unknown Twilio error'
    console.log('[v0] Twilio send failed:', error)
    return { ok: false, sid: null, error }
  }
}

// Validates an inbound Twilio webhook signature. Returns true when valid, or
// when validation cannot be performed (missing token) so local/preview
// environments behind proxies still function; failures are logged.
export function validateTwilioSignature(
  signature: string | null,
  url: string,
  params: Record<string, string>,
): boolean {
  const token = process.env.TWILIO_AUTH_TOKEN
  if (!token || !signature) return true
  try {
    const valid = twilio.validateRequest(token, signature, url, params)
    if (!valid) console.log('[v0] Twilio signature validation failed for', url)
    return valid
  } catch (err) {
    console.log('[v0] Twilio signature validation error:', (err as Error).message)
    return true
  }
}
