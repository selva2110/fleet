// --- Meal runs -------------------------------------------------------------
// Scheduling records returned by the catalog service's meal-delivery listing
// (catalog-deliveries): the fleet collects prepared meals from a center/
// kitchen and drops them off at participants' homes over a date range.

import { number } from "zod";
import { ParticipantMealForm } from "../catalog/groups";

export type MealRunStatus = "ACTIVE" | "INACTIVE";
export type MealParticipantSourceType = "INDIVIDUAL" | "GROUP";

export interface MealRunParticipant {
  id: number;
  deliveryId: number;
  participantId: string;
  groupId: string | null;
  sourceType: MealParticipantSourceType;
  mealOption: string;
  dietPlan: string;
  mealNotes: string;
  medicalNotes: string;
  createdAt: string;
  updatedAt: string;
}

export interface MealRun {
  id: number;
  name: string;
  centerId: string; // kitchen the meals are picked up from
  vehicleId: string | null;
  vehicleName: string | null;
  driverId: string | null;
  driverName: string | null;
  typeId: number;
  fromDate: string;
  toDate: string;
  departTime: string;
  status: MealRunStatus;
  groups: unknown[];
  participants: MealRunParticipant[];
  createdAt: string;
  updatedAt: string;
}

export interface MealRunListResponse {
  success: boolean;
  message: string;
  data: {
    content: MealRun[];
    page: number;
    size: number;
    totalElements: number;
    totalPages: number;
  };
}

export type MealRunForm = {
  id?: number;
  name: string;
  centerId: string;
  vehicleId: string | null;
  driverId: string | null;
  typeId: number;
  fromdate: string;
  todate: string;
  departTime: string;
  groupIds: string[];
  participants: ParticipantMealForm[];
};

export type mealsQueryParams = {
  typeId?: number;
};

export type DateRangePreset = "today" | "weekly" | "monthly";
