'use client'

import { useMemo, useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import {
  Bus,
  Check,
  ChevronDown,
  CircleAlert,
  CircleCheck,
  Clock,
  Gauge,
  Map as MapIcon,
  Route as RouteIcon,
  Sparkles,
  TriangleAlert,
  UserRound,
  Users,
} from 'lucide-react'
import { PageHeader, StatCard } from '@/components/common'
import { FleetMap } from '@/components/map/fleet-map-dynamic'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { cn, findById, firstLetterInitials } from '@/lib/utils'
import { formatMonthDayYear, formatTimeOfDay } from '@/lib/date'
import { formatMiles } from '@/lib/labels'
import { useCenters, useEvents } from '@/lib/events/hooks'
import { useTrips, useDispatchActions } from '@/lib/trips/hooks'
import { useVehicles } from '@/lib/vehicles/hooks'
import { useDrivers } from '@/lib/driver/hooks'
import { useParticipants } from '@/lib/participant/hooks'
import { useFleetSession } from '@/components/context/fleet-session-provider'
import { useNotifications } from '@/components/context/notification-provider'
import type { LatLng} from '@/lib/types'
import { TripsConfig } from '@/lib/trips/config';
import { Phase, PlanRecommendation, PlanStatus, RecentPlansInterface } from '@/lib/trips/types';
import { UnassignedParticipant } from '@/lib/participant/types';
import { TripsUtils } from '@/lib/trips/utils';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useTranslation } from '@/components/context/language-provider';

function FailureReasons({
  reason,
  canReplan,
  busy,
  onReplan,
}: {
  reason: string
  canReplan: boolean
  busy: boolean
  onReplan: () => Promise<void>
}) {
  const { t } = useTranslation()
  return (
    <ul className="space-y-2">
      {reason.split(';').map((r, i) => (
        <li
          key={i}
          className="flex items-center justify-between gap-2 rounded-md border bg-background px-3 py-2"
        >
          <span className="text-sm">{r.trim()}</span>
          {canReplan && (
            <Button size="sm" disabled={busy} onClick={onReplan}>
              <Sparkles className="size-4" />
              {t('planner.replan')}
            </Button>
          )}
        </li>
      ))}
    </ul>
  )
}

