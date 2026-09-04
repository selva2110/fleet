"use client";

import { useState } from "react";
import { Package, Plus, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageHeader } from "@/components/common";
import { NewMealRunDialog } from "@/components/meals/new-meal-run-dialog";
import { useCareItems, useCareItemTypes } from "@/lib/catalog/hooks";
import { useTranslation } from "@/components/context/language-provider";
import { EventsConfig } from "@/lib/events/config";
import { useParticipants } from "@/lib/participant/hooks";
import CatalogParticipantsTab from "@/components/catalog/catalogParticipantsTab";
import { useMealDeliveries } from "@/lib/meals/hooks";
import { MealRunsTab } from "@/components/meals/meal-runs";
import { CatalogTab } from "@/components/catalog/catalogTab";

export const DEFAULT_CARE_TYPES = ["1", "2"];
export default function CareCatalogPage() {
  const { careItems, isLoading: careItemsLoading } = useCareItems();
  const { careItemTypes, isLoading: careItemTypesLoading } = useCareItemTypes();
  const { participants } = useParticipants();
  const [detailId, setDetailId] = useState<string | null>(null);
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<
    "catalog" | "participants" | "medical-runs"
  >("medical-runs");
  const [mealDialogOpen, setMealDialogOpen] = useState(false);
  const [selectedParticipantIds, setSelectedParticipantIds] = useState<
    string[]
  >([]);

  return (
    <div className="flex min-h-full flex-col">
      <PageHeader
        title={t(EventsConfig.EVENT_HEADER["catalog"]?.title)}
        description={t(EventsConfig.EVENT_HEADER["catalog"]?.description)}
        actions={
          <Button onClick={() => setMealDialogOpen(true)} size="lg">
            <Plus className="size-4" /> {t("e.plannewrun")}
          </Button>
        }
      />
      <div className="p-6">
        <Tabs
          value={activeTab}
          onValueChange={(v) =>
            setActiveTab(v as "catalog" | "participants" | "medical-runs")
          }
        >
          <TabsList className="w-fit">
            <TabsTrigger value="medical-runs">
              <Users className="size-3.5" /> Medical Runs
            </TabsTrigger>
            <TabsTrigger value="catalog">
              <Package className="size-3.5" /> {t("catalog.itemtypes")}
              <Badge
                variant="secondary"
                className="ml-1.5 px-1.5 py-0 text-[10px]"
              >
                {careItemTypes.length}
              </Badge>
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

          <TabsContent value="medical-runs" className="mt-6">
            <MealRunsTab
              detailId={detailId}
              onOpenDetail={setDetailId}
              typeId={2}
            />
          </TabsContent>
          <TabsContent value="catalog" className="mt-6">
            <CatalogTab
              careItems={careItems}
              careItemTypes={careItemTypes}
              isLoading={careItemsLoading || careItemTypesLoading}
            />
          </TabsContent>

          <TabsContent value="participants" className="mt-6">
            <CatalogParticipantsTab
              selectedParticipantIds={selectedParticipantIds}
              onSelectedParticipantIdsChange={setSelectedParticipantIds}
              columns={[
                "select",
                "medicalNotes",
                "participant",
                "lastDeliveryDate",
              ]}
              typeId={2}
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
        initialParticipantIds={selectedParticipantIds}
        type={2}
        columns={["medicalNotes"]}
      />
    </div>
  );
}
