import { GroupForm } from "../catalog/groups";
import {
  CareItem,
  CareItemForm,
  CareItemResponse,
  CareItemType,
  CareItemTypeForm,
} from "../catalog/types";
import { apiDelete, apiGet, apiPost, apiPut, SERVICE_URLS } from "./http";

const baseUrl = () => `${SERVICE_URLS.catalog()}/api/v1`;
const catalogBaseUrl = () => `${SERVICE_URLS.catalog()}/api/v1/catalog-groups`;
const catalogParticipantsBaseurl = () =>
  `${SERVICE_URLS.catalog()}/api/v1/catalog-participants`;
export async function listCareItemTypes(): Promise<CareItemType[]> {
  // Rarely changes and is identical for every caller, so it's safe to
  // let the Next Data Cache absorb repeat requests for a short window.
  const res = await apiGet<{ data: { content: CareItemType[] } }>(
    `${baseUrl()}/care-item-types`,
    undefined,
    60,
  );
  return res.data.content;
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

export async function listParticipantsNotinList(params: {
  groupIds?: string[];
}): Promise<{ participantId: string; name: string }[]> {
  const res = await apiPost<{
    data: {
      participants: { participantId: string; name: string }[];
    };
  }>(`${catalogParticipantsBaseurl()}/not-in-groups`, {
    groupIds: params.groupIds ?? [],
  });
  return res.data.participants;
}

export async function listCatalogGroups(params: {
  typeId?: number;
} = {}): Promise<GroupForm[]> {
  const searchParams = new URLSearchParams();
  if (params.typeId != null) {
    searchParams.set("typeId", String(params.typeId));
  }
  const query = searchParams.toString();
  const res = await apiGet<{
    data: {
      content: GroupForm[];
    };
  }>(`${catalogBaseUrl()}${query ? `?${query}` : ""}`);
  return res.data.content;
}
