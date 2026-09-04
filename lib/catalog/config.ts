import { SortOption } from "@/components/data-view/data-view";
import { CareStatus, CatalogParticipantColumnKey } from "./types";

export class CatalogConfig {
  static readonly careStatusMeta: Record<
    CareStatus,
    { label: string; cls: string }
  > = {
    ACTIVE: {
      label: "common.active",
      cls: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
    },
    INACTIVE: {
      label: "common.inactive",
      cls: "bg-muted text-muted-foreground",
    },
  };

  static readonly STATUS_OPTIONS = Object.entries(this.careStatusMeta).map(
    ([value, meta]) => ({
      value,
      label: meta.label,
    }),
  );

  static readonly SORT_OPTIONS: SortOption[] = [
    { key: "name", label: "common.name" },
    { key: "code", label: "common.code" },
    { key: "status", label: "common.status" },
  ];

  static readonly ITEM_SORT_OPTIONS: SortOption[] = [
    { key: "name", label: "common.name" },
    { key: "status", label: "common.status" },
  ];

  static readonly DEFAULT_COLUMNS: CatalogParticipantColumnKey[] = [
    "select",
    "participant",
    "dietPlan",
    "mealNotes",
    "medicalNotes",
  ];
}
