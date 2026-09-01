import 'server-only'
import { apiGet, apiPost, SERVICE_URLS } from './http'
import { MealDelivery, MealDeliveryCreateInput } from '../meals/types';
import { localToUtcParts, utcToLocalParts } from '../date';

const base = () => `${SERVICE_URLS.trip()}/api/v1/meal-deliveries`

// Backend stores date/departTime as UTC; the UI works in local time.
function toLocalMealDelivery(m: MealDelivery): MealDelivery {
  const { date, time: departTime } = utcToLocalParts(m.date, m.departTime)
  return { ...m, date, departTime }
}

export async function listMealDeliveries(): Promise<MealDelivery[]> {
  const res = await apiGet<{ data: MealDelivery[] }>(`${base()}?limit=500`)
  return res.data.map(toLocalMealDelivery)
}

export async function createMealDelivery(input: MealDeliveryCreateInput): Promise<MealDelivery> {
  const { date, time: departTime } = localToUtcParts(input.date, input.departTime)
  const created = await apiPost<MealDelivery>(base(), { ...input, date, departTime })
  return toLocalMealDelivery(created)
}

export async function startMealDelivery(id: string): Promise<void> {
  await apiPost(`${base()}/${id}/start`)
}

export async function cancelMealDelivery(id: string): Promise<void> {
  await apiPost(`${base()}/${id}/cancel`)
}
