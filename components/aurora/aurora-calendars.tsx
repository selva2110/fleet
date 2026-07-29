'use client'

import { useMemo, useState } from 'react'
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
import { AURORA_ACCENTS, GlassCard, PanelTitle } from './aurora-ui'
import { useFleet } from '@/lib/store'
import { isDriverOnShift } from '@/lib/shift'
import { driverStatusMeta, mealStatusMeta, vehicleStatusMeta, formatMiles } from '@/lib/labels'
import type { Driver, FleetEvent, MealDelivery, Vehicle } from '@/lib/types'
import { cn } from '@/lib/utils'

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

function ymd(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function startOfWeek(d: Date) {
  const x = new Date(d)
  const day = (x.getDay() + 6) % 7 // Monday = 0
  x.setDate(x.getDate() - day)
  x.setHours(0, 0, 0, 0)
  return x
}

function to12h(hhmm: string) {
  const [h, m] = hhmm.split(':').map(Number)
  const period = h >= 12 ? 'PM' : 'AM'
  const hour = h % 12 === 0 ? 12 : h % 12
  return `${hour}:${String(m).padStart(2, '0')} ${period}`
}

type DayInfo = {
  events: FleetEvent[]
  drivers: Driver[]
  available: Vehicle[]
  inService: Vehicle[]
  meals: MealDelivery[]
}

type DetailTab = 'events' | 'drivers' | 'vehicles' | 'meals'

/**
 * Weekly schedule calendar for the dashboard. Shows a Mon–Sun strip with an
 * at-a-glance load per day (events, drivers on shift, vehicles available, meal
 * runs). Clicking a day opens a dialog whose Events / Drivers / Vehicles /
 * Meals tiles switch the detail list shown below them.
 */
export function AuroraCalendars() {
  const fleet = useFleet()
  const [anchor, setAnchor] = useState(() => startOfWeek(new Date()))
  const [openKey, setOpenKey] = useState<string | null>(null)
  const [tab, setTab] = useState<DetailTab>('events')

  const days = useMemo(
    () =>
      Array.from({ length: 7 }, (_, i) => {
        const d = new Date(anchor)
        d.setDate(anchor.getDate() + i)
        return d
      }),
    [anchor],
  )

  const todayKey = ymd(new Date())
  const totalVehicles = fleet.vehicles.length
  const serviceDue = fleet.vehicles.filter((v) => v.maintenanceStatus !== 'good')

  // Per-day derived load, keyed by yyyy-mm-dd.
  const perDay = useMemo(() => {
    const map: Record<string, DayInfo> = {}
    for (const d of days) {
      const key = ymd(d)
      const dow = d.getDay()
      const events = fleet.events
        .filter((e) => e.date === key)
        .sort((a, b) => a.startTime.localeCompare(b.startTime))
      const drivers = fleet.drivers.filter((dr) => isDriverOnShift(dr, key, '09:00'))
      // Approximate scheduled service by spreading due vehicles across weekdays.
      const inService = serviceDue.filter((_, idx) => idx % 7 === dow)
      const inServiceIds = new Set(inService.map((v) => v.id))
      const available = fleet.vehicles.filter((v) => !inServiceIds.has(v.id))
      const meals = fleet.mealDeliveries
        .filter((m) => m.date === key && m.status !== 'cancelled')
        .sort((a, b) => a.departTime.localeCompare(b.departTime))
      map[key] = { events, drivers, available, inService, meals }
    }
    return map
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [days, fleet.events, fleet.drivers, fleet.vehicles, fleet.mealDeliveries])

  const rangeLabel = `${days[0].toLocaleDateString([], { month: 'short', day: 'numeric' })} – ${days[6].toLocaleDateString([], { month: 'short', day: 'numeric' })}`
  const weekEventCount = days.reduce((n, d) => n + (perDay[ymd(d)]?.events.length ?? 0), 0)

  const shiftWeek = (delta: number) => {
    const next = new Date(anchor)
    next.setDate(anchor.getDate() + delta * 7)
    setAnchor(startOfWeek(next))
  }

  const openDay = openKey ? perDay[openKey] : null
  const openDate = openKey ? days.find((d) => ymd(d) === openKey) ?? null : null

  function openDayDialog(key: string) {
    setTab('events')
    setOpenKey(key)
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
              onClick={() => shiftWeek(-1)}
              aria-label="Previous week"
              className="flex size-7 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-slate-300 hover:bg-white/10"
            >
              <ChevronLeft className="size-4" />
            </button>
            <button
              type="button"
              onClick={() => setAnchor(startOfWeek(new Date()))}
              className="rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-xs font-medium text-slate-200 hover:bg-white/10"
            >
              Today
            </button>
            <span className="min-w-32 text-center text-xs font-medium text-slate-200">{rangeLabel}</span>
            <button
              type="button"
              onClick={() => shiftWeek(1)}
              aria-label="Next week"
              className="flex size-7 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-slate-300 hover:bg-white/10"
            >
              <ChevronRight className="size-4" />
            </button>
          </div>
        }
      >
        Weekly Schedule
        <span className="ml-2 text-xs font-normal text-slate-400">
          {weekEventCount} event{weekEventCount === 1 ? '' : 's'}
        </span>
      </PanelTitle>

      <div className="mt-3 grid grid-cols-2 gap-2 px-4 sm:grid-cols-4 lg:grid-cols-7">
        {days.map((d) => {
          const key = ymd(d)
          const info = perDay[key]
          const isToday = key === todayKey
          const eventCount = info?.events.length ?? 0
          const mealCount = info?.meals.length ?? 0
          return (
            <button
              key={key}
              type="button"
              onClick={() => openDayDialog(key)}
              className={cn(
                'flex min-h-28 flex-col rounded-xl border p-2.5 text-left transition-colors',
                isToday
                  ? 'border-cyan-400/50 bg-cyan-400/10'
                  : 'border-white/10 bg-white/[0.02] hover:bg-white/[0.06]',
              )}
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-medium uppercase tracking-wide text-slate-400">
                  {WEEKDAYS[(d.getDay() + 6) % 7]}
                </span>
                <span
                  className={cn(
                    'text-sm font-semibold tabular-nums',
                    isToday ? 'text-cyan-300' : 'text-white',
                  )}
                >
                  {d.getDate()}
                </span>
              </div>

              <div className="mt-2 flex flex-1 flex-col gap-1.5">
                {eventCount > 0 ? (
                  <span
                    className="inline-flex w-fit items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-medium text-cyan-100"
                    style={{ background: 'rgba(34,211,238,0.18)' }}
                  >
                    <CalendarDays className="size-3" /> {eventCount} event{eventCount === 1 ? '' : 's'}
                  </span>
                ) : (
                  <span className="text-[10px] text-slate-500">No events</span>
                )}
                {mealCount > 0 ? (
                  <span
                    className="inline-flex w-fit items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-medium text-emerald-100"
                    style={{ background: 'rgba(16,185,129,0.18)' }}
                  >
                    <UtensilsCrossed className="size-3" /> {mealCount} meal{mealCount === 1 ? '' : 's'}
                  </span>
                ) : null}
              </div>

              <div className="mt-1.5 flex items-center gap-2 border-t border-white/5 pt-1.5 text-[10px] text-slate-400">
                <span className="flex items-center gap-0.5" title="Drivers on shift">
                  <UserRound className="size-3" style={{ color: AURORA_ACCENTS.emerald }} />
                  {info?.drivers.length ?? 0}
                </span>
                <span className="flex items-center gap-0.5" title="Vehicles available">
                  <Truck className="size-3" style={{ color: AURORA_ACCENTS.blue }} />
                  {info?.available.length ?? 0}
                </span>
              </div>
            </button>
          )
        })}
      </div>

      <Dialog open={openKey !== null} onOpenChange={(v) => !v && setOpenKey(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CalendarDays className="size-4 text-primary" />
              {openDate
                ? openDate.toLocaleDateString([], {
                    weekday: 'long',
                    month: 'long',
                    day: 'numeric',
                    year: 'numeric',
                  })
                : 'Day details'}
            </DialogTitle>
            <DialogDescription>
              Programs, driver coverage, vehicle availability, and meal runs for this day. Tap a tile
              to see the details.
            </DialogDescription>
          </DialogHeader>

          {openDay ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                <DayStat
                  icon={CalendarDays}
                  label="Events"
                  value={openDay.events.length}
                  active={tab === 'events'}
                  onClick={() => setTab('events')}
                />
                <DayStat
                  icon={UserRound}
                  label="Drivers"
                  value={openDay.drivers.length}
                  active={tab === 'drivers'}
                  onClick={() => setTab('drivers')}
                />
                <DayStat
                  icon={Truck}
                  label="Vehicles"
                  value={openDay.available.length}
                  hint={openDay.inService.length ? `${openDay.inService.length} in service` : undefined}
                  active={tab === 'vehicles'}
                  onClick={() => setTab('vehicles')}
                />
                <DayStat
                  icon={UtensilsCrossed}
                  label="Meals"
                  value={openDay.meals.length}
                  active={tab === 'meals'}
                  onClick={() => setTab('meals')}
                />
              </div>

              <div className="max-h-80 overflow-y-auto">
                {tab === 'events' ? <EventsList info={openDay} /> : null}
                {tab === 'drivers' ? <DriversList info={openDay} /> : null}
                {tab === 'vehicles' ? <VehiclesList info={openDay} /> : null}
                {tab === 'meals' ? <MealsList info={openDay} /> : null}
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </GlassCard>
  )
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
      {children}
    </p>
  )
}

function EmptyRow({ children }: { children: React.ReactNode }) {
  return (
    <p className="rounded-lg border border-dashed border-border px-3 py-6 text-center text-sm text-muted-foreground">
      {children}
    </p>
  )
}

function EventsList({ info }: { info: DayInfo }) {
  const fleet = useFleet()
  return (
    <div>
      <SectionLabel>Events</SectionLabel>
      {info.events.length === 0 ? (
        <EmptyRow>No events scheduled for this day.</EmptyRow>
      ) : (
        <ul className="space-y-2">
          {info.events.map((e) => {
            const center = fleet.centerById(e.centerId)
            return (
              <li key={e.id} className="rounded-lg border border-border bg-muted/30 px-3 py-2">
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate text-sm font-medium">{e.name}</p>
                  <span className="flex shrink-0 items-center gap-1 text-[11px] tabular-nums text-muted-foreground">
                    <Clock className="size-3" />
                    {to12h(e.startTime)}
                  </span>
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-muted-foreground">
                  <span className="truncate">{e.type}</span>
                  {center ? (
                    <span className="flex items-center gap-1">
                      <MapPin className="size-3" /> {center.name}
                    </span>
                  ) : null}
                  <span className="flex items-center gap-1">
                    <Users className="size-3" />
                    {e.participantIds.length || e.expectedAttendance} riders
                  </span>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

function DriversList({ info }: { info: DayInfo }) {
  const fleet = useFleet()
  return (
    <div>
      <SectionLabel>Drivers on shift</SectionLabel>
      {info.drivers.length === 0 ? (
        <EmptyRow>No drivers scheduled for this day.</EmptyRow>
      ) : (
        <ul className="space-y-2">
          {info.drivers.map((d) => {
            const meta = driverStatusMeta[d.status]
            const vehicle = d.assignedVehicleId ? fleet.vehicleById(d.assignedVehicleId) : undefined
            return (
              <li key={d.id} className="rounded-lg border border-border bg-muted/30 px-3 py-2">
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate text-sm font-medium">{d.name}</p>
                  <span className={cn('rounded-full px-1.5 py-0.5 text-[10px] font-medium', meta.cls)}>
                    {meta.label}
                  </span>
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Clock className="size-3" /> {d.shiftStart}–{d.shiftEnd}
                  </span>
                  <span className="flex items-center gap-1">
                    <Star className="size-3 fill-warning text-warning" /> {d.rating.toFixed(1)}
                  </span>
                  <span className="flex items-center gap-1">
                    <Truck className="size-3" /> {vehicle?.name ?? 'No vehicle'}
                  </span>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

function VehiclesList({ info }: { info: DayInfo }) {
  return (
    <div className="space-y-4">
      <div>
        <SectionLabel>Available vehicles ({info.available.length})</SectionLabel>
        {info.available.length === 0 ? (
          <EmptyRow>No vehicles available this day.</EmptyRow>
        ) : (
          <ul className="space-y-2">
            {info.available.map((v) => (
              <VehicleRow key={v.id} v={v} />
            ))}
          </ul>
        )}
      </div>
      {info.inService.length > 0 ? (
        <div>
          <SectionLabel>In service ({info.inService.length})</SectionLabel>
          <ul className="space-y-2">
            {info.inService.map((v) => (
              <VehicleRow key={v.id} v={v} inService />
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  )
}

function VehicleRow({ v, inService }: { v: Vehicle; inService?: boolean }) {
  const meta = vehicleStatusMeta[v.status]
  return (
    <li className="rounded-lg border border-border bg-muted/30 px-3 py-2">
      <div className="flex items-center justify-between gap-2">
        <p className="truncate text-sm font-medium">{v.name}</p>
        <span
          className={cn(
            'rounded-full px-1.5 py-0.5 text-[10px] font-medium',
            inService ? 'bg-warning/20 text-warning-foreground' : meta.cls,
          )}
        >
          {inService ? 'Service' : meta.label}
        </span>
      </div>
      <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-muted-foreground">
        <span className="truncate">{v.type}</span>
        <span className="flex items-center gap-1">
          <Users className="size-3" /> {v.capacity} seats
        </span>
        {v.wheelchairCapacity > 0 ? <span>{v.wheelchairCapacity} WC</span> : null}
      </div>
    </li>
  )
}

function MealsList({ info }: { info: DayInfo }) {
  const fleet = useFleet()
  return (
    <div>
      <SectionLabel>Meal delivery runs</SectionLabel>
      {info.meals.length === 0 ? (
        <EmptyRow>No meal runs scheduled for this day.</EmptyRow>
      ) : (
        <ul className="space-y-2">
          {info.meals.map((m) => {
            const center = fleet.centerById(m.centerId)
            const meta = mealStatusMeta[m.status]
            const delivered = m.stops.filter((s) => s.status === 'delivered').length
            return (
              <li key={m.id} className="rounded-lg border border-border bg-muted/30 px-3 py-2">
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate text-sm font-medium">
                    {m.runNumber} · {m.mealType}
                  </p>
                  <span className={cn('rounded-full px-1.5 py-0.5 text-[10px] font-medium', meta.cls)}>
                    {meta.label}
                  </span>
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Clock className="size-3" /> {to12h(m.departTime)}
                  </span>
                  {center ? (
                    <span className="flex items-center gap-1">
                      <MapPin className="size-3" /> {center.name}
                    </span>
                  ) : null}
                  <span>{m.totalMeals} meals</span>
                  <span>
                    {delivered}/{m.stops.length} delivered · {formatMiles(m.distanceKm)}
                  </span>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

function DayStat({
  icon: Icon,
  label,
  value,
  hint,
  active,
  onClick,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: number
  hint?: string
  active?: boolean
  onClick?: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'rounded-lg border px-3 py-2.5 text-left transition-colors',
        active
          ? 'border-primary bg-primary/10'
          : 'border-border bg-muted/30 hover:border-primary/40 hover:bg-muted/50',
      )}
    >
      <div className={cn('flex items-center gap-1.5', active ? 'text-primary' : 'text-muted-foreground')}>
        <Icon className="size-3.5" />
        <span className="text-[10px]">{label}</span>
      </div>
      <p className="mt-1 text-lg font-semibold tabular-nums text-foreground">{value}</p>
      {hint ? <p className="text-[10px] text-muted-foreground">{hint}</p> : null}
    </button>
  )
}
