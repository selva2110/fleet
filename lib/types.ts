// Domain types for the Smart Fleet Event Transportation Management Platform.
// This module is the single source of truth for entity shapes and is designed
// to map cleanly onto a relational schema (each interface ~ one table) so the
// in-memory mock store can later be swapped for a real database.

export type Role =
  | 'admin'
  | 'dispatcher'
  | 'operations'
  | 'driver'
  | 'center'
  | 'participant'
  | 'caregiver'

export type LatLng = { lat: number; lng: number }

export type CenterType =
  | 'Hospital'
  | 'Clinic'
  | 'Dialysis Center'
  | 'Rehabilitation Center'
  | 'Community Hall'
  | 'Senior Care Center'
  | 'Therapy Center'

export interface Center {
  id: string
  name: string
  type: CenterType
  address: string
  location: LatLng
  operatingHours: string
  capacity: number
}

export type MobilityLevel = 'independent' | 'assisted' | 'wheelchair' | 'stretcher'
export type MedicalPriority = 'routine' | 'elevated' | 'critical'

export interface TransportConstraints {
  wheelchair?: boolean
  poweredWheelchair?: boolean
  walker?: boolean
  oxygen?: boolean
  caregiverRequired?: boolean
  bariatric?: boolean
  visualAssist?: boolean
  cognitiveAssist?: boolean
  serviceAnimal?: boolean
}

export type ParticipantStatus =
  | 'registered'
  | 'scheduled'
  | 'vehicle-assigned'
  | 'driver-assigned'
  | 'driver-approaching'
  | 'picked-up'
  | 'dropped-off'
  | 'completed'

export interface Participant {
  id: string
  name: string
  phone: string
  emergencyContact: string
  address: string
  location: LatLng
  medicalNotes: string
  constraints: TransportConstraints
  maxTravelMinutes: number
  pickupWindow: string
  mobilityLevel: MobilityLevel
  medicalPriority: MedicalPriority
  eligible: boolean
  status: ParticipantStatus
  eventId: string | null
}

export type VehicleType =
  | 'Sedan'
  | 'SUV'
  | 'Van'
  | 'Wheelchair Accessible Van'
  | 'Medical Transport Vehicle'
  | 'Mini Bus'
  | 'Shuttle Bus'
  | 'Ambulance'

export type VehicleStatus =
  | 'available'
  | 'assigned'
  | 'heading-to-pickup'
  | 'onboard'
  | 'at-destination'
  | 'returning'
  | 'offline'

export interface Vehicle {
  id: string
  name: string
  address: string
  type: VehicleType
  capacity: number
  wheelchairCapacity: number
  oxygenEquipment: boolean
  liftAvailable: boolean
  bariatricCapable: boolean
  stretcherCapable: boolean
  fuelType: 'Gas' | 'Diesel' | 'Hybrid' | 'Electric'
  maintenanceStatus: 'good' | 'due-soon' | 'service-required'
  status: VehicleStatus
  location: LatLng
  imageUrl?: string | null
}

export type DriverStatus = 'available' | 'on-trip' | 'break' | 'offline'

export interface Driver {
  id: string
  name: string
  phone: string
  address: string
  location: LatLng
  license: string
  certifications: {
    wheelchairAssist: boolean
    medicalTransport: boolean
  }
  assignedVehicleId: string | null
  status: DriverStatus
  rating: number
  // Shift window, 24h "HH:MM". shiftEnd < shiftStart means an overnight shift
  // that wraps past midnight.
  shiftStart: string
  shiftEnd: string
  // Days the driver works, 0 = Sunday .. 6 = Saturday (matches Date#getDay()).
  shiftDays: number[]
  imageUrl?: string | null
}

export type EventType =
  | 'Dialysis Session'
  | 'Clinical Appointment'
  | 'Vaccination Camp'
  | 'Community Program'
  | 'Therapy Session'
  | 'Rehabilitation Session'
  | 'Health Screening'

export type EventStatus = 'scheduled' | 'planning' | 'active' | 'completed'

export interface FleetEvent {
  id: string
  name: string
  type: EventType
  centerId: string
  date: string
  startTime: string
  endTime: string
  expectedAttendance: number
  participantIds: string[]
  status: EventStatus
}

export type TripStatus =
  | 'planned'
  | 'vehicle-assigned'
  | 'driver-assigned'
  | 'en-route'
  | 'pickup-in-progress'
  | 'onboard'
  | 'arrived'
  | 'completed'
  | 'cancelled'

export interface TripStop {
  participantId: string
  location: LatLng
  order: number
  etaMinutes: number
  scheduledPickupTime?: string
  pickupOffsetMinutes?: number
  status: 'pending' | 'approaching' | 'picked-up' | 'skipped'
}

export interface Trip {
  id: string
  tripNumber: string
  eventId: string
  vehicleId: string | null
  driverId: string | null
  stops: TripStop[]
  destinationCenterId: string
  status: TripStatus
  distanceKm: number
  durationMinutes: number
  etaCenter: string
  progress: number // 0..1 along the route
  currentLocation: LatLng
  routePath: LatLng[]
  startedAt: string | null
}

// Output of the planning engine before trips are committed.
export interface PlanRecommendation {
  id: string
  vehicleId: string
  driverId: string
  participantIds: string[]
  routePath: LatLng[]
  stops: TripStop[]
  distanceKm: number
  durationMinutes: number
  estimatedCost: number
  capacityUtilization: number
  routeScore: number
  efficiencyScore: number
  vehiclePickupTime?: string
  vehiclePickupOffsetMinutes?: number
  scheduledArrivalTime?: string
  programStartTime?: string
  violations: string[]
}

// A participant the planner could not place in any route, with a human-readable reason.
export interface UnassignedParticipant {
  participantId: string
  reason: string
}

export interface PlanResult {
  recommendations: PlanRecommendation[]
  unassigned: UnassignedParticipant[]
}
