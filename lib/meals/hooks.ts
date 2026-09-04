"use client";

import useSWR, { useSWRConfig } from "swr";
import { getMealDeliveries } from "@/app/actions/data";
import {
  createMealDelivery as createMealDeliveryAction,
  cancelMealDelivery as cancelMealDeliveryAction,
  updateMealDelivery as updateMealDeliveryAction,
  deleteMealDelivery as deleteMealDeliveryAction,
} from "@/app/actions/meals";
import { useFleetSession } from "@/components/context/fleet-session-provider";
import { EVENT_LOG_KEY } from "../events/hooks";
import { MealRun, MealRunForm, mealsQueryParams } from "./types";

export const MEAL_DELIVERIES_KEY = "mealDeliveries";

const EMPTY_MEAL_DELIVERIES: MealRun[] = [];

export function useMealDeliveries(params: mealsQueryParams = {}) {
  const key: [string, mealsQueryParams] = [MEAL_DELIVERIES_KEY, params];
  const { data, isLoading, mutate } = useSWR<MealRun[]>(
    key,
    ([, queryParams]: [string, mealsQueryParams]) =>
      getMealDeliveries(queryParams),
  );
  return { mealDeliveries: data ?? EMPTY_MEAL_DELIVERIES, isLoading, mutate };
}

export function isMealDeliveriesKey(key: unknown) {
  return Array.isArray(key) && key[0] === MEAL_DELIVERIES_KEY;
}

export function useMealMutations() {
  const { mutate } = useSWRConfig();
  const { role } = useFleetSession();

  async function createMealDelivery(input: MealRunForm) {
    await createMealDeliveryAction(input, role);
    await mutate(isMealDeliveriesKey);
  }

  async function cancelMealDelivery(id: string) {
    await cancelMealDeliveryAction(id, role);
    await mutate(isMealDeliveriesKey);
  }

  async function updateMealDelivery(form: MealRunForm) {
    await updateMealDeliveryAction(form);
    await mutate(isMealDeliveriesKey);
  }

  async function deleteMealDelivery(id: number) {
    await deleteMealDeliveryAction(id, role);
    await mutate(isMealDeliveriesKey);
  }

  return {
    createMealDelivery,
    cancelMealDelivery,
    updateMealDelivery,
    deleteMealDelivery,
  };
}
