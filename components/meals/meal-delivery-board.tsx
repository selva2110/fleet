'use client'

import { useMemo, useState } from 'react'
import { Boxes, Clock, MapPin, Play, Plus, Route, Truck, UtensilsCrossed, X } from 'lucide-react'
import { FleetMap } from '@/components/map/fleet-map-dynamic'
import { StatusBadge } from '@/components/common'
import { NewMealRunDialog } from '@/components/meals/new-meal-run-dialog'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'
import { useFleet } from '@/lib/store'
import { formatMiles, mealStatusMeta } from '@/lib/labels'

/**
 * Self-contained meal-delivery workspace (KPI strip, run list, live map, run
 * detail overlay, and the "new run" dialog). Rendered inside the Dispatch
 * Command Center's Meal Delivery tab.
 */
export function MealDeliveryBoard() {
  const fleet = useFleet()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)

  const runs = fleet.mealDeliveries
  const activeRuns = useMemo(
    () => runs.filter((m) => m.status !== 'cancelled' && m.status !== 'completed'),
    [runs],
  )
  const selected = runs.find((m) => m.id === selectedId) ?? null

  const enRoute = runs.filter((m) => m.status === 'en-route' || m.status === 'delivering').length
  const mealsInTransit = runs
    .filter((m) => m.status !== 'completed' && m.status !== 'cancelled')
    .reduce((s, m) => s + m.totalMeals, 0)
  const totalStops = runs.reduce((s, m) => s + m.stops.length, 0)
  const deliveredStops = runs.reduce(
    (s, m) => s + m.stops.filter((x) => x.status === 'delivered').length,
    0,
  )
  const stopsRemaining = totalStops - deliveredStops
  const mapVehicles = fleet.vehicles.filter((v) => activeRuns.some((m) => m.vehicleId === v.id))

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* KPI strip */}
      <div className="grid grid-cols-2 gap-px border-b border-border bg-border sm:grid-cols-4">
        <Kpi icon={Truck} label="Active runs" value={String(activeRuns.length)} />
        <Kpi icon={Route} label="Out for delivery" value={String(enRoute)} tone="primary" />
        <Kpi icon={Boxes} label="Meals in transit" value={String(mealsInTransit)} />
        <Kpi icon={MapPin} label="Stops remaining" value={String(stopsRemaining)} />
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-1 overflow-hidden lg:grid-cols-[380px_1fr]">
        {/* Run list */}
        <div className="flex min-h-0 flex-col border-b border-border bg-card lg:border-b-0 lg:border-r">
          <ScrollArea className="h-[320px] lg:h-full">
            <div className="divide-y divide-border border-t border-border">
              {runs.map((m) => {
                const meta = mealStatusMeta[m.status]
                const center = fleet.centerById(m.centerId)
                const delivered = m.stops.filter((s) => s.status === 'delivered').length
                const isSelected = m.id === selectedId
                return (
                  <button
                    key={m.id}
                    onClick={() => setSelectedId(isSelected ? null : m.id)}
                    className={cn(
                      'flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/50',
                      isSelected && 'bg-accent/60',
                    )}
                  >
                    <div className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <UtensilsCrossed className="size-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="truncate text-sm font-medium">
                          {m.runNumber} · {m.mealType}
                        </span>
                        <StatusBadge label={meta.label} cls={meta.cls} />
                      </div>
                      <p className="truncate text-xs text-muted-foreground">
                        {center?.name} · {m.totalMeals} meals
                      </p>
                      <div className="mt-1.5 flex items-center gap-2">
                        <Progress value={m.progress * 100} className="h-1 flex-1" />
                        <span className="text-[11px] tabular-nums text-muted-foreground">
                          {delivered}/{m.stops.length}
                        </span>
                      </div>
                    </div>
                  </button>
                )
              })}
              {runs.length === 0 ? (
                <p className="px-4 py-8 text-center text-xs text-muted-foreground">
                  No meal runs yet. Create one to start delivering meals.
                </p>
              ) : null}
            </div>
          </ScrollArea>
        </div>

        {/* Map */}
        <div className="relative min-h-[400px] flex-1">
          <FleetMap
            centers={fleet.centers}
            vehicles={mapVehicles}
            trips={[]}
            mealDeliveries={runs}
            highlightMealId={selectedId}
            onSelectMeal={(id) => setSelectedId(id)}
          />

          <div className="pointer-events-none absolute bottom-3 left-3 z-[500] rounded-lg border border-border bg-card/95 px-3 py-2 text-[11px] shadow-sm backdrop-blur">
            <p className="mb-1 font-semibold text-foreground">Legend</p>
            <div className="flex flex-col gap-1 text-muted-foreground">
              <LegendDot color="#2563eb" label="En route" />
              <LegendDot color="#d97706" label="Delivering / pending drop" />
              <LegendDot color="#059669" label="Delivered" />
              <LegendSquare label="Kitchen / center" />
            </div>
          </div>

          {selected ? (
            <MealDetail key={selected.id} runId={selected.id} onClose={() => setSelectedId(null)} />
          ) : null}
        </div>
      </div>

      <NewMealRunDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </div>
  )
}

