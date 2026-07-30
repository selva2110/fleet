import type { FleetEvent, Trip } from './types'

export type PlanStatus = {
  /** Whether participant SMS notifications are configured for this event. */
  notificationsEnabled: boolean
  /** Response cutoff after which a plan may be generated. */
  deadline: Date
  /** True once the response deadline has passed. */
  deadlinePassed: boolean
  /** True when at least one non-cancelled trip exists for the event. */
  hasPlan: boolean
  /** True when the dispatcher is allowed to generate a plan right now. */
  canGenerate: boolean
  /** Short reason the plan cannot be generated yet (when applicable). */
  blockedReason?: string
}

// Notifications are considered enabled when the event has reminders scheduled.
export function notificationsEnabled(event: FleetEvent): boolean {
  return (event.reminders?.length ?? 0) > 0
}

/**
 * Resolve the participant response deadline. Uses the explicit
 * registrationDeadline when set, otherwise falls back to one hour before the
 * event's start time (matching the SMS response-window rule).
 */
export function getResponseDeadline(event: FleetEvent): Date {
  if (event.registrationDeadline) {
    const explicit = new Date(event.registrationDeadline)
    if (!Number.isNaN(explicit.getTime())) return explicit
  }
  const start = new Date(`${event.date}T${event.startTime || '00:00'}:00`)
  return new Date(start.getTime() - 60 * 60 * 1000)
}

// An event has a plan once it has any non-cancelled trip.
export function eventHasPlan(eventId: string, trips: Trip[]): boolean {
  return trips.some((t) => t.eventId === eventId && t.status !== 'cancelled')
}

/**
 * Compute the full planning gate for an event: whether a plan exists, whether
 * notifications force us to wait for the response deadline, and whether the
 * dispatcher may generate a plan right now.
 */
export function getPlanStatus(event: FleetEvent, trips: Trip[], now: Date = new Date()): PlanStatus {
  const enabled = notificationsEnabled(event)
  const deadline = getResponseDeadline(event)
  const deadlinePassed = now.getTime() >= deadline.getTime()
  const hasPlan = eventHasPlan(event.id, trips)

  let canGenerate = true
  let blockedReason: string | undefined
  if (enabled && !deadlinePassed) {
    canGenerate = false
    blockedReason = `Awaiting participant responses until ${deadline.toLocaleString([], {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    })}`
  }

  return { notificationsEnabled: enabled, deadline, deadlinePassed, hasPlan, canGenerate, blockedReason }
}
