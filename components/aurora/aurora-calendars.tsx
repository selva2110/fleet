'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock,
  MapPin,
  Star,
  Truck,
  UserRound,
  Users,
  UtensilsCrossed,
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { GlassCard, PanelTitle } from './aurora-ui'
import { useFleet } from '@/lib/store'
import { driverStatusMeta, mealStatusMeta, formatMiles, formatShiftDays } from '@/lib/labels'
import type { Driver, FleetEvent, MealDelivery } from '@/lib/types'
import { cn } from '@/lib/utils'

// Pixel height of one hour row in the timeline.
const HOUR_H = 48
const DAY_COUNT = 5

function ymd(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function toMin(hhmm: string | null | undefined) {
  if (!hhmm) return null
  const [h, m] = hhmm.split(':').map(Number)
  if (Number.isNaN(h)) return null
  return h * 60 + (Number.isNaN(m) ? 0 : m)
}

function to12h(hhmm: string) {
  const [h, m] = hhmm.split(':').map(Number)
  const period = h >= 12 ? 'PM' : 'AM'
  const hour = h % 12 === 0 ? 12 : h % 12
  return `${hour}:${String(m).padStart(2, '0')} ${period}`
}

function hourLabel(h: number) {
  const period = h >= 12 ? 'PM' : 'AM'
  const hour = h % 12 === 0 ? 12 : h % 12
  return `${hour} ${period}`
}

// ---- Layers --------------------------------------------------------------
type LayerKey = 'event' | 'driver' | 'vehicle' | 'meal'

const LAYERS: Record<
  LayerKey,
  {
    label: string
    icon: React.ComponentType<{ className?: string }>
    border: string
    bg: string
    sub: string
  }
> = {
  event: {
    label: 'Events',
    icon: CalendarDays,
    border: 'rgba(34,211,238,0.9)',
    bg: 'rgba(34,211,238,0.16)',
    sub: 'rgba(165,243,252,0.8)',
  },
  driver: {
    label: 'Driver shifts',
    icon: UserRound,
    border: 'rgba(96,165,250,0.9)',
    bg: 'rgba(59,130,246,0.18)',
    sub: 'rgba(191,219,254,0.8)',
  },
  vehicle: {
    label: 'Vehicle bookings',
    icon: Truck,
    border: 'rgba(251,191,36,0.9)',
    bg: 'rgba(245,158,11,0.18)',
    sub: 'rgba(253,230,138,0.85)',
  },
  meal: {
    label: 'Meal runs',
    icon: UtensilsCrossed,
    border: 'rgba(16,185,129,0.9)',
    bg: 'rgba(16,185,129,0.18)',
    sub: 'rgba(167,243,208,0.85)',
  },
}

const LAYER_OPTIONS: { value: LayerKey; label: string }[] = [
  { value: 'event', label: 'Events' },
  { value: 'driver', label: 'Drivers' },
  { value: 'vehicle', label: 'Vehicles' },
  { value: 'meal', label: 'Meals' },
]

type SelectedItem =
  | { kind: 'event'; data: FleetEvent }
  | { kind: 'meal'; data: MealDelivery }
  | { kind: 'driver'; data: Driver }
  | null

// A raw timeline entry before overlap packing.
type Entry = {
  key: string
  start: number
  end: number
  title: string
  subtitle?: string
  sel: SelectedItem
}

// A positioned timeline block after interval-column packing.
type Placed = Entry & { col: number; cols: number }

/**
 * Greedy interval-column packing: overlapping blocks within a day column are
 * split into side-by-side columns so nothing is hidden behind another block.
 */
function packColumns(items: Entry[]): Placed[] {
  const sorted = [...items].sort((a, b) => a.start - b.start || a.end - b.end)
  const result: Placed[] = []
  let cluster: Placed[] = []
  let clusterEnd = -1
  let colEnds: number[] = []

  const flush = () => {
    if (!cluster.length) return
    const cols = Math.max(...cluster.map((c) => c.col)) + 1
    cluster.forEach((c) => (c.cols = cols))
    result.push(...cluster)
    cluster = []
    colEnds = []
  }

  for (const it of sorted) {
    if (cluster.length && it.start >= clusterEnd) flush()
    let col = colEnds.findIndex((e) => e <= it.start)
    if (col === -1) {
      col = colEnds.length
      colEnds.push(it.end)
    } else {
      colEnds[col] = it.end
    }
    cluster.push({ ...it, col, cols: 1 })
    clusterEnd = cluster.length === 1 ? it.end : Math.max(clusterEnd, it.end)
  }
  flush()
  return result
}

/**
 * Teams-style 5-day hourly schedule for the dashboard. Five days from today are
 * laid out as columns on a shared vertical 24-hour axis. A single dropdown picks
 * which layer to display — Events (default), Driver shifts, Vehicle bookings, or
 * Meal runs — and each item renders as a time-positioned block.
 */
export function AuroraCalendars() {
  const fleet = useFleet()
  const [weekOffset, setWeekOffset] = useState(0)
  const [layer, setLayer] = useState<LayerKey>('event')
  const [selected, setSelected] = useState<SelectedItem>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  const days = useMemo(() => {
    const start = new Date()
    start.setHours(0, 0, 0, 0)
    start.setDate(start.getDate() + weekOffset * DAY_COUNT)
    return Array.from({ length: DAY_COUNT }, (_, i) => {
      const d = new Date(start)
      d.setDate(start.getDate() + i)
      return d
    })
  }, [weekOffset])

  const todayKey = ymd(new Date())

  // Which vehicles serve each event (via committed, non-cancelled trips), plus
  // the driver assigned on each of those trips (for vehicle-booking labels).
  const tripsByEvent = useMemo(() => {
    const m = new Map<string, { vehicleId: string; driverId: string | null }[]>()
    for (const t of fleet.trips) {
      if (t.status === 'cancelled' || !t.vehicleId) continue
      if (!m.has(t.eventId)) m.set(t.eventId, [])
      m.get(t.eventId)!.push({ vehicleId: t.vehicleId, driverId: t.driverId ?? null })
    }
    return m
  }, [fleet.trips])

  // Build the entries for a single day based on the active layer.
  function entriesForDay(date: Date): Entry[] {
    const key = ymd(date)
    const dow = date.getDay()

    if (layer === 'event') {
      return fleet.events
        .filter((e) => e.date === key)
        .map((e) => {
          const start = toMin(e.startTime) ?? 9 * 60
          const rawEnd = toMin(e.endTime)
          const end = rawEnd && rawEnd > start ? rawEnd : start + 60
          return {
            key: e.id,
            start,
            end,
            title: e.name,
            subtitle: to12h(e.startTime),
            sel: { kind: 'event', data: e } as SelectedItem,
          }
        })
    }

    if (layer === 'meal') {
      return fleet.mealDeliveries
        .filter((m) => m.date === key && m.status !== 'cancelled')
        .map((m) => {
          const start = toMin(m.departTime) ?? 11 * 60
          const end = start + Math.max(m.durationMinutes || 0, 30)
          return {
            key: m.id,
            start,
            end,
            title: `${m.runNumber} · ${m.mealType}`,
            subtitle: to12h(m.departTime),
            sel: { kind: 'meal', data: m } as SelectedItem,
          }
        })
    }

    if (layer === 'driver') {
      return fleet.drivers
        .filter((d) => d.shiftDays.includes(dow))
        .map((d) => {
          const start = toMin(d.shiftStart) ?? 0
          let end = toMin(d.shiftEnd) ?? 24 * 60
          // Overnight shift: display start → end of day within this column.
          if (end <= start) end = 24 * 60
          return {
            key: d.id,
            start,
            end,
            title: d.name,
            subtitle: `${to12h(d.shiftStart)}–${to12h(d.shiftEnd)}`,
            sel: { kind: 'driver', data: d } as SelectedItem,
          }
        })
    }

    // vehicle bookings: derive from event trips + meal runs that use a vehicle.
    const entries: Entry[] = []
    const seen = new Set<string>()
    for (const e of fleet.events.filter((ev) => ev.date === key)) {
      const start = toMin(e.startTime) ?? 9 * 60
      const rawEnd = toMin(e.endTime)
      const end = rawEnd && rawEnd > start ? rawEnd : start + 60
      for (const trip of tripsByEvent.get(e.id) ?? []) {
        const dedupe = `${e.id}:${trip.vehicleId}`
        if (seen.has(dedupe)) continue
        seen.add(dedupe)
        const veh = fleet.vehicleById(trip.vehicleId)
        entries.push({
          key: dedupe,
          start,
          end,
          title: veh?.name ?? 'Vehicle',
          subtitle: e.name,
          sel: { kind: 'event', data: e },
        })
      }
    }
    for (const m of fleet.mealDeliveries.filter((md) => md.date === key && md.status !== 'cancelled')) {
      if (!m.vehicleId) continue
      const start = toMin(m.departTime) ?? 11 * 60
      const end = start + Math.max(m.durationMinutes || 0, 30)
      const veh = fleet.vehicleById(m.vehicleId)
      entries.push({
        key: `meal:${m.id}`,
        start,
        end,
        title: veh?.name ?? 'Vehicle',
        subtitle: `${m.runNumber} · ${m.mealType}`,
        sel: { kind: 'meal', data: m },
      })
    }
    return entries
  }

  const columns = useMemo(
    () => days.map((d) => ({ date: d, key: ymd(d), blocks: packColumns(entriesForDay(d)) })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [days, layer, fleet.events, fleet.mealDeliveries, fleet.drivers, fleet.vehicles, tripsByEvent],
  )

  const totalShown = columns.reduce((n, c) => n + c.blocks.length, 0)
  const rangeLabel = `${days[0].toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  })} – ${days[DAY_COUNT - 1].toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`

  // Scroll to the working hours (7 AM) on first paint.
  useEffect(() => {
    const el = scrollRef.current
    if (el) el.scrollTop = 7 * HOUR_H
  }, [])

  const active = LAYERS[layer]
  const now = new Date()
  const nowMin = now.getHours() * 60 + now.getMinutes()

  return (
    <GlassCard className="p-0 pb-4">
      <PanelTitle
        icon={CalendarDays}
        accent="cyan"
        action={
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setWeekOffset((o) => o - 1)}
              className="rounded-lg border border-white/10 bg-white/5 p-1 text-slate-300 transition-colors hover:bg-white/10"
              aria-label="Previous 5 days"
            >
              <ChevronLeft className="size-4" />
            </button>
            <span className="min-w-32 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-center text-xs font-medium text-slate-200">
              {rangeLabel}
            </span>
            <button
              type="button"
              onClick={() => setWeekOffset((o) => o + 1)}
              className="rounded-lg border border-white/10 bg-white/5 p-1 text-slate-300 transition-colors hover:bg-white/10"
              aria-label="Next 5 days"
            >
              <ChevronRight className="size-4" />
            </button>
            {weekOffset !== 0 ? (
              <button
                type="button"
                onClick={() => setWeekOffset(0)}
                className="rounded-lg border border-cyan-400/30 bg-cyan-400/10 px-2.5 py-1 text-xs font-medium text-cyan-200 transition-colors hover:bg-cyan-400/20"
              >
                Today
              </button>
            ) : null}
          </div>
        }
      >
        Schedule
        <span className="ml-2 text-xs font-normal text-slate-400">
          5-day view · {totalShown} {active.label.toLowerCase()}
        </span>
      </PanelTitle>

      {/* Single layer dropdown */}
      <div className="mt-3 px-4">
        <div className="w-full sm:max-w-56">
          <Select value={layer} onValueChange={(v) => v && setLayer(v as LayerKey)}>
            <SelectTrigger className="w-full border-white/10 bg-white/5 text-slate-200">
              <span className="flex min-w-0 items-center gap-2">
                <active.icon className="size-3.5 shrink-0 text-slate-400" />
                <SelectValue>
                  {(v) => LAYER_OPTIONS.find((o) => o.value === v)?.label ?? 'Events'}
                </SelectValue>
              </span>
            </SelectTrigger>
            <SelectContent>
              {LAYER_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Day headers */}
      <div className="mt-3 flex px-4">
        <div className="w-12 shrink-0" />
        <div className="flex flex-1 gap-1.5">
          {columns.map((c) => {
            const isToday = c.key === todayKey
            return (
              <div
                key={c.key}
                className={cn(
                  'flex flex-1 flex-col items-center gap-0.5 rounded-t-lg border-b-2 pb-1.5',
                  isToday ? 'border-cyan-400' : 'border-white/10',
                )}
              >
                <span className="text-[10px] font-medium uppercase tracking-wide text-slate-400">
                  {c.date.toLocaleDateString('en-US', { weekday: 'short' })}
                </span>
                <span
                  className={cn(
                    'flex size-6 items-center justify-center rounded-full text-xs font-semibold tabular-nums',
                    isToday ? 'bg-cyan-400 text-slate-950' : 'text-white',
                  )}
                >
                  {c.date.getDate()}
                </span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Hourly timeline */}
      <div ref={scrollRef} className="mt-1 max-h-100 overflow-auto px-4">
        <div className="flex min-w-[560px]" style={{ height: 24 * HOUR_H }}>
          {/* Hour gutter */}
          <div className="w-12 shrink-0">
            {Array.from({ length: 24 }, (_, h) => (
              <div
                key={h}
                style={{ height: HOUR_H }}
                className="relative -top-2 pr-2 text-right text-[10px] tabular-nums text-slate-500"
              >
                {h === 0 ? '' : hourLabel(h)}
              </div>
            ))}
          </div>

          {/* Day columns */}
          <div className="relative flex flex-1 gap-1.5">
            {/* Shared hour grid lines */}
            <div className="pointer-events-none absolute inset-0">
              {Array.from({ length: 24 }, (_, h) => (
                <div
                  key={h}
                  style={{ height: HOUR_H }}
                  className="border-t border-white/5 first:border-t-0"
                />
              ))}
            </div>

            {columns.map((c) => {
              const isToday = c.key === todayKey
              return (
                <div
                  key={c.key}
                  className={cn(
                    'relative flex-1 border-l border-white/5 first:border-l-0',
                    isToday && 'bg-cyan-400/5',
                  )}
                >
                  {/* Current-time indicator on today's column */}
                  {isToday ? (
                    <div
                      className="pointer-events-none absolute inset-x-0 z-20 flex items-center"
                      style={{ top: (nowMin / 60) * HOUR_H }}
                    >
                      <span className="size-1.5 -translate-x-0.5 rounded-full bg-rose-400" />
                      <span className="h-px flex-1 bg-rose-400/70" />
                    </div>
                  ) : null}

                  {c.blocks.length === 0 ? (
                    <span className="pointer-events-none absolute left-1/2 top-6 -translate-x-1/2 whitespace-nowrap text-[10px] text-slate-600">
                      None
                    </span>
                  ) : null}

                  {c.blocks.map((b) => {
                    const top = (b.start / 60) * HOUR_H
                    const height = Math.max(((b.end - b.start) / 60) * HOUR_H, 20)
                    const widthPct = 100 / b.cols
                    return (
                      <button
                        key={b.key}
                        type="button"
                        onClick={() => b.sel && setSelected(b.sel)}
                        className="absolute overflow-hidden rounded-md border-l-2 px-1.5 py-1 text-left text-white transition-[filter] hover:brightness-110"
                        style={{
                          top,
                          height,
                          left: `calc(${b.col * widthPct}% + 1px)`,
                          width: `calc(${widthPct}% - 2px)`,
                          borderColor: active.border,
                          background: active.bg,
                        }}
                        title={`${b.title}${b.subtitle ? ` · ${b.subtitle}` : ''}`}
                      >
                        <span className="block truncate text-[10px] font-semibold leading-tight">
                          {b.title}
                        </span>
                        {height > 28 && b.subtitle ? (
                          <span
                            className="block truncate text-[9px] leading-tight"
                            style={{ color: active.sub }}
                          >
                            {b.subtitle}
                          </span>
                        ) : null}
                      </button>
                    )
                  })}
                </div>
              )
            })}
          </div>
        </div>
      </div>

      <Dialog open={selected !== null} onOpenChange={(v) => !v && setSelected(null)}>
        <DialogContent className="max-w-md">
          {selected?.kind === 'event' ? <EventDetail event={selected.data} /> : null}
          {selected?.kind === 'meal' ? <MealDetail meal={selected.data} /> : null}
          {selected?.kind === 'driver' ? <DriverDetail driver={selected.data} /> : null}
        </DialogContent>
      </Dialog>
    </GlassCard>
  )
}

function DetailRow({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-muted-foreground">
      {children}
    </div>
  )
}

function EventDetail({ event }: { event: FleetEvent }) {
  const fleet = useFleet()
  const center = fleet.centerById(event.centerId)
  const trips = fleet.trips.filter((t) => t.eventId === event.id && t.status !== 'cancelled')
  const vehicles = [
    ...new Set(trips.map((t) => t.vehicleId).filter((id): id is string => Boolean(id))),
  ].map((id) => fleet.vehicleById(id))
  const drivers = [
    ...new Set(trips.map((t) => t.driverId).filter((id): id is string => Boolean(id))),
  ].map((id) => fleet.drivers.find((d) => d.id === id))

  return (
    <>
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <CalendarDays className="size-4 text-primary" />
          {event.name}
        </DialogTitle>
        <DialogDescription>
          {event.type} · scheduled program with transport details.
        </DialogDescription>
      </DialogHeader>
      <div className="space-y-3">
        <DetailRow>
          <span className="flex items-center gap-1">
            <Clock className="size-3.5" /> {to12h(event.startTime)}
            {event.endTime ? ` – ${to12h(event.endTime)}` : ''}
          </span>
          {center ? (
            <span className="flex items-center gap-1">
              <MapPin className="size-3.5" /> {center.name}
            </span>
          ) : null}
          <span className="flex items-center gap-1">
            <Users className="size-3.5" />
            {event.participantIds.length || event.expectedAttendance} riders
          </span>
        </DetailRow>
        <div>
          <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Assigned transport
          </p>
          {vehicles.length === 0 ? (
            <p className="rounded-lg border border-dashed border-border px-3 py-3 text-center text-[12px] text-muted-foreground">
              No vehicles assigned yet.
            </p>
          ) : (
            <ul className="space-y-1.5">
              {vehicles.map((v, i) => (
                <li
                  key={v?.id ?? i}
                  className="flex items-center justify-between rounded-lg border border-border bg-muted/30 px-3 py-2 text-[12px]"
                >
                  <span className="flex items-center gap-1.5 font-medium">
                    <Truck className="size-3.5" /> {v?.name ?? 'Vehicle'}
                  </span>
                  <span className="flex items-center gap-1.5 text-muted-foreground">
                    <UserRound className="size-3.5" /> {drivers[i]?.name ?? 'Unassigned'}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </>
  )
}

function MealDetail({ meal }: { meal: MealDelivery }) {
  const fleet = useFleet()
  const center = fleet.centerById(meal.centerId)
  const vehicle = meal.vehicleId ? fleet.vehicleById(meal.vehicleId) : undefined
  const driver = meal.driverId ? fleet.drivers.find((d) => d.id === meal.driverId) : undefined
  const meta = mealStatusMeta[meal.status]
  const driverMeta = driver ? driverStatusMeta[driver.status] : null
  const delivered = meal.stops.filter((s) => s.status === 'delivered').length

  return (
    <>
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <UtensilsCrossed className="size-4 text-primary" />
          {meal.runNumber} · {meal.mealType}
        </DialogTitle>
        <DialogDescription>Meal delivery run schedule and route progress.</DialogDescription>
      </DialogHeader>
      <div className="space-y-3">
        <DetailRow>
          <span className="flex items-center gap-1">
            <Clock className="size-3.5" /> Departs {to12h(meal.departTime)}
          </span>
          {center ? (
            <span className="flex items-center gap-1">
              <MapPin className="size-3.5" /> {center.name}
            </span>
          ) : null}
          <span className={cn('rounded-full px-1.5 py-0.5 text-[10px] font-medium', meta.cls)}>
            {meta.label}
          </span>
        </DetailRow>
        <DetailRow>
          <span>{meal.totalMeals} meals</span>
          <span>
            {delivered}/{meal.stops.length} delivered
          </span>
          <span>{formatMiles(meal.distanceKm)}</span>
        </DetailRow>
        <div className="flex items-center justify-between rounded-lg border border-border bg-muted/30 px-3 py-2 text-[12px]">
          <span className="flex items-center gap-1.5 font-medium">
            <Truck className="size-3.5" /> {vehicle?.name ?? 'No vehicle'}
          </span>
          <span className="flex items-center gap-1.5 text-muted-foreground">
            <UserRound className="size-3.5" /> {driver?.name ?? 'Unassigned'}
            {driverMeta ? (
              <span className={cn('rounded-full px-1.5 py-0.5 text-[10px] font-medium', driverMeta.cls)}>
                {driverMeta.label}
              </span>
            ) : null}
            {driver ? <Star className="size-3 fill-warning text-warning" /> : null}
          </span>
        </div>
      </div>
    </>
  )
}

function DriverDetail({ driver }: { driver: Driver }) {
  const fleet = useFleet()
  const vehicle = driver.assignedVehicleId ? fleet.vehicleById(driver.assignedVehicleId) : undefined
  const meta = driverStatusMeta[driver.status]

  return (
    <>
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <UserRound className="size-4 text-primary" />
          {driver.name}
        </DialogTitle>
        <DialogDescription>Driver shift schedule and assignment.</DialogDescription>
      </DialogHeader>
      <div className="space-y-3">
        <DetailRow>
          <span className="flex items-center gap-1">
            <Clock className="size-3.5" /> {to12h(driver.shiftStart)} – {to12h(driver.shiftEnd)}
          </span>
          <span className={cn('rounded-full px-1.5 py-0.5 text-[10px] font-medium', meta.cls)}>
            {meta.label}
          </span>
        </DetailRow>
        <DetailRow>
          <span className="flex items-center gap-1">
            <CalendarDays className="size-3.5" /> {formatShiftDays(driver.shiftDays)}
          </span>
        </DetailRow>
        <div className="flex items-center justify-between rounded-lg border border-border bg-muted/30 px-3 py-2 text-[12px]">
          <span className="flex items-center gap-1.5 font-medium">
            <Truck className="size-3.5" /> {vehicle?.name ?? 'No vehicle assigned'}
          </span>
          <span className="flex items-center gap-1.5 text-muted-foreground">
            <Star className="size-3 fill-warning text-warning" /> {driver.rating.toFixed(1)}
          </span>
        </div>
      </div>
    </>
  )
}
