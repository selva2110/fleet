import { useCenters } from "@/lib/events/hooks";
import { useMealDeliveries, useMealMutations } from "@/lib/meals/hooks";
import { MealRun } from "@/lib/meals/types";
import { useTranslation } from "../context/language-provider";
import { useNotifications } from "../context/notification-provider";
import {
  compareValues,
  DataToolbar,
  EmptyState,
  LoadingState,
  useDataView,
} from "../data-view/data-view";
import { useMemo, useState } from "react";
import { findById } from "@/lib/utils";
import { Card } from "../ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "../ui/table";
import { tableHeaderRow } from "../aurora/aurora-ui";
import { MealsConfig } from "@/lib/meals/config";
import { formatMonthDayYear, formatTimeOfDay } from "@/lib/date";
import { StatusBadge } from "../common";
import { useVehicles } from "@/lib/vehicles/hooks";
import { useDrivers } from "@/lib/driver/hooks";
import { useCareItemTypes } from "@/lib/catalog/hooks";
import { Boxes, Clock, Truck, UtensilsCrossed } from "lucide-react";
import { RowActions } from "../crud/row-actions";
import { NewMealRunDialog } from "./new-meal-run-dialog";

function dateRangeLabel(fromDate: string, toDate: string) {
  return fromDate === toDate
    ? formatMonthDayYear(fromDate)
    : `${formatMonthDayYear(fromDate)} – ${formatMonthDayYear(toDate)}`;
}

