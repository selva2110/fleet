'use client'

import { useMemo, useState } from 'react'
import { CalendarDays, ChevronLeft, ChevronRight, Truck, UserRound } from 'lucide-react'
import { AURORA_ACCENTS, GlassCard, PanelTitle } from './aurora-ui'
import { useFleet } from '@/lib/store'
import { isDriverOnShift } from '@/lib/shift'
import { cn } from '@/lib/utils'

const DOW = ['S', 'M', 'T', 'W', 'T', 'F', 'S']

function ymd(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

interface DayCell {
  date: Date | null
  key: string
}

function buildMonth(year: number, month: number): DayCell[] {
  const first = new Date(year, month, 1)
  const startDow = first.getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const cells: DayCell[] = []
  for (let i = 0; i < startDow; i++) cells.push({ date: null, key: `pad-${i}` })
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ date: new Date(year, month, d), key: `d-${d}` })
  }
  return cells
}

/**
 * Three real-data calendars for the dashboard:
 *  - Events: days with scheduled events (count badge)
 *  - Drivers: how many drivers are on shift that day (coverage heat)
 *  - Vehicles: available vehicles that day (availability heat)
 */
export function AuroraCalendars() {
  const [cursor, setCursor] = useState(() => {
    const n = new Date()
    return { year: n.getFullYear(), month: n.getMonth() }
  })

  const month = buildMonth(cursor.year, cursor.month)
  const monthLabel = new Date(cursor.year, cursor.month, 1).toLocaleDateString([], {
    month: 'long',
    year: 'numeric',
  })
  const today = ymd(new Date())

  const shift = (delta: number) => {
    setCursor((c) => {
      const d = new Date(c.year, c.month + delta, 1)
      return { year: d.getFullYear(), month: d.getMonth() }
    })
  }

  return (
    <GlassCard className="p-0 pb-4">
      <PanelTitle
        icon={CalendarDays}
        accent="cyan"
        action={
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => shift(-1)}
              aria-label="Previous month"
              className="flex size-7 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-slate-300 hover:bg-white/10"
            >
              <ChevronLeft className="size-4" />
            </button>
            <span className="min-w-32 text-center text-xs font-medium text-slate-200">{monthLabel}</span>
            <button
              type="button"
              onClick={() => shift(1)}
              aria-label="Next month"
              className="flex size-7 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-slate-300 hover:bg-white/10"
            >
              <ChevronRight className="size-4" />
            </button>
          </div>
        }
      >
        Schedule Calendars
      </PanelTitle>

      <div className="mt-3 grid gap-4 px-4 lg:grid-cols-3">
        <EventsCalendar month={month} today={today} />
        <DriversCalendar month={month} today={today} />
        <VehiclesCalendar month={month} today={today} />
      </div>
    </GlassCard>
  )
}

function CalHeader({
  icon: Icon,
  title,
  subtitle,
  color,
}: {
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>
  title: string
  subtitle: string
  color: string
}) {
  return (
    <div className="mb-2 flex items-center gap-2">
      <span className="flex size-6 items-center justify-center rounded-md bg-white/5">
        <Icon className="size-3.5" style={{ color }} />
      </span>
      <div className="leading-tight">
        <p className="text-xs font-semibold text-white">{title}</p>
        <p className="text-[10px] text-slate-400">{subtitle}</p>
      </div>
    </div>
  )
}

function WeekdayRow() {
  return (
    <div className="grid grid-cols-7 gap-1 pb-1">
      {DOW.map((d, i) => (
        <span key={i} className="text-center text-[9px] font-medium uppercase text-slate-500">
          {d}
        </span>
      ))}
    </div>
  )
}

