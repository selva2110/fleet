'use client'

import { useState } from 'react'
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
  UserRound,
  CalendarDays,
} from 'lucide-react'
import {GlassCard, PanelTitle } from './aurora-ui'
import { useAuroraData } from './use-aurora-data'
import { useCenters, useEvents, useSmsNotifications } from '@/lib/events/hooks'
import { useMealDeliveries } from '@/lib/meals/hooks'
import { useTrips } from '@/lib/trips/hooks'
import { useDrivers } from '@/lib/driver/hooks'
import { useParticipants } from '@/lib/participant/hooks'
import { cn, findById } from '@/lib/utils'
import { TripsConfig } from '@/lib/trips/config';
import { EventsConfig } from '@/lib/events/config';
import { AuroraUtils } from '@/lib/aurora/utils';
import { AuroraConfig } from '@/lib/aurora/config';
import { useTranslation } from '../context/language-provider';
import { MealsConfig } from '@/lib/meals/config';

export function AuroraWidgets() {
  return (
    <div className="flex flex-col gap-4">
      <AlertsCenter />
      <PaceInsights />
    </div>
  )
}

export function TodaysOverview() {
  const data = useAuroraData()
  const { centers } = useCenters()
  const { events } = useEvents()
  const { trips } = useTrips()
  const { mealDeliveries } = useMealDeliveries()
  const { drivers } = useDrivers()
  const {t} = useTranslation()
  const slices = [
    { name: t('aurora.live'), value: data.tripStatusCounts.live, color: AuroraConfig.AURORA_ACCENTS.cyan },
    { name: t('e.completed'), value: data.tripStatusCounts.completed, color: AuroraConfig.AURORA_ACCENTS.emerald },
    { name: t('aurora.planned'), value: data.tripStatusCounts.planned, color: AuroraConfig.AURORA_ACCENTS.violet },
    { name: t('meal.cancelled'), value: data.tripStatusCounts.cancelled, color: AuroraConfig.AURORA_ACCENTS.rose },
  ].filter((s) => s.value > 0)
  const total = slices.reduce((s, d) => s + d.value, 0)

  // Today's trip and meal-run details, resolved from live fleet data.
  const todayKey = AuroraUtils.ymd(new Date())
  const todayEvents = events.filter((e) => e.date === todayKey)
  const todayEventIds = new Set(todayEvents.map((e) => e.id))
  const todayTrips = trips
    .filter((t) => todayEventIds.has(t.eventId))
    .sort((a, b) => a.etaCenter.localeCompare(b.etaCenter))
  const todayMeals = mealDeliveries
    .filter((m) => m.fromDate <= todayKey && todayKey <= m.toDate && m.status === 'ACTIVE')
    .sort((a, b) => a.departTime.localeCompare(b.departTime))

  const handleTripNavigate = (tripId: string) => {
    window.location.href = `/trips?tripId=${tripId}`;
  }

  return (
    <GlassCard className="p-0 pb-4">
      <div className="mt-4 grid grid-cols-1 gap-4 px-5 sm:grid-cols-3">
        <div>
          <PanelTitle icon={PieIcon} accent="cyan">
            {t('aurora.todaysoverview')}
          </PanelTitle>
          <div className="mt-2 flex items-center gap-4 px-5">
            <div className="relative size-32 shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={
                      total > 0
                        ? slices
                        : [{ name: "None", value: 1, color: "#334155" }]
                    }
                    dataKey="value"
                    innerRadius={42}
                    outerRadius={60}
                    paddingAngle={total > 0 ? 3 : 0}
                    stroke="none"
                    startAngle={90}
                    endAngle={-270}
                  >
                    {(total > 0 ? slices : [{ color: "#334155" }]).map(
                      (s, i) => (
                        <Cell key={i} fill={s.color} />
                      ),
                    )}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-xl font-semibold tabular-nums text-foreground">
                  {total ?? 0}
                </span>
                <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
                  {t('aurora.tripsword')}
                </span>
              </div>
            </div>
            <div className="flex-1 space-y-1.5">
              {slices.length === 0 ? (
                <p className="text-xs text-slate-400">
                  {t('aurora.notripstoday')}
                </p>
              ) : (
                slices.map((s) => (
                  <div key={s.name} className="flex items-center gap-2 text-xs">
                    <span className="flex items-center gap-2 text-muted-foreground">
                      <span
                        className="size-2.5 rounded-full"
                        style={{ background: s.color }}
                      />
                      {s.name}
                    </span>
                    <span className="font-medium tabular-nums">
                      {s.value}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
        <TodayDetailColumn
          icon={RouteIcon}
          title={t('aurora.tripstoday')}
          count={todayTrips.length}
          empty={t('aurora.notripsscheduled')}
        >
          {todayTrips.map((trip) => {
            const meta = TripsConfig.tripStatusMeta[trip.status] ?? TripsConfig.tripStatusMeta['PLANNED'];
            const event = todayEvents.find((e) => e.id === trip.eventId);
            const driver = trip.driverId
              ? findById(drivers, trip.driverId)
              : undefined;
            return (
              <li
                key={trip.id}
                className="rounded-lg border border-border bg-card/80 px-2.5 py-2 cursor-pointer transition-colors hover:bg-card/90"
                onClick={() => handleTripNavigate(trip.id)}
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate text-xs font-medium text-foreground">
                    {trip.tripNumber}
                  </p>
                  <span
                    className="shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-medium"
                    style={{ background: `${meta.map}22`, color: meta.map }}
                  >
                    {t(meta.label)}
                  </span>
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-[10px] text-muted-foreground">
                  {event ? (
                    <>
                      <span className="flex items-center gap-1">
                        <Clock className="size-3" /> {AuroraUtils.to12h(event.startTime)}
                      </span>
                      <span className="flex items-center gap-1">
                        <CalendarDays className="size-3" />
                        {event.name}
                      </span>
                    </>
                  ) : null}
                  {driver ? (
                    <span className="flex items-center gap-1">
                      <UserRound className="size-3" />
                      {driver.name}
                    </span>
                  ) : null}
                </div>
              </li>
            );
          })}
        </TodayDetailColumn>

        <TodayDetailColumn
          icon={UtensilsCrossed}
          title={t('aurora.mealrunstoday')}
          count={todayMeals.length}
          empty={t('aurora.nomealrunsscheduled')}
        >
          {todayMeals.map((m) => {
            const meta = MealsConfig.mealStatusMeta[m.status];
            const center = findById(centers, m.centerId);
            return (
              <li
                key={m.id}
                className="rounded-lg border border-border bg-card/80 px-2.5 py-2"
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate text-xs font-medium text-foreground">
                    {m.name}
                  </p>
                  <span
                    className="shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-medium"
                    style={{ background: `${meta.map}22`, color: meta.map }}
                  >
                    {t(meta.label)}
                  </span>
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-[10px] text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Clock className="size-3" /> {AuroraUtils.to12h(m.departTime)}
                  </span>
                  {center ? (
                    <span className="flex items-center gap-1 truncate">
                      <MapPin className="size-3" /> {center.name}
                    </span>
                  ) : null}
                  <span>
                    {m.participants.length} {t('meal.deliveries').toLowerCase()}
                  </span>
                </div>
              </li>
            );
          })}
        </TodayDetailColumn>
      </div>
    </GlassCard>
  );
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
      <div className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        <Icon className="size-3.5" />
        {title}
        <span className="ml-auto rounded-full bg-card/80 px-1.5 py-0.5 text-[10px] tabular-nums text-foreground">
          {count}
        </span>
      </div>
      {count === 0 ? (
        <p className="rounded-lg border border-dashed border-border px-3 py-4 text-center text-[11px] text-muted-foreground">
          {empty}
        </p>
      ) : (
        <ul className="max-h-56 space-y-1.5 overflow-y-auto pr-1">{children}</ul>
      )}
    </div>
  )
}

function OverviewDetailColumn({
  icon: Icon,
  title,
  count,
  hideCount,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>
  title: string
  count: number
  hideCount?: boolean
  children: React.ReactNode
}) {
  return (
    <div>
      <div className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        <Icon className="size-3.5" />
        {title}
        {!hideCount ? (
          <span className="ml-auto rounded-full bg-card/80 px-1.5 py-0.5 text-[10px] tabular-nums text-foreground">
            {count}
          </span>
        ) : null}
      </div>
      <div className="rounded-3xl border border-border bg-card/80 px-3 py-4">
        {children}
      </div>
    </div>
  )
}

function AlertsCenter() {
  const data = useAuroraData()
  const {t} = useTranslation()
  const meta = {
    critical: { cls: 'border-rose-400/25 bg-rose-400/10 text-rose-500', icon: AlertTriangle, dot: 'bg-rose-400' },
    warning: { cls: 'border-amber-400/25 bg-amber-400/10 text-amber-500', icon: AlertTriangle, dot: 'bg-amber-400' },
    info: { cls: 'border-cyan-400/20 bg-cyan-400/10 text-cyan-500', icon: Info, dot: 'bg-cyan-400' },
  } as const

  return (
    <GlassCard className="p-0 pb-4">
      <PanelTitle icon={AlertTriangle} accent="rose" className="px-5 pt-4">
        {t('aurora.alertscenter')}
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
                <p className="text-[13px] font-medium leading-tight text-foreground">{a.title}</p>
                <p className="mt-0.5 text-xs text-muted-foreground/80">{a.detail}</p>
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
  const {t} = useTranslation()
  const rows = [
    { label: t('resp.needstransport'), value: data.attendingTransport, color: AuroraConfig.AURORA_ACCENTS.cyan },
    { label: t('e.owntransport'), value: data.attendingSelf, color: AuroraConfig.AURORA_ACCENTS.emerald },
    { label: t('e.notattending'), value: data.notAttending, color: AuroraConfig.AURORA_ACCENTS.rose },
    { label: t('e.noresponse'), value: data.noResponse, color: AuroraConfig.AURORA_ACCENTS.amber },
  ]
  const max = Math.max(1, ...rows.map((r) => r.value))
  return (
    <GlassCard className="p-0 pb-4">
      <PanelTitle icon={Users} accent="amber" className="px-5 pt-4">
        {t('aurora.participantattendance')}
      </PanelTitle>
      <div className="mt-3 space-y-2.5 px-5">
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-semibold tabular-nums text-foreground">{data.attendanceRate}%</span>
          <span className="text-xs text-muted-foreground">{t('aurora.confirmedattendance')} · {data.responded} {t('aurora.replies')}</span>
        </div>
        {rows.map((r) => (
          <div key={r.label}>
            <div className="mb-1 flex items-center justify-between text-xs">
              <span className="text-muted-foreground">{r.label}</span>
              <span className="font-medium tabular-nums text-foreground">{r.value}</span>
            </div>
            <span className="block h-1.5 overflow-hidden rounded-full bg-card/80">
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
  const { events } = useEvents()
  const { participants } = useParticipants()
  const { smsNotifications } = useSmsNotifications(events)
  const data = useAuroraData()
  const {t} = useTranslation()
  const [eventId, setEventId] = useState<string>('all')
  const selectedEvent = eventId === 'all' ? null : findById(events, eventId)

  let registered: number
  let scheduled: number
  let transportRequests: number

  if (selectedEvent) {
    const participantIds = Array.isArray(selectedEvent.participantIds) ? selectedEvent.participantIds : []
    const roster = participantIds
      .map((id) => findById(participants, id))
      .filter((p): p is NonNullable<typeof p> => Boolean(p))
    registered = roster.length
    scheduled = roster.filter((p) =>
      ['scheduled', 'driver-assigned', 'vehicle-assigned'].includes(p.status),
    ).length
    transportRequests = smsNotifications.filter(
      (n) => n.eventId === selectedEvent.id && n.response === 'attending_transport',
    ).length
  } else {
    registered = data.totals.participants
    scheduled = data.scheduled
    transportRequests = data.attendingTransport
  }

  const enrolled = registered > 0 ? Math.round((scheduled / registered) * 100) : 0

  const funnel = [
    { label: t('aurora.registered'), value: registered, color: AuroraConfig.AURORA_ACCENTS.violet },
    { label: t('e.scheduled'), value: scheduled, color: AuroraConfig.AURORA_ACCENTS.cyan },
    { label: t('aurora.transportrequests'), value: transportRequests, color: AuroraConfig.AURORA_ACCENTS.emerald },
  ]
  const max = Math.max(1, ...funnel.map((f) => f.value))

  return (
    <GlassCard className="p-0 pb-4">
      <PanelTitle icon={HeartPulse} accent="violet" className="px-5 pt-4">
        {t('aurora.paceprogramregistration')}
      </PanelTitle>
      <div className="mt-3 px-5">
        <label className="sr-only" htmlFor="pace-event-select">
          {t('aurora.chooseprogram')}
        </label>
        <select
          id="pace-event-select"
          value={eventId}
          onChange={(e) => setEventId(e.target.value)}
          className="mb-3 w-full rounded-lg border border-white/10 bg-white/6 px-3 py-2 text-xs font-medium text-foreground outline-none transition-colors hover:bg-white/10 focus:ring-2 focus:ring-violet-400/40"
        >
          <option value="all" className="bg-slate-900 text-white">
            {t('aurora.allprograms')}
          </option>
          {events.map((ev) => (
            <option key={ev.id} value={ev.id} className="bg-slate-900 text-white">
              {ev.name}
            </option>
          ))}
        </select>
        {selectedEvent ? (
          <p className="mb-3 text-[11px] text-slate-400">
            {selectedEvent.type} · {selectedEvent.date}
          </p>
        ) : null}
        <div className="mb-3 flex items-baseline gap-2">
          <span className="text-2xl font-semibold tabular-nums text-foreground">{enrolled}%</span>
          <span className="text-xs text-muted-foreground">{t('aurora.scheduledregisteredrate')}</span>
        </div>
        <div className="space-y-2">
          {funnel.map((f) => (
            <div key={f.label} className="flex items-center gap-3">
              <span className="w-32 shrink-0 text-xs text-muted-foreground">{f.label}</span>
              <span className="h-2 flex-1 overflow-hidden rounded-full bg-card/80">
                <span
                  className="block h-full rounded-full"
                  style={{ width: `${(f.value / max) * 100}%`, background: f.color }}
                />
              </span>
              <span className="w-6 shrink-0 text-right text-xs font-semibold tabular-nums text-foreground">
                {f.value}
              </span>
            </div>
          ))}
        </div>
      </div>
    </GlassCard>
  )
}
