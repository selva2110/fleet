import type {
  Center,
  Driver,
  FleetEvent,
  MealDelivery,
  Participant,
  SmsNotification,
  Trip,
  Vehicle,
} from '@/lib/types'
import type {
  centers,
  drivers,
  events,
  mealDeliveries,
  participants,
  smsNotifications,
  trips,
  vehicles,
} from './schema'

type CenterRow = typeof centers.$inferSelect
type ParticipantRow = typeof participants.$inferSelect
type VehicleRow = typeof vehicles.$inferSelect
type DriverRow = typeof drivers.$inferSelect
type EventRow = typeof events.$inferSelect
type TripRow = typeof trips.$inferSelect
type SmsNotificationRow = typeof smsNotifications.$inferSelect
type MealDeliveryRow = typeof mealDeliveries.$inferSelect

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
    registrationDeadline: r.registrationDeadline,
    roundTrip: r.roundTrip ?? false,
    returnTime: r.returnTime,
    status: r.status as FleetEvent['status'],
  }
}

export function toSmsNotification(r: SmsNotificationRow): SmsNotification {
  return {
    id: r.id,
    eventId: r.eventId,
    participantId: r.participantId,
    phone: r.phone,
    messageSid: r.messageSid,
    deliveryStatus: r.deliveryStatus,
    response: r.response,
    responseBody: r.responseBody,
    respondedAt: r.respondedAt ? r.respondedAt.toISOString() : null,
    sentAt: r.sentAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
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
    tripKind: (r.tripKind as Trip['tripKind']) ?? 'outbound',
    distanceKm: r.distanceKm,
    durationMinutes: r.durationMinutes,
    etaCenter: r.etaCenter,
    progress: r.progress,
    currentLocation: r.currentLocation,
    routePath: r.routePath,
    startedAt: r.startedAt ? r.startedAt.toISOString() : null,
  }
}

export function toMealDelivery(r: MealDeliveryRow): MealDelivery {
  return {
    id: r.id,
    runNumber: r.runNumber,
    centerId: r.centerId,
    vehicleId: r.vehicleId,
    driverId: r.driverId,
    date: r.date,
    departTime: r.departTime,
    mealType: r.mealType,
    totalMeals: r.totalMeals,
    stops: r.stops,
    status: r.status as MealDelivery['status'],
    distanceKm: r.distanceKm,
    durationMinutes: r.durationMinutes,
    progress: r.progress,
    currentLocation: r.currentLocation,
    routePath: r.routePath,
    startedAt: r.startedAt ? r.startedAt.toISOString() : null,
  }
}
