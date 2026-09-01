import 'server-only'
import { apiDelete, apiGet, apiPatch, apiPost, apiPut, SERVICE_URLS } from './http'
import { Vehicle, VehicleCreateInput, VehicleListResponse, VehicleResponse, VehicleStatus } from '../vehicles/types';

const base = () => `${SERVICE_URLS.vehicle()}/api/v1/vehicles`

function toVehicle(r: VehicleResponse): Vehicle {
  const { createdAt: _createdAt, updatedAt: _updatedAt, ...vehicle } = r
  return vehicle
}

export async function listVehicles(): Promise<Vehicle[]> {
  const res = await apiGet<VehicleListResponse>(`${base()}?limit=200`)
  return res.data.map(toVehicle)
}

export async function getVehicle(id: string): Promise<Vehicle> {
  return toVehicle(await apiGet<VehicleResponse>(`${base()}/${id}`))
}

export async function createVehicle(input: VehicleCreateInput): Promise<Vehicle> {
  return toVehicle(await apiPost<VehicleResponse>(base(), input))
}

export async function updateVehicle(id: string, input: Partial<Omit<Vehicle, 'id'>>): Promise<Vehicle> {
  return toVehicle(await apiPut<VehicleResponse>(`${base()}/${id}`, input))
}

export async function deleteVehicle(id: string): Promise<void> {
  await apiDelete(`${base()}/${id}`)
}

export async function updateVehicleStatus(id: string, status: VehicleStatus): Promise<Vehicle> {
  return toVehicle(await apiPatch<VehicleResponse>(`${base()}/${id}/status`, { status }))
}
