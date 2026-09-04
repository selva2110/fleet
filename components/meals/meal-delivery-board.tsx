'use client'

import { useMemo, useState } from 'react'
import { Boxes, Clock, MapPin, Search, Truck, UserRound, UtensilsCrossed, X } from 'lucide-react'
import { FleetMap } from '@/components/map/fleet-map-dynamic'
import { StatusBadge } from '@/components/common'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn, findById } from '@/lib/utils'
import { useMealDeliveries } from '@/lib/meals/hooks'
import { useCenters } from '@/lib/events/hooks'
import { useVehicles } from '@/lib/vehicles/hooks'
import { useDrivers } from '@/lib/driver/hooks'
import { useParticipants } from '@/lib/participant/hooks'
import { formatMonthDayYear, formatTimeOfDay } from '@/lib/date'
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
  const [mealRunSearch, setMealRunSearch] = useState('')

  const visibleRuns = useMemo(
    () => mealDeliveries.filter((m) => m.status === 'ACTIVE'),
    [mealDeliveries],
  )
  const filteredMealRuns = useMemo(() => {
      const query = mealRunSearch.trim().toLowerCase();
      if (!query) return visibleRuns;
      return visibleRuns.filter((item) =>
        item.name.toLowerCase().includes(query),
      );
  }, [visibleRuns, mealRunSearch]);
  const selected = visibleRuns.find((m) => String(m.id) === selectedId) ?? null

  const totalDeliveries = visibleRuns.reduce((s, m) => s + m.participants.length, 0)
  const vehiclesAssigned = new Set(visibleRuns.filter((m) => m.vehicleId).map((m) => m.vehicleId)).size
  const driversAssigned = new Set(visibleRuns.filter((m) => m.driverId).map((m) => m.driverId)).size
  const mapVehicles = vehicles.filter((v) => visibleRuns.some((m) => m.vehicleId === v.id))

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex items-center justify-between border-b border-border px-4 py-2">
        <p className="text-xs text-muted-foreground">{t('meal.fleetruns')}</p>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-2 gap-px border-b border-border bg-border sm:grid-cols-4">
        <Kpi icon={Truck} label={t('meal.activeruns')} value={String(visibleRuns.length)} />
        <Kpi icon={Boxes} label={t('meal.deliveries')} value={String(totalDeliveries)} tone="primary" />
        <Kpi icon={Truck} label={t('common.vehicles')} value={String(vehiclesAssigned)} />
        <Kpi icon={UserRound} label={t('common.drivers')} value={String(driversAssigned)} />
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
                const isSelected = String(m.id) === selectedId;
                return (
                  <button
                    key={m.id}
                    onClick={() => setSelectedId(isSelected ? null : String(m.id))}
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
                          {m.name}
                        </span>
                        <StatusBadge label={t(meta.label)} cls={meta.cls} />
                      </div>
                      <p className="truncate text-xs text-muted-foreground">
                        {center?.name} · {m.participants.length} {t('meal.deliveries').toLowerCase()}
                      </p>
                      <p className="mt-1 text-[11px] text-muted-foreground">
                        {formatMonthDayYear(m.fromDate)} · {formatTimeOfDay(m.departTime)}
                      </p>
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
              <LegendDot color="#2563eb" label={t('meal.activeruns')} />
              <LegendSquare label={t('board.kitchencenter')} />
            </div>
          </div>

          {selected ? (
            <MealDetail key={selected.id} runId={selected.id} onClose={() => setSelectedId(null)} />
          ) : null}
        </div>
      </div>
    </div>
  );
}

function MealDetail({ runId, onClose }: { runId: number; onClose: () => void }) {
  const { mealDeliveries } = useMealDeliveries()
  const { centers } = useCenters()
  const { vehicles } = useVehicles()
  const { drivers } = useDrivers()
  const {t} = useTranslation()
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
          <h3 className="text-sm font-semibold">{run.name}</h3>
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
        <InfoCell icon={Boxes} label={t('meal.deliveries')} value={String(run.participants.length)} />
        <InfoCell icon={MapPin} label={t('common.date')} value={formatMonthDayYear(run.fromDate)} />
      </div>

      <div className="border-b border-border px-4 py-3">
        <p className="text-xs text-muted-foreground">{t('board.driverlabel')} {driver?.name ?? t('common.unassigned')}</p>
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
              <p className="text-xs text-muted-foreground">
                {t('meal.pickupkitchen')} · {center?.address}
              </p>
            </li>
            {run.participants.map((p) => (
              <li key={p.id} className="relative">
                <span className="absolute -left-6.75 flex size-4 items-center justify-center rounded-full border-2 border-card bg-muted-foreground/40" />
                <p className="text-sm font-medium">{p.participantName}</p>
              </li>
            ))}
          </ol>
        </div>
      </ScrollArea>
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
