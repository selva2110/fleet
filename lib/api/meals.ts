import "server-only";
import { apiDelete, apiGet, apiPost, apiPut, SERVICE_URLS } from "./http";
import {
  MealRun,
  MealRunForm,
  MealRunListResponse,
  mealsQueryParams,
} from "../meals/types";
import { GroupForm } from "../catalog/groups";

const catalogGroups = () => `${SERVICE_URLS.catalog()}/api/v1/catalog-groups`;
const catalogGroupsDeliveries = () =>
  `${SERVICE_URLS.catalog()}/api/v1/catalog-group-deliveries`;

export async function listMealDeliveries(
  params: mealsQueryParams,
): Promise<MealRun[]> {
  const searchParams = new URLSearchParams();
  searchParams.set("typeId", String(params.typeId));
  const res = await apiGet<MealRunListResponse>(
    `${catalogGroupsDeliveries()}?${searchParams.toString()}`,
  );
  return res.data.content.map((m) => ({ ...m, status: m.status ?? "ACTIVE" }));
}

export async function createMealDelivery(input: MealRunForm): Promise<MealRun> {
  const payload = {
    ...input,
    typeId: Number(input.typeId),
  };
  const res = await apiPost<{ data: MealRun }>(
    catalogGroupsDeliveries(),
    payload,
  );
  return res.data;
}

export async function createGroup(input: GroupForm): Promise<MealRun> {
  const res = await apiPost<{ data: MealRun }>(catalogGroups(), input);
  return res.data;
}

export async function updateGroup(input: GroupForm): Promise<MealRun> {
  const res = await apiPut<{ data: MealRun }>(
    `${catalogGroups()}/${input.id}`,
    input,
  );
  return res.data;
}

export async function cancelMealDelivery(id: string): Promise<void> {
  await apiPost(`${catalogGroupsDeliveries()}/${id}/cancel`);
}

export async function updateMealDelivery(input: MealRunForm): Promise<MealRun> {
  const payload = {
    ...input,
    typeId: Number(input.typeId),
  };
  const res = await apiPut<{ data: MealRun }>(
    `${catalogGroupsDeliveries()}/${input.id}`,
    payload,
  );
  return res.data;
}

export async function deleteMealMedDelivery(inputId: number): Promise<void> {
  await apiDelete(`${catalogGroupsDeliveries()}/${inputId}`);
}

export async function deleteCatalogGroup(inputId: number): Promise<void> {
  await apiDelete(`${catalogGroups()}/${inputId}`);
}
