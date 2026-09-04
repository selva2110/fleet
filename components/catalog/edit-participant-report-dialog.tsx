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
import { useTranslation } from "../context/language-provider";
import { useNotifications } from "../context/notification-provider";
import { useParticipantMutations } from "@/lib/participant/hooks";
import { ParticipantMedMealReportItem } from "@/lib/participant/types";
import { CatalogParticipantColumnKey } from "@/lib/catalog/types";

export function EditParticipantReportDialog({
  open,
  onOpenChange,
  report,
  columns,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  report: ParticipantMedMealReportItem | null;
  columns: CatalogParticipantColumnKey[];
}) {
  const showDietPlan = columns.includes("dietPlan");
  const showMealNotes = columns.includes("mealNotes");
  const showMedicalNotes = columns.includes("medicalNotes");
  const { t } = useTranslation();
  const { addToast } = useNotifications();
  const { saveParticipantMedReport } = useParticipantMutations();
  const [form, setForm] = useState({
    dietPlan: "",
    mealNotes: "",
    medicalNotes: "",
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open || !report) return;
    setForm({
      dietPlan: report.dietPlan ?? "",
      mealNotes: report.mealNotes ?? "",
      medicalNotes: report.medicalNotes ?? "",
    });
  }, [open, report]);

  async function submit() {
    if (!report) return;
    setSaving(true);
    try {
      await saveParticipantMedReport({
        id: report.participantId,
        name: report.name,
        phone: report.phone,
        dietPlan: form.dietPlan,
        mealNotes: form.mealNotes,
        medicalNotes: form.medicalNotes,
      });
      addToast({
        title: t("common.success"),
        message: t("part.reportsavedsuccess"),
        kind: "success",
      });
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
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <NotebookText className="size-4 text-primary" />{" "}
            {t("part.editreport")}
          </DialogTitle>
          <DialogDescription>{t("part.editreportdesc")}</DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          <div className="grid gap-2">
            <Label>{t("common.participant")}</Label>
            <Input value={report?.name ?? ""} disabled />
          </div>

          {showDietPlan && (
            <div className="grid gap-2">
              <Label htmlFor="report-diet-plan">{t("part.dietplan")}</Label>
              <Input
                id="report-diet-plan"
                value={form.dietPlan}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, dietPlan: event.target.value }))
                }
              />
            </div>
          )}

          {showMealNotes && (
            <div className="grid gap-2">
              <Label htmlFor="report-meal-notes">{t("part.mealnotes")}</Label>
              <Textarea
                id="report-meal-notes"
                value={form.mealNotes}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, mealNotes: event.target.value }))
                }
              />
            </div>
          )}

          {showMedicalNotes && (
            <div className="grid gap-2">
              <Label htmlFor="report-medical-notes">
                {t("part.medicalNotes")}
              </Label>
              <Textarea
                id="report-medical-notes"
                value={form.medicalNotes}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    medicalNotes: event.target.value,
                  }))
                }
              />
            </div>
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