export default function PlannerPage() {
  const { centers } = useCenters()
  const { events } = useEvents()
  const { trips } = useTrips()
  const { vehicles } = useVehicles()
  const { participants } = useParticipants()
  const { simRunning, toggleSim } = useFleetSession()
  const { generatePlan, commitPlan, replanTripByEventId, replanTripByTripId } = useDispatchActions()
  const {t} = useTranslation()
  const { addToast } = useNotifications()
  const router = useRouter()
  const plannableEvents = events.filter(
    (e) => e.status !== 'completed' && TripsUtils.isEventDispatchable(e),
  )
  const defaultEventId = useMemo(() => {
    const committedPids = new Set(
      trips
        .filter((t) => t.status !== 'CANCELLED')
        .flatMap((t) => (Array.isArray(t.stops) ? t.stops : []).map((s) => s.participantId)),
    )
    const withPending = plannableEvents.find((e) =>
      (Array.isArray(e.participantIds) ? e.participantIds : []).some((pid) => !committedPids.has(pid)),
    )
    return withPending?.id ?? plannableEvents[0]?.id ?? ''
  }, [])
  const [eventId, setEventId] = useState(defaultEventId)

  useEffect(() => {
    if (typeof window === 'undefined') return
    const sp = new URLSearchParams(window.location.search)
    const id = sp.get('id')
    if (id) setEventId(id)
  }, [])
  const [phase, setPhase] = useState<Phase>('idle')
  const [step, setStep] = useState(0)
  const [recs, setRecs] = useState<PlanRecommendation[]>([])
  const [unassigned, setUnassigned] = useState<UnassignedParticipant[]>([])
  const [selectedRouteId, setSelectedRouteId] = useState<string | null>(null)
  const [committed, setCommitted] = useState(false)

  const event = findById(events, eventId)
  const center = event ? findById(centers, event.centerId) : undefined
  const pending = useMemo(() => {
    if (!event) return []
    const participantIds = Array.isArray(event.participantIds) ? event.participantIds : []
    const committedPids = new Set(
      trips
        .filter((t) => t.eventId === eventId && t.status !== 'CANCELLED')
        .flatMap((t) => (Array.isArray(t.stops) ? t.stops : []).map((s) => s.participantId)),
    )
    return participants.filter(
      (p) => participantIds.includes(p.id) && !committedPids.has(p.id),
    )
  }, [event, eventId, trips, participants])

  const planStatus = useMemo(
    () => (event ? TripsUtils.getPlanStatus(event, trips) : null),
    [event, trips],
  )

  function runPlanner(targetId: string = eventId) {
    simRunning && toggleSim()
    if (targetId !== eventId) setEventId(targetId)
    setPhase('planning')
    setStep(0)
    setCommitted(false)
    setUnassigned([])
    const interval = setInterval(() => {
      setStep((s) => {
        if (s >= TripsConfig.PLANNING_STEPS.length - 1) {
          clearInterval(interval)
          generatePlan(targetId)
            .then((result) => {
              setRecs(result.recommendations)
              setUnassigned(result.unassigned)
              setSelectedRouteId(result.recommendations[0]?.id ?? null)
              setPhase('results')
            })
            .catch((error) => {
              console.error('[v0] generatePlan failed', error)
              setRecs([])
              setUnassigned([])
              setSelectedRouteId(null)
              setPhase('results')
            })
          return s
        }
        return s + 1
      })
    }, 550
  )
  }

  async function replanEvent(evId: string) {
    try {
      await replanTripByEventId(evId);
      addToast({ title: t('notif.replansuccess'), message: t('notif.replansuccessbody'), kind: 'success' })
    } catch (error) {
      console.error('[v0] replanTripByEventId failed', error)
      addToast({ title: t('notif.replanfailed'), message: t('notif.replanfailedbody'), kind: 'danger' })
    }
  }

  async function replanTrip(tripId: string) {
    try {
      await replanTripByTripId(tripId);
      addToast({ title: t('notif.replansuccess'), message: t('notif.replansuccessbody'), kind: 'success' })
    } catch (error) {
      console.error('[v0] replanTripByTripId failed', error)
      addToast({ title: t('notif.replanfailed'), message: t('notif.replanfailedbody'), kind: 'danger' })
    }
  }

  async function commit() {
    await commitPlan(eventId, recs)
    setCommitted(true)
  }

  const autoPlanRef = useRef(false)
  useEffect(() => {
    if (autoPlanRef.current || typeof window === 'undefined') return
    const sp = new URLSearchParams(window.location.search)
    if (sp.get('autoplan') !== '1') return
    if (!event || !planStatus || phase !== 'idle') return
    if (!planStatus.canGenerate || planStatus.hasPlan) return
    autoPlanRef.current = true
    runPlanner(event.id)
  }, [event, planStatus, phase])

  const fitPoints = useMemo(() => {
    const points: LatLng[] = []
    if (center?.location) points.push(center.location)
    pending.forEach((p) => points.push(p.location))
    return points
  }, [center, pending])

  const totalDistance = recs.reduce((s, r) => s + r.distanceKm, 0)
  const anyDriverAssigned = recs.some((r) => r.driverId)

  return (
    <div className="flex min-h-full flex-col">
      <PageHeader
        title={t('nav.routeplanner')}
        description={t('planner.desc')}
      />

      <div className="flex flex-col gap-6 p-6">

        {event && planStatus && phase !== 'idle' ? <PlanStatusBanner status={planStatus} /> : null}

        {event && phase !== 'idle' ? (
          <div
            className={`grid w-full gap-4 ${phase === "results" ? "lg:grid-cols-[2fr_1fr]" : "lg:grid-cols-[1fr_auto]"}`}
          >
            <Card className="p-4">
              <div className="flex flex-col gap-4">
                <div className="flex flex-col items-center justify-center">
                  <h2 className="text-sm font-semibold text-balance">
                    {event.name}
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    {center?.name} · {formatMonthDayYear(event.date)} at {formatTimeOfDay(event.startTime)}
                  </p>
                </div>

                <div className="flex items-center gap-6 justify-center">
                  <div className="text-center">
                    <p className="text-xl font-semibold tabular-nums leading-none">
                      {pending.length}
                    </p>
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      {t('common.participants')}
                    </p>
                  </div>

                  <div className="text-center">
                    <p className="text-xl font-semibold tabular-nums leading-none">
                      {
                        pending.filter(
                          (p) =>
                            p.constraints.wheelchair
                        ).length
                      }
                    </p>
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      {t('part.wheelchair')}
                    </p>
                  </div>
                </div>
              </div>
            </Card>
            {phase === "results" ? (
              <div className="grid grid-cols-2 gap-4">
                <StatCard
                  label={t('planner.vehiclesused')}
                  value={recs.length}
                  icon={Bus}
                  tone="primary"
                />
                <StatCard
                  label={t('planner.totaldistance')}
                  value={formatMiles(totalDistance)}
                  icon={RouteIcon}
                />
              </div>
            ) : null}
          </div>
        ) : null}

        {phase === 'idle' ? (
          <RecentPlans onReplan={replanEvent} onReplanTrip={replanTrip} onOpenDispatch={(eventId) => router.push(`/command-center?eventId=${eventId}`)} />
        ) : null}

        {phase === "planning" ? (
          <Card className="p-6">
            <div className="mx-auto max-w-md space-y-3">
              {TripsConfig.PLANNING_STEPS.map((label, i) => {
                const active = i === step;
                const done = i < step;
                return (
                  <div key={label} className="flex items-center gap-3">
                    <span
                      className={cn(
                        "flex size-6 shrink-0 items-center justify-center rounded-full text-xs",
                        done
                          ? "bg-success text-success-foreground"
                          : active
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted text-muted-foreground",
                      )}
                    >
                      {done ? (
                        <Check className="size-3.5" />
                      ) : active ? (
                        <span className="size-2 animate-ping rounded-full bg-primary-foreground" />
                      ) : (
                        i + 1
                      )}
                    </span>
                    <span
                      className={cn(
                        'text-sm',
                        done ? 'text-muted-foreground line-through' : active ? 'font-medium text-foreground' : 'text-muted-foreground',
                      )}
                    >
                      {t(label)}
                    </span>
                  </div>
                );
              })}
            </div>
          </Card>
        ) : null}

        {/* Results */}
        {phase === "results" ? (
          <>
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold">
                {t('planner.recommendedcount').replace('{{count}}', String(recs.length))}{" "}
                {recs.length === 1 ? t('planner.route') : t('planner.routes')}
              </h2>
              {committed ? (
                <Badge className="bg-success/20 text-success">
                  <Check className="mr-1 size-3.5" /> {t('planner.committedtodispatch')}
                </Badge>
              ) : (
                <div className="flex items-center gap-2">
                  {recs.length > 0 && !anyDriverAssigned ? (
                    <span className="text-xs text-muted-foreground">{t('planner.nodriverany')}</span>
                  ) : null}
                  <Button size="sm" onClick={commit} disabled={recs.length === 0 || !anyDriverAssigned}>
                    <Check className="size-4" />
                    {t('planner.commitcount').replace('{{count}}', String(recs.length))}{" "}
                    {recs.length === 1 ? t('planner.route') : t('planner.routes')} {t('planner.todispatch')}
                  </Button>
                </div>
              )}
            </div>
            <Card className="overflow-hidden">
              <div className="flex items-center gap-2 border-b border-border px-4 py-1">
                <MapIcon className="size-4 text-primary" />
                <div>
                  <h2 className="text-sm font-semibold">
                    {t('planner.recommendedroutemap')}
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    {t('planner.routewithstops').replace('{{index}}', String(recs.findIndex((r) => r.id === selectedRouteId) + 1))}
                  </p>
                </div>
              </div>
              <div className="h-105">
                <FleetMap
                  centers={center ? [center] : []}
                  vehicles={vehicles}
                  trips={[]}
                  participants={pending}
                  recommendedRoute={(() => {
                    const routes = recs;
                    return routes.map((route) => {
                      const vehicle = findById(vehicles, route.vehicleId);

                      return {
                        ...route,
                        routeId: route.id,
                        origin: vehicle?.location,
                        destination: center?.location,
                        fallbackMinutes: route.durationMinutes,
                      };
                    });
                  })()}
                  setRecommendedRoute={setSelectedRouteId}
                  recommendedRouteId={selectedRouteId ?? ""}
                  fitTo={recs.find((r) => r.id === selectedRouteId)?.routePath ?? fitPoints}
                />
              </div>
            </Card>
            <div className="grid gap-4 lg:grid-cols-2">
              {recs.map((rec, i) => (
                <RecommendationCard
                  key={rec.id}
                  rec={rec}
                  index={i}
                  selected={selectedRouteId === rec.id}
                  onSelect={() => setSelectedRouteId(rec.id)}
                />
              ))}
            </div>

            {unassigned.length > 0 ? (
              <Card className="border-warning/40 bg-warning/5 p-4">
                <p className="flex items-center gap-1.5 text-sm font-semibold text-warning-foreground">
                  <TriangleAlert className="size-4" />
                  {t('planner.needsschedulerreview')
                    .replace('{{count}}', String(unassigned.length))
                    .replace('{{suffix}}', unassigned.length === 1 ? '' : 's')}
                </p>
                <ul className="mt-2 space-y-1">
                  {unassigned.map((u) => (
                    <li key={u.participantId} className="flex items-start gap-1.5 text-xs text-muted-foreground">
                      <CircleAlert className="mt-0.5 size-3 shrink-0 text-warning-foreground" />
                      {u.reason}
                    </li>
                  ))}
                </ul>
                <p className="mt-2 text-[11px] text-muted-foreground">
                  {t('planner.addcoveragenote')}
                </p>
              </Card>
            ) : null}

            {committed ? (
              <Card className="flex items-center justify-between gap-4 border-success/40 bg-success/5 p-4">
                <p className="text-sm text-muted-foreground">
                  {t('planner.routescommitted')}
                </p>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => router.push(`/command-center?eventId=${event?.id ?? ''}`)}
                >
                  {t('planner.opencommandcenter')}
                </Button>
              </Card>
            ) : null}
          </>
        ) : null}
      </div>
    </div>
  );
}

