'use client'

import { useMemo, useState } from 'react'
import { Boxes, Clock, MapPin, Play, Plus, Route, Search, Truck, UtensilsCrossed, X } from 'lucide-react'
import { FleetMap } from '@/components/map/fleet-map-dynamic'
import { StatusBadge } from '@/components/common'
import { NewMealRunDialog } from '@/components/meals/new-meal-run-dialog'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn, findById } from '@/lib/utils'
import { useMealDeliveries, useMealMutations } from '@/lib/meals/hooks'
import { useCenters } from '@/lib/events/hooks'
import { useVehicles } from '@/lib/vehicles/hooks'
import { useDrivers } from '@/lib/driver/hooks'
import { useParticipants } from '@/lib/participant/hooks'
import { formatMiles } from '@/lib/labels'
import { formatTimeOfDay } from '@/lib/date'
import { useTranslation } from '@/components/context/language-provider';
import { Input } from '../ui/input';
import { MealsConfig } from '@/lib/meals/config';

export function MealDeliveryBoard() {
  const { mealDeliveries } = useMealDeliveries()
  const { centers } = useCenters()
  const { vehicles } = useVehicles()
  const { participants } = useParticipants()
  const {t} = useTranslation()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [mealRunSearch, setMealRunSearch] = useState('')

  const runs = mealDeliveries
  const visibleRuns = useMemo(
    () => runs.filter((m) => m.status !== 'cancelled' && m.status !== 'completed'),
    [runs],
  )
  const filteredMealRuns = useMemo(() => {
      const query = mealRunSearch.trim().toLowerCase();
      if (!query) return visibleRuns;
      return visibleRuns.filter((item) =>
        (item.runNumber ?? "").toLowerCase().includes(query),
      );
  }, [visibleRuns, mealRunSearch]);
  const selected = visibleRuns.find((m) => m.id === selectedId) ?? null

  const enRoute = visibleRuns.filter((m) => m.status === 'en-route' || m.status === 'delivering').length
  const mealsInTransit = visibleRuns.reduce((s, m) => s + m.totalMeals, 0)
  const totalStops = visibleRuns.reduce((s, m) => s + m.stops.length, 0)
  const deliveredStops = visibleRuns.reduce(
    (s, m) => s + m.stops.filter((x) => x.status === 'delivered').length,
    0,
  )
  const stopsRemaining = totalStops - deliveredStops
  const mapVehicles = vehicles.filter((v) => visibleRuns.some((m) => m.vehicleId === v.id))

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex items-center justify-between border-b border-border px-4 py-2">
        <p className="text-xs text-muted-foreground">{t('meal.fleetruns')}</p>
        <Button size="sm" onClick={() => setDialogOpen(true)}>
          <Plus className="size-4" /> {t('meal.newrunbutton')}
        </Button>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-2 gap-px border-b border-border bg-border sm:grid-cols-4">
        <Kpi icon={Truck} label={t('meal.activeruns')} value={String(visibleRuns.length)} />
        <Kpi icon={Route} label={t('meal.outfordelivery')} value={String(enRoute)} tone="primary" />
        <Kpi icon={Boxes} label={t('meal.mealsintransit')} value={String(mealsInTransit)} />
        <Kpi icon={MapPin} label={t('meal.stopsremaining')} value={String(stopsRemaining)} />
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[380px_1fr]">
        {/* Run list */}
        <div className="flex min-h-0 flex-col border-b border-border bg-card lg:border-b-0 lg:border-r">
          <div className="relative mx-3 my-1">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={mealRunSearch}
              onChange={(e) => setMealRunSearch(e.target.value)}
              placeholder={t('meal.searchmealsplaceholder')}
              className="pl-8"
            />
          </div>
          <ScrollArea className="h-80 lg:h-full">
            <div className="divide-y divide-border border-t border-border">
              {filteredMealRuns.map((m) => {
                const meta = MealsConfig.mealStatusMeta[m.status];
                const center = findById(centers, m.centerId);
                const delivered = m.stops.filter((s) => s.status === "delivered").length;
                const isSelected = m.id === selectedId;
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
                        <StatusBadge label={t(meta.label)} cls={meta.cls} />
                      </div>
                      <p className="truncate text-xs text-muted-foreground">
                        {center?.name} · {m.totalMeals} {t('meal.meals').toLowerCase()}
                      </p>
                      <div className="mt-1.5 flex items-center gap-2">
                        <Progress value={m.progress * 100} className="h-1 flex-1" />
                        <span className="text-[11px] tabular-nums text-muted-foreground">
                          {delivered}/{m.stops.length}
                        </span>
                      </div>
                    </div>
                  </button>
                );
              })}
              {filteredMealRuns.length === 0 ? (
                <p className="px-4 py-8 text-center text-xs text-muted-foreground">
                  {t('meal.nomealruns')}
                </p>
              ) : null}
            </div>
          </ScrollArea>
        </div>

        {/* Map */}
        <div className="relative min-h-100 flex-1">
          <FleetMap
            centers={centers}
            vehicles={mapVehicles}
            trips={[]}
            participants={participants}
            mealDeliveries={visibleRuns}
            highlightMealId={selectedId}
            onSelectMeal={(id) => setSelectedId(id)}
          />

          <div className="pointer-events-none absolute bottom-3 left-3 z-500 rounded-lg border border-border bg-card/95 px-3 py-2 text-[11px] shadow-sm backdrop-blur">
            <p className="mb-1 font-semibold text-foreground">{t('cc.legend')}</p>
            <div className="flex flex-col gap-1 text-muted-foreground">
              <LegendDot color="#2563eb" label={t('board.enroute')} />
              <LegendDot color="#d97706" label={t('board.deliveringpending')} />
              <LegendDot color="#059669" label={t('common.delivered')} />
              <LegendSquare label={t('board.kitchencenter')} />
            </div>
          </div>

          {selected ? (
            <MealDetail key={selected.id} runId={selected.id} onClose={() => setSelectedId(null)} />
          ) : null}
        </div>
      </div>

      <NewMealRunDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </div>
  );
}

