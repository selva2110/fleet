"use client";

import { useMemo, useState } from "react";
import {
  Boxes,
  Clock,
  MapPin,
  Play,
  Plus,
  Route,
  Truck,
  UserRound,
  UtensilsCrossed,
} from "lucide-react";
import { PageHeader, StatusBadge } from "@/components/common";
import { NewMealRunDialog } from "@/components/meals/new-meal-run-dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  CheckboxGroupFilter,
  DataToolbar,
  EmptyState,
  FilterRail,
  FilterSection,
  ListLayout,
  compareValues,
  useDataView,
} from "@/components/data-view/data-view";
import { useMealDeliveries, useMealMutations } from "@/lib/meals/hooks";
import { useCenters } from "@/lib/events/hooks";
import { useVehicles } from "@/lib/vehicles/hooks";
import { useDrivers } from "@/lib/driver/hooks";
import { useParticipants } from "@/lib/participant/hooks";
import { formatMonthDayYear, formatTimeOfDay } from "@/lib/date";
import { formatMiles } from "@/lib/labels";
import { cn, findById } from "@/lib/utils";
import { tableHeaderRow } from "../../../components/aurora/aurora-ui";
import { EventsConfig } from "@/lib/events/config";
import { useTranslation } from "../../../components/context/language-provider";
import { MealDelivery } from "@/lib/meals/types";
import { MealsConfig } from "@/lib/meals/config";

/**
 * Consolidated meal-delivery surface for the Events page. Lists scheduled and
 * in-progress runs with search/filter, opens a detail dialog on row click, and
 * hosts the "plan new run" dialog (opened from the page header).
 */