function RecommendationCard({
  rec,
  index,
  selected,
  onSelect,
}: {
  rec: PlanRecommendation
  index: number
  selected: boolean
  onSelect: () => void
}) {
  const { vehicles } = useVehicles()
  const { drivers } = useDrivers()
  const { participants } = useParticipants()
  const {t} = useTranslation()
  const vehicle = findById(vehicles, rec.vehicleId)
  const driver = rec.driverId ? findById(drivers, rec.driverId) : undefined
  const participantIds = Array.isArray(rec.participantIds) ? rec.participantIds : []
  const stops = Array.isArray(rec.stops) ? rec.stops : []
  const violations = Array.isArray(rec.violations) ? rec.violations : []

  return (
    <Card
      className={cn('cursor-pointer overflow-hidden transition-colors', selected && 'border-primary ring-2 ring-primary/60')}
      onClick={onSelect}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') onSelect()
      }}
      role="button"
      tabIndex={0}
    >
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Bus className="size-4" />
          </div>
          <div>
            <p className="text-sm font-semibold">{t('planner.routenum').replace('{{index}}', String(index + 1))}</p>
            <p className="text-xs text-muted-foreground">{vehicle?.name} · {vehicle?.type}</p>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 border-b border-border px-4 py-3">
        {rec.vehiclePickupTime ? (
          <Badge variant="outline" className="bg-primary/5 text-primary">
            {t('planner.vehiclepickup').replace('{{time}}', rec.vehiclePickupTime)}
          </Badge>
        ) : null}
        {rec.scheduledArrivalTime ? (
          <Badge variant="outline" className="bg-success/10 text-success">
            {t('planner.arriveby').replace('{{time}}', rec.scheduledArrivalTime)}
          </Badge>
        ) : null}
        {rec.programStartTime ? (
          <Badge variant="outline" className="text-muted-foreground">
            {t('planner.programstart').replace('{{time}}', rec.programStartTime)}
          </Badge>
        ) : null}
      </div>

      <div className="grid grid-cols-3 gap-px bg-border">
        <MiniMetric label={t('trip.riders')} value={String(participantIds.length)} icon={Users} />
        <MiniMetric label={t('meal.distance')} value={formatMiles(rec.distanceKm)} icon={RouteIcon} />
        <MiniMetric label={t('common.time')} value={`${rec.durationMinutes}m`} icon={Gauge} />
      </div>

      <div className="px-4 py-3">
        <div className="mb-1 flex items-center justify-between text-xs">
          <span className="flex items-center gap-1.5 text-muted-foreground">
            <UserRound className="size-3.5" />
            {driver?.name ?? <span className="text-destructive">{t('planner.nodriveravailable')}</span>}
          </span>
          <span className="text-muted-foreground">{Math.round(rec.capacityUtilization * 100)}% {t('planner.full')}</span>
        </div>
        <Progress value={rec.capacityUtilization * 100} className="h-1" />

        <ol className="mt-3 space-y-1.5">
          {stops.map((s) => {
            const p = findById(participants, s.participantId)
            return (
              <li key={s.participantId} className="flex items-center gap-2 text-xs">
                <span className="flex size-4 items-center justify-center rounded-full bg-muted text-[9px] font-medium text-muted-foreground">
                  {s.order}
                </span>
                <span className="flex-1 truncate">{p?.name}</span>
                <span className="text-right tabular-nums text-muted-foreground">
                  {s.scheduledPickupTime ? (
                    <span className="block text-[11px] font-medium text-foreground">{s.scheduledPickupTime}</span>
                  ) : null}
                  <span className="block">+{s.etaMinutes}m</span>
                </span>
              </li>
            )
          })}
        </ol>

        {violations.length > 0 ? (
          <div className="mt-3 rounded-md border border-warning/40 bg-warning/10 px-3 py-2">
            <p className="flex items-center gap-1.5 text-xs font-medium text-warning-foreground">
              <TriangleAlert className="size-3.5" />
              {violations.length} {violations.length === 1 ? t('planner.constraintflag') : t('planner.constraintflags')}
            </p>
            <ul className="mt-1 space-y-0.5">
              {violations.map((v) => (
                <li key={v} className="flex items-start gap-1 text-[11px] text-muted-foreground">
                  <CircleAlert className="mt-0.5 size-3 shrink-0 text-warning-foreground" />
                  {v}
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <p className="mt-3 flex items-center gap-1.5 text-xs text-success">
            <Check className="size-3.5" /> {t('planner.allconstraintssatisfied')}
          </p>
        )}
      </div>
    </Card>
  )
}

function PlanStatusBanner({ status }: { status: PlanStatus }) {
  const {t} = useTranslation()
  if (status.hasPlan) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-success/30 bg-success/10 px-3 py-2 text-sm text-success">
        <CircleCheck className="size-4 shrink-0" />
        <span>
          {t('planner.routeplangenerated')} · {status.tripCount} {status.tripCount === 1 ? t('planner.route') : t('planner.routes')}
          {status.dispatched ? ` · ${t('planner.dispatchedsuffix')}` : ` · ${t('planner.awaitingdispatch')}`}
        </span>
      </div>
    )
  }
  if (!status.canGenerate) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-warning/40 bg-warning/10 px-3 py-2 text-sm text-warning-foreground">
        <Clock className="size-4 shrink-0" />
        <span>
          {status.blockedReasonKey
            ? t(status.blockedReasonKey).replace(
                '{{time}}',
                status.deadline.toLocaleString([], {
                  month: 'short',
                  day: 'numeric',
                  hour: 'numeric',
                  minute: '2-digit',
                }),
              )
            : t('planner.waitingresponses')}
        </span>
      </div>
    )
  }
  return (
    <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
      <Sparkles className="size-4 shrink-0 text-primary" />
      <span>{t('planner.noplanyet')}</span>
    </div>
  )
}

