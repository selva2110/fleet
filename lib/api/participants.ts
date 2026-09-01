import 'server-only'
import { apiDelete, apiGet, apiPatch, apiPost, apiPut, SERVICE_URLS } from './http'
import { Participant, ParticipantCreateInput, ParticipantListResponse, ParticipantResponse, ParticipantStatus } from '../participant/types';

const base = () => `${SERVICE_URLS.participant()}/api/v1`

function toParticipant(r: ParticipantResponse): Participant {
  const { createdAt: _c, updatedAt: _u, eventId, ...rest } = r
  return { ...rest, eventId: eventId ?? null }
}

/* --------------------------------- Participants -------------------------------- */

export async function listParticipants(): Promise<Participant[]> {
  const res = await apiGet<ParticipantListResponse>(`${base()}/participants?limit=200`)
  return res.data.map(toParticipant)
}

//Not used Anywhere
export async function getParticipantsByIds(ids: string[]): Promise<Participant[]> {
  if (ids.length === 0) return []
  const res = await apiGet<ParticipantListResponse>(`${base()}/participants/by-ids?ids=${encodeURIComponent(ids.join(','))}`)
  return res.data.map(toParticipant)
}

export async function createParticipant(input: ParticipantCreateInput): Promise<Participant> {
  return toParticipant(await apiPost<ParticipantResponse>(`${base()}/participants`, input))
}

export async function updateParticipant(id: string, input: Partial<Omit<Participant, 'id'>>): Promise<Participant> {
  return toParticipant(await apiPut<ParticipantResponse>(`${base()}/participants/${id}`, input))
}

export async function deleteParticipant(id: string): Promise<void> {
  await apiDelete(`${base()}/participants/${id}`)
}

//Not used Anywhere
export async function updateParticipantStatus(id: string, status: ParticipantStatus): Promise<Participant> {
  return toParticipant(await apiPatch<ParticipantResponse>(`${base()}/participants/${id}/status`, { status }))
}

export async function assignParticipantToEvent(
  id: string,
  eventId: string | null,
  status?: ParticipantStatus,
): Promise<Participant> {
  return toParticipant(
    await apiPatch<ParticipantResponse>(`${base()}/participants/${id}/event`, { eventId, status }),
  )
}