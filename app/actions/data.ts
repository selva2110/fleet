"use server";

// Each domain has its own fetcher below (getTrips, getEvents, ...), backing
// the per-domain SWR hooks in lib/<domain>/hooks.ts. Every hook fetches only
// the domain it needs instead of one shared full-app snapshot.

import { getMealMedicineReports, listParticipants } from "@/lib/api/participants";
import { getVehicleStatistics, listVehicles } from "@/lib/api/vehicles";
import {
  listDrivers,
  listDriverAvailability,
  listDriverPto,
} from "@/lib/api/drivers";
import { DriverAvailabilityRange, DriverPtoList } from "@/lib/driver/types";
import {
  listEvents,
  getEventLog,
  getAllParticipantResponses,
  listCenters,
} from "@/lib/api/events";
import { listTrips } from "@/lib/api/trips";
import { listMealDeliveries } from "@/lib/api/meals";
import { mealsQueryParams } from "@/lib/meals/types";
import { DomainEvent, FleetEvent } from "@/lib/events/types";
import { listCareItems, listCareItemTypes } from "@/lib/api/catalog";
import { listUsers } from "@/lib/api/users";
import { listRoles } from "@/lib/api/auth";
import { VehicleQueryParams } from "@/lib/vehicles/types";
import { emptyObjectResponse, emptyResponse } from "@/lib/utils";

export async function getCenters() {
  return listCenters().catch(() => []);
}

export async function getParticipants() {
  return listParticipants().catch(() => emptyResponse());
}

export async function getParticipantsReports() {
  return getMealMedicineReports().catch(() => []);
}

export async function getVehicles(params: VehicleQueryParams = {}) {
  return listVehicles(params).catch(() => emptyResponse());
}

export async function getVehicleStats() {
  return getVehicleStatistics().catch(() =>
    emptyObjectResponse({
      totalVehicles: 0,
      availableNow: 0,
      wheelchairCapable: 0,
      needService: 0,
    }),
  );
}

export async function getDrivers() {
  return listDrivers().catch(() => []);
}

export async function getDriverAvailability(
  startDate: string,
  endDate: string,
): Promise<DriverAvailabilityRange> {
  return listDriverAvailability(startDate, endDate);
}

export async function getDriverPto(driverId: string): Promise<DriverPtoList> {
  return listDriverPto(driverId).catch(() => ({
    data: [],
    limit: 0,
    page: 0,
    total: 0,
  }));
}

export async function getEvents() {
  return listEvents().catch(() => []);
}

export async function getTrips() {
  return listTrips().catch(() => []);
}

export async function getMealDeliveries(
  params: mealsQueryParams = { typeId: 1 },
) {
  return listMealDeliveries(params).catch(() => []);
}

export async function getCareItems() {
  return listCareItems().catch(() => []);
}

export async function getCareItemTypes() {
  return listCareItemTypes().catch(() => []);
}

export async function getUsers() {
  return listUsers().catch(() => []);
}

export async function getEventLogRows(): Promise<DomainEvent[]> {
  return getEventLog(200).catch(() => []);
}

export async function getSmsNotifications(events: FleetEvent[]) {
  return getAllParticipantResponses(events).catch(() => []);
}

export async function getRoles() {
  return listRoles();
}