function MealDetail({ runId, onClose }: { runId: string; onClose: () => void }) {
  const fleet = useFleet()
  const [busy, setBusy] = useState(false)
  const run = fleet.mealDeliveries.find((m) => m.id === runId)
  if (!run) return null
  const center = fleet.centerById(run.centerId)
  const vehicle = fleet.vehicleById(run.vehicleId)
  const driver = fleet.driverById(run.driverId)
  const meta = mealStatusMeta[run.status]

  return (
    <div className="absolute right-0 top-0 z-[600] flex h-full w-full max-w-sm flex-col overflow-y-auto border-l border-border bg-card shadow-xl">
      <div className="flex items-start justify-between border-b border-border p-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold">{run.runNumber}</h3>
            <span className="font-mono text-[11px] text-muted-foreground">{run.mealType}</span>
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
        <InfoCell icon={Truck} label="Vehicle" value={vehicle?.name ?? 'Unassigned'} />
        <InfoCell icon={Clock} label="Departs" value={run.departTime} />
        <InfoCell icon={Boxes} label="Meals" value={String(run.totalMeals)} />
        <InfoCell icon={MapPin} label="Distance" value={formatMiles(run.distanceKm)} />
      </div>

      <div className="border-b border-border px-4 py-3">
        <div className="mb-1.5 flex items-center justify-between text-xs">
          <span className="font-medium text-foreground">Run progress</span>
          <span className="tabular-nums text-muted-foreground">{Math.round(run.progress * 100)}%</span>
        </div>
        <Progress value={run.progress * 100} className="h-1.5" />
        <p className="mt-2 text-xs text-muted-foreground">Driver: {driver?.name ?? 'Unassigned'}</p>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Delivery route
          </p>
          <ol className="relative space-y-4 border-l border-dashed border-border pl-5">
            <li className="relative">
              <span className="absolute -left-[27px] flex size-4 items-center justify-center rounded-full border-2 border-card bg-foreground">
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
                      'absolute -left-[27px] flex size-4 items-center justify-center rounded-full border-2 border-card',
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
      </ScrollArea>

      <div className="flex flex-col gap-2 border-t border-border p-4">
        {run.status === 'scheduled' || run.status === 'preparing' || run.status === 'loaded' ? (
          <Button
            size="sm"
            className="w-full"
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
          className="w-full text-destructive hover:text-destructive"
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
  tone?: 'default' | 'primary'
}) {
  const cls = tone === 'primary' ? 'text-primary' : 'text-foreground'
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
      <p className="mt-0.5 truncate text-sm font-medium text-foreground">{value}</p>
    </div>
  )
}
