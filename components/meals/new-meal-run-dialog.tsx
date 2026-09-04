"use client";

import { useEffect, useMemo, useState } from "react";
import dayjs from "dayjs";
import { Pencil, Search, Trash2, UtensilsCrossed, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { SelectField, TextField } from "@/components/crud/form-fields";
import {
  EmptyState,
  compareValues,
  useDataView,
} from "@/components/data-view/data-view";
import { useCenters } from "@/lib/events/hooks";
import { useMealMutations } from "@/lib/meals/hooks";
import { useVehicles } from "@/lib/vehicles/hooks";
import { useDrivers } from "@/lib/driver/hooks";
import { useParticipantReports } from "@/lib/participant/hooks";
import { validateSchema } from "../validation/zod-validation";
import { createMealRunSchema } from "../validation/meal-run";
import { ParticipantMedMealReportItem } from "@/lib/participant/types";
import { useTranslation } from "../context/language-provider";
import { useNotifications } from "../context/notification-provider";
import { MealRun, MealRunForm } from "@/lib/meals/types";
import { MealsUtils } from "@/lib/meals/utils";
import { useCareItemTypes } from "@/lib/catalog/hooks";
import { createFieldSetter } from "../common";
import { findById } from "@/lib/utils";
import { todayLocalDate } from "@/lib/date";
import { CatalogConfig } from "@/lib/catalog/config";
import { CatalogParticipantColumnKey } from "@/lib/catalog/types";
import { EditParticipantReportDialog } from "../catalog/edit-participant-report-dialog";

type DateRangePreset = "today" | "weekly" | "monthly";

const DATE_RANGE_PRESETS: { value: DateRangePreset; label: string }[] = [
  { value: "today", label: "Today" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
];

export function NewMealRunDialog({
  open,
  onOpenChange,
  initialParticipantIds,
  type = 1,
  columns = CatalogConfig.DEFAULT_COLUMNS,
  editingRun = null,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  initialParticipantIds?: string[];
  type?: number;
  columns?: CatalogParticipantColumnKey[];
  editingRun?: MealRun | null;
}) {
  const visibleColumns = useMemo(() => new Set(columns), [columns]);
  const showColumn = (key: CatalogParticipantColumnKey) =>
    visibleColumns.has(key);
  const { centers } = useCenters();
  const { vehicles } = useVehicles();
  const { careItemTypes } = useCareItemTypes();
  const { drivers } = useDrivers();
  const { reports } = useParticipantReports();
  const { createMealDelivery, updateMealDelivery, deleteMealDelivery } =
    useMealMutations();
  const { t } = useTranslation();
  const { addToast } = useNotifications();
  const MealRunSchema = useMemo(() => createMealRunSchema(t), [t]);
  const [form, setForm] = useState<MealRunForm>(() =>
    MealsUtils.blankMealRun(centers[0]?.id ?? "", type),
  );
  const pdv = useDataView("name", "list");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [editingReport, setEditingReport] =
    useState<ParticipantMedMealReportItem | null>(null);
  const [reportDialogOpen, setReportDialogOpen] = useState(false);
  const set = createFieldSetter(setForm, setErrors);
  const mealTypes = careItemTypes.map((item) => {
    return {
      label: item.name,
      value: String(item.id),
    };
  });
  useEffect(() => {
    if (!open) return;
    if (editingRun) {
      setForm({
        id: editingRun.id,
        name: editingRun.name,
        centerId: editingRun.centerId,
        vehicleId: editingRun.vehicleId,
        driverId: editingRun.driverId,
        typeId: editingRun.typeId,
        fromdate: editingRun.fromDate,
        todate: editingRun.toDate,
        departTime: editingRun.departTime,
        participantIds: editingRun.participants.map((p) => p.participantId),
      });
      return;
    }
    if (initialParticipantIds?.length) {
      setForm((f) => ({
        ...f,
        participantIds: Array.from(
          new Set([...f.participantIds, ...initialParticipantIds]),
        ),
      }));
    }
  }, [open, editingRun]);

  const centerOptions = [
    { value: "", label: "meal.selectkitchen" },
    ...centers.map((c) => ({ value: c.id, label: c.name })),
  ];
  const vehicleOptions = [
    { value: "", label: "Auto-Assigned Vehicle" },
    ...vehicles.map((v) => ({
      value: v.id,
      label: `${v.name} · ${v.type}`,
    })),
  ];
  const driverOptions = [
    { value: "", label: "Auto-Assigned Driver" },
    ...drivers.map((d) => ({ value: d.id, label: d.name })),
  ];

  const filteredParticipants = useMemo(() => {
    const q = pdv.query.trim().toLowerCase();
    const list = reports.filter(
      (p) =>
        !q ||
        p.name.toLowerCase().includes(q) ||
        (p.address?.toLowerCase().includes(q) ?? false) ||
        (p.phone?.toLowerCase().includes(q) ?? false),
    );
    list.sort((a, b) =>
      compareValues(
        a[pdv.sortKey as keyof ParticipantMedMealReportItem],
        b[pdv.sortKey as keyof ParticipantMedMealReportItem],
        pdv.sortDir,
      ),
    );
    return list;
  }, [reports, pdv.query, pdv.sortKey, pdv.sortDir]);

  const selected = useMemo(
    () =>
      form.participantIds
        .map((id) => reports.find((r) => r.participantId === id))
        .filter((p): p is ParticipantMedMealReportItem => Boolean(p)),
    [form.participantIds, reports],
  );

  function toggle(id: string) {
    setForm((f) => ({
      ...f,
      participantIds: f.participantIds.includes(id)
        ? f.participantIds.filter((x) => x !== id)
        : [...f.participantIds, id],
    }));
  }

  function reset() {
    setForm(MealsUtils.blankMealRun(centers[0]?.id ?? "", type));
    pdv.setQuery("");
  }

  function applyDateRangePreset(preset: DateRangePreset) {
    const from = todayLocalDate();
    const to =
      preset === "today"
        ? from
        : preset === "weekly"
          ? dayjs(from).add(7, "day").format("YYYY-MM-DD")
          : dayjs(from).add(1, "month").format("YYYY-MM-DD");
    setForm((f) => ({ ...f, fromdate: from, todate: to }));
    setErrors((e) => ({ ...e, fromdate: "", todate: "" }));
  }

  function validate() {
    const isValid = validateSchema(MealRunSchema, form, setErrors);
    if (!isValid) {
      addToast({
        title: t("common.validationfailed"),
        message: t("common.fixhighlightedfields"),
        kind: "danger",
      });
    }
    return isValid;
  }

  async function submit() {
    if (!validate()) return;
    setSaving(true);
    try {
      if (editingRun) {
        await updateMealDelivery(form);
        addToast({
          title: t("common.success"),
          message: t("meal.updatedsuccess"),
          kind: "success",
        });
      } else {
        await createMealDelivery(form);
        addToast({
          title: t("common.success"),
          message: t("meal.createdsuccess"),
          kind: "success",
        });
      }
      reset();
      onOpenChange(false);
    } catch {
      addToast({
        title: t("common.savefailed"),
        message: t("common.savefailedmessage"),
        kind: "danger",
      });
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!editingRun) return;
    setDeleting(true);
    try {
      await deleteMealDelivery(editingRun.id);
      addToast({
        title: t("common.success"),
        message: t("meal.deletedsuccess"),
        kind: "success",
      });
      reset();
      onOpenChange(false);
    } catch {
      addToast({
        title: t("common.savefailed"),
        message: t("meal.deletefailed"),
        kind: "danger",
      });
    } finally {
      setDeleting(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(value) => {
        onOpenChange(value);
        reset();
      }}
    >
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UtensilsCrossed className="size-4 text-primary" />{" "}
            {editingRun ? t("meal.editrun") : t("meal.newrun")}
          </DialogTitle>
          <DialogDescription>
            {editingRun ? t("meal.editrundesc") : t("meal.newrundesc")}
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[60vh] px-1 w-full overflow-hidden">
          <div className="grid gap-4 sm:grid-cols-2 pr-4 px-2">
            <TextField
              label={t("meal.runname")}
              value={form.name}
              onChange={(value) => set("name", value)}
              error={errors.name}
            />
            <SelectField
              label={t("meal.pickupkitchencenter")}
              value={form.centerId}
              options={centerOptions}
              onChange={(value) => set("centerId", value)}
              error={errors.centerId}
            />
            <SelectField
              label={"Type"}
              value={String(form.typeId)}
              options={mealTypes}
              onChange={() => {}}
              error={errors.mealType}
              disabled
            />

            <div className="flex items-center gap-2 sm:col-span-2">
              {DATE_RANGE_PRESETS.map((preset) => (
                <Button
                  key={preset.value}
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => applyDateRangePreset(preset.value)}
                >
                  {preset.label}
                </Button>
              ))}
            </div>
            <TextField
              label="From Date"
              type="date"
              value={form.fromdate}
              onChange={(value) => set("fromdate", value)}
              error={errors.fromdate}
            />
            <TextField
              label="To Date"
              type="date"
              value={form.todate}
              onChange={(value) => set("todate", value)}
              error={errors.todate}
            />
            <TextField
              label={t("meal.departuretime")}
              type="time"
              value={form.departTime}
              onChange={(value) => set("departTime", value)}
              error={errors.departTime}
            />
            <SelectField
              label={t("common.vehicle")}
              value={form.vehicleId ?? ""}
              options={vehicleOptions}
              onChange={(value) => set("vehicleId", value)}
              error={errors.vehicleId}
            />
            <SelectField
              label={t("common.driver")}
              value={form.driverId ?? ""}
              options={driverOptions}
              onChange={(value) => set("driverId", value)}
              error={errors.driverId}
            />
          </div>
          {errors.participantIds ? (
            <p className="mt-2 text-sm text-destructive pr-4">
              {errors.participantIds}
            </p>
          ) : null}
          <div className="rounded-lg border border-border mt-3 pr-4">
            <div className="flex items-center justify-between border-b border-border px-3 py-2">
              <span className="text-xs font-medium text-muted-foreground">
                {t("meal.deliverystops")} ({selected.length})
              </span>
            </div>
            <div className="p-3">
              {selected.length > 0 ? (
                <div className="mb-3 flex flex-wrap gap-1.5">
                  {selected.map((p) => (
                    <span
                      key={p.participantId}
                      className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary"
                    >
                      {p.name}
                      <button
                        type="button"
                        onClick={() => toggle(p.participantId)}
                        aria-label={t("e.removeparticipant").replace(
                          "{{name}}",
                          p.name,
                        )}
                      >
                        <X className="size-3" />
                      </button>
                    </span>
                  ))}
                </div>
              ) : null}

              <div className="relative">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={pdv.query}
                  onChange={(e) => pdv.setQuery(e.target.value)}
                  placeholder={t("e.searchparticipants")}
                  className="pl-8"
                />
              </div>

              <div className="mt-3 max-h-72 overflow-y-auto rounded-md border border-border">
                {filteredParticipants.length === 0 ? (
                  <EmptyState message={t("part.none")} />
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-10" />
                        <TableHead>{t("common.participant")}</TableHead>
                        {showColumn("mealNotes") && showColumn("dietPlan") && (
                          <>
                            <TableHead>{t("part.dietplan")}</TableHead>
                            <TableHead>{t("part.mealnotes")}</TableHead>
                          </>
                        )}
                        {showColumn("medicalNotes") && (
                          <>
                            <TableHead>{t("part.medicalNotes")}</TableHead>
                          </>
                        )}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredParticipants.map((p) => {
                        const on = form.participantIds.includes(
                          p.participantId,
                        );
                        return (
                          <TableRow
                            key={p.participantId}
                            onClick={() => toggle(p.participantId)}
                            data-on={on}
                            className="cursor-pointer data-[on=true]:bg-accent/50"
                          >
                            <TableCell onClick={(e) => e.stopPropagation()}>
                              <Checkbox
                                checked={on}
                                onCheckedChange={() => toggle(p.participantId)}
                                aria-label={p.name}
                              />
                            </TableCell>
                            <TableCell>
                              <p className="text-sm font-medium">{p.name}</p>
                              <p className="text-xs text-muted-foreground">
                                {p.address}
                              </p>
                            </TableCell>
                            {showColumn("mealNotes") &&
                              showColumn("dietPlan") && (
                                <>
                                  <TableCell className="text-sm text-muted-foreground">
                                    {p.dietPlan || "—"}
                                  </TableCell>
                                  <TableCell className="text-sm text-muted-foreground">
                                    {p.mealNotes || "—"}
                                  </TableCell>
                                </>
                              )}
                            {showColumn("medicalNotes") && (
                              <TableCell className="text-sm text-muted-foreground">
                                {p.medicalNotes || "—"}
                              </TableCell>
                            )}
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                )}
              </div>
            </div>
          </div>
        </ScrollArea>

        <DialogFooter>
          {editingRun ? (
            <Button
              variant="destructive"
              className="mr-auto"
              onClick={handleDelete}
              disabled={saving || deleting}
            >
              <Trash2 className="size-4" />
              {deleting ? t("common.deleting") : t("meal.deleterun")}
            </Button>
          ) : null}
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("common.cancel")}
          </Button>
          <Button onClick={submit} disabled={saving || deleting}>
            {editingRun
              ? saving
                ? t("common.saving")
                : t("common.savchanges")
              : saving
                ? t("meal.creating")
                : `${t("meal.createrun")} (${form.participantIds.length})`}
          </Button>
        </DialogFooter>
      </DialogContent>

      <EditParticipantReportDialog
        open={reportDialogOpen}
        onOpenChange={(v) => {
          setReportDialogOpen(v);
          if (!v) setEditingReport(null);
        }}
        report={editingReport}
        columns={columns}
      />
    </Dialog>
  );
}
