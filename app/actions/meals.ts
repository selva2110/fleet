'use server'

// Thin proxy to trip-service, which now owns meal-delivery run creation and
// lifecycle (it shares the same route-building/simulation infrastructure as
// trips).

import * as mealsApi from '@/lib/api/meals'
import { MealDeliveryInput } from '@/lib/meals/types';

export async function createMealDelivery(input: MealDeliveryInput, _actorRole = 'operations') {
  const meal = await mealsApi.createMealDelivery(input)
  return meal.id
}

export async function startMealDelivery(id: string, _actorRole = 'dispatcher') {
  await mealsApi.startMealDelivery(id)
}

export async function cancelMealDelivery(id: string, _actorRole = 'dispatcher') {
  await mealsApi.cancelMealDelivery(id)
}
