// Drizzle schema for the Smart Vehicle platform (Neon Postgres).
// Nested/structured fields are stored as JSONB so domain shapes in lib/types.ts
// map 1:1 onto rows. No auth/user scoping: this is a single-tenant ops tool
// driven by a mock role switcher.

import {
  boolean,
  integer,
  jsonb,
  pgTable,
  real,
  serial,
  text,
  timestamp,
} from 'drizzle-orm/pg-core'
import type {
  CenterType,
  DriverStatus,
  EventReminder,
  EventStatus,
  EventType,
  LatLng,
  MedicalPriority,
  MobilityLevel,
  ParticipantStatus,
  SmsDeliveryStatus,
  SmsResponseCode,
  TransportConstraints,
  TripStatus,
  TripStop,
  VehicleStatus,
  VehicleType,
} from '../types'

export const centers = pgTable('centers', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  type: text('type').$type<CenterType>().notNull(),
  address: text('address').notNull(),
  location: jsonb('location').$type<LatLng>().notNull(),
  operatingHours: text('operating_hours').notNull(),
  capacity: integer('capacity').notNull(),
})

export const participants = pgTable('participants', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  phone: text('phone').notNull().default(''),
  emergencyContact: text('emergency_contact').notNull().default(''),
  address: text('address').notNull().default(''),
  location: jsonb('location').$type<LatLng>().notNull(),
  medicalNotes: text('medical_notes').notNull().default(''),
  constraints: jsonb('constraints').$type<TransportConstraints>().notNull().default({}),
  maxTravelMinutes: integer('max_travel_minutes').notNull().default(40),
  pickupWindow: text('pickup_window').notNull().default(''),
  mobilityLevel: text('mobility_level').$type<MobilityLevel>().notNull(),
  medicalPriority: text('medical_priority').$type<MedicalPriority>().notNull(),
  eligible: boolean('eligible').notNull().default(true),
  status: text('status').$type<ParticipantStatus>().notNull(),
  eventId: text('event_id'),
})

export const vehicles = pgTable('vehicles', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  address: text('address').notNull().default(''),
  type: text('type').$type<VehicleType>().notNull(),
  capacity: integer('capacity').notNull(),
  wheelchairCapacity: integer('wheelchair_capacity').notNull().default(0),
  oxygenEquipment: boolean('oxygen_equipment').notNull().default(false),
  liftAvailable: boolean('lift_available').notNull().default(false),
  bariatricCapable: boolean('bariatric_capable').notNull().default(false),
  stretcherCapable: boolean('stretcher_capable').notNull().default(false),
  fuelType: text('fuel_type').notNull(),
  maintenanceStatus: text('maintenance_status').notNull(),
  status: text('status').$type<VehicleStatus>().notNull(),
  location: jsonb('location').$type<LatLng>().notNull(),
  imageUrl: text('image_url'),
})

export const drivers = pgTable('drivers', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  phone: text('phone').notNull().default(''),
  address: text('address').notNull().default(''),
  location: jsonb('location').$type<LatLng>().notNull(),
  license: text('license').notNull().default(''),
  certifications: jsonb('certifications')
    .$type<{ wheelchairAssist: boolean; medicalTransport: boolean }>()
    .notNull(),
  assignedVehicleId: text('assigned_vehicle_id'),
  status: text('status').$type<DriverStatus>().notNull(),
  rating: real('rating').notNull().default(4.5),
  shiftStart: text('shift_start').notNull().default('00:00'),
  shiftEnd: text('shift_end').notNull().default('23:59'),
  shiftDays: jsonb('shift_days').$type<number[]>().notNull().default([0, 1, 2, 3, 4, 5, 6]),
  imageUrl: text('image_url'),
})

export const events = pgTable('events', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  type: text('type').$type<EventType>().notNull(),
  centerId: text('center_id').notNull(),
  date: text('date').notNull(),
  startTime: text('start_time').notNull(),
  endTime: text('end_time').notNull(),
  expectedAttendance: integer('expected_attendance').notNull().default(0),
  participantIds: jsonb('participant_ids').$type<string[]>().notNull().default([]),
  reminders: jsonb('reminders').$type<EventReminder[]>().notNull().default([]),
  registrationDeadline: text('registration_deadline'),
  status: text('status').$type<EventStatus>().notNull(),
})

// Per-participant SMS program notifications: tracks Twilio delivery status and
// captures the participant's latest attendance/transport response.
export const smsNotifications = pgTable('sms_notifications', {
  id: text('id').primaryKey(),
  eventId: text('event_id').notNull(),
  participantId: text('participant_id').notNull(),
  phone: text('phone').notNull(),
  messageSid: text('message_sid'),
  deliveryStatus: text('delivery_status').$type<SmsDeliveryStatus>().notNull().default('queued'),
  response: text('response').$type<SmsResponseCode>(),
  responseBody: text('response_body'),
  respondedAt: timestamp('responded_at', { withTimezone: true }),
  sentAt: timestamp('sent_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

export const trips = pgTable('trips', {
  id: text('id').primaryKey(),
  tripNumber: text('trip_number').notNull(),
  eventId: text('event_id').notNull(),
  vehicleId: text('vehicle_id'),
  driverId: text('driver_id'),
  stops: jsonb('stops').$type<TripStop[]>().notNull().default([]),
  destinationCenterId: text('destination_center_id').notNull(),
  status: text('status').$type<TripStatus>().notNull(),
  distanceKm: real('distance_km').notNull().default(0),
  durationMinutes: real('duration_minutes').notNull().default(0),
  etaCenter: text('eta_center').notNull().default(''),
  progress: real('progress').notNull().default(0),
  currentLocation: jsonb('current_location').$type<LatLng>().notNull(),
  routePath: jsonb('route_path').$type<LatLng[]>().notNull().default([]),
  startedAt: timestamp('started_at', { withTimezone: true }),
  lastTickAt: timestamp('last_tick_at', { withTimezone: true }),
})

// Append-only domain event log for audit + debugging. Every state mutation
// records a row here.
export const eventLog = pgTable('event_log', {
  id: serial('id').primaryKey(),
  eventType: text('event_type').notNull(),
  aggregateType: text('aggregate_type').notNull(),
  aggregateId: text('aggregate_id').notNull().default(''),
  actorRole: text('actor_role').notNull().default('system'),
  summary: text('summary').notNull().default(''),
  payload: jsonb('payload').$type<Record<string, unknown>>().notNull().default({}),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

export type EventLogRow = typeof eventLog.$inferSelect
