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
  Info,
  MapPin,
  Navigation,
  Pause,
  Play,
  Radio,
  Search,
  Send,
  UserRound,
  Users,
  UtensilsCrossed,
  Waypoints,
  X,
} from 'lucide-react'
import { FleetMap } from '@/components/map/fleet-map-dynamic'
import { PageHeader, StatusBadge, StatCard, HoverTooltip } from '@/components/common'
import { EventFeed } from '@/components/event-feed'
import { MealDeliveryBoard } from '@/components/meals/meal-delivery-board'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn, findById } from '@/lib/utils'
import { useFleetSession } from '@/components/context/fleet-session-provider'
import { useTrips, useDispatchActions } from '@/lib/trips/hooks'
import { useVehicles } from '@/lib/vehicles/hooks'
import { useDrivers } from '@/lib/driver/hooks'
import { useCenters, useEvents, useEventLog } from '@/lib/events/hooks'
import { useMealDeliveries } from '@/lib/meals/hooks'
import { useParticipants } from '@/lib/participant/hooks'
import { formatMiles } from '@/lib/labels'
import { estimateMinutes, formatClockTime, haversineKm } from '@/lib/geo'
import { formatTimeOfDay } from '@/lib/date'
import { DriverUtils } from '@/lib/driver/utils'
import { TripsConfig } from '@/lib/trips/config';
import { FleetEvent } from '@/lib/events/types';
import { useTranslation } from '@/components/context/language-provider';

