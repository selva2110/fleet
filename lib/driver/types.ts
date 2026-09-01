import { LatLng } from "../types";

export type DriverStatus = "available" | "on-trip" | "break" | "offline";

export interface Driver {
  id: string;
  name: string;
  phone: string;
  mobile_number: string;
  address: string;
  blood_group: string;
  location: LatLng;
  dial_code: string;
  license_number: string;
  certifications: {
    wheelchairAssist: {
      enabled: boolean;
      certificateNo: string;
    };
    medicalTransport: {
      enabled: boolean;
      certificateNo: string;
    };
  };
  assignedVehicleId: string | null;
  status: DriverStatus;
  rating: number;
  // Shift window, 24h "HH:MM". shiftEnd < shiftStart means an overnight shift
  // that wraps past midnight.
  shiftStart: string;
  shiftEnd: string;
  // Days the driver works, 0 = Sunday .. 6 = Saturday (matches Date#getDay()).
  shiftDays: number[];
  imageUrl?: string | null;
}

export type DriverInput = Omit<Driver, "id" | "status" | "location"> & {
  location?: Driver["location"];
  status?: Driver["status"];
};

export interface DriverResponse {
  id: string;
  name?: string;
  first_name: string;
  last_name: string;
  mobile_number: string;
  phone: string;
  dial_code: string;
  blood_group: string;
  address?: string;
  license_number?: string;
  location?: { lat: number; lng: number };
  certifications?: {
    wheelchairAssist: { enabled: boolean; certificateNo: string };
    medicalTransport: { enabled: boolean; certificateNo: string };
  };
  assigned_vehicle_id?: string | null;
  fleet_status?: DriverStatus;
  rating?: number;
  image_url?: string | null;
  shift_start_time?: string;
  shift_end_time?: string;
  shift_days?: string[];
}

export interface DriverListResponse {
  data: DriverResponse[];
  total: number;
}

export type DriverForm = Omit<Driver, "id" | "status" | "location"> & {
  location: Driver["location"] | null;
};

export type DriverCreateInput = Omit<Driver, "id" | "status"> & {
  id?: string;
  status?: DriverStatus;
};

export type LeaveStatus = "PENDING" | "APPROVED" | "REJECTED" | "CANCELLED";
export interface DriverLeaveResponse {
  leave_id: string;
  start_date: string;
  end_date: string;
  leave_status: LeaveStatus;
  reason: string;
}

export interface DriverAvailabilityEntryResponse {
  driver: DriverResponse;
  unavailable_dates: DriverLeaveResponse[];
}

export interface DriverAvailabilityResponse {
  start_date: string;
  end_date: string;
  drivers: DriverAvailabilityEntryResponse[];
}

export interface DriverLeave {
  id: string;
  startDate: string;
  endDate: string;
  status: LeaveStatus;
  reason: string;
}

export interface DriverAvailability {
  driver: Driver;
  unavailableDates: DriverLeave[];
}

export interface DriverAvailabilityRange {
  startDate: string;
  endDate: string;
  drivers: DriverAvailability[];
}

export interface DriverPtoResponse {
  id: string;
  driver_id: string;
  start_date: string;
  end_date: string;
  reason: string;
  status: LeaveStatus;
  review_notes: string;
  reviewed_at: string;
  created_at: string;
  updated_at: string;
}

export interface DriverPtoListResponse {
  data: DriverPtoResponse[];
  limit: number;
  page: number;
  total: number;
}

export interface DriverPto {
  id: string;
  driverId: string;
  startDate: string;
  endDate: string;
  reason: string;
  status: LeaveStatus;
  reviewNotes: string;
  reviewedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface DriverPtoList {
  data: DriverPto[];
  limit: number;
  page: number;
  total: number;
}

export type LeaveRecord = {
  driverId: string;
  driverName: string;
  status: LeaveStatus;
  reason: string;
  startDate: string;
  endDate: string;
  ptoId: string;
};
