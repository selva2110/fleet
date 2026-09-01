"use client";

import useSWR, { useSWRConfig } from "swr";
import { getMealDeliveries } from "@/app/actions/data";
import {
  createMealDelivery as createMealDeliveryAction,
  startMealDelivery as startMealDeliveryAction,
  cancelMealDelivery as cancelMealDeliveryAction,
} from "@/app/actions/meals";
import { useFleetSession } from "@/components/context/fleet-session-provider";
import { EVENT_LOG_KEY } from "../events/hooks";
import { MealDelivery, MealDeliveryInput } from "./types";

export const MEAL_DELIVERIES_KEY = "mealDeliveries";

const EMPTY_MEAL_DELIVERIES: MealDelivery[] = [];

export function useMealDeliveries() {
  const { data, isLoading, mutate } = useSWR<MealDelivery[]>(MEAL_DELIVERIES_KEY, getMealDeliveries);
  return { mealDeliveries: data ?? EMPTY_MEAL_DELIVERIES, isLoading, mutate };
}

export function useMealMutations() {
  const { mutate } = useSWRConfig();
  const { role } = useFleetSession();

  async function createMealDelivery(input: MealDeliveryInput) {
    await createMealDeliveryAction(input, role);
    await Promise.all([mutate(MEAL_DELIVERIES_KEY), mutate(EVENT_LOG_KEY)]);
  }

  async function startMealDelivery(id: string) {
    await startMealDeliveryAction(id, role);
    await Promise.all([mutate(MEAL_DELIVERIES_KEY), mutate(EVENT_LOG_KEY)]);
  }

  async function cancelMealDelivery(id: string) {
    await cancelMealDeliveryAction(id, role);
    await Promise.all([mutate(MEAL_DELIVERIES_KEY), mutate(EVENT_LOG_KEY)]);
  }

  return { createMealDelivery, startMealDelivery, cancelMealDelivery };
}