export default function DispatchPage() {
  const { trips } = useTrips()
  const { vehicles } = useVehicles()
  const { drivers } = useDrivers()
  const { centers } = useCenters()
  const { events } = useEvents()
  const { participants } = useParticipants()
  const { mealDeliveries } = useMealDeliveries()
  const { eventLog } = useEventLog()
  const { simRunning, toggleSim } = useFleetSession()
  const {t} = useTranslation()
  const [selectedTripId, setSelectedTripId] = useState<string | null>(null)
  const [highlightedTripIds, setHighlightedTripIds] = useState<string[]>([])
  const [deepLinkedEventId, setDeepLinkedEventId] = useState<string | null>(null)
  const [expandedEventId, setExpandedEventId] = useState<string | null>(null)

  const [view, setView] = useState<"dispatch" | "meals">("dispatch");
  const [tab, setTab] = useState<"trips" | "feed" | "all-trips">('all-trips');
  const [liveEventSearch, setLiveEventSearch] = useState('')
  const [allEventSearch, setAllEventSearch] = useState('')
  useEffect(() => {
    if (typeof window === 'undefined') return
    const params = new URLSearchParams(window.location.search)
    const tab = params.get('tab')
    const eventId = params.get('eventId')
    if (tab === 'meals' || tab === 'dispatch') setView(tab)
    if (eventId) setDeepLinkedEventId(eventId)
  }, [])

  const liveTrips = useMemo(
    () => trips.filter((t) => TripsConfig.LIVE_TRIP_STATUSES.includes(t.status)),
    [trips],
  )

  const liveEventGroups = useMemo(() => {
    const groups = new Map<string, { event: FleetEvent | undefined; trips: typeof liveTrips }>()
    for (const t of liveTrips) {
      const existing = groups.get(t.eventId)
      if (existing) existing.trips.push(t)
      else groups.set(t.eventId, { event: findById(events,t.eventId), trips: [t] })
    }
    return [...groups.values()].sort((a, b) =>
      (a.event?.name ?? '').localeCompare(b.event?.name ?? ''),
    )
  }, [liveTrips, events])

  const eventGroups = useMemo(() => {
    const groups = new Map<string, { event: FleetEvent | undefined; trips: typeof liveTrips }>()
    for (const t of trips) {
      const existing = groups.get(t.eventId)
      if (existing) existing.trips.push(t)
      else groups.set(t.eventId, { event: findById(events,t.eventId), trips: [t] })
    }
    return [...groups.values()].sort((a, b) =>
      (a.event?.name ?? '').localeCompare(b.event?.name ?? ''),
    )
  }, [trips, events])

  const filteredLiveEventGroups = useMemo(() => {
    const query = liveEventSearch.trim().toLowerCase()
    if (!query) return liveEventGroups
    return liveEventGroups.filter(({ event }) =>
      (event?.name ?? '').toLowerCase().includes(query),
    )
  }, [liveEventGroups, liveEventSearch])

  const filteredEventGroups = useMemo(() => {
    const query = allEventSearch.trim().toLowerCase()
    if (!query) return eventGroups
    return eventGroups.filter(({ event }) =>
      (event?.name ?? '').toLowerCase().includes(query),
    )
  }, [eventGroups, allEventSearch])

  const selectedTrip = trips.find((t) => t.id === selectedTripId) ?? null
  const selectedVehicle = selectedTrip ? findById(vehicles,selectedTrip.vehicleId) : undefined
  const [deepLinkAutoSelected, setDeepLinkAutoSelected] = useState(false)
  
  const fitTo = useMemo(() => selectedTrip?.routePath, [selectedTripId])

  // Keep the event group containing the selected trip open (e.g. when a trip is
  // picked from the map) so it stays visible in the Active Trips list.
  useEffect(() => {
    if (selectedTrip) setExpandedEventId(selectedTrip.eventId)
  }, [selectedTrip])

  useEffect(() => {
    if (!deepLinkedEventId || deepLinkAutoSelected) return
    const eventTrips = liveTrips.filter((t) => t.eventId === deepLinkedEventId)
    if (eventTrips.length > 0) {
      setHighlightedTripIds(eventTrips.map((t) => t.id))
      setExpandedEventId(deepLinkedEventId)
      if (!selectedTripId) {
        setSelectedTripId(eventTrips[0].id)
      }
      setDeepLinkAutoSelected(true)
    }
  }, [deepLinkedEventId, liveTrips, selectedTripId, deepLinkAutoSelected])

  useEffect(() => {
    if (selectedTripId) {
      setHighlightedTripIds([selectedTripId])
      return
    }
    if (deepLinkedEventId) {
      const eventTrips = liveTrips.filter((t) => t.eventId === deepLinkedEventId)
      setHighlightedTripIds(eventTrips.map((t) => t.id))
      return
    }
    setHighlightedTripIds([])
  }, [selectedTripId, deepLinkedEventId, liveTrips])

  const activeVehicleIds = new Set(liveTrips.map((t) => t.vehicleId))
  const mapVehicles = vehicles.filter((v) => activeVehicleIds.has(v.id))
  const mealRunCount = mealDeliveries.filter((m) => m.status === 'ACTIVE').length

  // KPI calculations
  const onboardCount = liveTrips.filter((t) => t.status === 'ONBOARD').length
  const totalStops = liveTrips.reduce((sum, t) => sum + (Array.isArray(t.stops) ? t.stops.length : 0), 0)
  const pickedStops = liveTrips.reduce(
    (sum, t) => sum + (Array.isArray(t.stops) ? t.stops.filter((s) => s.status === 'picked-up').length : 0),
    0,
  )
  const pickupsRemaining = totalStops - pickedStops
  const avgProgress =
    liveTrips.length > 0
      ? Math.round((liveTrips.reduce((s, t) => s + t.progress, 0) / liveTrips.length) * 100)
      : 0
  const utilization =
    vehicles.length > 0
      ? Math.round((activeVehicleIds.size / vehicles.length) * 100)
      : 0
  const nextArrival = liveTrips
    .map((t) => t.etaCenter)
    .sort()[0]

  // Live-tracking feed: dispatch-relevant events only
  const trackingFeed = useMemo(
    () =>
      eventLog
        .filter((e) => e.aggregateType === 'trip' || e.aggregateType === 'vehicle')
        .slice(0, 60),
    [eventLog],
  )

  return (
    <div className="flex h-full flex-col overflow-y-auto">
      <PageHeader
        title={t('nav.commandcenter')}
        description={t('cc.desc')}
        actions={
          <>
            <div className="hidden items-center gap-1.5 sm:flex">
              <Button variant="outline" size="sm" render={<Link href="/events/new" />}>
                <CalendarPlus className="size-4" /> {t('cc.newevent')}
              </Button>
              <Button variant="outline" size="sm" render={<Link href="/planner" />}>
                <Waypoints className="size-4" /> {t('cc.planroutes')}
              </Button>
              <Button variant="outline" size="sm" render={<Link href="/responses" />}>
                <Send className="size-4" /> {t('common.sms')}
              </Button>
              <span className="mx-1 h-5 w-px bg-border" aria-hidden />
            </div>
            <div className="hidden items-center gap-2 rounded-md bg-muted px-2.5 py-1.5 text-xs font-medium sm:flex">
              <span className="relative flex size-2">
                {simRunning ? (
                  <span className="absolute inline-flex size-full animate-ping rounded-full bg-success opacity-60" />
                ) : null}
                <span
                  className={cn(
                    'relative inline-flex size-2 rounded-full',
                    simRunning ? 'bg-success' : 'bg-muted-foreground',
                  )}
                />
              </span>
              {simRunning ? t('cc.liveupdating') : t('cc.paused')}
            </div>
            <Button variant="outline" size="sm" onClick={toggleSim}>
              {simRunning ? <Pause className="size-4" /> : <Play className="size-4" />}
              {simRunning ? t('cc.pause') : t('cc.resume')}
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
            <Bus className="size-3.5" /> {t('cc.livedispatch')}
            <Badge variant="secondary" className="ml-1.5 px-1.5 py-0 text-[10px]">
              {liveTrips.length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="meals">
            <UtensilsCrossed className="size-3.5" /> {t('e.mealdelivery')}
            <Badge variant="secondary" className="ml-1.5 px-1.5 py-0 text-[10px]">
              {mealRunCount}
            </Badge>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="dispatch" className="mt-3 flex min-h-0 flex-1 flex-col">
            {/* Prominent KPI strip using StatCard for stronger hierarchy */}
            <div className="grid grid-cols-1 gap-3 px-4 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard icon={Bus} label={t('cc.activetrips')} value={liveTrips.length} tone={liveTrips.length > 0 ? 'primary' : 'default'} />
              <StatCard icon={Users} label={t('cc.onboard')} value={onboardCount} tone={onboardCount > 0 ? 'primary' : 'default'} />
              <StatCard icon={MapPin} label={t('cc.remainingpickups')} value={pickupsRemaining} hint={t('cc.completedhint').replace('{{picked}}', String(pickedStops)).replace('{{total}}', String(totalStops))} />
              <StatCard icon={Clock} label={t('cc.nextarrival')} value={nextArrival ?? '—'} />
            </div>

            {/* Operational insights row */}
            <div className="mt-4 grid grid-cols-1 gap-4 px-4 sm:grid-cols-1 lg:grid-cols-3">
              <div className="col-span-1 lg:col-span-1">
                <div className="overflow-hidden rounded-xl border border-border bg-card/90 shadow-sm p-4">
                  <h3 className="text-sm font-semibold text-foreground">{t('cc.routeprogress')} <HoverTooltip message={t('cc.routeprogresstooltip')}><Info className={"size-3  ml-2"}/></HoverTooltip></h3>
                  <p className="mt-1 text-xs text-muted-foreground">{t('cc.routeprogressdesc')}</p>
                  <div className="mt-3">
                    <div className="flex items-center gap-3">
                      <div className="flex-1">
                        <div className="mb-2 text-sm font-medium">{t('cc.avgprogress')}</div>
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
                  <h3 className="text-sm font-semibold text-foreground">{t('cc.driverstatus')}<HoverTooltip message={t('cc.driverstatustooltip')}><Info className={"size-3 ml-2"}/></HoverTooltip></h3>
                  <p className="mt-1 text-xs text-muted-foreground">{t('cc.driverstatusdesc')}</p>
                  <div className="mt-3 grid grid-cols-3 gap-2">
                    <div className="text-center">
                      <div className="text-lg font-semibold">{ drivers.filter((driver) => events.some((event) => DriverUtils.isDriverOnShift( driver, event.date, event.startTime ))).length }</div>
                      <div className="text-xs text-muted-foreground">{t('cc.onshift')}</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-semibold">{drivers.filter((d) => d.status === 'available').length}</div>
                      <div className="text-xs text-muted-foreground">{t('e.available')}</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-semibold">{drivers.length + drivers.filter((d) => d.status === 'available').length}</div>
                      <div className="text-xs text-muted-foreground">{t('cc.total')}</div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="col-span-1 lg:col-span-1">
                <div className="overflow-hidden rounded-xl border border-border bg-card/90 shadow-sm p-4">
                  <h3 className="text-sm font-semibold text-foreground">{t('cc.vehicleutilization')}<HoverTooltip message={t('cc.vehicleutiltooltip')}><Info className={"size-3 ml-2"}/></HoverTooltip></h3>
                  <p className="mt-1 text-xs text-muted-foreground">{t('cc.vehicleutildesc')}</p>
                  <div className="mt-3 flex items-center justify-between">
                    <div className="w-full mr-4">
                      <div className="w-full rounded-full bg-muted h-2">
                        <div className="h-2 rounded-full bg-primary" style={{ width: `${utilization}%` }} />
                      </div>
                      <div className="mt-2 text-sm font-medium">{t('cc.activetotal').replace('{{active}}', String(activeVehicleIds.size)).replace('{{total}}', String(vehicles.length))}</div>
                    </div>
                    <div className="text-2xl font-semibold">{utilization}%</div>
                  </div>
                </div>
              </div>
            </div>

          <div className="mt-4 grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[380px_1fr]">
            {/* Side panel with tabs */}
        <div className="flex min-h-0 flex-col border-b border-border bg-card lg:border-b-0 lg:border-r">
          <Tabs value={tab} onValueChange={(v) => setTab(v as 'trips' | 'feed' | 'all-trips')} className="flex min-h-0 flex-1 flex-col gap-0">
            
            <TabsList className="m-3 grid grid-cols-3">
              <TabsTrigger value="all-trips" className={'truncate'}> {t('cc.alltrips')} 
                { trips.length ? <Badge variant="secondary" className="ml-1.5 px-1.5 py-0 text-[10px]">
                  {trips.length}
                  </Badge> : null}
              </TabsTrigger>
              <TabsTrigger value="trips" className={'truncate'}>
                {t('cc.activetrips')}
                { liveTrips.length ? <Badge variant="secondary" className="ml-1.5 px-1.5 py-0 text-[10px]">
                  {liveTrips.length}
                </Badge> : null}
              </TabsTrigger>
              <TabsTrigger value="feed" className={'truncate'}>
                <Radio className="size-3.5" /> {t('cc.livefeed')}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="trips" className="min-h-0 flex-1">
              <div className="relative mx-3 mb-2">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={liveEventSearch}
                  onChange={(e) => setLiveEventSearch(e.target.value)}
                  placeholder={t('cc.searchevents')}
                  className="pl-8"
                />
              </div>
              <ScrollArea className="h-80 lg:h-full">

                <div className="divide-y divide-border border-t border-border">
                  {filteredLiveEventGroups.map(({ event, trips }) => {
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
                                {event?.name ?? t('cc.unassignedevent')}
                              </span>
                              <Badge variant="secondary" className="shrink-0 px-1.5 py-0 text-[10px]">
                                {trips.length} {t('cc.trip')}{trips.length === 1 ? '' : 's'}
                              </Badge>
                            </div>
                            <p className="truncate text-xs text-muted-foreground">
                              {event ? `${formatTimeOfDay(event.startTime)} · ` : ''}
                              {trips.length} {t('cc.vehicleenroute').replace('{{suffix}}', trips.length === 1 ? '' : 's')}
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
                            {trips.map((trip) => {
                              const vehicle = findById(vehicles,trip.vehicleId)
                              const driver = findById(drivers,trip.driverId)
                              const meta = TripsConfig.tripStatusMeta[trip.status] ?? TripsConfig.tripStatusMeta['PLANNED']
                              const stops = Array.isArray(trip.stops) ? trip.stops : []
                              const picked = stops.filter((s) => s.status === 'picked-up').length
                              const isSelected = trip.id === selectedTripId
                              return (
                                <button
                                  key={trip.id}
                                  onClick={() => setSelectedTripId(isSelected ? null : trip.id)}
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
                                      <span className="truncate text-sm font-medium">{trip.tripNumber} {`(${vehicle?.name})`}</span>
                                      <StatusBadge label={t(meta.label)} cls={meta.cls} />
                                    </div>
                                    <p className="truncate text-xs text-muted-foreground">
                                      {driver?.name ?? t('common.unassigned')} · {t('trip.eta')} {trip.etaCenter}
                                    </p>
                                    <div className="mt-1.5 flex items-center gap-2">
                                      <Progress value={trip.progress * 100} className="h-1 flex-1" />
                                      <span className="text-[11px] tabular-nums text-muted-foreground">
                                        {picked}/{stops.length}
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
                  {filteredLiveEventGroups.length === 0 ? (
                    <p className="px-4 py-8 text-center text-xs text-muted-foreground">
                      {liveEventGroups.length === 0 ? t('cc.noactivetrips') : t('cc.noeventsmatch')}
                    </p>
                  ) : null}
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="feed" className="min-h-0 flex-1">
              <ScrollArea className="h-80 lg:h-full">
                <div className="border-t border-border">
                  <EventFeed events={trackingFeed} dense emptyLabel={t('cc.waitingliveevents')} />
                </div>
              </ScrollArea>
            </TabsContent>

             <TabsContent value="all-trips" className="min-h-0 flex-1">
              <div className="relative mx-3 mb-2">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={allEventSearch}
                  onChange={(e) => setAllEventSearch(e.target.value)}
                  placeholder={t('cc.searchevents')}
                  className="pl-8"
                />
              </div>
              <ScrollArea className="h-80 lg:h-full">
                <div className="divide-y divide-border border-t border-border">
                  {filteredEventGroups.map(({ event, trips }) => {
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
                                {event?.name ?? t('cc.unassignedevent')}
                              </span>
                              <Badge variant="secondary" className="shrink-0 px-1.5 py-0 text-[10px]">
                                {trips.length} {t('cc.trip')}{trips.length === 1 ? '' : 's'}
                              </Badge>
                            </div>
                            <p className="truncate text-xs text-muted-foreground">
                              {event ? `${formatTimeOfDay(event.startTime)} · ` : ''}
                              {trips.length} {t('cc.vehicleenroute').replace('{{suffix}}', trips.length === 1 ? '' : 's')}
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
                            {trips.filter(item => !item.tripCreationFailedReason).map((trip) => {
                              const vehicle = findById(vehicles,trip.vehicleId)
                              const driver = findById(drivers,trip.driverId)
                              const meta = TripsConfig.tripStatusMeta[trip.status] ?? TripsConfig.tripStatusMeta['PLANNED']
                              const stops = Array.isArray(trip.stops) ? trip.stops : []
                              const picked = stops.filter((s) => s.status === 'picked-up').length
                              const isSelected = trip.id === selectedTripId
                              return (
                                <button
                                  key={trip.id}
                                  onClick={() => setSelectedTripId(isSelected ? null : trip.id)}
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
                                      <span className="truncate text-sm font-medium">{trip.tripNumber} {`(${vehicle?.name})`}</span>
                                      <StatusBadge label={t(meta.label) ?? ''} cls={meta.cls} />
                                    </div>
                                    <p className="truncate text-xs text-muted-foreground">
                                      {driver?.name ?? t('common.unassigned')} · {t('trip.eta')} {trip.etaCenter}
                                    </p>
                                    <div className="mt-1.5 flex items-center gap-2">
                                      <Progress value={trip.progress * 100} className="h-1 flex-1" />
                                      <span className="text-[11px] tabular-nums text-muted-foreground">
                                        {picked}/{stops.length}
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
                  {filteredEventGroups.length === 0 ? (
                    <p className="px-4 py-8 text-center text-xs text-muted-foreground">
                      {eventGroups.length === 0 ? t('cc.noactivetrips') : t('cc.noeventsmatch')}
                    </p>
                  ) : null}
                </div>
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </div>

        {/* Map */}
        <div className="relative min-h-100 flex-1">
          <FleetMap
            centers={centers}
            vehicles={mapVehicles}
            trips={tab === "all-trips" ? trips : liveTrips}
            participants={participants}
            highlightTripId={selectedTripId}
            highlightTripIds={highlightedTripIds}
            highlightVehicleId={selectedVehicle?.id ?? null}
            onSelectTrip={(id) => setSelectedTripId(id)}
            fitTo={fitTo}
          />

          {/* Legend */}
          <div className="pointer-events-none absolute bottom-3 left-3 z-500 rounded-lg border border-border bg-card/95 px-3 py-2 text-[11px] shadow-sm backdrop-blur">
            <p className="mb-1 font-semibold text-foreground">{t('cc.legend')}</p>
            <div className="flex flex-col gap-1 text-muted-foreground">
              <LegendDot color="#2563eb" label={t('cc.enrouteonboard')} />
              <LegendDot color="#d97706" label={t('cc.pickupinprogress')} />
              <LegendDot color="#059669" label={t('cc.arrived')} />
              <LegendSquare label={t('common.carecenter')} />
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
  const { trips } = useTrips()
  const { assignDriver, cancelTrip } = useDispatchActions()
  const { vehicles } = useVehicles()
  const { drivers } = useDrivers()
  const { centers } = useCenters()
  const { events } = useEvents()
  const { participants } = useParticipants()
  const {t} = useTranslation()
  const trip = trips.find((t) => t.id === tripId)
  if (!trip) return null
  const vehicle = findById(vehicles,trip.vehicleId)
  const driver = findById(drivers,trip.driverId)
  const center = findById(centers,trip.destinationCenterId)
  const event = findById(events,trip.eventId)
  const meta = TripsConfig.tripStatusMeta[trip.status] ?? TripsConfig.tripStatusMeta['PLANNED']
  const availableDrivers = drivers.filter(
    (d) => d.status === 'available' || d.id === trip.driverId,
  )

  const tripStartMs = trip.startedAt ? new Date(trip.startedAt).getTime() : Date.now()
  const stops = Array.isArray(trip.stops) ? trip.stops : []
  const nextStop = stops.find((s) => s.status === 'pending' || s.status === 'approaching')
  const nextStopParticipant = nextStop ? findById(participants,nextStop.participantId) : undefined
  const liveEtaMin = nextStop
    ? Math.max(1, estimateMinutes(haversineKm(trip.currentLocation, nextStop.location)))
    : null

  return (
    <div className="absolute right-0 top-0 z-45 overflow-y-auto flex h-full w-full max-w-sm flex-col border-l border-border bg-card shadow-xl">
      <div className="flex items-start justify-between border-b border-border p-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold">{vehicle?.name}</h3>
            <span className="font-mono text-[11px] text-muted-foreground">{trip.tripNumber}</span>
          </div>
          <div className="mt-1">
            <StatusBadge label={t(meta.label)} cls={meta.cls} />
          </div>
        </div>
        <Button variant="ghost" size="icon" className="size-7" onClick={onClose} aria-label={t('e.closedetails')}>
          <X className="size-4" />
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-px border-b border-border bg-border">
        <InfoCell icon={UserRound} label={t('common.driver')} value={driver?.name ?? t('common.unassigned')} />
        <InfoCell icon={Clock} label={t('cc.etatocenter')} value={trip.etaCenter} />
        <InfoCell icon={MapPin} label={t('meal.distance')} value={formatMiles(trip.distanceKm)} />
        <InfoCell icon={Bus} label={t('cc.duration')} value={`${trip.durationMinutes} ${t('common.min')}`} />
      </div>

      <div className="border-b border-border px-4 py-3">
        <div className="mb-1.5 flex items-center justify-between text-xs">
          <span className="font-medium text-foreground">{t('cc.tripprogress')}</span>
          <span className="tabular-nums text-muted-foreground">{Math.round(trip.progress * 100)}%</span>
        </div>
        <Progress value={trip.progress * 100} className="h-1.5" />
      </div>

      {nextStop && liveEtaMin != null ? (
        <div className="flex items-center gap-2 border-b border-border bg-primary/5 px-4 py-2.5">
          <Navigation className="size-3.5 shrink-0 text-primary" />
          <p className="min-w-0 flex-1 truncate text-xs text-foreground">
            {t('common.next')}: <span className="font-medium">{nextStopParticipant?.name}</span>
            <span className="text-muted-foreground"> — ~{liveEtaMin} {t('cc.minaway')}</span>
          </p>
          <span className="shrink-0 text-[11px] tabular-nums text-muted-foreground">
            {formatClockTime(tripStartMs, nextStop.etaMinutes)}
          </span>
        </div>
      ) : null}

      {/* Driver assignment + dispatch controls */}
      <div className="flex flex-col gap-2 border-b border-border px-4 py-3">
        <label className="text-[11px] font-medium text-muted-foreground">{t('cc.assigndriver')}</label>
        {availableDrivers.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border px-2.5 py-2 text-xs text-muted-foreground">
            {t('cc.nodrivers')}
          </p>
        ) : (
          <Select
            value={trip.driverId ?? ''}
            onValueChange={(v) => {
              if (v) void assignDriver(trip.id, v)
            }}
          >
            <SelectTrigger className="h-9">
              <SelectValue placeholder={t('cc.selectdriver')}>
                {(value) => findById(drivers,String(value))?.name ?? t('cc.selectdriver')}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {availableDrivers.map((d) => {
                const onShift = event ? DriverUtils.isDriverOnShift(d, event.date, event.startTime) : true
                return (
                  <SelectItem key={d.id} value={d.id}>
                    {d.name} · {d.rating.toFixed(1)}★{onShift ? '' : ` ${t('cc.offshift')}`}
                  </SelectItem>
                )
              })}
            </SelectContent>
          </Select>
        )}
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {t('cc.pickuproute')}
          </p>
          <ol className="relative space-y-4 border-l border-dashed border-border pl-5">
            {stops.map((stop) => {
              const p = findById(participants,stop.participantId)
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
                      {t('cc.driverapproaching')}
                    </Badge>
                  ) : null}
                  {done ? (
                    <Badge className="mt-1 bg-success/20 px-1.5 py-0 text-[10px] text-success">
                      {t('cc.pickedup')}
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
              <p className="text-xs text-muted-foreground">{t('cc.destinationlabel')} · {center?.address}</p>
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
            void cancelTrip(trip.id)
            onClose()
          }}
        >
          {t('cc.canceltrip')}
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