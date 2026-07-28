// Domain event catalogue for the event-driven architecture.
// Every state change in the platform is expressed as a domain event that is
// (1) appended to the `event_log` table in Postgres for debugging/audit and
// (2) used to drive side effects. This is the single source of truth for the
// event vocabulary.

export type DomainEventType =
  // Entity lifecycle
  | 'event.created'
  | 'event.updated'
  | 'event.deleted'
  | 'event.reminder.sent'
  | 'participant.created'
  | 'participant.updated'
  | 'participant.deleted'
  | 'vehicle.created'
  | 'vehicle.updated'
  | 'vehicle.deleted'
  | 'driver.created'
  | 'driver.updated'
  | 'driver.deleted'
  // Dispatch lifecycle
  | 'plan.generated'
  | 'plan.committed'
  | 'trip.created'
  | 'trip.dispatched'
  | 'trip.driver_assigned'
  | 'trip.started'
  | 'trip.pickup_reached'
  | 'trip.participant_picked_up'
  | 'trip.onboard'
  | 'trip.arrived'
  | 'trip.completed'
  | 'trip.cancelled'
  | 'trips.cleared_all'
  // Live tracking
  | 'trip.location_updated'
  | 'vehicle.location_updated'
  // System
  | 'simulation.started'
  | 'simulation.stopped'
  | 'system.seeded'
  | 'system.reset'

export type AggregateType =
  | 'event'
  | 'participant'
  | 'vehicle'
  | 'driver'
  | 'trip'
  | 'plan'
  | 'system'

export interface DomainEvent {
  id: number
  eventType: DomainEventType
  aggregateType: AggregateType
  aggregateId: string
  actorRole: string
  summary: string
  payload: Record<string, unknown>
  createdAt: string
}

export interface EmitInput {
  eventType: DomainEventType
  aggregateType: AggregateType
  aggregateId?: string
  actorRole?: string
  summary: string
  payload?: Record<string, unknown>
}

// Human-friendly metadata used by the event feed / debug log UI.
export const EVENT_META: Record<
  string,
  { label: string; tone: 'info' | 'success' | 'warning' | 'danger' | 'muted' }
> = {
  'event.created': { label: 'Event created', tone: 'info' },
  'event.updated': { label: 'Event updated', tone: 'info' },
  'event.deleted': { label: 'Event deleted', tone: 'danger' },
  'event.reminder.sent': { label: 'Reminder sent', tone: 'warning' },
  'participant.created': { label: 'Participant added', tone: 'info' },
  'participant.updated': { label: 'Participant updated', tone: 'info' },
  'participant.deleted': { label: 'Participant removed', tone: 'danger' },
  'vehicle.created': { label: 'Vehicle added', tone: 'info' },
  'vehicle.updated': { label: 'Vehicle updated', tone: 'info' },
  'vehicle.deleted': { label: 'Vehicle removed', tone: 'danger' },
  'driver.created': { label: 'Driver added', tone: 'info' },
  'driver.updated': { label: 'Driver updated', tone: 'info' },
  'driver.deleted': { label: 'Driver removed', tone: 'danger' },
  'plan.generated': { label: 'Plan generated', tone: 'info' },
  'plan.committed': { label: 'Plan committed', tone: 'success' },
  'trip.created': { label: 'Trip created', tone: 'info' },
  'trip.dispatched': { label: 'Trip dispatched', tone: 'success' },
  'trip.driver_assigned': { label: 'Driver assigned', tone: 'info' },
  'trip.started': { label: 'Trip started', tone: 'success' },
  'trip.pickup_reached': { label: 'Pickup reached', tone: 'info' },
  'trip.participant_picked_up': { label: 'Participant picked up', tone: 'success' },
  'trip.onboard': { label: 'All aboard', tone: 'success' },
  'trip.arrived': { label: 'Arrived at center', tone: 'success' },
  'trip.completed': { label: 'Trip completed', tone: 'success' },
  'trip.cancelled': { label: 'Trip cancelled', tone: 'danger' },
  'trips.cleared_all': { label: 'All trips cleared', tone: 'warning' },
  'trip.location_updated': { label: 'Location updated', tone: 'muted' },
  'vehicle.location_updated': { label: 'Vehicle moved', tone: 'muted' },
  'simulation.started': { label: 'Live tracking started', tone: 'success' },
  'simulation.stopped': { label: 'Live tracking paused', tone: 'warning' },
  'system.seeded': { label: 'Database seeded', tone: 'info' },
  'system.reset': { label: 'System reset', tone: 'warning' },
}