export function MealRunsTab({
  detailId,
  onOpenDetail,
  typeId,
}: {
  detailId: string | null;
  onOpenDetail: (id: string) => void;
  typeId: number;
}) {
  const { mealDeliveries, isLoading } = useMealDeliveries({ typeId });
  const { centers } = useCenters();
  const { careItemTypes } = useCareItemTypes();
  const { deleteMealDelivery } = useMealMutations();
  const { t } = useTranslation();
  const { addToast } = useNotifications();
  const dv = useDataView("fromDate");
  const [editingRun, setEditingRun] = useState<MealRun | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);

  function openEdit(run: MealRun) {
    setEditingRun(run);
    setEditDialogOpen(true);
  }

  async function handleDelete(run: MealRun) {
    try {
      await deleteMealDelivery(run.id);
      addToast({
        title: t("common.success"),
        message: t("meal.deletedsuccess"),
        kind: "success",
      });
    } catch {
      addToast({
        title: t("common.savefailed"),
        message: t("meal.deletefailed"),
        kind: "danger",
      });
    }
  }

  const filtered = useMemo(() => {
    const q = dv.query.trim().toLowerCase();
    const list = mealDeliveries.filter((m) => {
      const center = findById(centers, m.centerId);
      return (
        !q ||
        m.name.toLowerCase().includes(q) ||
        (m.vehicleName?.toLowerCase().includes(q) ?? false) ||
        (m.driverName?.toLowerCase().includes(q) ?? false) ||
        (center?.name.toLowerCase().includes(q) ?? false)
      );
    });
    list.sort((a, b) =>
      compareValues(
        a[dv.sortKey as keyof MealRun],
        b[dv.sortKey as keyof MealRun],
        dv.sortDir,
      ),
    );
    return list.map((item, index) => ({
      ...item,
      idx: index + 1,
    }));
  }, [mealDeliveries, centers, dv.query, dv.sortKey, dv.sortDir]);

  return (
    <div className="flex flex-col gap-6">
      <DataToolbar
        query={dv.query}
        onQueryChange={dv.setQuery}
        searchPlaceholder={t("meal.searchplaceholder")}
        sortOptions={MealsConfig.MEAL_RUN_SORT_OPTIONS}
        sortKey={dv.sortKey}
        onSortKeyChange={dv.setSortKey}
        sortDir={dv.sortDir}
        onToggleSortDir={dv.toggleSortDir}
        view={dv.view}
        onViewChange={dv.setView}
        resultCount={filtered.length}
      />

      {isLoading ? (
        <LoadingState />
      ) : filtered.length === 0 ? (
        <EmptyState message={t("meal.none")} />
      ) : dv.view === "grid" ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((m) => (
            <MealRunCard
              key={m.id}
              run={m}
              onOpen={() => onOpenDetail(String(m.id))}
              onEdit={() => openEdit(m)}
              onDelete={() => handleDelete(m)}
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
                    t("meal.deliveries"),
                    t("common.vehicle"),
                    t("common.status"),
                    t("common.actions"),
                  ])}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((m) => {
                  const center = findById(centers, m.centerId);
                  const type = findById(careItemTypes, String(m.typeId));
                  const meta = MealsConfig.mealStatusMeta[m.status];
                  return (
                    <TableRow
                      key={m.id}
                      onClick={() => onOpenDetail(String(m.id))}
                      data-active={detailId === String(m.id)}
                      className="cursor-pointer data-[active=true]:bg-muted/60"
                    >
                      <TableCell>
                        <p className="font-medium text-center">{m.idx}</p>
                      </TableCell>
                      <TableCell>
                        <p className="text-sm font-medium">{m.name}</p>
                        {type ? (
                          <p className="text-xs text-muted-foreground">
                            {type.name}
                          </p>
                        ) : null}
                      </TableCell>
                      <TableCell className="text-sm">{center?.name}</TableCell>
                      <TableCell className="text-sm tabular-nums">
                        {dateRangeLabel(m.fromDate, m.toDate)}
                      </TableCell>
                      <TableCell className="text-sm tabular-nums text-muted-foreground">
                        {formatTimeOfDay(m.departTime)}
                      </TableCell>
                      <TableCell className="text-sm tabular-nums">
                        {m.participants.length}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {m.vehicleName ?? t("meal.unassignedvehicle")}
                      </TableCell>
                      <TableCell>
                        <StatusBadge label={t(meta.label)} cls={meta.cls} />
                      </TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <RowActions
                          onEdit={() => openEdit(m)}
                          onDelete={() => handleDelete(m)}
                          deleteTitle={t("meal.deleterun")}
                          deleteMessage={t("meal.deletecnfrm").replace(
                            "{{name}}",
                            m.name,
                          )}
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

      <NewMealRunDialog
        open={editDialogOpen}
        onOpenChange={(value) => {
          setEditDialogOpen(value);
          if (!value) setEditingRun(null);
        }}
        editingRun={editingRun}
        type={editingRun?.typeId ?? 1}
        columns={["dietPlan", "mealNotes"]}
      />
    </div>
  );
}

function MealRunCard({
  run,
  onOpen,
  onEdit,
  onDelete,
}: {
  run: MealRun;
  onOpen: () => void;
  onEdit: () => void;
  onDelete: () => void | Promise<void>;
}) {
  const { centers } = useCenters();
  const { vehicles } = useVehicles();
  const { drivers } = useDrivers();
  const { careItemTypes } = useCareItemTypes();
  const { t } = useTranslation();
  const center = findById(centers, run.centerId);
  const vehicle = run.vehicleId ? findById(vehicles, run.vehicleId) : undefined;
  const driver = run.driverId ? findById(drivers, run.driverId) : undefined;
  const type = findById(careItemTypes, String(run.typeId));
  const meta = MealsConfig.mealStatusMeta[run.status];

  return (
    <Card
      onClick={onOpen}
      className="flex cursor-pointer flex-col overflow-hidden transition-colors hover:border-primary/40"
    >
      <div className="flex items-start justify-between gap-2 border-b border-border px-4 py-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">
            {run.name}
            {type ? ` · ${type.name}` : ""}
          </p>
          <p className="text-xs text-muted-foreground">{center?.name}</p>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <StatusBadge label={t(meta.label)} cls={meta.cls} />
          <div onClick={(e) => e.stopPropagation()}>
            <RowActions
              onEdit={onEdit}
              onDelete={onDelete}
              deleteTitle={t("meal.deleterun")}
              deleteMessage={t("meal.deletecnfrm").replace(
                "{{name}}",
                run.name,
              )}
            />
          </div>
        </div>
      </div>
      <div className="flex-1 space-y-2 px-4 py-3 text-xs text-muted-foreground">
        <p className="flex items-center gap-2">
          <Clock className="size-3.5 shrink-0" />{" "}
          {dateRangeLabel(run.fromDate, run.toDate)} · {t("meal.departsWord")}{" "}
          {formatTimeOfDay(run.departTime)}
        </p>
        <p className="flex items-center gap-2">
          <Boxes className="size-3.5 shrink-0" /> {run.participants.length}{" "}
          {t("meal.deliveries").toLowerCase()}
        </p>
        <p className="flex items-center gap-2">
          <Truck className="size-3.5 shrink-0" />
          {vehicle?.name ?? run.vehicleName ?? t("meal.unassignedvehicle")}
          {driver
            ? ` · ${driver.name}`
            : run.driverName
              ? ` · ${run.driverName}`
              : ` · ${t("meal.nodriver")}`}
        </p>
      </div>
      <div className="flex items-center gap-1.5 border-t border-border px-4 py-2 text-[11px] text-muted-foreground">
        <UtensilsCrossed className="size-3.5" /> {t("meal.run")} #{run.id}
      </div>
    </Card>
  );
}
