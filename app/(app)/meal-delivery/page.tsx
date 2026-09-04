"use client";

import { useState } from "react";
import { Plus, Users, UtensilsCrossed } from "lucide-react";
import { PageHeader } from "@/components/common";
import { NewMealRunDialog } from "@/components/meals/new-meal-run-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useMealDeliveries } from "@/lib/meals/hooks";
import { useParticipants } from "@/lib/participant/hooks";
import { EventsConfig } from "@/lib/events/config";
import { useTranslation } from "../../../components/context/language-provider";
import CatalogParticipantsTab from "@/components/catalog/catalogParticipantsTab";
import { MealRunsTab } from "@/components/meals/meal-runs";

export default function MealDeliveryPage() {
  const { participants } = useParticipants();
  const { t } = useTranslation();
  const [mealDialogOpen, setMealDialogOpen] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"runs" | "participants">("runs");
  const [selectedParticipantIds, setSelectedParticipantIds] = useState<
    string[]
  >([]);

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
        <Tabs
          value={activeTab}
          onValueChange={(v) => setActiveTab(v as "runs" | "participants")}
        >
          <TabsList className="w-fit">
            <TabsTrigger value="runs">
              <UtensilsCrossed className="size-3.5" /> {t("aurora.mealruns")}
            </TabsTrigger>
            <TabsTrigger value="participants">
              <Users className="size-3.5" /> {t("common.participants")}
              <Badge
                variant="secondary"
                className="ml-1.5 px-1.5 py-0 text-[10px]"
              >
                {participants.length}
              </Badge>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="runs" className="mt-6">
            <MealRunsTab
              detailId={detailId}
              onOpenDetail={setDetailId}
              typeId={1}
            />
          </TabsContent>

          <TabsContent value="participants" className="mt-6">
            <CatalogParticipantsTab
              selectedParticipantIds={selectedParticipantIds}
              onSelectedParticipantIdsChange={setSelectedParticipantIds}
              columns={[
                "select",
                "dietPlan",
                "mealNotes",
                "participant",
                "lastDeliveryDate",
              ]}
              typeId={1}
            />
          </TabsContent>
        </Tabs>
      </div>

      <NewMealRunDialog
        open={mealDialogOpen}
        onOpenChange={(value) => {
          setMealDialogOpen(value);
          setSelectedParticipantIds([]);
        }}
        type={1}
        initialParticipantIds={selectedParticipantIds}
        columns={["dietPlan", "mealNotes"]}
      />
    </div>
  );
}
