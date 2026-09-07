"use client";

import { useEffect, useMemo, useState } from "react";
import dayjs from "dayjs";
import {
  Loader2,
  Pencil,
  Plus,
  Search,
  Trash2,
  UtensilsCrossed,
} from "lucide-react";
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
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Field, SelectField, TextField } from "@/components/crud/form-fields";
import {
  EmptyState,
  LoadingState,
  useDataView,
} from "@/components/data-view/data-view";
import { useCenters } from "@/lib/events/hooks";
import { useMealMutations } from "@/lib/meals/hooks";
import { useVehicles } from "@/lib/vehicles/hooks";
import { useDrivers } from "@/lib/driver/hooks";
import { useParticipants } from "@/lib/participant/hooks";
import { validateSchema } from "../validation/zod-validation";
import { createMealRunSchema } from "../validation/meal-run";
import { useTranslation } from "../context/language-provider";
import { useNotifications } from "../context/notification-provider";
import { DateRangePreset, MealRun, MealRunForm } from "@/lib/meals/types";
import { MealsUtils } from "@/lib/meals/utils";
import { ConfirmDialog, createFieldSetter } from "../common";
import { todayLocalDate } from "@/lib/date";
import { EditParticipantReportDialog } from "../catalog/edit-participant-report-dialog";
import {
  DIET_KEY_VALUE,
  GroupForm,
  MEAL_KEY_VALUE,
  ParticipantMealForm,
} from "@/lib/catalog/groups";
import {
  useCatalogGroups,
  useParticipantGroupMutations,
  // useParticipantsNotInGroups,
} from "@/lib/catalog/groups-hooks";
import { GroupFormDialog } from "../catalog/group-form-dialog";
import { MealsConfig } from "@/lib/meals/config";

