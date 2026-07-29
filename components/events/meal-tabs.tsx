'use client'

import { useMemo, useState } from 'react'
import { Boxes, Clock, MapPin, Play, Route, Truck, UserRound, UtensilsCrossed } from 'lucide-react'
import { StatusBadge } from '@/components/common'
import { NewMealRunDialog } from '@/components/meals/new-meal-run-dialog'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { formatMonthDayYear } from '@/lib/date'
import { formatMiles, mealStatusMeta } from '@/lib/labels'
import type { MealDelivery } from '@/lib/types'
import { cn } from '@/lib/utils'

// Runs that are still being planned (not yet dispatched onto the road).
const PLANNING_STATUSES = ['scheduled', 'preparing', 'loaded']

const STATUS_OPTIONS = Object.entries(mealStatusMeta)
  .filter(([value]) => value !== 'cancelled')
  .map(([value, m]) => ({ value, label: m.label }))

const TYPE_OPTIONS = ['Breakfast', 'Lunch', 'Dinner'].map((v) => ({ value: v, label: v }))

const SORT_OPTIONS: SortOption[] = [
  { key: 'date', label: 'Date' },
  { key: 'runNumber', label: 'Run' },
  { key: 'mealType', label: 'Meal' },
  { key: 'totalMeals', label: 'Meals' },
  { key: 'status', label: 'Status' },
]

/**
 * Consolidated meal-delivery surface for the Events page. Lists scheduled and
 * in-progress runs with search/filter, opens a detail dialog on row click, and
 * hosts the "plan new run" dialog (opened from the page header).
 */
