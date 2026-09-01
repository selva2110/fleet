'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { Bus, MapPin, Trash2, UserRound } from 'lucide-react'
import { PageHeader, StatusBadge } from '@/components/common'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  CheckboxGroupFilter,
  DataToolbar,
  EmptyState,
  FilterRail,
  FilterSection,
  ListLayout,
  compareValues,
  useDataView,
} from '@/components/data-view/data-view'
import { useTrips, useDispatchActions } from '@/lib/trips/hooks'
import { useVehicles } from '@/lib/vehicles/hooks'
import { useDrivers } from '@/lib/driver/hooks'
import { useEvents } from '@/lib/events/hooks'
import { cn, findById } from '@/lib/utils';
import { tableHeaderRow } from '@/components/aurora/aurora-ui';
import { TripsConfig } from '@/lib/trips/config';
import { Trip } from '@/lib/trips/types';
import { TripsUtils } from '@/lib/trips/utils';
import { useTranslation } from '@/components/context/language-provider';

export default function TripsPage() {
  const { trips } = useTrips()
  const { vehicles } = useVehicles()
  const { drivers } = useDrivers()
  const { events } = useEvents()
  const { clearAllTrips } = useDispatchActions()
  const {t} = useTranslation();
  const dv = useDataView('tripNumber', 'list')
  const [clearOpen, setClearOpen] = useState(false)
  const [clearing, setClearing] = useState(false)

  const [statuses, setStatuses] = useState<string[]>([])
  const [groups, setGroups] = useState<string[]>([])
  const [crew, setCrew] = useState<string[]>([])
  const [tripId, setTripId] = useState<string | null>(null)
  const selectedRef = useRef<HTMLDivElement |HTMLTableRowElement | null>(null);
  const selectedRowRef = useRef<HTMLTableRowElement | null>(null);

  const activeFilterCount =
    (statuses.length ? 1 : 0) + (groups.length ? 1 : 0) + (crew.length ? 1 : 0)

  function resetFilters() {
    setStatuses([])
    setGroups([])
    setCrew([])
  }

  function matchesGroup(t: Trip): boolean {
    if (groups.length === 0) return true
    return groups.some((g) => {
      if (g === 'active') return TripsConfig.ACTIVE.includes(t.status)
      if (g === 'planned') return TripsConfig.PLANNED.includes(t.status)
      if (g === 'completed') return t.status === 'COMPLETED'
      if (g === 'cancelled') return t.status === 'CANCELLED'
      return false
    })
  }

  function matchesCrew(t: Trip): boolean {
    if (crew.length === 0) return true
    return crew.every((c) => {
      if (c === 'has-driver') return Boolean(t.driverId)
      if (c === 'no-driver') return !t.driverId
      if (c === 'has-vehicle') return Boolean(t.vehicleId)
      if (c === 'no-vehicle') return !t.vehicleId
      return true
    })
  }

  const filtered = useMemo(() => {
    const q = dv.query.trim().toLowerCase()
    const list = trips.filter((t) => {
      const vehicle = t.vehicleId ? findById(vehicles, t.vehicleId) : undefined
      const driver = t.driverId ? findById(drivers, t.driverId) : undefined
      const event = findById(events, t.eventId)
      const matchQuery =
        !q ||
        t.tripNumber.toLowerCase().includes(q) ||
        (event?.name.toLowerCase().includes(q) ?? false) ||
        (vehicle?.name.toLowerCase().includes(q) ?? false) ||
        (driver?.name.toLowerCase().includes(q) ?? false)
      const matchStatus = statuses.length === 0 || statuses.includes(t.status)
      return matchQuery && matchStatus && matchesGroup(t) && matchesCrew(t)
    })
    list.sort((a, b) => compareValues(TripsUtils.sortValue(a, dv.sortKey), TripsUtils.sortValue(b, dv.sortKey), dv.sortDir))
     return list.map((item, index) => ({
    ...item,
    idx: index + 1,
    })) 
  }, [trips, vehicles, drivers, events, dv.query, dv.sortKey, dv.sortDir, statuses, groups, crew])

  async function confirmClearAll() {
    setClearing(true)
    try {
      await clearAllTrips()
      setClearOpen(false)
    } finally {
      setClearing(false)
    }
  }
  
  useEffect(() => {
    if (!tripId) return;

    const timer = setTimeout(() => {
      if (dv.view === "grid") {
        selectedRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
      } else {
        selectedRowRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
      }
    }, 0); // or 50ms if needed

    return () => clearTimeout(timer);
  }, [tripId, dv.view, filtered]);

   useEffect(() => {
     if (typeof window === "undefined") return;
     const sp = new URLSearchParams(window.location.search);
     const id = sp.get("tripId");
     if (id) {
       setTripId(id);
       const timeout = setTimeout(() => {
         setTripId(null);
       }, 8000);
       return () => clearTimeout(timeout);
     }
   }, []);

  function onNavigate() {
    window.location.href = '/command-center'
  }

  return (
    <div className="flex min-h-full flex-col">
      <PageHeader
        title={t('common.trips')}
        description={t('trip.desc')}
        actions={
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              className="text-destructive hover:text-destructive"
              onClick={() => setClearOpen(true)}
              disabled={trips.length === 0}
            >
              <Trash2 className="size-4" /> {t('trip.clearall')}
            </Button>
            <Button
              size="sm"
              variant="outline"
              nativeButton={false}
              render={<Link href="/command-center" />}
            >
              <MapPin className="size-4" /> {t('trip.livemap')}
            </Button>
          </div>
        }
      />

      <div className="p-6">
        <ListLayout
          filters={
            <FilterRail activeCount={activeFilterCount} onReset={resetFilters}>
              <FilterSection title={t('trip.quickgroups')}>
                <CheckboxGroupFilter
                  options={TripsConfig.GROUP_OPTIONS}
                  selected={groups}
                  onChange={setGroups}
                />
              </FilterSection>
              <FilterSection title={t('common.status')}>
                <CheckboxGroupFilter
                  options={TripsConfig.STATUS_OPTIONS}
                  selected={statuses}
                  onChange={setStatuses}
                />
              </FilterSection>
              <FilterSection title={t('trip.crewassignment')}>
                <CheckboxGroupFilter
                  options={TripsConfig.CREW_OPTIONS}
                  selected={crew}
                  onChange={setCrew}
                />
              </FilterSection>
            </FilterRail>
          }
        >
          <div className="flex flex-col gap-6">
            <DataToolbar
              query={dv.query}
              onQueryChange={dv.setQuery}
              searchPlaceholder={t('trip.searchplaceholder')}
              sortOptions={TripsConfig.SORT_OPTIONS}
              sortKey={dv.sortKey}
              onSortKeyChange={dv.setSortKey}
              sortDir={dv.sortDir}
              onToggleSortDir={dv.toggleSortDir}
              view={dv.view}
              onViewChange={dv.setView}
              resultCount={filtered.length}
            />

            {filtered.length === 0 ? (
              <EmptyState message={t('trip.none')} />
            ) : dv.view === "grid" ? (
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {filtered.map((trip) => {
                  const vehicle = trip.vehicleId
                    ? findById(vehicles, trip.vehicleId)
                    : undefined;
                  const driver = trip.driverId
                    ? findById(drivers, trip.driverId)
                    : undefined;
                  const event = findById(events, trip.eventId);
                  const meta = TripsConfig.tripStatusMeta[trip.status] ?? TripsConfig.tripStatusMeta['PLANNED'];
                  const stops = Array.isArray(trip.stops) ? trip.stops : [];
                  const picked = stops.filter(
                    (s) => s.status === "picked-up",
                  ).length;
                  return (
                    <Card
                      key={trip.id}
                      onClick={onNavigate}
                      className={`flex flex-col p-4 justify-between ${
                        tripId === trip.id
                          ? "ring-2 ring-ring/50 ring-inset animate-pulse"
                          : ""
                      }`}
                      ref={tripId === trip.id ? selectedRef : null}
                    >
                      <div className="flex flex-col gap-3 transition-colors">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="font-mono text-xs text-muted-foreground">
                              {trip.tripNumber}
                            </p>
                            <p className="text-sm font-semibold">
                              {event?.name}
                            </p>
                          </div>
                          <StatusBadge label={t(meta.label)} cls={meta.cls} />
                        </div>
                        <div className="flex flex-col gap-1.5 text-xs text-muted-foreground">
                          <p className="flex items-center gap-2">
                            <Bus className="size-3.5 shrink-0" />{" "}
                            {vehicle?.name ?? t('trip.novehicle')}
                          </p>
                          <p className="flex items-center gap-2">
                            <UserRound className="size-3.5 shrink-0" />{" "}
                            {driver?.name ?? t('common.unassigned')}
                          </p>
                        </div>
                        <div>
                          <div className="mb-1 flex items-center justify-between text-[11px]">
                            <span className="text-muted-foreground">
                              {picked}/{stops.length} {t('trip.riderspickedup')}
                            </span>
                            <span className="tabular-nums text-muted-foreground">
                              {Math.round(trip.progress * 100)}%
                            </span>
                          </div>
                          <Progress
                            value={trip.progress * 100}
                            className="h-1.5"
                          />
                        </div>
                      </div>
                      <div className="flex items-center justify-between border-t border-border pt-2 text-xs">
                        <span className="text-muted-foreground">{t('trip.eta')}</span>
                        <span className="font-medium tabular-nums">
                          {trip.status === "CANCELLED" ? "—" : trip.etaCenter}
                        </span>
                      </div>
                    </Card>
                  );
                })}
              </div>
            ) : (
              <Card className="overflow-hidden py-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        {tableHeaderRow([
                          t('common.sno'),
                          t('trip.trip'),
                          t('e.event'),
                          t('trip.vehicledriver'),
                          t('trip.riders'),
                          t('trip.progress'),
                          t('trip.eta'),
                          t('common.status'),
                        ])}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filtered.map((trip) => {
                        const vehicle = trip.vehicleId
                          ? findById(vehicles, trip.vehicleId)
                          : undefined;
                        const driver = trip.driverId
                          ? findById(drivers, trip.driverId)
                          : undefined;
                        const event = findById(events, trip.eventId);
                        const meta = TripsConfig.tripStatusMeta[trip.status] ?? TripsConfig.tripStatusMeta['PLANNED'];
                        const stops = Array.isArray(trip.stops) ? trip.stops : [];
                        const picked = stops.filter(
                          (s) => s.status === "picked-up",
                        ).length;
                        return (
                          <TableRow
                            key={trip.id}
                            onClick={onNavigate}
                            className={cn(
                              "cursor-pointer transition-all",
                              tripId === trip.id &&
                                "ring-2 ring-ring/50 ring-inset animate-pulse",
                            )}
                            ref={tripId === trip.id ? selectedRowRef : null}
                          >
                            <TableCell>
                              <p className="font-medium text-center">{trip.idx}</p>
                            </TableCell>
                            <TableCell className="font-mono text-xs">
                              {trip.tripNumber}
                            </TableCell>
                            <TableCell className="text-sm">
                              {event?.name}
                            </TableCell>
                            <TableCell>
                              <p className="text-sm font-medium">
                                {vehicle?.name ?? "—"}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {driver?.name ?? t('common.unassigned')}
                              </p>
                            </TableCell>
                            <TableCell className="text-sm tabular-nums">
                              {picked}/{stops.length}
                            </TableCell>
                            <TableCell className="w-40">
                              <div className="flex items-center gap-2">
                                <Progress
                                  value={trip.progress * 100}
                                  className="h-1.5 flex-1"
                                />
                                <span className="text-[11px] tabular-nums text-muted-foreground">
                                  {Math.round(trip.progress * 100)}%
                                </span>
                              </div>
                            </TableCell>
                            <TableCell className="text-sm tabular-nums text-muted-foreground">
                              {trip.status === "CANCELLED" ? "—" : trip.etaCenter}
                            </TableCell>
                            <TableCell>
                              <StatusBadge label={t(meta.label)} cls={meta.cls} />
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </Card>
            )}
          </div>
        </ListLayout>
      </div>

      <Dialog open={clearOpen} onOpenChange={setClearOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{t('trip.clearall')}</DialogTitle>
            <DialogDescription>
              {t('trip.clearalldesc')
                .replace("{{count}}", String(trips.length))
                .replace("{{suffix}}", trips.length === 1 ? "" : "s")}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter showCloseButton>
            <Button
              variant="destructive"
              onClick={confirmClearAll}
              disabled={clearing}
            >
              {clearing ? t('trip.clearing') : t('trip.clearall')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
