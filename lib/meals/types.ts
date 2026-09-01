// --- Meal delivery -------------------------------------------------------
// A meal-delivery run: the fleet collects prepared meals from a center/kitchen
// and drops them off at participants' homes. Modeled separately from Trips
// because there is no "return to center with riders" leg — it is a one-way

import { LatLng } from "../types";

// outbound distribution route.
export type MealType = "Breakfast" | "Lunch" | "Dinner";

export type MealDeliveryStatus =
  | "scheduled"
  | "preparing"
  | "loaded"
  | "en-route"
  | "delivering"
  | "completed"
  | "cancelled";

export interface MealStop {
  participantId: string;
  location: LatLng;
  order: number;
  etaMinutes: number;
  mealCount: number;
  status: "pending" | "approaching" | "delivered" | "skipped";
}

export interface MealDelivery {
  id: string;
  runNumber: string;
  centerId: string; // kitchen the meals are picked up from
  vehicleId: string | null;
  driverId: string | null;
  date: string;
  departTime: string;
  mealType: MealType;
  totalMeals: number;
  stops: MealStop[];
  status: MealDeliveryStatus;
  distanceKm: number;
  durationMinutes: number;
  progress: number; // 0..1 along the route
  currentLocation: LatLng | null; // vehicle's current location along the
  routePath: LatLng[];
  startedAt: string | null;
}

export interface MealDeliveryInput {
  centerId: string;
  vehicleId: string | null;
  driverId: string | null;
  date: string;
  departTime: string;
  mealType: MealDelivery["mealType"];
  participantIds: string[];
  mealsPerStop?: Record<string, number>;
}

export interface MealDeliveryCreateInput {
  centerId: string;
  vehicleId: string | null;
  driverId: string | null;
  date: string;
  departTime: string;
  mealType: MealDelivery["mealType"];
  participantIds: string[];
  mealsPerStop?: Record<string, number>;
}

export type MealRunForm = {
  centerId: string;
  vehicleId: string | null;
  driverId: string | null;
  mealType: MealType;
  date: string;
  departTime: string;
  participantIds: string[];
};
