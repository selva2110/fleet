export type CenterType =
  | 'hospital'
  | 'clinic'
  | 'rehabilitation'
  | 'dialysis'
  | 'community_hall'
  | 'senior_center';

export type EventStatus =
  | 'scheduled'
  | 'enrolling'
  | 'route_planning'
  | 'dispatched'
  | 'in_progress'
  | 'completed'
  | 'cancelled';

export type VehicleType =
  | 'minivan'
  | 'wheelchair_van'
  | 'bus'
  | 'ambulance'
  | 'sedan';

export type VehicleStatus =
  | 'available'
  | 'assigned'
  | 'in_service'
  | 'maintenance'
  | 'offline';

export type DriverStatus = 'available' | 'assigned' | 'on_break' | 'off_duty';

export type TripStatus = 'planned' | 'assigned' | 'started' | 'completed' | 'cancelled';

export type StopStatus = 'pending' | 'arrived' | 'completed' | 'skipped';

export type StopType = 'pickup' | 'dropoff';

export type MedicalPriority = 'low' | 'normal' | 'high' | 'critical';

export type PgPoint = { type: 'Point'; coordinates: [number, number] };

export interface Center {
  id: string;
  name: string;
  center_type: CenterType;
  address: string;
  phone: string | null;
  location: PgPoint;
  created_at: string;
}

export interface EventRow {
  id: string;
  center_id: string;
  name: string;
  description: string | null;
  start_time: string;
  duration_minutes: number;
  enrollment_threshold: number;
  status: EventStatus;
  created_at: string;
  center?: Center;
  enrollment_count?: number;
}

export interface Participant {
  id: string;
  full_name: string;
  phone: string | null;
  home_location: PgPoint;
  home_address: string;
  needs_wheelchair: boolean;
  needs_power_wheelchair: boolean;
  needs_oxygen: boolean;
  needs_caregiver: boolean;
  needs_bariatric: boolean;
  needs_mobility_assistance: boolean;
  pickup_window_start: string | null;
  pickup_window_end: string | null;
  max_travel_minutes: number | null;
  medical_priority: MedicalPriority;
  created_at: string;
}

export interface Vehicle {
  id: string;
  name: string;
  plate: string;
  vehicle_type: VehicleType;
  capacity: number;
  wheelchair_capacity: number;
  has_oxygen: boolean;
  has_lift: boolean;
  current_location: PgPoint | null;
  status: VehicleStatus;
  created_at: string;
}

export interface Driver {
  id: string;
  full_name: string;
  phone: string | null;
  license_class: string;
  status: DriverStatus;
  assigned_vehicle_id: string | null;
  rating: number;
  created_at: string;
}

export interface Trip {
  id: string;
  event_id: string;
  vehicle_id: string;
  driver_id: string;
  status: TripStatus;
  route_geojson: { type: 'LineString'; coordinates: [number, number][] } | null;
  total_distance_km: number;
  estimated_duration_minutes: number;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  event?: EventRow;
  vehicle?: Vehicle;
  driver?: Driver;
  stops?: TripStop[];
}

export interface TripStop {
  id: string;
  trip_id: string;
  participant_id: string;
  sequence_index: number;
  stop_type: StopType;
  location: PgPoint;
  address: string | null;
  planned_eta: string | null;
  actual_time: string | null;
  status: StopStatus;
  participant?: Participant;
}

export interface SystemEvent {
  id: string;
  event_type: string;
  payload: Record<string, unknown>;
  created_at: string;
}

export interface LngLat {
  lng: number;
  lat: number;
}

export interface LiveVehicleState {
  vehicleId: string;
  position: [number, number];
  heading: number;
  speedKmh: number;
  progress: number;
  tripId: string | null;
  stopIndex: number;
  status: VehicleStatus;
  etaSeconds: number | null;
}
