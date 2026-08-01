'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import {
  Bus,
  CalendarDays,
  CalendarPlus,
  ChevronDown,
  CircleDot,
  Clock,
  MapPin,
  Navigation,
  Pause,
  Play,
  Radio,
  Send,
  UserRound,
  Users,
  UtensilsCrossed,
  Waypoints,
  X,
} from 'lucide-react'
import { FleetMap } from '@/components/map/fleet-map-dynamic'
import { PageHeader, StatusBadge, StatCard } from '@/components/common'
import { EventFeed } from '@/components/event-feed'
import { MealDeliveryBoard } from '@/components/meals/meal-delivery-board'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'
import { useFleet } from '@/lib/store'
import { formatMiles, tripStatusMeta } from '@/lib/labels'
import { estimateMinutes, formatClockTime, haversineKm } from '@/lib/geo'
import { isDriverOnShift } from '@/lib/shift'

const LIVE_STATUSES = ['en-route', 'pickup-in-progress', 'onboard', 'driver-assigned', 'arrived']

export default function DispatchPage() {
  const fleet = useFleet()
  const [selectedTripId, setSelectedTripId] = useState<string | null>(null)
  const [expandedEventId, setExpandedEventId] = useState<string | null>(null)
  // Top-level view: 'dispatch' (live trips) or 'meals' (meal delivery). Read
  // an optional ?tab= deep link once on mount so links can open a given tab.
  const [view, setView] = useState<'dispatch' | 'meals'>('dispatch')
  useEffect(() => {
    if (typeof window === 'undefined') return
    const tab = new URLSearchParams(window.location.search).get('tab')
    if (tab === 'meals' || tab === 'dispatch') setView(tab)
  }, [])

  const liveTrips = useMemo(
    () => fleet.trips.filter((t) => LIVE_STATUSES.includes(t.status)),
    [fleet.trips],
  )

  // Group live trips by their event so the Active Trips panel lists events
  // first and expands to the trips belonging to each event on click.
  const liveEventGroups = useMemo(() => {
    const groups = new Map<string, { event: ReturnType<typeof fleet.eventById>; trips: typeof liveTrips }>()
    for (const t of liveTrips) {
      const existing = groups.get(t.eventId)
      if (existing) existing.trips.push(t)
      else groups.set(t.eventId, { event: fleet.eventById(t.eventId), trips: [t] })
    }
    return [...groups.values()].sort((a, b) =>
      (a.event?.name ?? '').localeCompare(b.event?.name ?? ''),
    )
  }, [liveTrips, fleet])

  const selectedTrip = liveTrips.find((t) => t.id === selectedTripId) ?? null
  const selectedVehicle = selectedTrip ? fleet.vehicleById(selectedTrip.vehicleId) : undefined

  // Keep the event group containing the selected trip open (e.g. when a trip is
  // picked from the map) so it stays visible in the Active Trips list.
  useEffect(() => {
    if (selectedTrip) setExpandedEventId(selectedTrip.eventId)
  }, [selectedTrip])

  const activeVehicleIds = new Set(liveTrips.map((t) => t.vehicleId))
  const mapVehicles = fleet.vehicles.filter((v) => activeVehicleIds.has(v.id))
  const mealRunCount = fleet.mealDeliveries.filter((m) => m.status !== 'cancelled').length
  const commandCenterLocation = fleet.centers[0]?.location ?? { lat: 40.7359, lng: -73.9911 }

  // KPI calculations
  const onboardCount = liveTrips.filter((t) => t.status === 'onboard').length
  const pickupCount = liveTrips.filter((t) => t.status === 'pickup-in-progress').length
  const totalStops = liveTrips.reduce((sum, t) => sum + t.stops.length, 0)
  const pickedStops = liveTrips.reduce(
    (sum, t) => sum + t.stops.filter((s) => s.status === 'picked-up').length,
    0,
  )
  const pickupsRemaining = totalStops - pickedStops
  const avgProgress =
    liveTrips.length > 0
      ? Math.round((liveTrips.reduce((s, t) => s + t.progress, 0) / liveTrips.length) * 100)
      : 0
  const utilization =
    fleet.vehicles.length > 0
      ? Math.round((activeVehicleIds.size / fleet.vehicles.length) * 100)
      : 0
  const nextArrival = liveTrips
    .filter((t) => t.status !== 'arrived')
    .map((t) => t.etaCenter)
    .sort()[0]

  // Live-tracking feed: dispatch-relevant events only
  const trackingFeed = useMemo(
    () =>
      fleet.eventLog
        .filter((e) => e.aggregateType === 'trip' || e.aggregateType === 'vehicle')
        .slice(0, 60),
    [fleet.eventLog],
  )

  return (
    <div className="flex h-full flex-col">
      <PageHeader
        title="Dispatch Command Center"
        description="Live vehicle tracking, pickups, and route monitoring."
        actions={
          <>
            <div className="hidden items-center gap-1.5 sm:flex">
              <Button variant="outline" size="sm" render={<Link href="/events/new" />}>
                <CalendarPlus className="size-4" /> New event
              </Button>
              <Button variant="outline" size="sm" render={<Link href="/planner" />}>
                <Waypoints className="size-4" /> Plan routes
              </Button>
              <Button variant="outline" size="sm" render={<Link href="/responses" />}>
                <Send className="size-4" /> SMS
              </Button>
              <span className="mx-1 h-5 w-px bg-border" aria-hidden />
            </div>
            <div className="hidden items-center gap-2 rounded-md bg-muted px-2.5 py-1.5 text-xs font-medium sm:flex">
              <span className="relative flex size-2">
                {fleet.simRunning ? (
                  <span className="absolute inline-flex size-full animate-ping rounded-full bg-success opacity-60" />
                ) : null}
                <span
                  className={cn(
                    'relative inline-flex size-2 rounded-full',
                    fleet.simRunning ? 'bg-success' : 'bg-muted-foreground',
                  )}
                />
              </span>
              {fleet.simRunning ? 'Live · updating' : 'Paused'}
            </div>
            <Button variant="outline" size="sm" onClick={fleet.toggleSim}>
              {fleet.simRunning ? <Pause className="size-4" /> : <Play className="size-4" />}
              {fleet.simRunning ? 'Pause' : 'Resume'}
            </Button>
          </>
        }
      />

      <Tabs
        value={view}
        onValueChange={(v) => setView(v as 'dispatch' | 'meals')}
        className="flex min-h-0 flex-1 flex-col gap-0"
      >
        <TabsList className="mx-4 mt-3 w-fit">
          <TabsTrigger value="dispatch">
            <Bus className="size-3.5" /> Live Dispatch
            <Badge variant="secondary" className="ml-1.5 px-1.5 py-0 text-[10px]">
              {liveTrips.length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="meals">
            <UtensilsCrossed className="size-3.5" /> Meal Delivery
            <Badge variant="secondary" className="ml-1.5 px-1.5 py-0 text-[10px]">
              {mealRunCount}
            </Badge>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="dispatch" className="mt-3 flex min-h-0 flex-1 flex-col">
            {/* Prominent KPI strip using StatCard for stronger hierarchy */}
            <div className="grid grid-cols-1 gap-3 px-4 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard icon={Bus} label="Active Trips" value={liveTrips.length} tone={liveTrips.length > 0 ? 'primary' : 'default'} />
              <StatCard icon={Users} label="Onboard" value={onboardCount} tone={onboardCount > 0 ? 'primary' : 'default'} />
              <StatCard icon={MapPin} label="Remaining Pickups" value={pickupsRemaining} hint={`${pickedStops}/${totalStops} completed`} />
              <StatCard icon={Clock} label="Next Arrival" value={nextArrival ?? '—'} />
            </div>

            {/* Operational insights row */}
            <div className="mt-4 grid grid-cols-1 gap-4 px-4 sm:grid-cols-1 lg:grid-cols-3">
              <div className="col-span-1 lg:col-span-1">
                <div className="overflow-hidden rounded-xl border border-border bg-card/90 shadow-sm p-4">
                  <h3 className="text-sm font-semibold text-foreground">Route Progress</h3>
                  <p className="mt-1 text-xs text-muted-foreground">Overview of active routes</p>
                  <div className="mt-3">
                    <div className="flex items-center gap-3">
                      <div className="flex-1">
                        <div className="mb-2 text-sm font-medium">Average progress</div>
                        <div className="w-full rounded-full bg-muted h-2">
                          <div className="h-2 rounded-full bg-primary" style={{ width: `${avgProgress}%` }} />
                        </div>
                      </div>
                      <div className="w-20 text-right text-2xl font-semibold">{avgProgress}%</div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="col-span-1 lg:col-span-1">
                <div className="overflow-hidden rounded-xl border border-border bg-card/90 shadow-sm p-4">
                  <h3 className="text-sm font-semibold text-foreground">Driver Status</h3>
                  <p className="mt-1 text-xs text-muted-foreground">At-a-glance driver availability</p>
                  <div className="mt-3 grid grid-cols-3 gap-2">
                    <div className="text-center">
                      <div className="text-lg font-semibold">{ fleet.drivers.filter((driver) => fleet.events.some((event) => isDriverOnShift( driver, event.date, event.startTime ))).length }</div>
                      <div className="text-xs text-muted-foreground">On shift</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-semibold">{fleet.drivers.filter((d) => d.status === 'available').length}</div>
                      <div className="text-xs text-muted-foreground">Available</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-semibold">{fleet.drivers.length - fleet.drivers.filter((d) => d.status === 'available').length}</div>
                      <div className="text-xs text-muted-foreground">Total</div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="col-span-1 lg:col-span-1">
                <div className="overflow-hidden rounded-xl border border-border bg-card/90 shadow-sm p-4">
                  <h3 className="text-sm font-semibold text-foreground">Vehicle Utilization</h3>
                  <p className="mt-1 text-xs text-muted-foreground">Active vehicles vs fleet size</p>
                  <div className="mt-3 flex items-center justify-between">
                    <div className="w-full mr-4">
                      <div className="w-full rounded-full bg-muted h-2">
                        <div className="h-2 rounded-full bg-primary" style={{ width: `${utilization}%` }} />
                      </div>
                      <div className="mt-2 text-sm font-medium">{activeVehicleIds.size} active · {fleet.vehicles.length} total</div>
                    </div>
                    <div className="text-2xl font-semibold">{utilization}%</div>
                  </div>
                </div>
              </div>
            </div>

          <div className="mt-4 grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[380px_1fr]">
            {/* Side panel with tabs */}
        <div className="flex min-h-0 flex-col border-b border-border bg-card lg:border-b-0 lg:border-r">
          <Tabs defaultValue="trips" className="flex min-h-0 flex-1 flex-col gap-0">
            <TabsList className="m-3 grid grid-cols-2">
              <TabsTrigger value="trips">
                Active Trips
                <Badge variant="secondary" className="ml-1.5 px-1.5 py-0 text-[10px]">
                  {liveTrips.length}
                </Badge>
              </TabsTrigger>
              <TabsTrigger value="feed">
                <Radio className="size-3.5" /> Live Feed
              </TabsTrigger>
            </TabsList>

            <TabsContent value="trips" className="min-h-0 flex-1">
              <ScrollArea className="h-80 lg:h-full">
                <div className="divide-y divide-border border-t border-border">
                  {liveEventGroups.map(({ event, trips }) => {
                    const eventId = event?.id ?? trips[0].eventId
                    const isExpanded = expandedEventId === eventId
                    const groupProgress = Math.round(
                      (trips.reduce((s, t) => s + t.progress, 0) / trips.length) * 100,
                    )
                    return (
                      <div key={eventId}>
                        <button
                          onClick={() => setExpandedEventId(isExpanded ? null : eventId)}
                          className={cn(
                            'flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/50',
                            isExpanded && 'bg-muted/40',
                          )}
                          aria-expanded={isExpanded}
                        >
                          <div className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                            <CalendarDays className="size-4" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-2">
                              <span className="truncate text-sm font-medium">
                                {event?.name ?? 'Unassigned event'}
                              </span>
                              <Badge variant="secondary" className="shrink-0 px-1.5 py-0 text-[10px]">
                                {trips.length} trip{trips.length === 1 ? '' : 's'}
                              </Badge>
                            </div>
                            <p className="truncate text-xs text-muted-foreground">
                              {event ? `${event.startTime} · ` : ''}
                              {trips.length} vehicle{trips.length === 1 ? '' : 's'} en route
                            </p>
                            <div className="mt-1.5 flex items-center gap-2">
                              <Progress value={groupProgress} className="h-1 flex-1" />
                              <span className="text-[11px] tabular-nums text-muted-foreground">
                                {groupProgress}%
                              </span>
                            </div>
                          </div>
                          <ChevronDown
                            className={cn(
                              'mt-1 size-4 shrink-0 text-muted-foreground transition-transform',
                              isExpanded && 'rotate-180',
                            )}
                          />
                        </button>

                        {isExpanded ? (
                          <div className="divide-y divide-border border-t border-border bg-muted/10">
                            {trips.map((t) => {
                              const vehicle = fleet.vehicleById(t.vehicleId)
                              const driver = fleet.driverById(t.driverId)
                              const meta = tripStatusMeta[t.status]
                              const picked = t.stops.filter((s) => s.status === 'picked-up').length
                              const isSelected = t.id === selectedTripId
                              return (
                                <button
                                  key={t.id}
                                  onClick={() => setSelectedTripId(isSelected ? null : t.id)}
                                  className={cn(
                                    'flex w-full items-start gap-3 py-3 pl-8 pr-4 text-left transition-colors hover:bg-muted/50',
                                    isSelected && 'bg-accent/60',
                                  )}
                                >
                                  <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                                    <Bus className="size-4" />
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <div className="flex items-center justify-between gap-2">
                                      <span className="truncate text-sm font-medium">{vehicle?.name}</span>
                                      <StatusBadge label={meta.label} cls={meta.cls} />
                                    </div>
                                    <p className="truncate text-xs text-muted-foreground">
                                      {driver?.name ?? 'Unassigned'} · ETA {t.etaCenter}
                                    </p>
                                    <div className="mt-1.5 flex items-center gap-2">
                                      <Progress value={t.progress * 100} className="h-1 flex-1" />
                                      <span className="text-[11px] tabular-nums text-muted-foreground">
                                        {picked}/{t.stops.length}
                                      </span>
                                    </div>
                                  </div>
                                </button>
                              )
                            })}
                          </div>
                        ) : null}
                      </div>
                    )
                  })}
                  {liveEventGroups.length === 0 ? (
                    <p className="px-4 py-8 text-center text-xs text-muted-foreground">
                      No active trips. Commit a plan from the Route Planner to dispatch vehicles.
                    </p>
                  ) : null}
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="feed" className="min-h-0 flex-1">
              <ScrollArea className="h-80 lg:h-full">
                <div className="border-t border-border">
                  <EventFeed events={trackingFeed} dense emptyLabel="Waiting for live events…" />
                </div>
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </div>

        {/* Map */}
        <div className="relative min-h-100 flex-1">
          <FleetMap
            centers={fleet.centers}
            vehicles={mapVehicles}
            trips={liveTrips}
            highlightTripId={selectedTripId}
            highlightVehicleId={selectedVehicle?.id ?? null}
            onSelectTrip={(id) => setSelectedTripId(id)}
          />

          {/* Legend */}
          <div className="pointer-events-none absolute bottom-3 left-3 z-500 rounded-lg border border-border bg-card/95 px-3 py-2 text-[11px] shadow-sm backdrop-blur">
            <p className="mb-1 font-semibold text-foreground">Legend</p>
            <div className="flex flex-col gap-1 text-muted-foreground">
              <LegendDot color="#2563eb" label="En route / onboard" />
              <LegendDot color="#d97706" label="Pickup in progress" />
              <LegendDot color="#059669" label="Arrived" />
              <LegendSquare label="Care center" />
            </div>
          </div>

          {/* Trip detail overlay */}
          {selectedTrip ? (
            <TripDetail
              key={selectedTrip.id}
              tripId={selectedTrip.id}
              onClose={() => setSelectedTripId(null)}
            />
          ) : null}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="meals" className="mt-3 flex min-h-0 flex-1 flex-col">
          <MealDeliveryBoard />
        </TabsContent>
      </Tabs>
    </div>
  )
}

function Kpi({
  icon: Icon,
  label,
  value,
  tone = 'default',
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: string
  tone?: 'default' | 'primary' | 'warning'
}) {
  const cls = {
    default: 'text-foreground',
    primary: 'text-primary',
    warning: 'text-warning-foreground',
  }[tone]
  return (
    <div className="flex items-center gap-3 bg-card px-4 py-3">
      <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
        <Icon className="size-4" />
      </div>
      <div className="min-w-0">
        <p className={cn('text-lg font-semibold leading-none tabular-nums', cls)}>{value}</p>
        <p className="mt-1 truncate text-[11px] text-muted-foreground">{label}</p>
      </div>
    </div>
  )
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className="size-2.5 rounded-full" style={{ background: color }} />
      {label}
    </span>
  )
}

