"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { PageHeader } from "@/components/common";
import { NewMealRunDialog } from "@/components/meals/new-meal-run-dialog";
import { Button } from "@/components/ui/button";
import { useParticipants } from "@/lib/participant/hooks";
import { EventsConfig } from "@/lib/events/config";
import { useTranslation } from "../../../components/context/language-provider";
import { MealRunsTab } from "@/components/meals/meal-runs";
import { MealRun } from "@/lib/meals/types";

export default function MealDeliveryPage() {
  const { t } = useTranslation();
  const [mealDialogOpen, setMealDialogOpen] = useState(false);
  const [editingRun, setEditingRun] = useState<MealRun | null>(null);
  const [selectedParticipantIds, setSelectedParticipantIds] = useState<
    string[]
  >([]);

  function openEdit(run: MealRun) {
    setEditingRun(run);
    setMealDialogOpen(true);
  }

  return (
    <div className="flex min-h-full flex-col">
      <PageHeader
        title={t(EventsConfig.EVENT_HEADER["meal-delivery"]?.title)}
        description={t(EventsConfig.EVENT_HEADER["meal-delivery"]?.description)}
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
          typeId={1}
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
        type={1}
        initialParticipantIds={selectedParticipantIds}
      />
    </div>
  );
}
