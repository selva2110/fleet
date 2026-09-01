import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'
import timezone from 'dayjs/plugin/timezone'

dayjs.extend(utc)
dayjs.extend(timezone)

const DATE_FORMAT = 'YYYY-MM-DD'
const TIME_FORMAT = 'HH:mm'

// The UI always works in IST regardless of the browser's or server's own
// timezone, so every local <-> UTC boundary conversion below is pinned to
// this zone explicitly rather than relying on the runtime's local time.
const IST_TIMEZONE = 'Asia/Kolkata'

function normalizedDate(value?: string | null): string {
  return value && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : dayjs().tz(IST_TIMEZONE).format(DATE_FORMAT)
}

function normalizedTime(value?: string | null): string {
  return value && /^\d{2}:\d{2}/.test(value) ? value.slice(0, 5) : '00:00'
}

export function localToUtcParts(date?: string | null, time?: string | null): { date: string; time: string } {
  const inIst = dayjs.tz(`${normalizedDate(date)}T${normalizedTime(time)}`, IST_TIMEZONE)
  const inUtc = inIst.utc()
  return { date: inUtc.format(DATE_FORMAT), time: inUtc.format(TIME_FORMAT) }
}

export function utcToLocalParts(date?: string | null, time?: string | null): { date: string; time: string } {
  const asUtc = dayjs.utc(`${normalizedDate(date)}T${normalizedTime(time)}`)
  const inIst = asUtc.tz(IST_TIMEZONE)
  return { date: inIst.format(DATE_FORMAT), time: inIst.format(TIME_FORMAT) }
}


export function localToUtcIso(date?: string | null, time?: string | null): string | null {
  if (!date) return null
  const inIst = dayjs.tz(`${normalizedDate(date)}T${normalizedTime(time)}`, IST_TIMEZONE)
  return inIst.isValid() ? inIst.utc().toISOString() : null
}

export function todayLocalDate(): string {
  return dayjs().tz(IST_TIMEZONE).format(DATE_FORMAT)
}

export function parseLocalDate(value?: string | Date | null): Date | null {
  if (!value) return null
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value
  }

  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (match) {
    const [, year, month, day] = match
    return new Date(Number(year), Number(month) - 1, Number(day))
  }

  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

export function formatMonthDayYear(value?: string | Date | null): string {
  const date = parseLocalDate(value)
  if (!date) return ''
  return date.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
}

export function formatMonthDayYearTime(value?: string | Date | null): string {
  const date = parseLocalDate(value)
  if (!date) return ''
  return `${date.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })} ${date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  })}`
}

export function formatTime(value?: string | Date | null): string {
  const date = parseLocalDate(value)
  if (!date) return ''
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  })
}

// For plain 24h "HH:mm" wall-clock values (shift/event/meal times) that
// aren't paired with a date, so they can't go through parseLocalDate/Date.
export function formatTimeOfDay(value?: string | null): string {
  if (!value) return ''

  const [hourString, minuteString] = value.split(':')
  const hour24 = Number(hourString)
  const minute = Number(minuteString)
  if (!Number.isFinite(hour24) || !Number.isFinite(minute)) return ''

  const suffix = hour24 >= 12 ? 'PM' : 'AM'
  const hour12 = hour24 % 12 || 12
  return `${hour12}:${String(minute).padStart(2, '0')} ${suffix}`
}
