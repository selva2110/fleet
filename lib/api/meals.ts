import "server-only";
import { apiDelete, apiGet, apiPost, apiPut, SERVICE_URLS } from "./http";
import {
  MealRun,
  MealRunForm,
  MealRunListResponse,
  mealsQueryParams,
} from "../meals/types";

const base = () => `${SERVICE_URLS.trip()}/api/v1/meal-deliveries`;
const catalogBase = () => `${SERVICE_URLS.catalog()}/api/v1/catalog-deliveries`;

export async function listMealDeliveries(
  params: mealsQueryParams,
): Promise<MealRun[]> {
  const searchParams = new URLSearchParams();
  searchParams.set("typeId", String(params.typeId));
  const res = await apiGet<MealRunListResponse>(
    `${catalogBase()}?${searchParams.toString()}`,
  );
  return res.data.content;
}

export async function createMealDelivery(input: MealRunForm): Promise<MealRun> {
  const payload = {
    ...input,
    typeId: Number(input.typeId),
  };
  const res = await apiPost<{ data: MealRun }>(catalogBase(), payload);
  return res.data;
}

export async function cancelMealDelivery(id: string): Promise<void> {
  await apiPost(`${base()}/${id}/cancel`);
}

export async function updateMealDelivery(input: MealRunForm): Promise<MealRun> {
  const payload = {
    ...input,
    typeId: Number(input.typeId),
  };
  const res = await apiPut<{ data: MealRun }>(
    `${catalogBase()}/${input.id}`,
    payload,
  );
  return res.data;
}

export async function deleteMealDeliveryMock(inputId: number): Promise<void> {
  await apiDelete(`${catalogBase()}/${inputId}`);
}
