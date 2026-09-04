import { SortOption } from "@/components/data-view/data-view";
import { MealRunStatus } from "./types";

export class MealsConfig {
  static readonly MEAL_RUN_SORT_OPTIONS: SortOption[] = [
    { key: "fromDate", label: "common.date" },
    { key: "name", label: "meal.run" },
    { key: "departTime", label: "meal.departs" },
    { key: "status", label: "common.status" },
  ];

  static readonly mealStatusMeta: Record<
    MealRunStatus,
    { label: string; cls: string; map: string }
  > = {
    ACTIVE: {
      label: "common.active",
      cls: "bg-primary/15 text-primary",
      map: "#2563eb",
    },
    INACTIVE: {
      label: "common.inactive",
      cls: "bg-muted text-muted-foreground",
      map: "#64748b",
    },
  };

  static readonly MEAL_STATUS_OPTIONS = Object.entries(
    MealsConfig.mealStatusMeta,
  ).map(([value, m]) => ({ value, label: m.label }));
}
