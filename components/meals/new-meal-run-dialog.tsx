"use client";

import { useMemo, useState } from "react";
import { Search, UtensilsCrossed, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { SelectField, TextField } from "@/components/crud/form-fields";
import { useCenters } from "@/lib/events/hooks";
import { useMealMutations } from "@/lib/meals/hooks";
import { useVehicles } from "@/lib/vehicles/hooks";
import { useDrivers } from "@/lib/driver/hooks";
import { useParticipants } from "@/lib/participant/hooks";
import { validateSchema } from "../validation/zod-validation";
import { createMealRunSchema } from "../validation/meal-run";
import { Participant } from "@/lib/participant/types";
import { EventUtils } from "@/lib/events/utils";
import { findById } from "@/lib/utils";
import { useTranslation } from "../context/language-provider";
import { useNotifications } from "../context/notification-provider";
import { MealRunForm } from "@/lib/meals/types";
import { MealsConfig } from "@/lib/meals/config";
import { MealsUtils } from "@/lib/meals/utils";


export function NewMealRunDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const { centers } = useCenters()
  const { vehicles } = useVehicles()
  const { drivers } = useDrivers()
  const { participants } = useParticipants()
  const { createMealDelivery } = useMealMutations()
  const {t} = useTranslation();
  const { addToast } = useNotifications();
  const MealRunSchema = useMemo(() => createMealRunSchema(t), [t]);
  const [form, setForm] = useState<MealRunForm>(() =>
    MealsUtils.blankMealRun(centers[0]?.id ?? ""),
  );
  const set = <K extends keyof MealRunForm>(key: K, value: MealRunForm[K]) => {
    setForm((f) => ({
      ...f,
      [key]: value,
    }));

    setErrors((e) => (e[key as string] ? { ...e, [key as string]: "" } : e));
  };
  const [query, setQuery] = useState("");
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const centerOptions = [
    { value: "", label: 'meal.selectkitchen' },
    ...centers.map((c) => ({ value: c.id, label: c.name })),
  ];
  const vehicleOptions = [
    { value: "", label: 'common.unassigned' },
    ...vehicles.map((v) => ({
      value: v.id,
      label: `${v.name} · ${v.type}`,
    })),
  ];
  const driverOptions = [
    { value: "", label: 'common.unassigned' },
    ...drivers.map((d) => ({ value: d.id, label: d.name })),
  ];

  const addable = useMemo(() => {
    const q = query.trim().toLowerCase();
    return participants
      .filter(
        (p) =>
          !q ||
          p.name.toLowerCase().includes(q) ||
          p.address.toLowerCase().includes(q),
      )
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [participants, query]);

  const selected = useMemo(
    () =>
      form.participantIds
        .map((id) => findById(participants, id))
        .filter((p): p is Participant => Boolean(p)),
    [form.participantIds, participants],
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
    setForm(MealsUtils.blankMealRun(centers[0]?.id ?? ""));
    setQuery("");
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
      await createMealDelivery(form);
      addToast({
        title: t("common.success"),
        message: t("meal.createdsuccess"),
        kind: "success",
      });
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UtensilsCrossed className="size-4 text-primary" /> {t('meal.newrun')}
          </DialogTitle>
          <DialogDescription>
            {t('meal.newrundesc')}
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[60vh] px-1 w-full overflow-hidden">
          <div className="grid gap-4 sm:grid-cols-2">
            <SelectField
              label={t('meal.pickupkitchencenter')}
              value={form.centerId}
              options={centerOptions}
              onChange={(value) => set("centerId", value)}
              error={errors.centerId}
            />
            <SelectField
              label={t('meal.type')}
              value={form.mealType}
              options={MealsConfig.MEAL_TYPES}
              onChange={(value) => set("mealType", value)}
              error={errors.mealType}
            />
            <TextField
              label={t('common.date')}
              type="date"
              value={form.date}
              onChange={(value) => set("date", value)}
              error={errors.date}
            />
            <TextField
              label={t('meal.departuretime')}
              type="time"
              value={form.departTime}
              onChange={(value) => set("departTime", value)}
              error={errors.departTime}
            />
            <SelectField
              label={t('common.vehicle')}
              value={form.vehicleId ?? ""}
              options={vehicleOptions}
              onChange={(value) => set("vehicleId", value)}
              error={errors.vehicleId}
            />
            <SelectField
              label={t('common.driver')}
              value={form.driverId ?? ""}
              options={driverOptions}
              onChange={(value) => set("driverId", value)}
              error={errors.driverId}
            />
          </div>
          {errors.participantIds ? (
            <p className="mt-2 text-sm text-destructive">
              {errors.participantIds}
            </p>
          ) : null}
          <div className="rounded-lg border border-border mt-1">
            <div className="flex items-center justify-between border-b border-border px-3 py-2">
              <span className="text-xs font-medium text-muted-foreground">
                {t('meal.deliverystops')} ({selected.length})
              </span>
            </div>
            <div className="p-3">
              <div className="relative mb-2">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={t('e.searchparticipants')}
                  className="pl-8"
                />
              </div>
              {selected.length > 0 ? (
                <div className="mb-2 flex flex-wrap gap-1.5">
                  {selected.map((p) => (
                    <span
                      key={p.id}
                      className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary"
                    >
                      {p.name}
                      <button
                        type="button"
                        onClick={() => toggle(p.id)}
                        aria-label={t('e.removeparticipant').replace('{{name}}', p.name)}
                      >
                        <X className="size-3" />
                      </button>
                    </span>
                  ))}
                </div>
              ) : null}
              <ScrollArea className="h-44 rounded-md border border-border">
                <div className="divide-y divide-border">
                  {addable.map((p) => {
                    const on = form.participantIds.includes(p.id);
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => toggle(p.id)}
                        className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm hover:bg-muted/50 data-[on=true]:bg-accent/50"
                        data-on={on}
                      >
                        <span className="min-w-0">
                          <span className="block truncate font-medium">
                            {p.name}
                          </span>
                          <span className="block truncate text-xs text-muted-foreground">
                            {p.address}
                          </span>
                        </span>
                        <span
                          className={
                            on
                              ? "text-[11px] font-medium text-primary"
                              : "text-[11px] text-muted-foreground"
                          }
                        >
                          {on ? t('common.added') : t('common.add')}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </ScrollArea>
            </div>
          </div>
        </ScrollArea>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t('common.cancel')}
          </Button>
          <Button onClick={submit} disabled={saving}>
            {saving
              ? t('meal.creating')
              : `${t('meal.createrun')} (${form.participantIds.length})`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
