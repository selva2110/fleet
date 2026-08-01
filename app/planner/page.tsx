'use client'

import { useMemo, useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import {
  Bus,
  Check,
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
  Wallet,
} from 'lucide-react'
import { PageHeader, StatCard } from '@/components/common'
import { FleetMap } from '@/components/map/fleet-map-dynamic'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { cn } from '@/lib/utils'
import { formatMonthDayYear } from '@/lib/date'
import { formatMiles, tripStatusMeta } from '@/lib/labels'
import { useFleet } from '@/lib/store'
import { getPlanStatus, isEventDispatchable, type PlanStatus } from '@/lib/planning-status'
import type { PlanRecommendation, UnassignedParticipant } from '@/lib/types'

type Phase = 'idle' | 'planning' | 'results'

const PLANNING_STEPS = [
  'Analyzing participant locations & needs',
  'Matching medical constraints to vehicles',
  'Grouping participants by proximity',
  'Optimizing pickup sequences',
  'Assigning certified drivers',
  'Scoring route efficiency',
]

export default function PlannerPage() {
  const fleet = useFleet()
  const router = useRouter()
  // Only events that are not completed AND whose start time is still in the
  // future can be planned/dispatched. Once an event's start time passes, it is
  // no longer shown as a dispatch target.
  const plannableEvents = fleet.events.filter(
    (e) => e.status !== 'completed' && isEventDispatchable(e),
  )
  const defaultEventId = useMemo(() => {
    const committedPids = new Set(
      fleet.trips
        .filter((t) => t.status !== 'cancelled')
        .flatMap((t) => t.stops.map((s) => s.participantId)),
    )
    const withPending = plannableEvents.find((e) =>
      e.participantIds.some((pid) => !committedPids.has(pid)),
    )
    return withPending?.id ?? plannableEvents[0]?.id ?? ''
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  const event = fleet.eventById(eventId)
  const center = event ? fleet.centerById(event.centerId) : undefined
  const pending = useMemo(() => {
    if (!event) return []
    const committedPids = new Set(
      fleet.trips
        .filter((t) => t.eventId === eventId && t.status !== 'cancelled')
        .flatMap((t) => t.stops.map((s) => s.participantId)),
    )
    return fleet.participants.filter(
      (p) => event.participantIds.includes(p.id) && !committedPids.has(p.id),
    )
  }, [event, eventId, fleet])

  const planStatus = useMemo(
    () => (event ? getPlanStatus(event, fleet.trips) : null),
    [event, fleet.trips],
  )

  function runPlanner(targetId: string = eventId) {
      fleet.simRunning && fleet.toggleSim()
    if (targetId !== eventId) setEventId(targetId)
    setPhase('planning')
    setStep(0)
    setCommitted(false)
    setUnassigned([])
    const interval = setInterval(() => {
      setStep((s) => {
        if (s >= PLANNING_STEPS.length - 1) {
          clearInterval(interval)
          fleet
            .generatePlan(targetId)
            .then((result) => {
              setRecs(result.recommendations)
              setUnassigned(result.unassigned)
              setSelectedRouteId(result.recommendations[0]?.id ?? null)
              setPhase('results')
            })
            .catch((error) => {
              console.error('[v0] generatePlan failed', error)
              // Never leave the UI stuck on the planning animation.
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

  // Cancel an event's still-planned (not yet dispatched) trips and re-run the
  // planner for that event so the dispatcher can generate a fresh plan.
  async function replanEvent(evId: string) {
    const toCancel = fleet.trips.filter(
      (t) =>
        t.eventId === evId &&
        !t.startedAt &&
        ['planned', 'vehicle-assigned', 'driver-assigned'].includes(t.status),
    )
    await Promise.all(toCancel.map((t) => fleet.cancelTrip(t.id)))
    runPlanner(evId)
  }

  async function commit() {
    await fleet.commitPlan(eventId, recs)
    setCommitted(true)
  }

  // When arriving from the deadline prompt (?autoplan=1) and generation is
  // unlocked, kick off the planner automatically for the selected event.
  const autoPlanRef = useRef(false)
  useEffect(() => {
    if (autoPlanRef.current || typeof window === 'undefined') return
    const sp = new URLSearchParams(window.location.search)
    if (sp.get('autoplan') !== '1') return
    if (!event || !planStatus || phase !== 'idle') return
    if (!planStatus.canGenerate || planStatus.hasPlan) return
    autoPlanRef.current = true
    runPlanner(event.id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [event, planStatus, phase])

  const totalDistance = recs.reduce((s, r) => s + r.distanceKm, 0)
  const totalCost = recs.reduce((s, r) => s + r.estimatedCost, 0)
  const avgScore = recs.length ? Math.round(recs.reduce((s, r) => s + r.routeScore, 0) / recs.length) : 0
  const totalViolations = recs.reduce((s, r) => s + r.violations.length, 0)
  const anyDriverAssigned = recs.some((r) => r.driverId)

  return (
    <div className="flex min-h-full flex-col">
      <PageHeader
        title="Route Planner"
        description="Routes are planned automatically once the response deadline ends — or immediately when participant notifications are off. Use Re-plan below to regenerate a plan."
      />

      <div className="flex flex-col gap-6 p-6">
        {/* Plan status + deadline gating — only while actively planning/re-planning */}
        {event && planStatus && phase !== 'idle' ? <PlanStatusBanner status={planStatus} /> : null}

        {/* Event summary — only while actively planning/re-planning */}
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
                    {center?.name} · {formatMonthDayYear(event.date)} at {event.startTime}
                  </p>
                </div>

                <div className="flex items-center gap-6 justify-center">
                  <div className="text-center">
                    <p className="text-xl font-semibold tabular-nums leading-none">
                      {pending.length}
                    </p>
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      Participants
                    </p>
                  </div>

                  <div className="text-center">
                    <p className="text-xl font-semibold tabular-nums leading-none">
                      {
                        pending.filter(
                          (p) =>
                            p.constraints.wheelchair ||
                            p.constraints.poweredWheelchair,
                        ).length
                      }
                    </p>
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      Wheelchair
                    </p>
                  </div>

                  <div className="text-center">
                    <p className="text-xl font-semibold tabular-nums leading-none">
                      {
                        pending.filter((p) => p.medicalPriority === "critical")
                          .length
                      }
                    </p>
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      Critical
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-xl font-semibold tabular-nums leading-none">
                      {
                        pending.filter((p) => p.medicalPriority === "elevated")
                          .length
                      }
                    </p>
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      Elevated
                    </p>
                  </div>
                </div>
              </div>
            </Card>
            {phase === "results" ? (
              <div className="grid grid-cols-2 gap-4">
                <StatCard
                  label="Vehicles Used"
                  value={recs.length}
                  icon={Bus}
                  tone="primary"
                />
                <StatCard
                  label="Total Distance"
                  value={formatMiles(totalDistance)}
                  icon={RouteIcon}
                />
              </div>
            ) : null}
          </div>
        ) : null}

        {/* Recent planned routes — re-plan any that are not yet dispatched */}
        {phase === 'idle' ? (
          <RecentPlans onReplan={replanEvent} onOpenDispatch={() => router.push('/command-center')} />
        ) : null}

        {/* Planning animation */}
        {phase === "planning" ? (
          <Card className="p-6">
            <div className="mx-auto max-w-md space-y-3">
              {PLANNING_STEPS.map((label, i) => {
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
                      {label}
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
                {recs.length} recommended{" "}
                {recs.length === 1 ? "route" : "routes"}
              </h2>
              {committed ? (
                <Badge className="bg-success/20 text-success">
                  <Check className="mr-1 size-3.5" /> Committed to Dispatch
                </Badge>
              ) : (
                <div className="flex items-center gap-2">
                  {recs.length > 0 && !anyDriverAssigned ? (
                    <span className="text-xs text-muted-foreground">No driver assigned to any route</span>
                  ) : null}
                  <Button size="sm" onClick={commit} disabled={recs.length === 0 || !anyDriverAssigned}>
                    <Check className="size-4" />
                    Commit {recs.length}{" "}
                    {recs.length === 1 ? "route" : "routes"} to Dispatch
                  </Button>
                </div>
              )}
            </div>
            <Card className="overflow-hidden">
              <div className="flex items-center gap-2 border-b border-border px-4 py-1">
                <MapIcon className="size-4 text-primary" />
                <div>
                  <h2 className="text-sm font-semibold">
                    Recommended route map
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    Route {recs.findIndex((r) => r.id === selectedRouteId) + 1}{" "}
                    with pickup stops
                  </p>
                </div>
              </div>
              <div className="h-105">
                <FleetMap
                  centers={center ? [center] : []}
                  vehicles={fleet.vehicles}
                  trips={[]}
                  participants={pending}
                  recommendedRoute={(() => {
                    const routes = recs;
                    return routes.map((route) => {
                      const vehicle = fleet.vehicleById(route.vehicleId);

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
                  fitTo={recs.find((r) => r.id === selectedRouteId)?.routePath}
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
                  {unassigned.length} participant
                  {unassigned.length === 1 ? "" : "s"} need scheduler review
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
                  Add a vehicle, driver, or shift coverage that meets these riders&apos; needs, or arrange transport manually.
                </p>
              </Card>
            ) : null}

            {committed ? (
              <Card className="flex items-center justify-between gap-4 border-success/40 bg-success/5 p-4">
                <p className="text-sm text-muted-foreground">
                  Routes committed. Track them live in the Command Center.
                </p>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => router.push("/command-center")}
                >
                  Open Command Center
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
  const fleet = useFleet()
  const vehicle = fleet.vehicleById(rec.vehicleId)
  const driver = rec.driverId ? fleet.driverById(rec.driverId) : undefined
  const scoreTone = rec.routeScore >= 75 ? 'text-success' : rec.routeScore >= 55 ? 'text-warning-foreground' : 'text-destructive'

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
            <p className="text-sm font-semibold">Route {index + 1}</p>
            <p className="text-xs text-muted-foreground">{vehicle?.name} · {vehicle?.type}</p>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 border-b border-border px-4 py-3">
        {rec.vehiclePickupTime ? (
          <Badge variant="outline" className="bg-primary/5 text-primary">
            Vehicle pickup {rec.vehiclePickupTime}
          </Badge>
        ) : null}
        {rec.scheduledArrivalTime ? (
          <Badge variant="outline" className="bg-success/10 text-success">
            Arrive by {rec.scheduledArrivalTime}
          </Badge>
        ) : null}
        {rec.programStartTime ? (
          <Badge variant="outline" className="text-muted-foreground">
            Program start {rec.programStartTime}
          </Badge>
        ) : null}
      </div>

      <div className="grid grid-cols-3 gap-px bg-border">
        <MiniMetric label="Riders" value={String(rec.participantIds.length)} icon={Users} />
        <MiniMetric label="Distance" value={formatMiles(rec.distanceKm)} icon={RouteIcon} />
        <MiniMetric label="Time" value={`${rec.durationMinutes}m`} icon={Gauge} />
        {/* <MiniMetric label="Cost" value={`$${rec.estimatedCost}`} icon={Wallet} /> */}
      </div>

      <div className="px-4 py-3">
        <div className="mb-1 flex items-center justify-between text-xs">
          <span className="flex items-center gap-1.5 text-muted-foreground">
            <UserRound className="size-3.5" />
            {driver?.name ?? <span className="text-destructive">No driver available</span>}
          </span>
          <span className="text-muted-foreground">{Math.round(rec.capacityUtilization * 100)}% full</span>
        </div>
        <Progress value={rec.capacityUtilization * 100} className="h-1" />

        <ol className="mt-3 space-y-1.5">
          {rec.stops.map((s) => {
            const p = fleet.participantById(s.participantId)
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

        {rec.violations.length > 0 ? (
          <div className="mt-3 rounded-md border border-warning/40 bg-warning/10 px-3 py-2">
            <p className="flex items-center gap-1.5 text-xs font-medium text-warning-foreground">
              <TriangleAlert className="size-3.5" />
              {rec.violations.length} constraint {rec.violations.length === 1 ? 'flag' : 'flags'}
            </p>
            <ul className="mt-1 space-y-0.5">
              {rec.violations.map((v) => (
                <li key={v} className="flex items-start gap-1 text-[11px] text-muted-foreground">
                  <CircleAlert className="mt-0.5 size-3 shrink-0 text-warning-foreground" />
                  {v}
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <p className="mt-3 flex items-center gap-1.5 text-xs text-success">
            <Check className="size-3.5" /> All constraints satisfied
          </p>
        )}
      </div>
    </Card>
  )
}

/**
 * Shows whether a route plan already exists for the selected event, and — when
 * participant notifications are enabled — whether generation is gated behind
 * the response deadline.
 */
function PlanStatusBanner({ status }: { status: PlanStatus }) {
  if (status.hasPlan) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-success/30 bg-success/10 px-3 py-2 text-sm text-success">
        <CircleCheck className="size-4 shrink-0" />
        <span>
          Route plan generated · {status.tripCount} {status.tripCount === 1 ? 'route' : 'routes'}
          {status.dispatched ? ' · dispatched' : ' · awaiting dispatch'}
        </span>
      </div>
    )
  }
  if (!status.canGenerate) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-warning/40 bg-warning/10 px-3 py-2 text-sm text-warning-foreground">
        <Clock className="size-4 shrink-0" />
        <span>{status.blockedReason ?? 'Waiting for participant responses.'}</span>
      </div>
    )
  }
  return (
    <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
      <Sparkles className="size-4 shrink-0 text-primary" />
      <span>No plan yet — ready to generate.</span>
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

const DISPATCHED_STATUSES = ['en-route', 'pickup-in-progress', 'onboard', 'arrived', 'completed']

/**
 * Lists recently planned routes grouped by event. A plan that has not been
 * dispatched yet (all its trips are still planned/assigned and unstarted) can
 * be re-planned in place; a dispatched plan links to the Command Center.
 */
function RecentPlans({
  onReplan,
  onOpenDispatch,
}: {
  onReplan: (eventId: string) => void | Promise<void>
  onOpenDispatch: () => void
}) {
  const fleet = useFleet()
  const [busyId, setBusyId] = useState<string | null>(null)

  const groups = useMemo(() => {
    const byEvent = new Map<string, typeof fleet.trips>()
    for (const t of fleet.trips) {
      if (t.status === 'cancelled') continue
      const list = byEvent.get(t.eventId) ?? []
      list.push(t)
      byEvent.set(t.eventId, list)
    }
    return Array.from(byEvent.entries())
      .map(([eventId, trips]) => {
        const dispatched = trips.some(
          (t) => Boolean(t.startedAt) || DISPATCHED_STATUSES.includes(t.status),
        )
        const riders = new Set(trips.flatMap((t) => t.stops.map((s) => s.participantId))).size
        const distance = trips.reduce((s, t) => s + t.distanceKm, 0)
        return { eventId, trips, dispatched, riders, distance }
      })
      .sort((a, b) => Number(a.dispatched) - Number(b.dispatched))
  }, [fleet.trips])

  if (groups.length === 0) return null

  return (
    <Card className="overflow-hidden">
      <div className="flex items-center gap-2 border-b border-border px-4 py-3">
        <RouteIcon className="size-4 text-primary" />
        <div>
          <h2 className="text-sm font-semibold">Recent planned routes</h2>
          <p className="text-xs text-muted-foreground">
            Routes committed from the planner. Re-plan any that have not been dispatched yet.
          </p>
        </div>
      </div>
      <div className="divide-y divide-border">
        {groups.map((g) => {
          const event = fleet.eventById(g.eventId)
          const center = event ? fleet.centerById(event.centerId) : undefined
          return (
            <div key={g.eventId} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <p className="truncate text-sm font-medium">{event?.name ?? 'Unknown event'}</p>
                  {g.dispatched ? (
                    <Badge className="bg-success/20 text-success">
                      <Check className="mr-1 size-3" /> Dispatched
                    </Badge>
                  ) : (
                    <Badge className="bg-muted text-muted-foreground">Not dispatched</Badge>
                  )}
                </div>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {center?.name ? `${center.name} · ` : ''}
                  {event ? `${formatMonthDayYear(event.date)} · ` : ''}
                  {g.trips.length} {g.trips.length === 1 ? 'route' : 'routes'} · {g.riders} riders ·{' '}
                  {formatMiles(g.distance)}
                </p>
                <div className="mt-1.5 flex flex-wrap gap-1">
                  {g.trips.map((t) => {
                    const meta = tripStatusMeta[t.status]
                    return (
                      <span
                        key={t.id}
                        className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground"
                      >
                        {t.tripNumber}
                        <span className="text-foreground/70">· {meta.label}</span>
                      </span>
                    )
                  })}
                </div>
              </div>

              <div className="flex items-center gap-2">
                {g.dispatched ? (
                  <Button size="sm" variant="outline" onClick={onOpenDispatch}>
                    Open Dispatch
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    disabled={busyId === g.eventId}
                    onClick={async () => {
                      setBusyId(g.eventId)
                      try {
                        await onReplan(g.eventId)
                      } finally {
                        setBusyId(null)
                      }
                    }}
                  >
                    <Sparkles className="size-4" /> Re-plan
                  </Button>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </Card>
  )
}
