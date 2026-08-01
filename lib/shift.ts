// Driver shift-timing helpers, shared between the planning engine (server)
// and the UI (e.g. the manual "assign driver" dropdown) so shift eligibility
// is defined in exactly one place — duplicating this check risks the two
// call sites silently drifting apart on what "on shift" means.

import type { Driver } from './types'

function timeToMinutes(t: string | null | undefined): number {
  if (typeof t !== 'string') return 0

  const [hStr, mStr] = t.trim().split(':')
  const h = Number(hStr)
  const m = Number(mStr)

  if (!Number.isFinite(h) || !Number.isFinite(m)) return 0
  return h * 60 + m
}

// Day-of-week (0=Sun..6=Sat) for a "YYYY-MM-DD" date string, parsed as local
// calendar date rather than UTC so it lines up with Date#getDay() everywhere
// else shift days are compared.
function dayOfWeekFromDate(dateStr: string | null | undefined): number {
  if (typeof dateStr !== 'string') return 0

  const normalized = dateStr.trim().split(/[T ]/)[0]
  const [yStr, mStr, dStr] = normalized.split('-')
  const y = Number(yStr)
  const m = Number(mStr)
  const d = Number(dStr)

  if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) return 0

  const safeMonth = Math.min(Math.max(m, 1), 12)
  const safeDay = Math.min(Math.max(d, 1), 31)
  return new Date(y, safeMonth - 1, safeDay).getDay()
}

// Is this time-of-day (minutes since midnight) within a driver's shift?
// shiftEnd < shiftStart means an overnight shift that wraps past midnight.
function timeWithinShift(shiftStartMin: number, shiftEndMin: number, t: number): boolean {
  if (shiftStartMin <= shiftEndMin) return t >= shiftStartMin && t <= shiftEndMin
  return t >= shiftStartMin || t <= shiftEndMin
}

// Deliberately checks only the event's start time, not the estimated
// pre-pickup travel time leading up to it — that travel time is a rounded
// heuristic estimate, and requiring it to also fall inside the shift makes
// the check fail on essentially-coincidental one-minute boundary rounding
// (e.g. a route needing to start at 07:59 excluding a driver on shift from
// 08:00) even though the driver is clearly on duty for the event itself.
export function isDriverOnShift(driver: Driver, eventDate: string, eventStartTime: string): boolean {
  return (
    driver.shiftDays.includes(dayOfWeekFromDate(eventDate)) &&
    timeWithinShift(timeToMinutes(driver.shiftStart), timeToMinutes(driver.shiftEnd), timeToMinutes(eventStartTime))
  )
}
