"use server";

// Thin proxy to trip-service, which now owns meal-delivery run creation and
// lifecycle (it shares the same route-building/simulation infrastructure as
// trips).

import * as mealsApi from "@/lib/api/meals";
import { MealRun, MealRunForm } from "@/lib/meals/types";

export async function createMealDelivery(
  input: MealRunForm,
  _actorRole = "operations",
) {
  const meal = await mealsApi.createMealDelivery(input);
  return meal.id;
}

export async function cancelMealDelivery(
  id: string,
  _actorRole = "dispatcher",
) {
  await mealsApi.cancelMealDelivery(id);
}

export async function updateMealDelivery(
  form: MealRunForm,
  _actorRole = "operations",
): Promise<MealRun> {
  return mealsApi.updateMealDelivery(form);
}

export async function deleteMealDelivery(
  id: number,
  _actorRole = "dispatcher",
): Promise<void> {
  await mealsApi.deleteMealDeliveryMock(id);
}
