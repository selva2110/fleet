import type {
  Center,
  Driver,
  FleetEvent,
  Participant,
  Trip,
  Vehicle,
} from '@/lib/types'
import type {
  centers,
  drivers,
  events,
  participants,
  trips,
  vehicles,
} from './schema'

type CenterRow = typeof centers.$inferSelect
type ParticipantRow = typeof participants.$inferSelect
type VehicleRow = typeof vehicles.$inferSelect
type DriverRow = typeof drivers.$inferSelect
type EventRow = typeof events.$inferSelect
type TripRow = typeof trips.$inferSelect

export function toCenter(r: CenterRow): Center {
  return {
    id: r.id,
    name: r.name,
    type: r.type as Center['type'],
    address: r.address,
    location: r.location,
    operatingHours: r.operatingHours,
    capacity: r.capacity,
  }
}

export function toParticipant(r: ParticipantRow): Participant {
  return {
    id: r.id,
    name: r.name,
    phone: r.phone,
    emergencyContact: r.emergencyContact,
    address: r.address,
    location: r.location,
    medicalNotes: r.medicalNotes,
    constraints: r.constraints,
    maxTravelMinutes: r.maxTravelMinutes,
    pickupWindow: r.pickupWindow,
    mobilityLevel: r.mobilityLevel as Participant['mobilityLevel'],
    medicalPriority: r.medicalPriority as Participant['medicalPriority'],
    eligible: r.eligible,
    status: r.status as Participant['status'],
    eventId: r.eventId,
  }
}

export function toVehicle(r: VehicleRow): Vehicle {
  return {
    id: r.id,
    name: r.name,
    address: r.address,
    type: r.type as Vehicle['type'],
    capacity: r.capacity,
    wheelchairCapacity: r.wheelchairCapacity,
    oxygenEquipment: r.oxygenEquipment,
    liftAvailable: r.liftAvailable,
    bariatricCapable: r.bariatricCapable,
    stretcherCapable: r.stretcherCapable,
    fuelType: r.fuelType as Vehicle['fuelType'],
    maintenanceStatus: r.maintenanceStatus as Vehicle['maintenanceStatus'],
    status: r.status as Vehicle['status'],
    location: r.location,
  }
}

export function toDriver(r: DriverRow): Driver {
  return {
    id: r.id,
    name: r.name,
    phone: r.phone,
    address: r.address,
    location: r.location,
    license: r.license,
    certifications: r.certifications,
    assignedVehicleId: r.assignedVehicleId,
    status: r.status as Driver['status'],
    rating: r.rating,
    shiftStart: r.shiftStart,
    shiftEnd: r.shiftEnd,
    shiftDays: r.shiftDays,
  }
}

export function toEvent(r: EventRow): FleetEvent {
  return {
    id: r.id,
    name: r.name,
    type: r.type as FleetEvent['type'],
    centerId: r.centerId,
    date: r.date,
    startTime: r.startTime,
    endTime: r.endTime,
    expectedAttendance: r.expectedAttendance,
    participantIds: r.participantIds,
    reminders: r.reminders,
    status: r.status as FleetEvent['status'],
  }
}

export function toTrip(r: TripRow): Trip {
  return {
    id: r.id,
    tripNumber: r.tripNumber,
    eventId: r.eventId,
    vehicleId: r.vehicleId,
    driverId: r.driverId,
    stops: r.stops,
    destinationCenterId: r.destinationCenterId,
    status: r.status as Trip['status'],
    distanceKm: r.distanceKm,
    durationMinutes: r.durationMinutes,
    etaCenter: r.etaCenter,
    progress: r.progress,
    currentLocation: r.currentLocation,
    routePath: r.routePath,
    startedAt: r.startedAt ? r.startedAt.toISOString() : null,
  }
}
