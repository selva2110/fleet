"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/common";
import { NewMealRunDialog } from "@/components/meals/new-meal-run-dialog";
import { useTranslation } from "@/components/context/language-provider";
import { EventsConfig } from "@/lib/events/config";
import { MealRunsTab } from "@/components/meals/meal-runs";
import { MealRun } from "@/lib/meals/types";
import { useRouter } from "next/navigation";

export const DEFAULT_CARE_TYPES = ["1", "2"];
export default function CareCatalogPage() {
  const { t } = useTranslation();
  const [mealDialogOpen, setMealDialogOpen] = useState(false);
  const [editingRun, setEditingRun] = useState<MealRun | null>(null);
  const [selectedParticipantIds, setSelectedParticipantIds] = useState<
    string[]
  >([]);
  const router = useRouter()

  function openEdit(run: MealRun) {
    setEditingRun(run);
    setMealDialogOpen(true);
  }

  return (
    <div className="flex min-h-full flex-col">
      <PageHeader
        title={t(EventsConfig.EVENT_HEADER["catalog"]?.title)}
        description={t(EventsConfig.EVENT_HEADER["catalog"]?.description)}
        actions={
          <Button
            onClick={() => {
              setEditingRun(null);
              setMealDialogOpen(true);
            }}
            size="lg"
          >
            <Plus className="size-4" /> {t("e.plannewrun")}
          </Button>
        }
      />
      <div className="p-6">
        <MealRunsTab
          detailId={editingRun ? String(editingRun.id) : null}
          onOpenDetail={openEdit}
          typeId={2}
        />
      </div>

      <NewMealRunDialog
        open={mealDialogOpen}
        onOpenChange={(value) => {
          setMealDialogOpen(value);
          setSelectedParticipantIds([]);
          if (!value) setEditingRun(null);
        }}
        editingRun={editingRun}
        initialParticipantIds={selectedParticipantIds}
        type={2}
      />
    </div>
  );
}
