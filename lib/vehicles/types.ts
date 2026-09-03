import { ApiResponse, LatLng, ListQueryParams, metaData } from "../types";

export type VehicleType =
  | "Sedan"
  | "SUV"
  | "Van"
  | "Wheelchair Accessible Van"
  | "Medical Transport Vehicle"
  | "Mini Bus"
  | "Shuttle Bus"
  | "Ambulance";

export type VehicleStatus =
  | "available"
  | "assigned"
  | "heading-to-pickup"
  | "onboard"
  | "at-destination"
  | "returning"
  | "offline";

export interface Vehicle {
  id: string;
  name: string;
  address: string;
  type: VehicleType;
  capacity: number;
  wheelchairCapacity: number;
  oxygenEquipment: boolean;
  liftAvailable: boolean;
  bariatricCapable: boolean;
  stretcherCapable: boolean;
  fuelType: "Gas" | "Diesel" | "Hybrid" | "Electric";
  maintenanceStatus: "good" | "due-soon" | "service-required";
  status: VehicleStatus;
  location: LatLng;
  imageUrl?: string | null;
  /** IST calendar date ("YYYY-MM-DD"); sent/received as UTC ISO at the API boundary. */
  insuranceExpirationDate: string | null;
  /** IST calendar date ("YYYY-MM-DD"); sent/received as UTC ISO at the API boundary. */
  lastInspectionDate: string | null;
}

export type VehicleInput = Omit<Vehicle, "id" | "location" | "status"> & {
  address: Vehicle["address"];
  location?: Vehicle["location"];
  status?: Vehicle["status"];
};

export type VehicleForm = Omit<Vehicle, "id" | "status" | "location"> & {
  address: string;
  location: Vehicle["location"] | null;
};

export type VehicleEditForm = Omit<Vehicle, "id" | "status" | "location"> & {
  address: string;
  location: Vehicle["location"] | null;
  imageUrl?: string | null;
};

export interface VehicleResponse
  extends Omit<Vehicle, "insuranceExpirationDate" | "lastInspectionDate"> {
  createdAt: string;
  updatedAt: string;
  /** UTC ISO datetime as sent by the backend (*time.Time), not the local date. */
  insuranceExpirationDate: string | null;
  /** UTC ISO datetime as sent by the backend (*time.Time), not the local date. */
  lastInspectionDate: string | null;
}
export type Vehicle3D = {
  id: string;
  lng: number;
  lat: number;
  /** Bearing in degrees, 0 = north, increasing clockwise. */
  heading: number;
  color: string;
  highlighted: boolean;
};

export type VehicleCreateInput = Omit<Vehicle, "id"> & { id?: string };

export type VehicleQueryParams = {
  vehicleStatus?: string[];
  vehicleType?: string[];
  vehicleFuel?: string[];
  vehicleMaintenanceStatus?: string[];
  vehicleCapacity?: string[];
} & ListQueryParams;

export interface VehicleStatistics {
  totalVehicles: number;
  availableNow: number;
  wheelchairCapable: number;
  needService: number;
}

export type VehicleListResponse = ApiResponse<Vehicle[]> & {
  metadata: metaData;
};