export function MealDeliveryTab({
  dialogOpen,
  onDialogOpenChange,
}: {
  dialogOpen: boolean
  onDialogOpenChange: (open: boolean) => void
}) {
  const fleet = useFleet()
  const dv = useDataView('date')
  const [statuses, setStatuses] = useState<string[]>([])
  const [types, setTypes] = useState<string[]>([])
  const [detailId, setDetailId] = useState<string | null>(null)

  const activeFilterCount = (statuses.length ? 1 : 0) + (types.length ? 1 : 0)

  function resetFilters() {
    setStatuses([])
    setTypes([])
  }

  const filtered = useMemo(() => {
    const q = dv.query.trim().toLowerCase()
    const list = fleet.mealDeliveries.filter((m) => {
      if (m.status === 'cancelled') return false
      const center = fleet.centerById(m.centerId)
      const matchQuery =
        !q ||
        m.runNumber.toLowerCase().includes(q) ||
        m.mealType.toLowerCase().includes(q) ||
        (center?.name.toLowerCase().includes(q) ?? false)
      const matchStatus = statuses.length === 0 || statuses.includes(m.status)
      const matchType = types.length === 0 || types.includes(m.mealType)
      return matchQuery && matchStatus && matchType
    })
    return list.sort((a, b) =>
      compareValues(
        a[dv.sortKey as keyof MealDelivery],
        b[dv.sortKey as keyof MealDelivery],
        dv.sortDir,
      ),
    )
  }, [fleet.mealDeliveries, fleet, dv.query, dv.sortKey, dv.sortDir, statuses, types])

  const detail = detailId ? fleet.mealDeliveries.find((m) => m.id === detailId) ?? null : null

  return (
    <>
      <ListLayout
        filters={
          <FilterRail activeCount={activeFilterCount} onReset={resetFilters}>
            <FilterSection title="Status">
              <CheckboxGroupFilter options={STATUS_OPTIONS} selected={statuses} onChange={setStatuses} />
            </FilterSection>
            <FilterSection title="Meal type">
              <CheckboxGroupFilter options={TYPE_OPTIONS} selected={types} onChange={setTypes} />
            </FilterSection>
          </FilterRail>
        }
      >
        <div className="flex flex-col gap-6">
          <DataToolbar
            query={dv.query}
            onQueryChange={dv.setQuery}
            searchPlaceholder="Search run, meal, or center"
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
            <EmptyState message="No meal-delivery runs match your search and filters. Plan a new run from the header." />
          ) : dv.view === 'grid' ? (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {filtered.map((m) => (
                <MealRunCard key={m.id} run={m} onOpen={() => setDetailId(m.id)} />
              ))}
            </div>
          ) : (
            <Card className="overflow-hidden py-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Run</TableHead>
                      <TableHead>Kitchen / center</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Departs</TableHead>
                      <TableHead>Meals</TableHead>
                      <TableHead>Deliveries</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((m) => {
                      const center = fleet.centerById(m.centerId)
                      const meta = mealStatusMeta[m.status]
                      const delivered = m.stops.filter((s) => s.status === 'delivered').length
                      return (
                        <TableRow
                          key={m.id}
                          onClick={() => setDetailId(m.id)}
                          data-active={detailId === m.id}
                          className="cursor-pointer data-[active=true]:bg-muted/60"
                        >
                          <TableCell>
                            <p className="text-sm font-medium">{m.runNumber}</p>
                            <p className="text-xs text-muted-foreground">{m.mealType}</p>
                          </TableCell>
                          <TableCell className="text-sm">{center?.name}</TableCell>
                          <TableCell className="text-sm tabular-nums">{formatMonthDayYear(m.date)}</TableCell>
                          <TableCell className="text-sm tabular-nums text-muted-foreground">
                            {m.departTime}
                          </TableCell>
                          <TableCell className="text-sm tabular-nums">{m.totalMeals}</TableCell>
                          <TableCell className="w-40">
                            <div className="flex items-center gap-2">
                              <Progress
                                value={m.stops.length ? (delivered / m.stops.length) * 100 : 0}
                                className="h-1.5 flex-1"
                              />
                              <span className="text-[11px] tabular-nums text-muted-foreground">
                                {delivered}/{m.stops.length}
                              </span>
                            </div>
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

      <MealRunDetailDialog
        run={detail}
        onClose={() => setDetailId(null)}
      />

      <NewMealRunDialog open={dialogOpen} onOpenChange={onDialogOpenChange} />
    </>
  )
}

function MealRunCard({ run, onOpen }: { run: MealDelivery; onOpen: () => void }) {
  const fleet = useFleet()
  const center = fleet.centerById(run.centerId)
  const vehicle = fleet.vehicleById(run.vehicleId)
  const driver = fleet.driverById(run.driverId)
  const meta = mealStatusMeta[run.status]
  const delivered = run.stops.filter((s) => s.status === 'delivered').length

  return (
    <Card
      onClick={onOpen}
      className="flex cursor-pointer flex-col overflow-hidden transition-colors hover:border-primary/40"
    >
      <div className="flex items-start justify-between gap-2 border-b border-border px-4 py-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">
            {run.runNumber} · {run.mealType}
          </p>
          <p className="text-xs text-muted-foreground">{center?.name}</p>
        </div>
        <StatusBadge label={meta.label} cls={meta.cls} />
      </div>
      <div className="flex-1 space-y-2 px-4 py-3 text-xs text-muted-foreground">
        <p className="flex items-center gap-2">
          <Clock className="size-3.5 shrink-0" /> {formatMonthDayYear(run.date)} · departs {run.departTime}
        </p>
        <p className="flex items-center gap-2">
          <Boxes className="size-3.5 shrink-0" /> {run.totalMeals} meals · {run.stops.length} stops
        </p>
        <p className="flex items-center gap-2">
          <Truck className="size-3.5 shrink-0" />
          {vehicle?.name ?? 'Unassigned vehicle'}
          {driver ? ` · ${driver.name}` : ' · No driver'}
        </p>
      </div>
      <div className="border-t border-border px-4 py-3">
        <div className="mb-1 flex items-center justify-between text-[11px]">
          <span className="font-medium text-foreground">Delivered</span>
          <span className="tabular-nums text-muted-foreground">
            {delivered}/{run.stops.length}
          </span>
        </div>
        <Progress value={run.stops.length ? (delivered / run.stops.length) * 100 : 0} className="h-1.5" />
      </div>
    </Card>
  )
}

function MealRunDetailDialog({ run, onClose }: { run: MealDelivery | null; onClose: () => void }) {
  const fleet = useFleet()
  const [busy, setBusy] = useState(false)

  const center = run ? fleet.centerById(run.centerId) : undefined
  const vehicle = run ? fleet.vehicleById(run.vehicleId) : undefined
  const driver = run ? fleet.driverById(run.driverId) : undefined
  const meta = run ? mealStatusMeta[run.status] : null
  const canDispatch = run ? PLANNING_STATUSES.includes(run.status) : false

  return (
    <Dialog open={run !== null} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg">
        {run && meta ? (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <UtensilsCrossed className="size-4 text-primary" />
                {run.runNumber} · {run.mealType}
                <StatusBadge label={meta.label} cls={meta.cls} />
              </DialogTitle>
              <DialogDescription>
                {center?.name} · {formatMonthDayYear(run.date)} · departs {run.departTime}
              </DialogDescription>
            </DialogHeader>

            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <DetailStat icon={Truck} label="Vehicle" value={vehicle?.name ?? 'Unassigned'} />
              <DetailStat icon={UserRound} label="Driver" value={driver?.name ?? 'Unassigned'} />
              <DetailStat icon={Boxes} label="Meals" value={String(run.totalMeals)} />
              <DetailStat icon={MapPin} label="Distance" value={formatMiles(run.distanceKm)} />
            </div>

            <div>
              <div className="mb-1.5 flex items-center justify-between text-xs">
                <span className="font-medium text-foreground">Run progress</span>
                <span className="tabular-nums text-muted-foreground">
                  {Math.round(run.progress * 100)}%
                </span>
              </div>
              <Progress value={run.progress * 100} className="h-1.5" />
            </div>

            <div className="max-h-64 overflow-y-auto">
              <p className="mb-3 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                <Route className="size-3.5" /> Delivery route
              </p>
              <ol className="relative space-y-4 border-l border-dashed border-border pl-5">
                <li className="relative">
                  <span className="absolute -left-[27px] flex size-4 items-center justify-center rounded-full border-2 border-background bg-foreground">
                    <UtensilsCrossed className="size-2.5 text-background" />
                  </span>
                  <p className="text-sm font-medium">{center?.name}</p>
                  <p className="text-xs text-muted-foreground">Pickup kitchen · {center?.address}</p>
                </li>
                {run.stops.map((stop) => {
                  const p = fleet.participantById(stop.participantId)
                  const done = stop.status === 'delivered'
                  const approaching = stop.status === 'approaching'
                  return (
                    <li key={stop.participantId} className="relative">
                      <span
                        className={cn(
                          'absolute -left-[27px] flex size-4 items-center justify-center rounded-full border-2 border-background',
                          done ? 'bg-success' : approaching ? 'bg-warning' : 'bg-muted-foreground/40',
                        )}
                      />
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-medium">{p?.name}</p>
                        <span className="text-[11px] tabular-nums text-muted-foreground">
                          {stop.mealCount} meal{stop.mealCount === 1 ? '' : 's'}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">{p?.address}</p>
                      {done ? (
                        <span className="mt-1 inline-flex rounded-full bg-success/20 px-1.5 py-0 text-[10px] text-success">
                          Delivered
                        </span>
                      ) : approaching ? (
                        <span className="mt-1 inline-flex rounded-full bg-warning/20 px-1.5 py-0 text-[10px] text-warning-foreground">
                          Approaching
                        </span>
                      ) : null}
                    </li>
                  )
                })}
              </ol>
            </div>

            <div className="flex items-center gap-2 border-t border-border pt-4">
              {canDispatch ? (
                <Button
                  size="sm"
                  className="flex-1"
                  disabled={busy}
                  onClick={async () => {
                    setBusy(true)
                    try {
                      await fleet.startMealDelivery(run.id)
                    } finally {
                      setBusy(false)
                    }
                  }}
                >
                  <Play className="size-4" /> Dispatch &amp; start run
                </Button>
              ) : null}
              <Button
                variant="outline"
                size="sm"
                className={cn('text-destructive hover:text-destructive', canDispatch ? '' : 'flex-1')}
                disabled={busy}
                onClick={async () => {
                  setBusy(true)
                  try {
                    await fleet.cancelMealDelivery(run.id)
                    onClose()
                  } finally {
                    setBusy(false)
                  }
                }}
              >
                Cancel run
              </Button>
            </div>
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  )
}

function DetailStat({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: string
}) {
  return (
    <div className="rounded-lg border border-border bg-muted/30 px-3 py-2">
      <div className="flex items-center gap-1.5 text-muted-foreground">
        <Icon className="size-3.5" />
        <span className="text-[10px]">{label}</span>
      </div>
      <p className="mt-0.5 truncate text-sm font-medium text-foreground">{value}</p>
    </div>
  )
}
