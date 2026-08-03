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
import { driverStatusMeta, mealStatusMeta, formatMiles } from '@/lib/labels'
import type { FleetEvent, MealDelivery } from '@/lib/types'
import { cn } from '@/lib/utils'

// Pixel height of one hour row in the timeline.
const HOUR_H = 56
const DAY_MINUTES = 24 * 60

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

const ALL = 'all'

// A positioned timeline block after interval-column packing.
type Placed<T> = { start: number; end: number; data: T; col: number; cols: number }

/**
 * Greedy interval-column packing: overlapping blocks within a lane are split
 * into side-by-side columns so nothing is hidden behind another block.
 */
function packColumns<T>(items: { start: number; end: number; data: T }[]): Placed<T>[] {
  const sorted = [...items].sort((a, b) => a.start - b.start || a.end - b.end)
  const result: Placed<T>[] = []
  let cluster: Placed<T>[] = []
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

type SelectedItem =
  | { kind: 'event'; data: FleetEvent }
  | { kind: 'meal'; data: MealDelivery }
  | null

/**
 * Teams-style hourly day view for the dashboard. A single day is laid out on a
 * vertical 24-hour axis with Events and Meals as time blocks in separate lanes.
 * Three dropdowns filter each layer independently: pick a single event, a single
 * meal run, or a vehicle (which narrows both lanes to items using that vehicle).
 */
export function AuroraCalendars() {
  const fleet = useFleet()
  const [dayOffset, setDayOffset] = useState(0)
  const [eventFilter, setEventFilter] = useState<string>(ALL)
  const [mealFilter, setMealFilter] = useState<string>(ALL)
  const [vehicleFilter, setVehicleFilter] = useState<string>(ALL)
  const [selected, setSelected] = useState<SelectedItem>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  const day = useMemo(() => {
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    d.setDate(d.getDate() + dayOffset)
    return d
  }, [dayOffset])

  const dayKey = ymd(day)
  const todayKey = ymd(new Date())
  const isToday = dayKey === todayKey

  // Which vehicles serve each event (via committed, non-cancelled trips).
  const vehiclesByEvent = useMemo(() => {
    const m = new Map<string, Set<string>>()
    for (const t of fleet.trips) {
      if (t.status === 'cancelled' || !t.vehicleId) continue
      if (!m.has(t.eventId)) m.set(t.eventId, new Set())
      m.get(t.eventId)!.add(t.vehicleId)
    }
    return m
  }, [fleet.trips])

  const dayEvents = useMemo(
    () =>
      fleet.events
        .filter((e) => e.date === dayKey)
        .sort((a, b) => a.startTime.localeCompare(b.startTime)),
    [fleet.events, dayKey],
  )

  const dayMeals = useMemo(
    () =>
      fleet.mealDeliveries
        .filter((m) => m.date === dayKey && m.status !== 'cancelled')
        .sort((a, b) => a.departTime.localeCompare(b.departTime)),
    [fleet.mealDeliveries, dayKey],
  )

  // Reset the item filters when the day changes so a stale selection from
  // another day doesn't blank the timeline.
  useEffect(() => {
    setEventFilter(ALL)
    setMealFilter(ALL)
  }, [dayKey])

  // Scroll to the morning (or current hour) on first paint.
  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    const focusHour = isToday ? Math.max(0, new Date().getHours() - 1) : 7
    el.scrollTop = focusHour * HOUR_H
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const eventOptions = [
    { value: ALL, label: 'All events' },
    ...dayEvents.map((e) => ({ value: e.id, label: e.name })),
  ]
  const mealOptions = [
    { value: ALL, label: 'All meals' },
    ...dayMeals.map((m) => ({ value: m.id, label: `${m.runNumber} · ${m.mealType}` })),
  ]
  const vehicleOptions = [
    { value: ALL, label: 'All vehicles' },
    ...fleet.vehicles.map((v) => ({ value: v.id, label: v.name })),
  ]

  // Apply filters. Event/meal dropdowns filter their own lane; the vehicle
  // dropdown narrows both lanes to items assigned that vehicle.
  const shownEvents = dayEvents.filter((e) => {
    if (eventFilter !== ALL && e.id !== eventFilter) return false
    if (vehicleFilter !== ALL && !vehiclesByEvent.get(e.id)?.has(vehicleFilter)) return false
    return true
  })
  const shownMeals = dayMeals.filter((m) => {
    if (mealFilter !== ALL && m.id !== mealFilter) return false
    if (vehicleFilter !== ALL && m.vehicleId !== vehicleFilter) return false
    return true
  })

  const eventBlocks = useMemo(() => {
    const items = shownEvents.map((e) => {
      const start = toMin(e.startTime) ?? 9 * 60
      const rawEnd = toMin(e.endTime)
      const end = rawEnd && rawEnd > start ? rawEnd : start + 60
      return { start, end, data: e }
    })
    return packColumns(items)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shownEvents])

  const mealBlocks = useMemo(() => {
    const items = shownMeals.map((m) => {
      const start = toMin(m.departTime) ?? 11 * 60
      const end = start + Math.max(m.durationMinutes || 0, 30)
      return { start, end, data: m }
    })
    return packColumns(items)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shownMeals])

  const nowMin = isToday ? new Date().getHours() * 60 + new Date().getMinutes() : null
  const totalShown = shownEvents.length + shownMeals.length

  return (
    <GlassCard className="p-0 pb-4">
      <PanelTitle
        icon={CalendarDays}
        accent="cyan"
        action={
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setDayOffset((o) => o - 1)}
              className="rounded-lg border border-white/10 bg-white/5 p-1 text-slate-300 transition-colors hover:bg-white/10"
              aria-label="Previous day"
            >
              <ChevronLeft className="size-4" />
            </button>
            <span className="min-w-40 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-center text-xs font-medium text-slate-200">
              {day.toLocaleDateString('en-US', {
                weekday: 'short',
                month: 'short',
                day: 'numeric',
              })}
            </span>
            <button
              type="button"
              onClick={() => setDayOffset((o) => o + 1)}
              className="rounded-lg border border-white/10 bg-white/5 p-1 text-slate-300 transition-colors hover:bg-white/10"
              aria-label="Next day"
            >
              <ChevronRight className="size-4" />
            </button>
            {dayOffset !== 0 ? (
              <button
                type="button"
                onClick={() => setDayOffset(0)}
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
          Day view · {totalShown} item{totalShown === 1 ? '' : 's'}
        </span>
      </PanelTitle>

      {/* Filter dropdowns: Events / Meals / Vehicles */}
      <div className="mt-3 grid grid-cols-1 gap-2 px-4 sm:grid-cols-3">
        <FilterSelect
          icon={CalendarDays}
          value={eventFilter}
          onChange={setEventFilter}
          options={eventOptions}
          placeholder="All events"
        />
        <FilterSelect
          icon={UtensilsCrossed}
          value={mealFilter}
          onChange={setMealFilter}
          options={mealOptions}
          placeholder="All meals"
        />
        <FilterSelect
          icon={Truck}
          value={vehicleFilter}
          onChange={setVehicleFilter}
          options={vehicleOptions}
          placeholder="All vehicles"
        />
      </div>

      {/* Lane headers */}
      <div className="mt-3 flex px-4">
        <div className="w-14 shrink-0" />
        <div className="flex flex-1 gap-2">
          <LaneHeader color="rgba(34,211,238,0.9)" label={`Events (${shownEvents.length})`} />
          <LaneHeader color="rgba(16,185,129,0.9)" label={`Meals (${shownMeals.length})`} />
        </div>
      </div>

      {/* Hourly timeline */}
      <div ref={scrollRef} className="mt-1 max-h-100 overflow-y-auto px-4">
        <div className="flex" style={{ height: 24 * HOUR_H }}>
          {/* Hour gutter */}
          <div className="w-14 shrink-0">
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

          {/* Lanes */}
          <div className="relative flex flex-1 gap-2">
            {/* Hour grid lines span both lanes */}
            <div className="pointer-events-none absolute inset-0">
              {Array.from({ length: 24 }, (_, h) => (
                <div
                  key={h}
                  style={{ height: HOUR_H }}
                  className="border-t border-white/5 first:border-t-0"
                />
              ))}
            </div>

            {/* Current-time indicator */}
            {nowMin !== null ? (
              <div
                className="pointer-events-none absolute inset-x-0 z-20 flex items-center"
                style={{ top: (nowMin / 60) * HOUR_H }}
              >
                <span className="size-2 -translate-x-1 rounded-full bg-rose-400" />
                <span className="h-px flex-1 bg-rose-400/70" />
              </div>
            ) : null}

            {/* Events lane */}
            <Lane empty={shownEvents.length === 0} emptyLabel="No events">
              {eventBlocks.map((b) => {
                const top = (b.start / 60) * HOUR_H
                const height = Math.max(((b.end - b.start) / 60) * HOUR_H, 22)
                const widthPct = 100 / b.cols
                return (
                  <button
                    key={b.data.id}
                    type="button"
                    onClick={() => setSelected({ kind: 'event', data: b.data })}
                    className="absolute overflow-hidden rounded-md border-l-2 border-cyan-400 px-1.5 py-1 text-left text-cyan-50 transition-colors hover:brightness-110"
                    style={{
                      top,
                      height,
                      left: `calc(${b.col * widthPct}% + 2px)`,
                      width: `calc(${widthPct}% - 4px)`,
                      background: 'rgba(34,211,238,0.16)',
                    }}
                    title={`${b.data.name} · ${to12h(b.data.startTime)}`}
                  >
                    <span className="block truncate text-[10px] font-semibold leading-tight">
                      {b.data.name}
                    </span>
                    {height > 30 ? (
                      <span className="block truncate text-[9px] tabular-nums text-cyan-200/80">
                        {to12h(b.data.startTime)}
                      </span>
                    ) : null}
                  </button>
                )
              })}
            </Lane>

            {/* Meals lane */}
            <Lane empty={shownMeals.length === 0} emptyLabel="No meals">
              {mealBlocks.map((b) => {
                const top = (b.start / 60) * HOUR_H
                const height = Math.max(((b.end - b.start) / 60) * HOUR_H, 22)
                const widthPct = 100 / b.cols
                return (
                  <button
                    key={b.data.id}
                    type="button"
                    onClick={() => setSelected({ kind: 'meal', data: b.data })}
                    className="absolute overflow-hidden rounded-md border-l-2 border-emerald-400 px-1.5 py-1 text-left text-emerald-50 transition-colors hover:brightness-110"
                    style={{
                      top,
                      height,
                      left: `calc(${b.col * widthPct}% + 2px)`,
                      width: `calc(${widthPct}% - 4px)`,
                      background: 'rgba(16,185,129,0.18)',
                    }}
                    title={`${b.data.runNumber} · ${to12h(b.data.departTime)}`}
                  >
                    <span className="block truncate text-[10px] font-semibold leading-tight">
                      {b.data.runNumber} · {b.data.mealType}
                    </span>
                    {height > 30 ? (
                      <span className="block truncate text-[9px] tabular-nums text-emerald-200/80">
                        {to12h(b.data.departTime)}
                      </span>
                    ) : null}
                  </button>
                )
              })}
            </Lane>
          </div>
        </div>
      </div>

      <Dialog open={selected !== null} onOpenChange={(v) => !v && setSelected(null)}>
        <DialogContent className="max-w-md">
          {selected?.kind === 'event' ? <EventDetail event={selected.data} /> : null}
          {selected?.kind === 'meal' ? <MealDetail meal={selected.data} /> : null}
        </DialogContent>
      </Dialog>
    </GlassCard>
  )
}

function FilterSelect({
  icon: Icon,
  value,
  onChange,
  options,
  placeholder,
}: {
  icon: React.ComponentType<{ className?: string }>
  value: string
  onChange: (v: string) => void
  options: { value: string; label: string }[]
  placeholder: string
}) {
  return (
    <Select value={value} onValueChange={(v) => v && onChange(v)}>
      <SelectTrigger className="w-full border-white/10 bg-white/5 text-slate-200">
        <span className="flex min-w-0 items-center gap-2">
          <Icon className="size-3.5 shrink-0 text-slate-400" />
          <SelectValue>{(v) => options.find((o) => o.value === v)?.label ?? placeholder}</SelectValue>
        </span>
      </SelectTrigger>
      <SelectContent>
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

function LaneHeader({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex flex-1 items-center gap-1.5 border-b border-white/10 pb-1">
      <span className="size-2 rounded-full" style={{ background: color }} />
      <span className="text-[11px] font-medium text-slate-300">{label}</span>
    </div>
  )
}

function Lane({
  children,
  empty,
  emptyLabel,
}: {
  children: React.ReactNode
  empty: boolean
  emptyLabel: string
}) {
  return (
    <div className="relative flex-1">
      {empty ? (
        <span className="pointer-events-none absolute left-1/2 top-6 -translate-x-1/2 text-[10px] text-slate-600">
          {emptyLabel}
        </span>
      ) : null}
      {children}
    </div>
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
