'use client'

import Link from 'next/link'
import {
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
} from 'recharts'
import {
  AlertTriangle,
  Clock,
  HeartPulse,
  Info,
  MapPin,
  PieChart as PieIcon,
  Route as RouteIcon,
  UtensilsCrossed,
  Users,
} from 'lucide-react'
import { AURORA_ACCENTS, GlassCard, PanelTitle } from './aurora-ui'
import { useAuroraData } from './use-aurora-data'
import { useFleet } from '@/lib/store'
import { mealStatusMeta, tripStatusMeta } from '@/lib/labels'
import { cn } from '@/lib/utils'

function ymd(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function to12h(hhmm: string) {
  const [h, m] = hhmm.split(':').map(Number)
  const period = h >= 12 ? 'PM' : 'AM'
  const hour = h % 12 === 0 ? 12 : h % 12
  return `${hour}:${String(m).padStart(2, '0')} ${period}`
}

export function AuroraWidgets() {
  return (
    <div className="flex flex-col gap-4">
      <AlertsCenter />
      <AttendanceAnalytics />
      <PaceInsights />
    </div>
  )
}

export function TodaysOverview() {
  const data = useAuroraData()
  const fleet = useFleet()
  const slices = [
    { name: 'Live', value: data.tripStatusCounts.live, color: AURORA_ACCENTS.cyan },
    { name: 'Completed', value: data.tripStatusCounts.completed, color: AURORA_ACCENTS.emerald },
    { name: 'Planned', value: data.tripStatusCounts.planned, color: AURORA_ACCENTS.violet },
    { name: 'Cancelled', value: data.tripStatusCounts.cancelled, color: AURORA_ACCENTS.rose },
  ].filter((s) => s.value > 0)
  const total = slices.reduce((s, d) => s + d.value, 0)

  // Today's trip and meal-run details, resolved from live fleet data.
  const todayKey = ymd(new Date())
  const todayEvents = fleet.events.filter((e) => e.date === todayKey)
  const todayEventIds = new Set(todayEvents.map((e) => e.id))
  const todayTrips = fleet.trips
    .filter((t) => todayEventIds.has(t.eventId))
    .sort((a, b) => a.etaCenter.localeCompare(b.etaCenter))
  const todayMeals = fleet.mealDeliveries
    .filter((m) => m.date === todayKey && m.status !== 'cancelled')
    .sort((a, b) => a.departTime.localeCompare(b.departTime))

  return (
    <GlassCard className="p-0 pb-4">
      <PanelTitle icon={PieIcon} accent="cyan">
        Today&apos;s Overview
      </PanelTitle>
      <div className="mt-2 flex items-center gap-4 px-5">
        <div className="relative size-32 shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={total > 0 ? slices : [{ name: 'None', value: 1, color: '#334155' }]}
                dataKey="value"
                innerRadius={42}
                outerRadius={60}
                paddingAngle={total > 0 ? 3 : 0}
                stroke="none"
                startAngle={90}
                endAngle={-270}
              >
                {(total > 0 ? slices : [{ color: '#334155' }]).map((s, i) => (
                  <Cell key={i} fill={s.color} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-xl font-semibold tabular-nums text-white">{total}</span>
            <span className="text-[10px] uppercase tracking-wide text-slate-400">trips</span>
          </div>
        </div>
        <div className="flex-1 space-y-1.5">
          {slices.length === 0 ? (
            <p className="text-xs text-slate-400">No trips recorded yet today.</p>
          ) : (
            slices.map((s) => (
              <div key={s.name} className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-2 text-slate-300">
                  <span className="size-2.5 rounded-full" style={{ background: s.color }} />
                  {s.name}
                </span>
                <span className="font-medium tabular-nums text-white">{s.value}</span>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Today's trip + meal run details */}
      <div className="mt-4 grid grid-cols-1 gap-4 px-5 sm:grid-cols-2">
        <TodayDetailColumn
          icon={RouteIcon}
          title="Trips today"
          count={todayTrips.length}
          empty="No trips scheduled today."
        >
          {todayTrips.map((t) => {
            const meta = tripStatusMeta[t.status]
            const event = todayEvents.find((e) => e.id === t.eventId)
            const driver = t.driverId ? fleet.driverById(t.driverId) : undefined
            return (
              <li key={t.id} className="rounded-lg border border-white/10 bg-white/[0.03] px-2.5 py-2">
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate text-xs font-medium text-white">{t.tripNumber}</p>
                  <span
                    className="shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-medium"
                    style={{ background: `${meta.map}22`, color: meta.map }}
                  >
                    {meta.label}
                  </span>
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-[10px] text-slate-400">
                  <span className="flex items-center gap-1">
                    <Clock className="size-3" /> {to12h(t.etaCenter)}
                  </span>
                  {event ? <span className="truncate">{event.name}</span> : null}
                  {driver ? <span className="truncate">{driver.name}</span> : null}
                </div>
              </li>
            )
          })}
        </TodayDetailColumn>

        <TodayDetailColumn
          icon={UtensilsCrossed}
          title="Meal runs today"
          count={todayMeals.length}
          empty="No meal runs scheduled today."
        >
          {todayMeals.map((m) => {
            const meta = mealStatusMeta[m.status]
            const center = fleet.centerById(m.centerId)
            const delivered = m.stops.filter((s) => s.status === 'delivered').length
            return (
              <li key={m.id} className="rounded-lg border border-white/10 bg-white/[0.03] px-2.5 py-2">
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate text-xs font-medium text-white">
                    {m.runNumber} · {m.mealType}
                  </p>
                  <span
                    className="shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-medium"
                    style={{ background: `${meta.map}22`, color: meta.map }}
                  >
                    {meta.label}
                  </span>
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-[10px] text-slate-400">
                  <span className="flex items-center gap-1">
                    <Clock className="size-3" /> {to12h(m.departTime)}
                  </span>
                  {center ? (
                    <span className="flex items-center gap-1 truncate">
                      <MapPin className="size-3" /> {center.name}
                    </span>
                  ) : null}
                  <span>
                    {delivered}/{m.stops.length} delivered
                  </span>
                </div>
              </li>
            )
          })}
        </TodayDetailColumn>
      </div>
    </GlassCard>
  )
}

function TodayDetailColumn({
  icon: Icon,
  title,
  count,
  empty,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>
  title: string
  count: number
  empty: string
  children: React.ReactNode
}) {
  return (
    <div>
      <div className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
        <Icon className="size-3.5" />
        {title}
        <span className="ml-auto rounded-full bg-white/10 px-1.5 py-0.5 text-[10px] tabular-nums text-slate-200">
          {count}
        </span>
      </div>
      {count === 0 ? (
        <p className="rounded-lg border border-dashed border-white/10 px-3 py-4 text-center text-[11px] text-slate-500">
          {empty}
        </p>
      ) : (
        <ul className="max-h-56 space-y-1.5 overflow-y-auto pr-1">{children}</ul>
      )}
    </div>
  )
}

function AlertsCenter() {
  const data = useAuroraData()
  const meta = {
    critical: { cls: 'border-rose-400/25 bg-rose-400/10 text-rose-200', icon: AlertTriangle, dot: 'bg-rose-400' },
    warning: { cls: 'border-amber-400/25 bg-amber-400/10 text-amber-200', icon: AlertTriangle, dot: 'bg-amber-400' },
    info: { cls: 'border-cyan-400/20 bg-cyan-400/10 text-cyan-200', icon: Info, dot: 'bg-cyan-400' },
  } as const

  return (
    <GlassCard className="p-0 pb-4">
      <PanelTitle icon={AlertTriangle} accent="rose">
        Alerts Center
      </PanelTitle>
      <div className="mt-3 flex flex-col gap-2 px-4">
        {data.alerts.map((a) => {
          const m = meta[a.severity]
          const Icon = m.icon
          return (
            <Link
              key={a.id}
              href={a.href}
              className={cn('flex items-start gap-2.5 rounded-xl border p-3 transition-colors hover:brightness-125', m.cls)}
            >
              <Icon className="mt-0.5 size-4 shrink-0" />
              <div className="min-w-0">
                <p className="text-[13px] font-medium leading-tight text-white">{a.title}</p>
                <p className="mt-0.5 text-xs text-slate-300/80">{a.detail}</p>
              </div>
            </Link>
          )
        })}
      </div>
    </GlassCard>
  )
}

function AttendanceAnalytics() {
  const data = useAuroraData()
  const rows = [
    { label: 'Needs transport', value: data.attendingTransport, color: AURORA_ACCENTS.cyan },
    { label: 'Own transport', value: data.attendingSelf, color: AURORA_ACCENTS.emerald },
    { label: 'Not attending', value: data.notAttending, color: AURORA_ACCENTS.rose },
    { label: 'No response', value: data.noResponse, color: AURORA_ACCENTS.amber },
  ]
  const max = Math.max(1, ...rows.map((r) => r.value))
  return (
    <GlassCard className="p-0 pb-4">
      <PanelTitle icon={Users} accent="amber">
        Participant Attendance
      </PanelTitle>
      <div className="mt-3 space-y-2.5 px-5">
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-semibold tabular-nums text-white">{data.attendanceRate}%</span>
          <span className="text-xs text-slate-400">confirmed attendance · {data.responded} replies</span>
        </div>
        {rows.map((r) => (
          <div key={r.label}>
            <div className="mb-1 flex items-center justify-between text-xs">
              <span className="text-slate-300">{r.label}</span>
              <span className="font-medium tabular-nums text-white">{r.value}</span>
            </div>
            <span className="block h-1.5 overflow-hidden rounded-full bg-white/10">
              <span
                className="block h-full rounded-full"
                style={{ width: `${(r.value / max) * 100}%`, background: r.color }}
              />
            </span>
          </div>
        ))}
      </div>
    </GlassCard>
  )
}

function PaceInsights() {
  const fleet = useFleet()
  const data = useAuroraData()
  const eligible = fleet.participants.filter((p) => p.eligible).length
  const registered = data.totals.participants
  const scheduled = data.scheduled
  const enrolled = registered > 0 ? Math.round((scheduled / registered) * 100) : 0

  const funnel = [
    { label: 'Registered', value: registered, color: AURORA_ACCENTS.violet },
    { label: 'Eligible', value: eligible, color: AURORA_ACCENTS.blue },
    { label: 'Scheduled', value: scheduled, color: AURORA_ACCENTS.cyan },
    { label: 'Transport requests', value: data.attendingTransport, color: AURORA_ACCENTS.emerald },
  ]
  const max = Math.max(1, ...funnel.map((f) => f.value))

  return (
    <GlassCard className="p-0 pb-4">
      <PanelTitle icon={HeartPulse} accent="violet">
        PACE Program Registration
      </PanelTitle>
      <div className="mt-3 px-5">
        <div className="mb-3 flex items-baseline gap-2">
          <span className="text-2xl font-semibold tabular-nums text-white">{enrolled}%</span>
          <span className="text-xs text-slate-400">scheduled-to-registered rate</span>
        </div>
        <div className="space-y-2">
          {funnel.map((f) => (
            <div key={f.label} className="flex items-center gap-3">
              <span className="w-32 shrink-0 text-xs text-slate-300">{f.label}</span>
              <span className="h-2 flex-1 overflow-hidden rounded-full bg-white/10">
                <span
                  className="block h-full rounded-full"
                  style={{ width: `${(f.value / max) * 100}%`, background: f.color }}
                />
              </span>
              <span className="w-6 shrink-0 text-right text-xs font-semibold tabular-nums text-white">
                {f.value}
              </span>
            </div>
          ))}
        </div>
      </div>
    </GlassCard>
  )
}