function MealDetail({ runId, onClose }: { runId: string; onClose: () => void }) {
  const { mealDeliveries } = useMealDeliveries()
  const { centers } = useCenters()
  const { vehicles } = useVehicles()
  const { drivers } = useDrivers()
  const { participants } = useParticipants()
  const { startMealDelivery } = useMealMutations()
  const {t} = useTranslation()
  const [busy, setBusy] = useState(false)
  const run = mealDeliveries.find((m) => m.id === runId)
  if (!run) return null
  const center = findById(centers, run.centerId)
  const vehicle = findById(vehicles, run.vehicleId)
  const driver = findById(drivers, run.driverId)
  const meta = MealsConfig.mealStatusMeta[run.status]

  return (
    <div className="absolute right-0 top-0 z-600 flex h-full w-full max-w-sm flex-col overflow-y-auto border-l border-border bg-card shadow-xl">
      <div className="flex items-start justify-between border-b border-border p-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold">{run.runNumber}</h3>
            <span className="font-mono text-[11px] text-muted-foreground">{run.mealType}</span>
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
        <InfoCell icon={Truck} label={t('common.vehicle')} value={vehicle?.name ?? t('common.unassigned')} />
        <InfoCell icon={Clock} label={t('meal.departs')} value={formatTimeOfDay(run.departTime)} />
        <InfoCell icon={Boxes} label={t('meal.meals')} value={String(run.totalMeals)} />
        <InfoCell icon={MapPin} label={t('meal.distance')} value={formatMiles(run.distanceKm)} />
      </div>

      <div className="border-b border-border px-4 py-3">
        <div className="mb-1.5 flex items-center justify-between text-xs">
          <span className="font-medium text-foreground">{t('meal.runprogress')}</span>
          <span className="tabular-nums text-muted-foreground">{Math.round(run.progress * 100)}%</span>
        </div>
        <Progress value={run.progress * 100} className="h-1.5" />
        <p className="mt-2 text-xs text-muted-foreground">{t('board.driverlabel')} {driver?.name ?? t('common.unassigned')}</p>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {t('meal.deliveryroute')}
          </p>
          <ol className="relative space-y-4 border-l border-dashed border-border pl-5">
            <li className="relative">
              <span className="absolute -left-6.75 flex size-4 items-center justify-center rounded-full border-2 border-card bg-foreground">
                <UtensilsCrossed className="size-2.5 text-background" />
              </span>
              <p className="text-sm font-medium">{center?.name}</p>
              <p className="text-xs text-muted-foreground">{t('meal.pickupkitchen')} · {center?.address}</p>
            </li>
            {run.stops.map((stop) => {
              const p = findById(participants, stop.participantId)
              const done = stop.status === 'delivered'
              const approaching = stop.status === 'approaching'
              return (
                <li key={stop.participantId} className="relative">
                  <span
                    className={cn(
                      'absolute -left-6.75 flex size-4 items-center justify-center rounded-full border-2 border-card',
                      done ? 'bg-success' : approaching ? 'bg-warning' : 'bg-muted-foreground/40',
                    )}
                  />
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium">{p?.name}</p>
                    <span className="text-[11px] tabular-nums text-muted-foreground">
                      {stop.mealCount} {t('board.mealword')}{stop.mealCount === 1 ? '' : 's'}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">{p?.address}</p>
                  {done ? (
                    <span className="mt-1 inline-flex rounded-full bg-success/20 px-1.5 py-0 text-[10px] text-success">
                      {t('common.delivered')}
                    </span>
                  ) : approaching ? (
                    <span className="mt-1 inline-flex rounded-full bg-warning/20 px-1.5 py-0 text-[10px] text-warning-foreground">
                      {t('meal.approaching')}
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
                await startMealDelivery(run.id)
              } finally {
                setBusy(false)
              }
            }}
          >
            <Play className="size-4" /> {t('meal.dispatchstart')}
          </Button>
        ) : null}
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
