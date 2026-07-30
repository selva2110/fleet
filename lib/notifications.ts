// Pure, dependency-free helpers for the SMS program-notification module.
// Safe to import from both client components and server route handlers
// (no 'twilio', no 'server-only', no DB access here).

import type { FleetEvent, SmsResponseCode } from '@/lib/types'

export const RESPONSE_META: Record<
  SmsResponseCode,
  { label: string; short: string; cls: string; dot: string }
> = {
  attending_transport: {
    label: 'Attending — needs transport',
    short: 'Needs transport',
    cls: 'bg-primary/15 text-primary',
    dot: 'bg-primary',
  },
  attending_self: {
    label: 'Attending — own transport',
    short: 'Own transport',
    cls: 'bg-success/20 text-success',
    dot: 'bg-success',
  },
  not_attending: {
    label: 'Not attending',
    short: 'Not attending',
    cls: 'bg-destructive/15 text-destructive',
    dot: 'bg-destructive',
  },
}

// Maps an inbound SMS body to a response code. Accepts the leading digit
// (1/2/3) as well as a few common keyword fallbacks.
export function parseSmsResponse(body: string): SmsResponseCode | null {
  const text = body.trim().toLowerCase()
  const firstChar = text.charAt(0)
  if (firstChar === '1') return 'attending_self'
  if (firstChar === '2') return 'attending_transport'
  if (firstChar === '3') return 'not_attending'
  if (/\bown\b/.test(text)) return 'attending_self'
  if (/\btransport|ride|pick ?up\b/.test(text)) return 'attending_transport'
  if (/\bno\b|not attending|can'?t|cannot/.test(text)) return 'not_attending'
  return null
}

// The event's local start time as a Date (dates are stored "YYYY-MM-DD" and
// times "HH:MM" in the operator's local zone).
export function eventStartDateTime(event: Pick<FleetEvent, 'date' | 'startTime'>): Date | null {
  if (!event.date || !event.startTime) return null
  const [h, m] = event.startTime.split(':').map((p) => Number.parseInt(p, 10))
  if (Number.isNaN(h) || Number.isNaN(m)) return null
  const [y, mo, d] = event.date.split('-').map((p) => Number.parseInt(p, 10))
  if ([y, mo, d].some(Number.isNaN)) return null
  return new Date(y, mo - 1, d, h, m, 0, 0)
}

// Responses are accepted until the earlier of: the registration deadline, or
// one hour before the event starts. This is the hard cutoff from the spec.
export function responseCutoff(event: FleetEvent): Date | null {
  const start = eventStartDateTime(event)
  if (!start) return null
  const oneHourBefore = new Date(start.getTime() - 60 * 60 * 1000)
  if (event.registrationDeadline) {
    const deadline = new Date(event.registrationDeadline)
    if (!Number.isNaN(deadline.getTime())) {
      return deadline < oneHourBefore ? deadline : oneHourBefore
    }
  }
  return oneHourBefore
}

export function isResponseWindowOpen(event: FleetEvent, now: Date = new Date()): boolean {
  const cutoff = responseCutoff(event)
  if (!cutoff) return false
  return now.getTime() < cutoff.getTime()
}

// Builds the outbound bulk-notification message body.
export function buildNotificationMessage(params: {
  eventName: string
  centerName: string
  date: string
  startTime: string
  cutoff: Date | null
  reminder?: boolean
}): string {
  const { eventName, centerName, date, startTime, cutoff, reminder } = params
  const when = cutoff
    ? cutoff.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      })
    : null
  const lines = [
    `${reminder ? 'REMINDER — ' : ''}PACE Program: ${eventName}`,
    `${date} at ${startTime}${centerName ? ` · ${centerName}` : ''}`,
    'Reply:',
    '1 = Attending (own transport)',
    '2 = Attending (need transport)',
    '3 = Not attending',
  ]
  if (when) lines.push(`Please reply by ${when}.`)
  return lines.join('\n')
}
