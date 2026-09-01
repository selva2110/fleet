import { UnassignedParticipant } from "../participant/types";
import { LatLng } from "../types";

export type TripStatus =
  | "PLANNED"
  | "VEHICLE_ASSIGNED"
  | "DRIVER_ASSIGNED"
  | "EN_ROUTE"
  | "PICKUP_IN_PROGRESS"
  | "ONBOARD"
  | "ARRIVED"
  | "COMPLETED"
  | "CANCELLED";

export interface TripsResponse {
  data: Trip[];
  total: number;
  page: number;
  limit: number;
}

export interface Trip {
  id: string;
  tripNumber: string;
  eventId: string;
  vehicleId: string | null;
  driverId: string | null;
  stops: Stop[];
  destinationCenterId: string;
  status: TripStatus;
  tripCreationFailedReason?: string;
  tripKind: "outbound" | "return";
  distanceKm: number;
  durationMinutes: number;
  etaCenter: string;
  progress: number;
  currentLocation: LatLng;
  routePath: LatLng[];
  routePolyline: RoutePolyline;
  routeNavigation: RouteNavigation;
  vehicleDetails: VehicleDetails;
  tripAddress: TripAddress;
  startedAt: string;
  lastTickAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface Stop {
  id: string;
  participantId: string;
  location: LatLng;
  order: number;
  etaMinutes: number;
  scheduledPickupTime: string;
  pickupOffsetMinutes: number;
  status: string;
}

export interface RoutePolyline {
  encodedPolyline: string;
  distanceInMeters: number;
  durationInSeconds: number;
}

export interface RouteNavigation {
  waypoints: Waypoint[];
  legs: NavigationLeg[];
  distanceMeters: number;
  durationSeconds: number;
}

export interface Waypoint {
  name: string;
  address: string;
  location: LatLng;
}

export interface NavigationLeg {
  summary: string;
  distanceMeters: number;
  durationSeconds: number;
  steps: NavigationStep[];
}

export interface NavigationStep {
  name: string;
  mode: string;
  drivingSide: string;
  distanceMeters: number;
  durationSeconds: number;
  geometry: LatLng[];
  maneuver: Maneuver;
  voiceInstructions: VoiceInstruction[];
  bannerInstructions: BannerInstruction[];
}

export interface Maneuver {
  type: string;
  modifier?: string;
  instruction: string;
  location: LatLng;
  bearingBefore: number;
  bearingAfter: number;
}

export interface VoiceInstruction {
  distanceAlongGeometry: number;
  announcement: string;
  ssmlAnnouncement: string;
}

export interface BannerInstruction {
  distanceAlongGeometry: number;
  primary: BannerPrimary;
}

export interface BannerPrimary {
  text: string;
  type: string;
  modifier?: string;
}

export interface VehicleDetails {
  id: string;
  name: string;
  type: string;
  capacity: number;
  wheelchairCapacity: number;
  oxygenEquipment: boolean;
  liftAvailable: boolean;
  bariatricCapable: boolean;
  stretcherCapable: boolean;
  fuelType: string;
  maintenanceStatus: string;
  status: string;
}

export interface TripAddress {
  startAddress: Address;
  destinationAddress: Address;
}

export interface Address {
  address: string;
  latitude: number;
  longitude: number;
}

export interface PlanRecommendation {
  id: string;
  vehicleId: string;
  driverId: string;
  participantIds: string[];
  routePath: LatLng[];
  stops: Stop[];
  distanceKm: number;
  durationMinutes: number;
  estimatedCost: number;
  capacityUtilization: number;
  routeScore: number;
  efficiencyScore: number;
  vehiclePickupTime?: string;
  vehiclePickupOffsetMinutes?: number;
  scheduledArrivalTime?: string;
  programStartTime?: string;
  violations: string[];
}

export interface PlanResult {
  recommendations: PlanRecommendation[];
  unassigned: UnassignedParticipant[];
}

export type Phase = "idle" | "planning" | "results";

export type PlanStatus = {
  notificationsEnabled: boolean;
  deadline: Date;
  deadlinePassed: boolean;
  hasPlan: boolean;
  tripCount: number;
  dispatched: boolean;
  canGenerate: boolean;
  blockedReasonKey?: string;
};

export interface RecentPlansInterface {
  eventId: string;
  trips: Trip[];
  dispatched: boolean;
  riders: number;
  distance: number;
}

export type TripUpdate = {
  driverId: string;
  shiftId: string;
  tripId: string;
  latitude: number;
  longitude: number;
  speedMiles: number;
  heading: number;
  recordedAt: string;
  isMoving: boolean;
};

export type ActiveTrip = {
  id: string;
};

export type TripSocketContextType = {
  vehicleLocations: Record<Trip['id'], TripUpdate>;
};