export function NewMealRunDialog({
  open,
  onOpenChange,
  initialParticipantIds,
  type = 1,
  editingRun = null,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  initialParticipantIds?: string[];
  type?: number;
  editingRun?: MealRun | null;
}) {
  const { centers } = useCenters();
  const [form, setForm] = useState<MealRunForm>(() =>
    MealsUtils.blankMealRun(centers[0]?.id ?? "", type),
  );
  const pdv = useDataView("name", "list");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteRunConfirmOpen, setDeleteRunConfirmOpen] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [editingReport, setEditingReport] = useState<{
    participantId: string;
    name: string;
  } | null>(null);

  const { vehicles } = useVehicles({ enabled: open });
  // const { participants, isLoading } = useParticipantsNotInGroups({
  //   groupIds: form.groupIds,
  //   enabled: open,
  // });
  const { participants: allParticipants, isLoading } = useParticipants({
    enabled: open,
  });
  const { drivers } = useDrivers({ enabled: open });
  const { saveGroups, deleteGroup: deleteGroupMutation } =
    useParticipantGroupMutations();
  const { createMealDelivery, updateMealDelivery, deleteMealDelivery } =
    useMealMutations();
  const { catalogGroups, isLoading: groupsLoading } = useCatalogGroups({
    typeId: type,
    enabled: open,
  });
  const participants = useMemo(() => {
    const selectedGroupMemberIds = new Set(
      catalogGroups
        .filter((g) => form.groupIds.includes(g.id))
        .flatMap((g) => g.memberIds),
    );
    return allParticipants
      .filter((p) => !selectedGroupMemberIds.has(p.id))
      .map((p) => ({ participantId: p.id, name: p.name }));
  }, [allParticipants, catalogGroups, form.groupIds]);
  const { t } = useTranslation();
  const { addToast } = useNotifications();
  const MealRunSchema = useMemo(() => createMealRunSchema(t), [t]);
  const [reportDialogOpen, setReportDialogOpen] = useState(false);
  const set = createFieldSetter(setForm, setErrors);

  const [groupFormOpen, setGroupFormOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<GroupForm | null>(null);
  const [deleteGroupTarget, setDeleteGroupTarget] = useState<GroupForm | null>(
    null,
  );
  const [groupQuery, setGroupQuery] = useState("");
  const [forms, setForms] = useState<ParticipantMealForm[]>([]);

  const filteredParticipants = useMemo(() => {
    const query = pdv.query.trim().toLowerCase();
    if (!query) return participants;
    return participants.filter((p) => p.name.toLowerCase().includes(query));
  }, [participants, pdv.query]);
  const filteredGroups = useMemo(() => {
    const query = groupQuery.trim().toLowerCase();
    if (!query) return catalogGroups;
    return catalogGroups.filter((g) => g.name.toLowerCase().includes(query));
  }, [catalogGroups, groupQuery]);

  useEffect(() => {
    if (!open) return;

    if (editingRun) {
      const individualParticipants = editingRun.participants
        .filter((p) => p.sourceType !== "GROUP")
        .map((p) => ({
          participantId: p.participantId,
          mealOption: p.mealOption,
          dietPlan: p.dietPlan,
          mealNotes: p.mealNotes,
          medicalNotes: p.medicalNotes,
        }));
      const groupIds = Array.from(
        new Set(
          editingRun.participants
            .filter((p) => p.sourceType === "GROUP" && p.groupId)
            .map((p) => p.groupId as string),
        ),
      );

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
        groupIds,
        participants: individualParticipants,
      });
      setForms(individualParticipants);

      return;
    }

    if (initialParticipantIds?.length) {
      setForm((f) => ({
        ...f,

        participants: [
          ...f.participants,
          ...initialParticipantIds.map((participantId) => ({
            participantId,
            mealOption: "",
            dietPlan: "",
            mealNotes: "",
            medicalNotes: "",
          })),
        ],
      }));
    }
  }, [open, editingRun, initialParticipantIds]);

  useEffect(() => {
    if (!open || isLoading) return;
    const validIds = new Set(participants.map((p) => p.participantId));
    setForms((current) => current.filter((f) => validIds.has(f.participantId)));
  }, [open, isLoading, participants]);

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

  function toggle(id: string, p: { participantId: string; name: string }) {
    const exists = forms.some((x) => x.participantId === id);

    if (exists) setForms((f) => f.filter((x) => x.participantId !== id));
    else {
      setEditingReport(p);
      setReportDialogOpen(true);
    }
  }

  function toggleGroup(groupId: string, checked: boolean) {
    setForm((f) => ({
      ...f,
      groupIds: checked
        ? [...f.groupIds.filter((id) => id !== groupId), groupId]
        : f.groupIds.filter((id) => id !== groupId),
    }));
  }

  function openCreateGroupForm() {
    setEditingGroup(null);
    setGroupFormOpen(true);
  }

  function openEditGroupForm(group: GroupForm) {
    setEditingGroup(group);
    setGroupFormOpen(true);
  }

  async function saveGroup(input: GroupForm) {
    try {
      await saveGroups(input);
      addToast({
        title: t("common.success"),
        message: t("part.groupsaved"),
        kind: "success",
      });
      setGroupFormOpen(false);
      setEditingGroup(null);
    } catch {
      addToast({
        title: t("common.savefailed"),
        message: t("common.savefailedmessage"),
        kind: "danger",
      });
    }
  }

  async function confirmDeleteGroup() {
    if (!deleteGroupTarget) return;
    try {
      await deleteGroupMutation(deleteGroupTarget.id);
      addToast({
        title: t("common.success"),
        message: t("part.groupdeleted"),
        kind: "success",
      });
      setDeleteGroupTarget(null);
    } catch {
      addToast({
        title: t("common.savefailed"),
        message: t("common.savefailedmessage"),
        kind: "danger",
      });
    }
  }

  function reset() {
    setForm(MealsUtils.blankMealRun(centers[0]?.id ?? "", type));
    setForms([]);
    pdv.setQuery("");
    setGroupQuery("");
    setGroupFormOpen(false);
    setEditingGroup(null);
    setDeleteGroupTarget(null);
    setDeleteRunConfirmOpen(false);
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

  function validate(data: MealRunForm) {
    const isValid = validateSchema(MealRunSchema, data, setErrors);
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
    const updatedForm = { ...form, participants: forms };
    if (!validate(updatedForm)) return;
    setSaving(true);
    try {
      if (editingRun) {
        await updateMealDelivery(updatedForm);
        addToast({
          title: t("common.success"),
          message: t("meal.updatedsuccess"),
          kind: "success",
        });
      } else {
        await createMealDelivery(updatedForm);
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
      setDeleteRunConfirmOpen(false);
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
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UtensilsCrossed className="size-4 text-primary" />{" "}
            {type === 1
              ? editingRun
                ? t("meal.editrun")
                : t("meal.newrun")
              : editingRun
                ? t("Edit Medical Delivery")
                : t("New Medical Delivery")}
          </DialogTitle>
          <DialogDescription>
            {type === 1
              ? editingRun
                ? t("meal.editrundesc")
                : t("meal.newrundesc")
              : editingRun
                ? t(
                    "Update the schedule, assignment, or participants for this medical delivery.",
                  )
                : t("Schedule a new medical delivery run.")}
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[60vh] overflow-hidden">
          <div className="grid gap-4 sm:grid-cols-2">
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

            <Field label={"Groups"} className="sm:col-span-2">
              <div className="flex flex-col gap-2 rounded-lg border border-border p-2">
                <div className="flex items-center justify-between px-1">
                  <p className="text-xs font-medium text-muted-foreground">
                    Manage Groups
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={openCreateGroupForm}
                  >
                    <Plus className="size-3.5" /> {t("Add Groups")}
                  </Button>
                </div>
                {catalogGroups.length > 0 ? (
                  <div className="relative px-1">
                    <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      value={groupQuery}
                      onChange={(e) => setGroupQuery(e.target.value)}
                      placeholder={t("meal.searchgroups")}
                      className="pl-8"
                    />
                  </div>
                ) : null}
                {groupsLoading ? (
                  <div className="flex items-center justify-center gap-2 py-4 text-xs text-muted-foreground">
                    <Loader2 className="size-3.5 animate-spin" />
                    {t("common.loading")}
                  </div>
                ) : filteredGroups.length === 0 ? (
                  <p className="px-1 py-2 text-xs text-muted-foreground">
                    {t("meal.nogroupsmatch")}
                  </p>
                ) : (
                  <div className="flex flex-col divide-y divide-border max-h-32 overflow-auto">
                    {filteredGroups.map((group) => (
                      <div
                        key={group.id}
                        className="flex cursor-pointer flex-wrap items-center gap-2.5 px-2 py-2 text-sm hover:bg-muted"
                      >
                        <Checkbox
                          checked={form.groupIds.includes(group.id)}
                          onClick={(e) => e.stopPropagation()}
                          onCheckedChange={(v) =>
                            toggleGroup(group.id, v === true)
                          }
                          aria-label={group.name}
                        />
                        <span className="flex-1 font-medium">{group.name}</span>
                        <Badge variant="outline">
                          {group.mealOption &&
                            MEAL_KEY_VALUE[
                              group.mealOption as keyof typeof MEAL_KEY_VALUE
                            ]}
                        </Badge>
                        <Badge variant="outline">
                          {group.dietPlan &&
                            DIET_KEY_VALUE[
                              group.dietPlan as keyof typeof DIET_KEY_VALUE
                            ]}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {group.memberIds.length} {t("members")}
                        </span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          aria-label={t("common.edit")}
                          onClick={(e) => {
                            e.stopPropagation();
                            openEditGroupForm(group);
                          }}
                        >
                          <Pencil className="size-3.5" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          aria-label={t("common.delete")}
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteGroupTarget(group);
                          }}
                        >
                          <Trash2 className="size-3.5 text-destructive" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </Field>
            <div className="rounded-lg border border-border mt-3 sm:col-span-2">
              <div className="flex items-center justify-between border-b border-border px-3 py-2">
                <span className="text-xs font-medium text-muted-foreground">
                  {t("Individual Participants Selected")} ({forms.length})
                </span>
              </div>
              <div className="p-3">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={pdv.query}
                    onChange={(e) => pdv.setQuery(e.target.value)}
                    placeholder={t("e.searchparticipants")}
                    className="pl-8"
                  />
                </div>

                <div className="mt-3 max-h-60 overflow-y-auto rounded-md border border-border">
                  {isLoading ? (
                    <LoadingState />
                  ) : filteredParticipants.length === 0 ? (
                    <EmptyState message={t("part.none")} />
                  ) : (
                    <Table>
                      <TableBody>
                        {filteredParticipants.map((p, idx) => {
                          const on = forms.some(
                            (item) => item.participantId === p.participantId,
                          );
                          return (
                            <TableRow
                              key={idx}
                              onClick={() => toggle(p.participantId, p)}
                              data-on={on}
                              className="cursor-pointer data-[on=true]:bg-accent/50"
                            >
                              <TableCell onClick={(e) => e.stopPropagation()}>
                                <Checkbox
                                  checked={on}
                                  onCheckedChange={() =>
                                    toggle(p.participantId, p)
                                  }
                                  aria-label={p.participantId}
                                />
                              </TableCell>
                              <TableCell className="w-full">
                                <p className="text-sm font-medium">
                                  {p.name.trim() || "No Participant Name"}
                                </p>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 sm:col-span-2">
              {MealsConfig.DATE_RANGE_PRESETS.map((preset) => (
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
            <div className="grid grid-cols-1 gap-4 sm:col-span-2 sm:grid-cols-3">
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
            </div>
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
          {errors.participants ? (
            <p className="mt-2 text-sm text-destructive pr-4">
              {errors.participants}
            </p>
          ) : null}
        </ScrollArea>

        <DialogFooter>
          {editingRun ? (
            <Button
              variant="destructive"
              className="mr-auto"
              onClick={() => setDeleteRunConfirmOpen(true)}
              disabled={saving || deleting}
            >
              <Trash2 className="size-4" />
              {deleting ? t("common.deleting") : t("meal.deleterun")}
            </Button>
          ) : null}
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("common.cancel")}
          </Button>
          <Button
            onClick={submit}
            disabled={
              saving ||
              deleting ||
              isLoading ||
              (!forms.length && !form.groupIds.length)
            }
          >
            {editingRun
              ? saving
                ? t("common.saving")
                : t("common.savchanges")
              : saving
                ? t("meal.creating")
                : `${t("meal.createrun")} (${forms.length + form.groupIds.length || 0} )`}
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
        type={type}
        onSave={(newForm) => {
          setForms((current) => [
            ...current.filter(
              (form) => form.participantId !== newForm.participantId,
            ),
            newForm,
          ]);

          setReportDialogOpen(false);
          setEditingReport(null);
        }}
      />
      <GroupFormDialog
        open={groupFormOpen}
        onOpenChange={(open) => {
          setGroupFormOpen(open);
          if (!open) setEditingGroup(null);
        }}
        group={editingGroup}
        typeId={type}
        onSave={saveGroup}
      />

      <ConfirmDialog
        open={deleteGroupTarget !== null}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) setDeleteGroupTarget(null);
        }}
        title={t("Delete Group")}
        message={t("Are you sure you want to delete this Group?")}
        onConfirm={confirmDeleteGroup}
      />

      <ConfirmDialog
        open={deleteRunConfirmOpen}
        onOpenChange={setDeleteRunConfirmOpen}
        title={t("meal.deleterun")}
        message={t("meal.deletecnfrm").replace(
          "{{name}}",
          editingRun?.name ?? form.name,
        )}
        onConfirm={handleDelete}
        loading={deleting}
        confirmLabel={deleting ? t("common.deleting") : t("common.delete")}
      />
    </Dialog>
  );
}
