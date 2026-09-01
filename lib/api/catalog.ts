import {
  CareItem,
  CareItemForm,
  CareItemResponse,
  CareItemType,
  CareItemTypeForm,
} from "../catalog/types";
import { apiDelete, apiGet, apiPost, apiPut, SERVICE_URLS } from "./http";

const baseUrl = () => `${SERVICE_URLS.catalog()}/api/v1`;
export async function listCareItemTypes(): Promise<CareItemType[]> {
  const res = await apiGet<{ data: { content: CareItemType[] } }>(
    `${baseUrl()}/care-item-types`,
  );
  return res.data.content;
  return [];
}

export async function saveCareItemType(
  input: CareItemTypeForm,
): Promise<CareItemType> {
  const res = await apiPost<{ data: CareItemType }>(
    `${baseUrl()}/care-item-types`,
    input,
  );
  return res.data;
}

export async function updateCareItemType(
  input: CareItemTypeForm,
  id: string,
): Promise<CareItemType> {
  const res = await apiPut<{ data: CareItemType }>(
    `${baseUrl()}/care-item-types/${id}`,
    input,
  );
  return res.data;
}

export async function deleteCareItemType(id: string): Promise<void> {
  await apiDelete(`${baseUrl()}/care-item-types/${id}`);
}

export async function listCareItems(): Promise<CareItem[]> {
  const res = await apiGet<CareItemResponse>(`${baseUrl()}/care-items`);
  return res.data.content;
  return [];
}

export async function saveCareItem(input: CareItemForm): Promise<CareItem> {
  const res = await apiPost<{ data: CareItem }>(
    `${baseUrl()}/care-items`,
    input,
  );
  return res.data;
}

export async function updateCareItem(
  input: CareItemForm,
  id: string,
): Promise<CareItem> {
  const payload = { ...input, type_id: Number(input.type_id) };
  const res = await apiPut<{ data: CareItem }>(
    `${baseUrl()}/care-items/${Number(id)}`,
    payload,
  );
  return res.data;
}

export async function deleteCareItem(id: string): Promise<void> {
  await apiDelete(`${baseUrl()}/care-items/${id}`);
}
