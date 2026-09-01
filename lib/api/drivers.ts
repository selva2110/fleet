import 'server-only'
import { apiDelete, apiGet, apiPatch, apiPost, apiPut, SERVICE_URLS } from './http'
import { localToUtcParts, utcToLocalParts } from '../date'
import {
  Driver,
  DriverAvailabilityRange,
  DriverAvailabilityResponse,
  DriverCreateInput,
  DriverListResponse,
  DriverPto,
  DriverPtoList,
  DriverPtoListResponse,
  DriverPtoResponse,
  DriverResponse,
  DriverStatus,
} from '../driver/types';

const base = () => `${SERVICE_URLS.driver()}/api/v1/drivers`

const WEEKDAYS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'] as const

function toDriver(r: DriverResponse): Driver {
  return {
    id: r.id,
    name: r.name || `${r.first_name} ${r.last_name}`.trim(),
    mobile_number: r.mobile_number,
    phone:r.phone,
    blood_group: r.blood_group ?? "",
    address: r.address ?? '',
    location: r.location ?? { lat: 0, lng: 0 },
    dial_code: r.dial_code ?? '',
    license_number: r.license_number ?? '',
    certifications: r.certifications ?? {
      wheelchairAssist: { enabled: false, certificateNo: '' },
      medicalTransport: { enabled: false, certificateNo: '' },
    },
    assignedVehicleId: r.assigned_vehicle_id ?? null,
    status: r.fleet_status ?? 'offline',
    rating: r.rating ?? 4.5,
    shiftStart: r.shift_start_time ? utcToLocalParts(undefined, r.shift_start_time).time : '00:00',
    shiftEnd: r.shift_end_time ? utcToLocalParts(undefined, r.shift_end_time).time : '23:59',
    shiftDays: (r.shift_days ?? []).map((d) => WEEKDAYS.indexOf(d as (typeof WEEKDAYS)[number])).filter((i) => i >= 0),
    imageUrl: r.image_url ?? null,
  }
}

function toShiftDays(days: number[]): string[] {
  return days.map((d) => WEEKDAYS[d]).filter(Boolean)
}

export async function listDrivers(): Promise<Driver[]> {
  const res = await apiGet<DriverListResponse>(`${base()}?limit=100`)
  return res.data.map(toDriver)
}

export async function createDriver(input: DriverCreateInput): Promise<Driver> {
  const id = input.id ?? `d-${Date.now().toString(36)}-${Math.floor(Math.random() * 1000)}`
  const body = {
    name: input.name,
    email: `${id}@drivers.fleetcare.local`,
    phone: input.mobile_number,
    mobile_number: input.mobile_number,
    dial_code: input.dial_code,
    license_number: input.license_number || id,
    license_expiry: new Date(Date.now() + 10 * 365 * 24 * 60 * 60 * 1000).toISOString(),
    shift_start_time: localToUtcParts(undefined, input.shiftStart).time,
    shift_end_time: localToUtcParts(undefined, input.shiftEnd).time,
    shift_days: toShiftDays(input.shiftDays.length ? input.shiftDays : [0, 1, 2, 3, 4, 5, 6]),
    address: input.address,
    location: input.location,
    certifications: input.certifications,
    assigned_vehicle_id: input.assignedVehicleId,
    fleet_status: input.status ?? 'available',
    rating: input.rating,
    image_url: input.imageUrl,
  }
  return toDriver(await apiPost<DriverResponse>(base(), body))
}

export async function updateDriver(id: string, input: Partial<Omit<Driver, 'id'>>): Promise<Driver> {
  const body: Record<string, unknown> = {}
  if (input.name !== undefined) body.name = input.name
  if (input.mobile_number !== undefined) body.mobile_number = input.mobile_number
  if (input.address !== undefined) body.address = input.address
  if (input.location !== undefined) body.location = input.location
  if (input.certifications !== undefined) body.certifications = input.certifications
  if (input.assignedVehicleId !== undefined) body.assigned_vehicle_id = input.assignedVehicleId
  if (input.rating !== undefined) body.rating = input.rating
  if (input.imageUrl !== undefined) body.image_url = input.imageUrl
  if (input.shiftStart !== undefined) body.shift_start_time = localToUtcParts(undefined, input.shiftStart).time
  if (input.shiftEnd !== undefined) body.shift_end_time = localToUtcParts(undefined, input.shiftEnd).time
  if (input.shiftDays !== undefined) body.shift_days = toShiftDays(input.shiftDays)

  return toDriver(await apiPut<DriverResponse>(`${base()}/${id}`, body))
}

export async function deleteDriver(id: string): Promise<void> {
  await apiDelete(`${base()}/${id}`)
}

export async function updateDriverFleetStatus(id: string, status: DriverStatus): Promise<Driver> {
  return toDriver(
    await apiPatch<DriverResponse>(`${base()}/${id}/fleet-status`, { fleet_status: status }),
  )
}

function toDriverPto(p: DriverPtoResponse): DriverPto {
  return {
    id: p.id,
    driverId: p.driver_id,
    startDate: utcToLocalParts(p.start_date).date,
    endDate: utcToLocalParts(p.end_date).date,
    reason: p.reason,
    status: p.status,
    reviewNotes: p.review_notes,
    reviewedAt: p.reviewed_at || null,
    createdAt: p.created_at,
    updatedAt: p.updated_at,
  }
}

export async function listDriverPto(driverId: string): Promise<DriverPtoList> {
  const res = await apiGet<DriverPtoListResponse>(`${base()}/${driverId}/pto`);
  return {
    data: res.data.map(toDriverPto),
    limit: res.limit,
    page: res.page,
    total: res.total,
  };
}

export async function manageLeaveApproval(
  driverId: string,
  ptoId: string,
  status: string,
  reviewNotes = "",
): Promise<void> {
  await apiPatch<DriverPtoResponse>(`${base()}/${driverId}/pto/${ptoId}`, {
    status: status,
    review_notes: reviewNotes,
  });
}

export async function listDriverAvailability(
  startDate: string,
  endDate: string,
): Promise<DriverAvailabilityRange> {
  const params = new URLSearchParams({
    startDate: localToUtcParts(startDate).date,
    endDate: localToUtcParts(endDate).date,
  });
  const res = await apiGet<DriverAvailabilityResponse>(
    `${base()}/availability?${params}`,
  );
  return {
    startDate: utcToLocalParts(res.start_date).date,
    endDate: utcToLocalParts(res.end_date).date,
    drivers: res.drivers.map((entry) => ({
      driver: toDriver(entry.driver),
      unavailableDates: entry.unavailable_dates.map((u) => ({
        id: u.leave_id,
        startDate: utcToLocalParts(u.start_date).date,
        endDate: utcToLocalParts(u.end_date).date,
        status: u.leave_status,
        reason: u.reason,
      })),
    })),
  };
}