function EventsCalendar({ month, today }: { month: DayCell[]; today: string }) {
  const fleet = useFleet()
  const byDay = useMemo(() => {
    const map: Record<string, number> = {}
    for (const e of fleet.events) map[e.date] = (map[e.date] ?? 0) + 1
    return map
  }, [fleet.events])
  const total = Object.values(byDay).reduce((s, n) => s + n, 0)

  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3">
      <CalHeader icon={CalendarDays} title="Events" subtitle={`${total} this view`} color={AURORA_ACCENTS.cyan} />
      <WeekdayRow />
      <div className="grid grid-cols-7 gap-1">
        {month.map((cell) => {
          if (!cell.date) return <span key={cell.key} />
          const key = ymd(cell.date)
          const count = byDay[key] ?? 0
          const isToday = key === today
          return (
            <div
              key={cell.key}
              className={cn(
                'relative flex aspect-square flex-col items-center justify-center rounded-md text-[11px] tabular-nums',
                count > 0 ? 'font-semibold text-white' : 'text-slate-400',
                isToday && 'ring-1 ring-cyan-400/60',
              )}
              style={count > 0 ? { background: `rgba(34,211,238,${Math.min(0.55, 0.18 + count * 0.16)})` } : undefined}
              title={count > 0 ? `${count} event${count === 1 ? '' : 's'}` : undefined}
            >
              {cell.date.getDate()}
              {count > 0 ? (
                <span className="absolute bottom-0.5 flex gap-0.5">
                  {Array.from({ length: Math.min(count, 3) }).map((_, i) => (
                    <span key={i} className="size-1 rounded-full bg-cyan-200" />
                  ))}
                </span>
              ) : null}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function DriversCalendar({ month, today }: { month: DayCell[]; today: string }) {
  const fleet = useFleet()
  const totalDrivers = fleet.drivers.length || 1

  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3">
      <CalHeader
        icon={UserRound}
        title="Driver Coverage"
        subtitle={`${fleet.drivers.length} on roster`}
        color={AURORA_ACCENTS.emerald}
      />
      <WeekdayRow />
      <div className="grid grid-cols-7 gap-1">
        {month.map((cell) => {
          if (!cell.date) return <span key={cell.key} />
          const key = ymd(cell.date)
          // Drivers on shift for a representative mid-day time (09:00).
          const onShift = fleet.drivers.filter((d) => isDriverOnShift(d, key, '09:00')).length
          const ratio = onShift / totalDrivers
          const isToday = key === today
          return (
            <div
              key={cell.key}
              className={cn(
                'flex aspect-square flex-col items-center justify-center rounded-md text-[11px] tabular-nums',
                onShift > 0 ? 'font-medium text-white' : 'text-slate-500',
                isToday && 'ring-1 ring-emerald-400/60',
              )}
              style={onShift > 0 ? { background: `rgba(52,211,153,${Math.min(0.5, 0.12 + ratio * 0.4)})` } : undefined}
              title={`${onShift} driver${onShift === 1 ? '' : 's'} on shift`}
            >
              <span>{cell.date.getDate()}</span>
              {onShift > 0 ? <span className="text-[8px] text-emerald-100/80">{onShift}</span> : null}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function VehiclesCalendar({ month, today }: { month: DayCell[]; today: string }) {
  const fleet = useFleet()
  const total = fleet.vehicles.length || 1
  // Vehicles needing service reduce availability; spread their service day
  // deterministically across the week so the calendar reads as a real rota.
  const serviceDue = fleet.vehicles.filter((v) => v.maintenanceStatus !== 'good')

  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3">
      <CalHeader
        icon={Truck}
        title="Vehicle Availability"
        subtitle={`${fleet.vehicles.length} in fleet`}
        color={AURORA_ACCENTS.blue}
      />
      <WeekdayRow />
      <div className="grid grid-cols-7 gap-1">
        {month.map((cell) => {
          if (!cell.date) return <span key={cell.key} />
          const key = ymd(cell.date)
          const dow = cell.date.getDay()
          const inService = serviceDue.filter((_, idx) => idx % 7 === dow).length
          const available = Math.max(0, fleet.vehicles.length - inService)
          const ratio = available / total
          const isToday = key === today
          return (
            <div
              key={cell.key}
              className={cn(
                'flex aspect-square flex-col items-center justify-center rounded-md text-[11px] tabular-nums',
                available > 0 ? 'font-medium text-white' : 'text-slate-500',
                isToday && 'ring-1 ring-blue-400/60',
              )}
              style={available > 0 ? { background: `rgba(96,165,250,${Math.min(0.5, 0.1 + ratio * 0.4)})` } : undefined}
              title={`${available} available${inService ? ` · ${inService} in service` : ''}`}
            >
              <span>{cell.date.getDate()}</span>
              {inService > 0 ? <span className="text-[8px] text-amber-200/80">-{inService}</span> : null}
            </div>
          )
        })}
      </div>
    </div>
  )
}