export default function MealDeliveryPage() {
  const { mealDeliveries } = useMealDeliveries();
  const { centers } = useCenters();
  const { t } = useTranslation();
  const dv = useDataView("date");
  const [statuses, setStatuses] = useState<string[]>([]);
  const [mealDialogOpen, setMealDialogOpen] = useState(false);

  const [types, setTypes] = useState<string[]>([]);
  const [detailId, setDetailId] = useState<string | null>(null);

  const activeFilterCount = (statuses.length ? 1 : 0) + (types.length ? 1 : 0);

  function resetFilters() {
    setStatuses([]);
    setTypes([]);
  }

  const filtered = useMemo(() => {
    const q = dv.query.trim().toLowerCase();
    const list = mealDeliveries.filter((m) => {
      const center = findById(centers, m.centerId);
      const matchQuery =
        !q ||
        m.runNumber.toLowerCase().includes(q) ||
        m.mealType.toLowerCase().includes(q) ||
        (center?.name.toLowerCase().includes(q) ?? false);
      const matchStatus = statuses.length === 0 || statuses.includes(m.status);
      const matchType = types.length === 0 || types.includes(m.mealType);
      return matchQuery && matchStatus && matchType;
    });
    list.sort((a, b) =>
      compareValues(
        a[dv.sortKey as keyof MealDelivery],
        b[dv.sortKey as keyof MealDelivery],
        dv.sortDir,
      ),
    );
    return list.map((item, index) => ({
      ...item,
      idx: index + 1,
    }));
  }, [
    mealDeliveries,
    centers,
    dv.query,
    dv.sortKey,
    dv.sortDir,
    statuses,
    types,
  ]);

  const detail = detailId
    ? (mealDeliveries.find((m) => m.id === detailId) ?? null)
    : null;

  return (
    <div className="flex min-h-full flex-col">
      <PageHeader
        title={t(EventsConfig.EVENT_HEADER["meal-delivery"]?.title)}
        description={t(EventsConfig.EVENT_HEADER["meal-delivery"]?.description)}
        actions={
          <Button onClick={() => setMealDialogOpen(true)} size="lg">
            <Plus className="size-4" /> {t("e.plannewrun")}
          </Button>
        }
      />
      <div className="p-6">
        <ListLayout
          filters={
            <FilterRail activeCount={activeFilterCount} onReset={resetFilters}>
              <FilterSection title={t("common.status")}>
                <CheckboxGroupFilter
                  options={MealsConfig.MEAL_STATUS_OPTIONS}
                  selected={statuses}
                  onChange={setStatuses}
                />
              </FilterSection>
              <FilterSection title={t("meal.type")}>
                <CheckboxGroupFilter
                  options={MealsConfig.MEAL_TYPES}
                  selected={types}
                  onChange={setTypes}
                />
              </FilterSection>
            </FilterRail>
          }
        >
          <div className="flex flex-col gap-6">
            <DataToolbar
              query={dv.query}
              onQueryChange={dv.setQuery}
              searchPlaceholder={t("meal.searchplaceholder")}
              sortOptions={EventsConfig.MEAL_SORT_OPTIONS}
              sortKey={dv.sortKey}
              onSortKeyChange={dv.setSortKey}
              sortDir={dv.sortDir}
              onToggleSortDir={dv.toggleSortDir}
              view={dv.view}
              onViewChange={dv.setView}
              resultCount={filtered.length}
            />

            {filtered.length === 0 ? (
              <EmptyState message={t("meal.none")} />
            ) : dv.view === "grid" ? (
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {filtered.map((m) => (
                  <MealRunCard
                    key={m.id}
                    run={m}
                    onOpen={() => setDetailId(m.id)}
                  />
                ))}
              </div>
            ) : (
              <Card className="overflow-hidden py-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        {tableHeaderRow([
                          t("common.sno"),
                          t("meal.run"),
                          t("meal.kitchencenter"),
                          t("common.date"),
                          t("meal.departs"),
                          t("meal.meals"),
                          t("meal.deliveries"),
                          t("common.status"),
                        ])}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filtered.map((m) => {
                        const center = findById(centers, m.centerId);
                        const meta = MealsConfig.mealStatusMeta[m.status];
                        const delivered = m.stops.filter(
                          (s) => s.status === "delivered",
                        ).length;
                        return (
                          <TableRow
                            key={m.id}
                            onClick={() => setDetailId(m.id)}
                            data-active={detailId === m.id}
                            className="cursor-pointer data-[active=true]:bg-muted/60"
                          >
                            <TableCell>
                              <p className="font-medium text-center">{m.idx}</p>
                            </TableCell>
                            <TableCell>
                              <p className="text-sm font-medium">
                                {m.runNumber}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {m.mealType}
                              </p>
                            </TableCell>
                            <TableCell className="text-sm">
                              {center?.name}
                            </TableCell>
                            <TableCell className="text-sm tabular-nums">
                              {formatMonthDayYear(m.date)}
                            </TableCell>
                            <TableCell className="text-sm tabular-nums text-muted-foreground">
                              {formatTimeOfDay(m.departTime)}
                            </TableCell>
                            <TableCell className="text-sm tabular-nums">
                              {m.totalMeals}
                            </TableCell>
                            <TableCell className="w-40">
                              <div className="flex items-center gap-2">
                                <Progress
                                  value={
                                    m.stops.length
                                      ? (delivered / m.stops.length) * 100
                                      : 0
                                  }
                                  className="h-1.5 flex-1"
                                />
                                <span className="text-[11px] tabular-nums text-muted-foreground">
                                  {delivered}/{m.stops.length}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <StatusBadge
                                label={t(meta.label)}
                                cls={meta.cls}
                              />
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

      <MealRunDetailDialog run={detail} onClose={() => setDetailId(null)} />

      <NewMealRunDialog
        open={mealDialogOpen}
        onOpenChange={setMealDialogOpen}
      />
    </div>
  );
}

function MealRunCard({
  run,
  onOpen,
}: {
  run: MealDelivery;
  onOpen: () => void;
}) {
  const { centers } = useCenters();
  const { vehicles } = useVehicles();
  const { drivers } = useDrivers();
  const { t } = useTranslation();
  const center = findById(centers, run.centerId);
  const vehicle = findById(vehicles, run.vehicleId);
  const driver = findById(drivers, run.driverId);
  const meta = MealsConfig.mealStatusMeta[run.status];
  const delivered = run.stops.filter((s) => s.status === "delivered").length;

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
        <StatusBadge label={t(meta.label)} cls={meta.cls} />
      </div>
      <div className="flex-1 space-y-2 px-4 py-3 text-xs text-muted-foreground">
        <p className="flex items-center gap-2">
          <Clock className="size-3.5 shrink-0" /> {formatMonthDayYear(run.date)}{" "}
          · {t("meal.departsWord")} {formatTimeOfDay(run.departTime)}
        </p>
        <p className="flex items-center gap-2">
          <Boxes className="size-3.5 shrink-0" /> {run.totalMeals} {t("meal.mealsWord")} ·{" "}
          {run.stops.length} {t("meal.stopsWord")}
        </p>
        <p className="flex items-center gap-2">
          <Truck className="size-3.5 shrink-0" />
          {vehicle?.name ?? t("meal.unassignedvehicle")}
          {driver ? ` · ${driver.name}` : ` · ${t("meal.nodriver")}`}
        </p>
      </div>
      <div className="border-t border-border px-4 py-3">
        <div className="mb-1 flex items-center justify-between text-[11px]">
          <span className="font-medium text-foreground">
            {t("common.delivered")}
          </span>
          <span className="tabular-nums text-muted-foreground">
            {delivered}/{run.stops.length}
          </span>
        </div>
        <Progress
          value={run.stops.length ? (delivered / run.stops.length) * 100 : 0}
          className="h-1.5"
        />
      </div>
    </Card>
  );
}

function MealRunDetailDialog({
  run,
  onClose,
}: {
  run: MealDelivery | null;
  onClose: () => void;
}) {
  const { centers } = useCenters();
  const { vehicles } = useVehicles();
  const { drivers } = useDrivers();
  const { participants } = useParticipants();
  const { startMealDelivery } = useMealMutations();
  const { t } = useTranslation();
  const [busy, setBusy] = useState(false);

  const center = run ? findById(centers, run.centerId) : undefined;
  const vehicle = run ? findById(vehicles, run.vehicleId) : undefined;
  const driver = run ? findById(drivers, run.driverId) : undefined;
  const meta = run ? MealsConfig.mealStatusMeta[run.status] : null;
  const canDispatch = run
    ? EventsConfig.PLANNING_STATUSES.includes(run.status)
    : false;

  return (
    <Dialog open={run !== null} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-lg">
        {run && meta ? (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <UtensilsCrossed className="size-4 text-primary" />
                {run.runNumber} · {run.mealType}
                <StatusBadge label={t(meta.label)} cls={meta.cls} />
              </DialogTitle>
              <DialogDescription>
                {center?.name} · {formatMonthDayYear(run.date)} · {t("meal.departsWord")}{" "}
                {formatTimeOfDay(run.departTime)}
              </DialogDescription>
            </DialogHeader>

            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <DetailStat
                icon={Truck}
                label={t("common.vehicle")}
                value={vehicle?.name ?? t("common.unassigned")}
              />
              <DetailStat
                icon={UserRound}
                label={t("common.driver")}
                value={driver?.name ?? t("common.unassigned")}
              />
              <DetailStat
                icon={Boxes}
                label={t("meal.meals")}
                value={String(run.totalMeals)}
              />
              <DetailStat
                icon={MapPin}
                label={t("meal.distance")}
                value={formatMiles(run.distanceKm)}
              />
            </div>

            <div>
              <div className="mb-1.5 flex items-center justify-between text-xs">
                <span className="font-medium text-foreground">
                  {t("meal.runprogress")}
                </span>
                <span className="tabular-nums text-muted-foreground">
                  {Math.round(run.progress * 100)}%
                </span>
              </div>
              <Progress value={run.progress * 100} className="h-1.5" />
            </div>

            <div className="max-h-96 overflow-y-auto pl-2">
              <p className="mb-3 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                <Route className="size-3.5" /> {t("meal.deliveryroute")}
              </p>
              <ol className="relative space-y-4 border-l border-dashed border-border pl-5">
                <li className="relative">
                  <span className="absolute -left-6.75 flex size-4 items-center justify-center rounded-full border-2 border-background bg-foreground">
                    <UtensilsCrossed className="size-2.5 text-background" />
                  </span>
                  <p className="text-sm font-medium">{center?.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {t("meal.pickupkitchen")} · {center?.address}
                  </p>
                </li>
                {run.stops.map((stop) => {
                  const p = findById(participants, stop.participantId);
                  const done = stop.status === "delivered";
                  const approaching = stop.status === "approaching";
                  return (
                    <li key={stop.participantId} className="relative">
                      <span
                        className={cn(
                          "absolute -left-6.75 flex size-4 items-center justify-center rounded-full border-2 border-background",
                          done
                            ? "bg-success"
                            : approaching
                              ? "bg-warning"
                              : "bg-muted-foreground/40",
                        )}
                      />
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-medium">{p?.name}</p>
                        <span className="text-[11px] tabular-nums text-muted-foreground">
                          {stop.mealCount} {stop.mealCount === 1 ? t("board.mealword") : t("meal.mealsWord")}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {p?.address}
                      </p>
                      {done ? (
                        <span className="mt-1 inline-flex rounded-full bg-success/20 px-1.5 py-0 text-[10px] text-success">
                          {t("common.delivered")}
                        </span>
                      ) : approaching ? (
                        <span className="mt-1 inline-flex rounded-full bg-warning/20 px-1.5 py-0 text-[10px] text-warning-foreground">
                          {t("meal.approaching")}
                        </span>
                      ) : null}
                    </li>
                  );
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
                    setBusy(true);
                    try {
                      await startMealDelivery(run.id);
                    } finally {
                      setBusy(false);
                    }
                  }}
                >
                  <Play className="size-4" /> {t("meal.dispatchstart")}
                </Button>
              ) : null}
            </div>
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function DetailStat({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-lg border border-border bg-muted/30 px-3 py-2">
      <div className="flex items-center gap-1.5 text-muted-foreground">
        <Icon className="size-3.5" />
        <span className="text-[10px]">{label}</span>
      </div>
      <p className="mt-0.5 truncate text-sm font-medium text-foreground">
        {value}
      </p>
    </div>
  );
}
