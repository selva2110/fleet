'use client'

import { useMemo, useState } from 'react'
import { Boxes, Clock, MapPin, Play, Plus, Truck, UtensilsCrossed } from 'lucide-react'
import { StatusBadge } from '@/components/common'
import { NewMealRunDialog } from '@/components/meals/new-meal-run-dialog'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useFleet } from '@/lib/store'
import { formatMonthDayYear } from '@/lib/date'
import { formatMiles, mealStatusMeta } from '@/lib/labels'
import { cn } from '@/lib/utils'

// Runs that are still being planned (not yet dispatched onto the road).
const PLANNING_STATUSES = ['scheduled', 'preparing', 'loaded'] as const

/** Scheduled meal-delivery runs shown as a read-oriented table. */
export function MealDeliveryTab() {
  const fleet = useFleet()
  const runs = useMemo(
    () =>
      [...fleet.mealDeliveries]
        .filter((m) => m.status !== 'cancelled')
        .sort((a, b) => (a.date + a.departTime).localeCompare(b.date + b.departTime)),
    [fleet.mealDeliveries],
  )

  if (runs.length === 0) {
    return (
      <EmptyMeals message="No meal-delivery runs scheduled yet. Plan one from the Meal Planning tab." />
    )
  }

  return (
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
            {runs.map((m) => {
              const center = fleet.centerById(m.centerId)
              const meta = mealStatusMeta[m.status]
              const delivered = m.stops.filter((s) => s.status === 'delivered').length
              return (
                <TableRow key={m.id}>
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
  )
}

/**
 * Meal-planning surface: create new runs and dispatch/cancel runs that are
 * still in the planning phase (scheduled / preparing / loaded).
 */
export function MealPlanningTab() {
  const fleet = useFleet()
  const [dialogOpen, setDialogOpen] = useState(false)

  const planning = useMemo(
    () =>
      fleet.mealDeliveries
        .filter((m) => (PLANNING_STATUSES as readonly string[]).includes(m.status))
        .sort((a, b) => (a.date + a.departTime).localeCompare(b.date + b.departTime)),
    [fleet.mealDeliveries],
  )

  return (
    <div className="flex flex-col gap-4">
      <Card className="flex flex-wrap items-center justify-between gap-3 p-4">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <UtensilsCrossed className="size-5" />
          </div>
          <div>
            <p className="text-sm font-semibold">Plan a meal-delivery run</p>
            <p className="text-xs text-muted-foreground">
              Pick a kitchen, assign a vehicle and driver, and choose the participants to deliver to.
            </p>
          </div>
        </div>
        <Button size="sm" onClick={() => setDialogOpen(true)}>
          <Plus className="size-4" /> Plan new run
        </Button>
      </Card>

      <div>
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Awaiting dispatch ({planning.length})
        </h3>
        {planning.length === 0 ? (
          <EmptyMeals message="No runs are waiting to be dispatched. Plan a new run to get started." />
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {planning.map((m) => (
              <PlanningCard key={m.id} runId={m.id} />
            ))}
          </div>
        )}
      </div>

      <NewMealRunDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </div>
  )
}

function PlanningCard({ runId }: { runId: string }) {
  const fleet = useFleet()
  const [busy, setBusy] = useState(false)
  const run = fleet.mealDeliveries.find((m) => m.id === runId)
  if (!run) return null
  const center = fleet.centerById(run.centerId)
  const vehicle = fleet.vehicleById(run.vehicleId)
  const driver = fleet.driverById(run.driverId)
  const meta = mealStatusMeta[run.status]

  return (
    <Card className="flex flex-col overflow-hidden">
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
          <MapPin className="size-3.5 shrink-0" /> {formatMiles(run.distanceKm)}
        </p>
        <p className="flex items-center gap-2">
          <Truck className="size-3.5 shrink-0" />
          {vehicle?.name ?? 'Unassigned vehicle'}
          {driver ? ` · ${driver.name}` : ' · No driver'}
        </p>
      </div>

      <div className="flex items-center gap-2 border-t border-border px-4 py-3">
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
          <Play className="size-4" /> Dispatch
        </Button>
        <Button
          variant="outline"
          size="sm"
          className={cn('text-destructive hover:text-destructive')}
          disabled={busy}
          onClick={async () => {
            setBusy(true)
            try {
              await fleet.cancelMealDelivery(run.id)
            } finally {
              setBusy(false)
            }
          }}
        >
          Cancel
        </Button>
      </div>
    </Card>
  )
}

function EmptyMeals({ message }: { message: string }) {
  return (
    <Card className="flex flex-col items-center justify-center gap-2 py-12 text-center">
      <div className="flex size-11 items-center justify-center rounded-xl bg-muted text-muted-foreground">
        <UtensilsCrossed className="size-5" />
      </div>
      <p className="max-w-sm text-sm text-muted-foreground text-pretty">{message}</p>
    </Card>
  )
}
