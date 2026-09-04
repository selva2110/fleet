import "server-only";
import {
  apiDelete,
  apiGet,
  apiPatch,
  apiPost,
  apiPut,
  SERVICE_URLS,
} from "./http";
import {
  Participant,
  ParticipantCreateInput,
  ParticipantListResponse,
  ParticipantMedMealReport,
  ParticipantMedMealReportItem,
  ParticipantQueryParams,
  ParticipantStatus,
} from "../participant/types";

const base = () => `${SERVICE_URLS.participant()}/api/v1/participants`;
const catalogBase = () => `${SERVICE_URLS.catalog()}/api/v1`;

export async function listParticipants(
  params: ParticipantQueryParams = {},
): Promise<ParticipantListResponse> {
  const searchParams = new URLSearchParams();
  if (params.page !== undefined) {
    searchParams.set("page", String(params.page));
  }
  if (params.limit !== undefined) {
    searchParams.set("limit", String(params.limit));
  }
  if (params.search) {
    searchParams.set("search", params.search);
  }
  if (params.sortBy) {
    searchParams.set("sortBy", params.sortBy);
  }
  if (params.sortOrder) {
    searchParams.set("sortOrder", params.sortOrder);
  }
  if (params.specialNeeds) {
    searchParams.set("specialNeeds", params.specialNeeds.join(","));
  }
  const res = await apiGet<ParticipantListResponse>(
    `${base()}?${searchParams.toString()}`,
  );
  return res;
}

//Not used Anywhere
export async function getParticipantsByIds(
  ids: string[],
): Promise<Participant[]> {
  if (ids.length === 0) return [];
  const res = await apiGet<Participant[]>(
    `${base()}/by-ids?ids=${encodeURIComponent(ids.join(","))}`,
  );
  return res;
}

export async function getMealMedicineReports(): Promise<
  ParticipantMedMealReportItem[]
> {
  const res = await apiGet<{
    data: { content: ParticipantMedMealReportItem[] };
  }>(`${catalogBase()}/participants`);
  return res.data.content;
}

export async function updateParticipantMedReport(
  input: ParticipantMedMealReport,
) {
  return await apiPut<ParticipantMedMealReport>(
    `${catalogBase()}/participants/${input.id}`,
    input,
  );
}

export async function createParticipant(
  input: ParticipantCreateInput,
): Promise<Participant> {
  return await apiPost<Participant>(`${base()}`, input);
}

export async function updateParticipant(
  id: string,
  input: Partial<Omit<Participant, "id">>,
): Promise<Participant> {
  return await apiPut<Participant>(`${base()}/${id}`, input);
}

export async function deleteParticipant(id: string): Promise<void> {
  await apiDelete(`${base()}/${id}`);
}

//Not used Anywhere
export async function updateParticipantStatus(
  id: string,
  status: ParticipantStatus,
): Promise<Participant> {
  return await apiPatch<Participant>(`${base()}/${id}/status`, {
    status,
  });
}

export async function assignParticipantToEvent(
  id: string,
  eventId: string | null,
  status?: ParticipantStatus,
): Promise<Participant> {
  return await apiPatch<Participant>(`${base()}/${id}/event`, {
    eventId,
    status,
  });
}
