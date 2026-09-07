"use client";

import { useEffect, useState } from "react";
import { NotebookText } from "lucide-react";
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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Field, SelectField } from "../crud/form-fields";
import { useTranslation } from "../context/language-provider";
import {
  DIET_OPTIONS,
  MEAL_OPTIONS,
  ParticipantMealForm,
} from "@/lib/catalog/groups";
import { MealsUtils } from "@/lib/meals/utils";

const DIET_SELECT_OPTIONS = [{ value: "", label: "—" }, ...DIET_OPTIONS];
const MEAL_SELECT_OPTIONS = [{ value: "", label: "—" }, ...MEAL_OPTIONS];

export function EditParticipantReportDialog({
  open,
  onOpenChange,
  report,
  onSave,
  type,
}: {
  open: boolean;
  type: number;
  onOpenChange: (v: boolean) => void;
  report: { participantId: string; name: string } | null;
  onSave: (participantDetails: ParticipantMealForm) => void;
}) {
  const { t } = useTranslation();
  const [form, setForm] = useState<ParticipantMealForm>(
    MealsUtils.blankParticipantRecord(),
  );
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open || !report) return;
    setForm({ ...form, participantId: report.participantId });
  }, [open, report]);

  async function submit() {
    if (!report) return;
    try {
      setSaving(true);
      const body = {
        participantId: report.participantId,
        mealOption: form.mealOption,
        dietPlan: form.dietPlan,
        mealNotes: form.mealNotes,
        medicalNotes: form.medicalNotes,
      };
      onSave(body);
    } catch (error) {
    } finally {
      setSaving(false);
      setForm(MealsUtils.blankParticipantRecord());
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <NotebookText className="size-4 text-primary" />{" "}
            {type === 1 ? "Eit Meal Details" : "Edit Medical Details"}
          </DialogTitle>
          <DialogDescription>{t("part.editreportdesc")}</DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          <div className="grid gap-2">
            <Label>{t("common.participant")}</Label>
            <Input
              value={report?.name.trim() || "No Participant Name"}
              disabled
            />
          </div>

          {type === 1 && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <SelectField
                  label={t("part.dietplan")}
                  value={form.dietPlan}
                  options={DIET_SELECT_OPTIONS}
                  onChange={(value) =>
                    setForm((prev) => ({ ...prev, dietPlan: value }))
                  }
                />
                <SelectField
                  label={t("Meal Option")}
                  value={form.mealOption}
                  options={MEAL_SELECT_OPTIONS}
                  onChange={(value) =>
                    setForm((prev) => ({ ...prev, mealOption: value }))
                  }
                />
              </div>
              <Field label="Meal Notes">
                <Textarea
                  rows={2}
                  className="resize-none"
                  maxLength={500}
                  value={form.mealNotes}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      mealNotes: event.target.value,
                    }))
                  }
                />
                {form.mealNotes && (
                  <div className="flex items-center justify-end text-xs mx-2 mt-1">
                    {form.mealNotes.length}/500
                  </div>
                )}
              </Field>
            </>
          )}

          {type === 2 && (
            <Field label={t("part.medicalNotes")}>
              <Textarea
                id="report-medical-notes"
                rows={2}
                className="resize-none"
                maxLength={500}
                value={form.medicalNotes}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    medicalNotes: event.target.value,
                  }))
                }
              />
              {form.medicalNotes && (
                <div className="flex items-center justify-end text-xs mx-2 mt-1">
                  {form.medicalNotes.length}/500
                </div>
              )}
            </Field>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("common.cancel")}
          </Button>
          <Button onClick={submit} disabled={saving || !report}>
            {saving ? t("common.saving") : t("common.savchanges")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
