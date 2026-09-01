import { MealDeliveryStatus, MealType } from "./types";

export class MealsConfig {
  static readonly mealStatusMeta: Record<
    MealDeliveryStatus,
    { label: string; cls: string; map: string }
  > = {
    scheduled: {
      label: "meal.scheduled",
      cls: "bg-muted text-muted-foreground",
      map: "#64748b",
    },
    preparing: {
      label: "meal.preparing",
      cls: "bg-accent text-accent-foreground",
      map: "#3b82f6",
    },
    loaded: {
      label: "meal.loaded",
      cls: "bg-accent text-accent-foreground",
      map: "#3b82f6",
    },
    "en-route": {
      label: "meal.enroute",
      cls: "bg-primary/15 text-primary",
      map: "#2563eb",
    },
    delivering: {
      label: "meal.delivering",
      cls: "bg-warning/20 text-warning-foreground",
      map: "#d97706",
    },
    completed: {
      label: "meal.completed",
      cls: "bg-success/20 text-success",
      map: "#059669",
    },
    cancelled: {
      label: "meal.cancelled",
      cls: "bg-destructive/15 text-destructive",
      map: "#dc2626",
    },
  };

  static readonly MEAL_TYPES: { value: MealType; label: string }[] = [
    { value: "Breakfast", label: "meal.breakfast" },
    { value: "Lunch", label: "meal.lunch" },
    { value: "Dinner", label: "meal.dinner" },
  ];

  static readonly MEAL_STATUS_OPTIONS = Object.entries(
    MealsConfig.mealStatusMeta,
  ).map(([value, m]) => ({ value, label: m.label }));
}
