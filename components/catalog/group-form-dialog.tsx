"use client";

import { useEffect, useState } from "react";
import { Users } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useTranslation } from "../context/language-provider";
import { DIET_OPTIONS, GroupForm, MEAL_OPTIONS } from "@/lib/catalog/groups";
import { Field, SelectField, TextField } from "../crud/form-fields";
import { Textarea } from "@/components/ui/textarea";
import { createFieldSetter } from "../common";
import { useParticipants } from "@/lib/participant/hooks";

export function GroupFormDialog({
  open,
  onOpenChange,
  group,
  typeId,
  onSave,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  group: GroupForm | null;
  typeId: number;
  onSave: (input: GroupForm) => void;
}) {
  const { t } = useTranslation();
  const { participants } = useParticipants();
  const [form, setForm] = useState<GroupForm>({
    id: "",
    name: "",
    mealNotes: "",
    mealOption: MEAL_OPTIONS[0].value,
    dietPlan: DIET_OPTIONS[0].value,
    medicalNotes: "",
    typeId,
    memberIds: [] as string[],
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const set = createFieldSetter(setForm, setErrors);
  useEffect(() => {
    if (!open) return;
    setForm(
      group
        ? {
            id: group.id,
            name: group.name,
            mealNotes: group.mealNotes ?? "",
            mealOption: group.mealOption ?? MEAL_OPTIONS[0].value,
            dietPlan: group.dietPlan ?? DIET_OPTIONS[0].value,
            medicalNotes: group.medicalNotes ?? "",
            typeId,
            memberIds: group.memberIds ?? [],
          }
        : {
            id: "",
            name: "",
            mealNotes: "",
            mealOption: MEAL_OPTIONS[0].value,
            dietPlan: DIET_OPTIONS[0].value,
            medicalNotes: "",
            typeId,
            memberIds: [],
          },
    );
  }, [open, group, typeId]);

  function toggleMember(id: string, checked: boolean) {
    setForm((prev) => ({
      ...prev,
      memberIds: checked
        ? [...prev.memberIds, id]
        : prev.memberIds.filter((mid) => mid !== id),
    }));
  }

  function submit() {
    if (!form.name.trim() || !form.memberIds.length) return;
    onSave({
      id: form.id ?? "",
      name: form.name.trim(),
      mealOption: form.mealOption,
      dietPlan: form.dietPlan,
      typeId,
      mealNotes: form.mealNotes,
      medicalNotes: form.medicalNotes,
      memberIds: form.memberIds,
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="size-4 text-primary" />{" "}
            {group ? t("Edit Group") : t("Add Group")}
          </DialogTitle>
        </DialogHeader>

        <div className="grid gap-2 py-1">
          <div className="grid gap-2">
            <TextField
              label={t("Group Name")}
              value={form.name}
              required
              onChange={(value) => set("name", value)}
              error={errors.name}
            />
          </div>

          {typeId === 1 ? (
            <>
              <div className="grid grid-cols-2 gap-3">
                <SelectField
                  label={t("Meal Option")}
                  value={form.mealOption ?? ""}
                  options={MEAL_OPTIONS}
                  onChange={(value) => set("mealOption", value)}
                  error={errors.mealOption}
                />

                <SelectField
                  label={t("Diet Option")}
                  value={form.dietPlan ?? ""}
                  options={DIET_OPTIONS}
                  onChange={(value) => set("dietPlan", value)}
                  error={errors.dietOption}
                />
              </div>

              <Field label={t("Meal Notes")} error={errors.mealNotes}>
                <Textarea
                  maxLength={500}
                  value={form.mealNotes ?? ""}
                  onChange={(event) => set("mealNotes", event.target.value)}
                />
                {form.mealNotes && (
                  <div className="flex items-center justify-end text-xs mx-2 mt-1">
                    {form.mealNotes.length}/500
                  </div>
                )}
              </Field>
            </>
          ) : (
            <Field label={t("Medical Notes")} error={errors.medicalNotes}>
              <Textarea
                maxLength={500}
                value={form.medicalNotes ?? ""}
                onChange={(event) => set("medicalNotes", event.target.value)}
              />
              {form.medicalNotes && (
                <div className="flex items-center justify-end text-xs mx-2 mt-1">
                  {form.medicalNotes.length}/500
                </div>
              )}
            </Field>
          )}
          <div className="grid gap-2 mt-2">
            <Label>
              {t("Select Members")}({form.memberIds.length} selected){" "}
              <span className="ml-0.5 text-destructive">*</span>
            </Label>
            {participants.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                {t("No Members Selected")}
              </p>
            ) : (
              <ScrollArea className="max-h-45 rounded-lg border border-border">
                <div className="flex flex-col divide-y divide-border">
                  {participants.map((p) => (
                    <label
                      key={p.id}
                      className="flex cursor-pointer items-center gap-2 px-3 py-2 text-sm hover:bg-muted"
                    >
                      <Checkbox
                        checked={form.memberIds.includes(p.id)}
                        onCheckedChange={(v) => toggleMember(p.id, v === true)}
                      />
                      {p.name}
                    </label>
                  ))}
                </div>
              </ScrollArea>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("common.cancel")}
          </Button>
          <Button onClick={submit} disabled={!form.name.trim() || !form.memberIds.length}>
            {t("common.savchanges")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