function MiniMetric({
  label,
  value,
  icon: Icon,
}: {
  label: string
  value: string
  icon: React.ComponentType<{ className?: string }>
}) {
  return (
    <div className="bg-card px-3 py-2.5">
      <div className="flex items-center gap-1 text-muted-foreground">
        <Icon className="size-3" />
        <span className="text-[10px]">{label}</span>
      </div>
      <p className="mt-0.5 text-sm font-semibold tabular-nums">{value}</p>
    </div>
  )
}

function RecentPlans({
  onReplan,
  onOpenDispatch,
  onReplanTrip,
}: {
  onReplan: (eventId: string) => void | Promise<void>;
  onReplanTrip: (tripId: string) => void | Promise<void>;
  onOpenDispatch: (eventId: string) => void;
}) {
  const { events } = useEvents();
  const { trips: allTrips } = useTrips();
  const { centers } = useCenters();
  const { drivers } = useDrivers();
  const { participants } = useParticipants();
  const {t} = useTranslation();
  const [busyId, setBusyId] = useState<string | null>(null);

  const groups = useMemo(() => {
    return events.map((e) => {
      const trips = allTrips.filter(
        (t) => t.eventId === e.id && t.status !== "CANCELLED",
      );
      trips.sort((a, b) =>
        (a.tripNumber ?? "").localeCompare(b.tripNumber ?? ""),
      );
      const dispatched = trips.some(
        (t) =>
          Boolean(t.startedAt) ||
          TripsConfig.DISPATCHED_STATUSES.includes(t.status),
      );
      const riders = new Set(
        trips.flatMap((t) =>
          (Array.isArray(t.stops) ? t.stops : []).map((s) => s.participantId),
        ),
      ).size;
      const distance = trips.reduce((s, t) => s + t.distanceKm, 0);
      return { eventId: e.id, trips, dispatched, riders, distance };
    }) as RecentPlansInterface[];
  }, [events, allTrips]);
  if (groups.length === 0) return null;

  return (
    <Card className="overflow-hidden">
      <div className="flex items-center gap-2 border-b border-border px-4 py-3">
        <RouteIcon className="size-4 text-primary" />
        <div>
          <h2 className="text-sm font-semibold">{t('planner.recentplannedroutes')}</h2>
          <p className="text-xs text-muted-foreground">
            {t('planner.recentplansdesc')}
          </p>
        </div>
      </div>
      <div className="divide-y divide-border">
        {groups.map((g) => {
          const event = findById(events, g.eventId);
          const center = event ? findById(centers, event.centerId) : undefined;
          const allTripsCompleted = g.trips.every(
            (t) => t.status === "COMPLETED",
          );
          return (
            <Collapsible key={g.eventId} className="border-b last:border-0">
              {/* Event header */}
              <div className="flex items-center justify-between gap-3 px-4 py-3">
                <CollapsibleTrigger className="flex min-w-0 flex-1 items-center gap-3 text-left">
                  <ChevronDown className="size-4 shrink-0 transition-transform data-panel-open:rotate-180" />

                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-sm font-medium">
                        {event?.name ?? t('planner.unknownevent')}
                      </p>

                      <Badge
                        className={
                          g.dispatched
                            ? "bg-success/20 text-success"
                            : "bg-muted text-muted-foreground"
                        }
                      >
                        {g.dispatched && <Check className="mr-1 size-3" />}
                        {g.dispatched ? t('planner.dispatched') : t('planner.notdispatched')}
                      </Badge>
                    </div>

                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {center?.name && `${center.name} · `}
                      {event && `${formatMonthDayYear(event.date)} · ${t('e.startTime')} - ${formatTimeOfDay(event.startTime)} · ${t('e.endTime')} - ${formatTimeOfDay(event.endTime)} · `}
                      {g.trips.length}{" "}
                      {g.trips.length === 1 ? t('planner.route') : t('planner.routes')} · {g.riders}{" "}
                      {t('planner.ridersword')} · {formatMiles(g.distance)}
                    </p>
                  </div>
                </CollapsibleTrigger>

                <div className="shrink-0">
                  {g.dispatched ? (
                    allTripsCompleted ? (
                      <Button size="sm" variant="outline">
                        {t('e.tripcompleted')}
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onOpenDispatch(g.eventId)}
                      >
                        {t('planner.opendispatch')}
                      </Button>
                    )
                  ) : (event &&
                    TripsUtils.canShowReplan(event))? (
                    <Button
                      size="sm"
                      disabled={busyId === g.eventId}
                      onClick={async () => {
                        setBusyId(g.eventId);
                        try {
                          await onReplan(g.eventId);
                        } finally {
                          setBusyId(null);
                        }
                      }}
                    >
                      <Sparkles className="size-4" />
                      {t('planner.replan')}
                    </Button>
                  ) : (
                    <div className="flex items-center gap-2 rounded-md border border-danger/20 bg-danger/5 px-3 py-2 text-sm text-danger">
                      <span className="font-medium">{t('planner.replandeadlinelabel')}</span>
                      <span>{t('planner.replandeadlinevalue')}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Event details */}
              <CollapsibleContent>
                <div className="border-t bg-muted/20 px-4 py-3">
                {event?.tripCreationFailedReason ? (
                  <FailureReasons
                    reason={event.tripCreationFailedReason}
                    canReplan={false}
                    busy={busyId === g.eventId}
                    onReplan={async () => {
                      setBusyId(g.eventId)
                      try {
                        await onReplan(g.eventId)
                      } finally {
                        setBusyId(null)
                      }
                    }}
                  />
                ) : (
                g.trips.length > 0 && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-medium text-muted-foreground">
                          {t('planner.routeslabel')}
                        </p>
                        <span className="text-xs text-muted-foreground">
                          {g.trips.length}{" "}
                          {g.trips.length === 1 ? t('planner.route') : t('planner.routes')}
                        </span>
                      </div>

                      {g.trips.map((trip) => {
                        const meta = TripsConfig.tripStatusMeta[trip.status] ?? TripsConfig.tripStatusMeta['PLANNED'];
                        const tripParticipants = (
                          Array.isArray(trip.stops) ? trip.stops : []
                        )
                          .map((s) => findById(participants, s.participantId))
                          .filter(Boolean) as { id: string; name: string }[];

                        const driver = findById(drivers, trip.driverId);
                        const failed = trip.tripCreationFailedReason;

                        return (
                          <Collapsible
                            key={trip.id}
                            className="overflow-hidden rounded-lg border bg-background shadow-sm"
                          >
                            {/* Trip header */}
                            <div className="flex items-center justify-between gap-3 px-3 py-2.5">
                              <CollapsibleTrigger className="flex min-w-0 flex-1 items-center gap-3 text-left">
                                <ChevronDown className="size-4 shrink-0 text-muted-foreground transition-transform data-panel-open:rotate-180" />

                                <div className="min-w-0">
                                  <div className="flex items-center gap-2">
                                    <span className="text-sm font-semibold">
                                      {trip.tripNumber}
                                    </span>
                                    <Badge
                                      variant="secondary"
                                      className="h-5 px-1.5 text-[10px]"
                                    >
                                      {t(meta.label) ?? ''}
                                    </Badge>
                                  </div>

                                  <p className="mt-0.5 text-xs text-muted-foreground">
                                    {tripParticipants.length}{" "}
                                    {tripParticipants.length === 1
                                      ? t('common.participant').toLowerCase()
                                      : t('common.participants').toLowerCase()}
                                    {" · "}
                                    {driver?.name ?? t('planner.nodriverassigned')}
                                  </p>
                                </div>
                              </CollapsibleTrigger>

                              <div className="text-right">
                                <p className="text-sm font-medium">
                                  {formatMiles(trip.distanceKm)}
                                </p>
                                <p className="text-[10px] text-muted-foreground">
                                  {t('planner.distancelabel')}
                                </p>
                              </div>
                            </div>

                            {/* Trip details */}
                            <CollapsibleContent>
                              <div className="border-t bg-muted/20 px-3 py-3">
                                {failed ? (
                                  <FailureReasons
                                    reason={failed}
                                    canReplan={Boolean(failed)}
                                    busy={busyId === trip.id}
                                    onReplan={async () => {
                                      setBusyId(trip.id)
                                      try {
                                        await onReplanTrip(trip.id)
                                      } finally {
                                        setBusyId(null)
                                      }
                                    }}
                                  />
                                ) : (
                                  <>
                                    {/* Driver / participant count */}
                                    <div className="grid gap-3 sm:grid-cols-2">
                                      <div className="rounded-md border bg-background p-3">
                                        <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                                          {t('common.driver')}
                                        </p>

                                        {driver ? (
                                          <div className="mt-1 flex items-center gap-2">
                                            <div className="flex size-7 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                                              {firstLetterInitials(driver.name)}
                                            </div>
                                            <span className="text-sm font-medium">
                                              {driver.name}
                                            </span>
                                          </div>
                                        ) : (
                                          <p className="mt-1 text-sm text-muted-foreground">
                                            {t('planner.nodriverassigned')}
                                          </p>
                                        )}
                                      </div>

                                      <div className="rounded-md border bg-background p-3">
                                        <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                                          {t('common.participants')}
                                        </p>
                                        <p className="mt-1 text-sm font-medium">
                                          {tripParticipants.length}
                                        </p>
                                      </div>
                                    </div>

                                    {/* Participants */}
                                    <div className="mt-3">
                                      <p className="mb-2 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                                        {t('planner.participantlist')}
                                      </p>

                                      {tripParticipants.length ? (
                                        <div className="overflow-hidden rounded-md border bg-background">
                                          {tripParticipants.map((p, i) => (
                                            <div
                                              key={p.id}
                                              className={cn(
                                                "flex items-center gap-2 px-3 py-2",
                                                i < tripParticipants.length - 1 &&
                                                  "border-b",
                                              )}
                                            >
                                              <div className="flex size-6 items-center justify-center rounded-full bg-muted text-[10px] font-medium">
                                                {i + 1}
                                              </div>
                                              <span className="truncate text-sm">
                                                {p.name}
                                              </span>
                                            </div>
                                          ))}
                                        </div>
                                      ) : (
                                        <div className="rounded-md border border-dashed bg-background px-3 py-2">
                                          <p className="text-sm text-muted-foreground">
                                            {t('planner.noparticipantsassigned')}
                                          </p>
                                        </div>
                                      )}
                                    </div>
                                  </>
                                )}
                              </div>
                            </CollapsibleContent>
                          </Collapsible>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </CollapsibleContent>
            </Collapsible>
          );
        })}
      </div>
    </Card>
  );
}
