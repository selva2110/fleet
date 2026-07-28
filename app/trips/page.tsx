'use client'

import { useMemo, useState } from 'react'
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
  TableHead,
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
  type SortOption,
} from '@/components/data-view/data-view'
import { useFleet } from '@/lib/store'
import { tripStatusMeta } from '@/lib/labels'
import type { Trip } from '@/lib/types'

const STATUS_OPTIONS = Object.entries(tripStatusMeta).map(([value, m]) => ({
  value,
  label: m.label,
}))
const GROUP_OPTIONS = [
  { value: 'active', label: 'Active (en route / onboard)' },
  { value: 'planned', label: 'Planned / assigned' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
]
const CREW_OPTIONS = [
  { value: 'has-driver', label: 'Has driver' },
  { value: 'no-driver', label: 'No driver' },
  { value: 'has-vehicle', label: 'Has vehicle' },
  { value: 'no-vehicle', label: 'No vehicle' },
]

const ACTIVE = ['en-route', 'pickup-in-progress', 'onboard']
const PLANNED = ['planned', 'vehicle-assigned', 'driver-assigned']

const SORT_OPTIONS: SortOption[] = [
  { key: 'tripNumber', label: 'Trip number' },
  { key: 'status', label: 'Status' },
  { key: 'progress', label: 'Progress' },
  { key: 'riders', label: 'Riders' },
  { key: 'distanceKm', label: 'Distance' },
]

export default function TripsPage() {
  const fleet = useFleet()
  const dv = useDataView('tripNumber', 'list')
  const [clearOpen, setClearOpen] = useState(false)
  const [clearing, setClearing] = useState(false)

  const [statuses, setStatuses] = useState<string[]>([])
  const [groups, setGroups] = useState<string[]>([])
  const [crew, setCrew] = useState<string[]>([])

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
      if (g === 'active') return ACTIVE.includes(t.status)
      if (g === 'planned') return PLANNED.includes(t.status)
      if (g === 'completed') return t.status === 'arrived' || t.status === 'completed'
      if (g === 'cancelled') return t.status === 'cancelled'
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

  function sortValue(t: Trip, key: string): unknown {
    if (key === 'riders') return t.stops.length
    return t[key as keyof Trip]
  }

  const filtered = useMemo(() => {
    const q = dv.query.trim().toLowerCase()
    const list = fleet.trips.filter((t) => {
      const vehicle = t.vehicleId ? fleet.vehicleById(t.vehicleId) : undefined
      const driver = t.driverId ? fleet.driverById(t.driverId) : undefined
      const event = fleet.eventById(t.eventId)
      const matchQuery =
        !q ||
        t.tripNumber.toLowerCase().includes(q) ||
        (event?.name.toLowerCase().includes(q) ?? false) ||
        (vehicle?.name.toLowerCase().includes(q) ?? false) ||
        (driver?.name.toLowerCase().includes(q) ?? false)
      const matchStatus = statuses.length === 0 || statuses.includes(t.status)
      return matchQuery && matchStatus && matchesGroup(t) && matchesCrew(t)
    })
    return list.sort((a, b) => compareValues(sortValue(a, dv.sortKey), sortValue(b, dv.sortKey), dv.sortDir))
  }, [fleet.trips, fleet, dv.query, dv.sortKey, dv.sortDir, statuses, groups, crew])

  async function confirmClearAll() {
    setClearing(true)
    try {
      await fleet.clearAllTrips()
      setClearOpen(false)
    } finally {
      setClearing(false)
    }
  }

  return (
    <div className="flex min-h-full flex-col">
      <PageHeader
        title="Trips"
        description="Every planned, active, and completed transport run."
        actions={
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              className="text-destructive hover:text-destructive"
              onClick={() => setClearOpen(true)}
              disabled={fleet.trips.length === 0}
            >
              <Trash2 className="size-4" /> Clear all trips
            </Button>
            <Button size="sm" variant="outline" nativeButton={false} render={<Link href="/command-center" />}>
              <MapPin className="size-4" /> Live map
            </Button>
          </div>
        }
      />

      <div className="p-6">
        <ListLayout
          filters={
            <FilterRail activeCount={activeFilterCount} onReset={resetFilters}>
              <FilterSection title="Quick groups">
                <CheckboxGroupFilter options={GROUP_OPTIONS} selected={groups} onChange={setGroups} />
              </FilterSection>
              <FilterSection title="Exact status">
                <CheckboxGroupFilter options={STATUS_OPTIONS} selected={statuses} onChange={setStatuses} />
              </FilterSection>
              <FilterSection title="Crew assignment">
                <CheckboxGroupFilter options={CREW_OPTIONS} selected={crew} onChange={setCrew} />
              </FilterSection>
            </FilterRail>
          }
        >
          <div className="flex flex-col gap-6">
        <DataToolbar
          query={dv.query}
          onQueryChange={dv.setQuery}
          searchPlaceholder="Search trip, event, vehicle, or driver"
          sortOptions={SORT_OPTIONS}
          sortKey={dv.sortKey}
          onSortKeyChange={dv.setSortKey}
          sortDir={dv.sortDir}
          onToggleSortDir={dv.toggleSortDir}
          view={dv.view}
          onViewChange={dv.setView}
          resultCount={filtered.length}
        />

        {filtered.length === 0 ? (
          <EmptyState message="No trips match your search and filters." />
        ) : dv.view === 'grid' ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {filtered.map((t) => {
              const vehicle = t.vehicleId ? fleet.vehicleById(t.vehicleId) : undefined
              const driver = t.driverId ? fleet.driverById(t.driverId) : undefined
              const event = fleet.eventById(t.eventId)
              const meta = tripStatusMeta[t.status]
              const picked = t.stops.filter((s) => s.status === 'picked-up').length
              return (
                <Card key={t.id} className="flex flex-col gap-3 p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-mono text-xs text-muted-foreground">{t.tripNumber}</p>
                      <p className="text-sm font-semibold">{event?.name}</p>
                    </div>
                    <StatusBadge label={meta.label} cls={meta.cls} />
                  </div>
                  <div className="flex flex-col gap-1.5 text-xs text-muted-foreground">
                    <p className="flex items-center gap-2">
                      <Bus className="size-3.5 shrink-0" /> {vehicle?.name ?? 'No vehicle'}
                    </p>
                    <p className="flex items-center gap-2">
                      <UserRound className="size-3.5 shrink-0" /> {driver?.name ?? 'Unassigned'}
                    </p>
                  </div>
                  <div>
                    <div className="mb-1 flex items-center justify-between text-[11px]">
                      <span className="text-muted-foreground">
                        {picked}/{t.stops.length} riders picked up
                      </span>
                      <span className="tabular-nums text-muted-foreground">
                        {Math.round(t.progress * 100)}%
                      </span>
                    </div>
                    <Progress value={t.progress * 100} className="h-1.5" />
                  </div>
                  <div className="flex items-center justify-between border-t border-border pt-2 text-xs">
                    <span className="text-muted-foreground">ETA</span>
                    <span className="font-medium tabular-nums">
                      {t.status === 'cancelled' ? '—' : t.etaCenter}
                    </span>
                  </div>
                </Card>
              )
            })}
          </div>
        ) : (
          <Card className="overflow-hidden py-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Trip</TableHead>
                    <TableHead>Event</TableHead>
                    <TableHead>Vehicle / Driver</TableHead>
                    <TableHead>Riders</TableHead>
                    <TableHead>Progress</TableHead>
                    <TableHead>ETA</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((t) => {
                    const vehicle = t.vehicleId ? fleet.vehicleById(t.vehicleId) : undefined
                    const driver = t.driverId ? fleet.driverById(t.driverId) : undefined
                    const event = fleet.eventById(t.eventId)
                    const meta = tripStatusMeta[t.status]
                    const picked = t.stops.filter((s) => s.status === 'picked-up').length
                    return (
                      <TableRow key={t.id}>
                        <TableCell className="font-mono text-xs">{t.tripNumber}</TableCell>
                        <TableCell className="text-sm">{event?.name}</TableCell>
                        <TableCell>
                          <p className="text-sm font-medium">{vehicle?.name ?? '—'}</p>
                          <p className="text-xs text-muted-foreground">{driver?.name ?? 'Unassigned'}</p>
                        </TableCell>
                        <TableCell className="text-sm tabular-nums">
                          {picked}/{t.stops.length}
                        </TableCell>
                        <TableCell className="w-40">
                          <div className="flex items-center gap-2">
                            <Progress value={t.progress * 100} className="h-1.5 flex-1" />
                            <span className="text-[11px] tabular-nums text-muted-foreground">
                              {Math.round(t.progress * 100)}%
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm tabular-nums text-muted-foreground">
                          {t.status === 'cancelled' ? '—' : t.etaCenter}
                        </TableCell>
                        <TableCell>
                          <StatusBadge label={meta.label} cls={meta.cls} />
                        </TableCell>
                      </TableRow>
                    )
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
            <DialogTitle>Clear all trips</DialogTitle>
            <DialogDescription>
              This removes all {fleet.trips.length} trip{fleet.trips.length === 1 ? '' : 's'} — planned, active, and
              completed — and releases their vehicles, drivers, and participants back to available/registered.
              Centers, participants, vehicles, drivers, and events are not affected. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter showCloseButton>
            <Button variant="destructive" onClick={confirmClearAll} disabled={clearing}>
              {clearing ? 'Clearing…' : 'Clear all trips'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