function LegendSquare({ label }: { label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className="size-2.5 rounded-sm bg-foreground" />
      {label}
    </span>
  )
}

function TripDetail({ tripId, onClose }: { tripId: string; onClose: () => void }) {
  const fleet = useFleet()
  const [assigning, setAssigning] = useState(false)
  const trip = fleet.trips.find((t) => t.id === tripId)
  if (!trip) return null
  const vehicle = fleet.vehicleById(trip.vehicleId)
  const driver = fleet.driverById(trip.driverId)
  const center = fleet.centerById(trip.destinationCenterId)
  const event = fleet.eventById(trip.eventId)
  const meta = tripStatusMeta[trip.status]
  const availableDrivers = fleet.drivers.filter(
    (d) => d.status === 'available' || d.id === trip.driverId,
  )

  // Scheduled clock times are anchored to the trip's actual start instant (not
  // "now") so they stay fixed as the trip plays out instead of drifting.
  const tripStartMs = trip.startedAt ? new Date(trip.startedAt).getTime() : Date.now()
  const nextStop = trip.stops.find((s) => s.status === 'pending' || s.status === 'approaching')
  const nextStopParticipant = nextStop ? fleet.participantById(nextStop.participantId) : undefined
  // Live, distance-based ETA from the vehicle's current position to the next
  // pickup — recalculated every tick from where the vehicle actually is, the
  // same way a real GPS-driven ETA would behave.
  const liveEtaMin = nextStop
    ? Math.max(1, estimateMinutes(haversineKm(trip.currentLocation, nextStop.location)))
    : null

  return (
    <div className="absolute right-0 top-0 z-600 overflow-y-auto flex h-full w-full max-w-sm flex-col border-l border-border bg-card shadow-xl">
      <div className="flex items-start justify-between border-b border-border p-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold">{vehicle?.name}</h3>
            <span className="font-mono text-[11px] text-muted-foreground">{trip.tripNumber}</span>
          </div>
          <div className="mt-1">
            <StatusBadge label={meta.label} cls={meta.cls} />
          </div>
        </div>
        <Button variant="ghost" size="icon" className="size-7" onClick={onClose} aria-label="Close details">
          <X className="size-4" />
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-px border-b border-border bg-border">
        <InfoCell icon={UserRound} label="Driver" value={driver?.name ?? 'Unassigned'} />
        <InfoCell icon={Clock} label="ETA to center" value={trip.etaCenter} />
        <InfoCell icon={MapPin} label="Distance" value={formatMiles(trip.distanceKm)} />
        <InfoCell icon={Bus} label="Duration" value={`${trip.durationMinutes} min`} />
      </div>

      <div className="border-b border-border px-4 py-3">
        <div className="mb-1.5 flex items-center justify-between text-xs">
          <span className="font-medium text-foreground">Trip progress</span>
          <span className="tabular-nums text-muted-foreground">{Math.round(trip.progress * 100)}%</span>
        </div>
        <Progress value={trip.progress * 100} className="h-1.5" />
      </div>

      {nextStop && liveEtaMin != null ? (
        <div className="flex items-center gap-2 border-b border-border bg-primary/5 px-4 py-2.5">
          <Navigation className="size-3.5 shrink-0 text-primary" />
          <p className="min-w-0 flex-1 truncate text-xs text-foreground">
            Next: <span className="font-medium">{nextStopParticipant?.name}</span>
            <span className="text-muted-foreground"> — ~{liveEtaMin} min away</span>
          </p>
          <span className="shrink-0 text-[11px] tabular-nums text-muted-foreground">
            {formatClockTime(tripStartMs, nextStop.etaMinutes)}
          </span>
        </div>
      ) : null}

      {/* Driver assignment + dispatch controls */}
      <div className="flex flex-col gap-2 border-b border-border px-4 py-3">
        <label className="text-[11px] font-medium text-muted-foreground">Assign driver</label>
        {availableDrivers.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border px-2.5 py-2 text-xs text-muted-foreground">
            No drivers available
          </p>
        ) : (
          <Select
            value={trip.driverId ?? ''}
            onValueChange={(v) => {
              if (v) void fleet.assignDriver(trip.id, v)
            }}
          >
            <SelectTrigger className="h-9">
              <SelectValue placeholder="Select a driver">
                {(value) => fleet.driverById(String(value))?.name ?? 'Select a driver'}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {availableDrivers.map((d) => {
                const onShift = event ? isDriverOnShift(d, event.date, event.startTime) : true
                return (
                  <SelectItem key={d.id} value={d.id}>
                    {d.name} · {d.rating.toFixed(1)}★{onShift ? '' : ' (off shift)'}
                  </SelectItem>
                )
              })}
            </SelectContent>
          </Select>
        )}
        {trip.status === 'driver-assigned' ? (
          <Button
            size="sm"
            className="w-full"
            disabled={assigning || !trip.driverId}
            onClick={async () => {
              setAssigning(true)
              try {
                await fleet.startTrip(trip.id)
              } finally {
                setAssigning(false)
              }
            }}
          >
            <Play className="size-4" /> Dispatch &amp; start trip
          </Button>
        ) : null}
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Pickup Route
          </p>
          <ol className="relative space-y-4 border-l border-dashed border-border pl-5">
            {trip.stops.map((stop) => {
              const p = fleet.participantById(stop.participantId)
              const done = stop.status === 'picked-up'
              const approaching = stop.status === 'approaching'
              return (
                <li key={stop.participantId} className="relative">
                  <span
                    className={cn(
                      'absolute -left-6.75 flex size-4 items-center justify-center rounded-full border-2 border-card',
                      done ? 'bg-success' : approaching ? 'bg-warning' : 'bg-muted-foreground/40',
                    )}
                  >
                    {done ? <CircleDot className="size-2.5 text-white" /> : null}
                  </span>
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium">{p?.name}</p>
                    <span className="flex items-center gap-1.5 text-[11px] tabular-nums text-muted-foreground">
                      {formatClockTime(tripStartMs, stop.etaMinutes)}
                      <span className="text-muted-foreground/70">(+{stop.etaMinutes}m)</span>
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">{p?.address}</p>
                  {approaching ? (
                    <Badge className="mt-1 bg-warning/20 px-1.5 py-0 text-[10px] text-warning-foreground">
                      Driver approaching
                    </Badge>
                  ) : null}
                  {done ? (
                    <Badge className="mt-1 bg-success/20 px-1.5 py-0 text-[10px] text-success">
                      Picked up
                    </Badge>
                  ) : null}
                </li>
              )
            })}
            <li className="relative">
              <span className="absolute -left-6.75 flex size-4 items-center justify-center rounded-full border-2 border-card bg-foreground">
                <MapPin className="size-2.5 text-background" />
              </span>
              <p className="text-sm font-medium">{center?.name}</p>
              <p className="text-xs text-muted-foreground">Destination · {center?.address}</p>
            </li>
          </ol>
        </div>
      </ScrollArea>

      <div className="border-t border-border p-4">
        <Button
          variant="outline"
          size="sm"
          className="w-full text-destructive hover:text-destructive"
          onClick={() => {
            void fleet.cancelTrip(trip.id)
            onClose()
          }}
        >
          Cancel Trip
        </Button>
      </div>
    </div>
  )
}

function InfoCell({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: string
}) {
  return (
    <div className="bg-card px-4 py-2.5">
      <div className="flex items-center gap-1.5 text-muted-foreground">
        <Icon className="size-3.5" />
        <span className="text-[11px]">{label}</span>
      </div>
      <p className="mt-0.5 truncate text-sm font-medium">{value}</p>
    </div>
  )
}
