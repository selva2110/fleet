import type {
  DriverStatus,
  ParticipantStatus,
  Role,
  TripStatus,
  VehicleStatus,
} from './types'

export const ROLES: { id: Role; label: string; short: string }[] = [
  { id: 'admin', label: 'System Administrator', short: 'Admin' },
  { id: 'dispatcher', label: 'Dispatcher', short: 'Dispatcher' },
  { id: 'operations', label: 'Operations Manager', short: 'Ops Manager' },
  { id: 'driver', label: 'Driver', short: 'Driver' },
  { id: 'center', label: 'Center Manager', short: 'Center Mgr' },
  { id: 'participant', label: 'Participant', short: 'Participant' },
  { id: 'caregiver', label: 'Caregiver', short: 'Caregiver' },
]

// Tailwind class tokens for status badges.
export const tripStatusMeta: Record<TripStatus, { label: string; cls: string; map: string }> = {
  planned: { label: 'Planned', cls: 'bg-muted text-muted-foreground', map: '#64748b' },
  'vehicle-assigned': { label: 'Vehicle Assigned', cls: 'bg-accent text-accent-foreground', map: '#3b82f6' },
  'driver-assigned': { label: 'Driver Assigned', cls: 'bg-accent text-accent-foreground', map: '#3b82f6' },
  'en-route': { label: 'En Route', cls: 'bg-primary/15 text-primary', map: '#2563eb' },
  'pickup-in-progress': { label: 'Pickup In Progress', cls: 'bg-warning/20 text-warning-foreground', map: '#d97706' },
  onboard: { label: 'Onboard', cls: 'bg-primary/15 text-primary', map: '#2563eb' },
  arrived: { label: 'Arrived', cls: 'bg-success/20 text-success', map: '#059669' },
  completed: { label: 'Completed', cls: 'bg-success/20 text-success', map: '#059669' },
  cancelled: { label: 'Cancelled', cls: 'bg-destructive/15 text-destructive', map: '#dc2626' },
}

export const vehicleStatusMeta: Record<VehicleStatus, { label: string; cls: string; map: string }> = {
  available: { label: 'Available', cls: 'bg-success/20 text-success', map: '#059669' },
  assigned: { label: 'Assigned', cls: 'bg-accent text-accent-foreground', map: '#3b82f6' },
  'heading-to-pickup': { label: 'Heading to Pickup', cls: 'bg-primary/15 text-primary', map: '#2563eb' },
  onboard: { label: 'Participant Onboard', cls: 'bg-primary/15 text-primary', map: '#2563eb' },
  'at-destination': { label: 'At Destination', cls: 'bg-success/20 text-success', map: '#059669' },
  returning: { label: 'Returning', cls: 'bg-muted text-muted-foreground', map: '#64748b' },
  offline: { label: 'Offline', cls: 'bg-muted text-muted-foreground', map: '#94a3b8' },
}

export const participantStatusMeta: Record<ParticipantStatus, { label: string; cls: string }> = {
  registered: { label: 'Registered', cls: 'bg-muted text-muted-foreground' },
  scheduled: { label: 'Scheduled', cls: 'bg-accent text-accent-foreground' },
  'vehicle-assigned': { label: 'Vehicle Assigned', cls: 'bg-accent text-accent-foreground' },
  'driver-assigned': { label: 'Driver Assigned', cls: 'bg-primary/15 text-primary' },
  'driver-approaching': { label: 'Driver Approaching', cls: 'bg-warning/20 text-warning-foreground' },
  'picked-up': { label: 'Picked Up', cls: 'bg-primary/15 text-primary' },
  'dropped-off': { label: 'Dropped Off', cls: 'bg-success/20 text-success' },
  completed: { label: 'Completed', cls: 'bg-success/20 text-success' },
}

export const driverStatusMeta: Record<DriverStatus, { label: string; cls: string }> = {
  available: { label: 'Available', cls: 'bg-success/20 text-success' },
  'on-trip': { label: 'On Trip', cls: 'bg-primary/15 text-primary' },
  break: { label: 'On Break', cls: 'bg-warning/20 text-warning-foreground' },
  offline: { label: 'Offline', cls: 'bg-muted text-muted-foreground' },
}

// --- US unit formatting -------------------------------------------------
// Distances are stored internally in kilometers; the UI displays US units (miles).
const KM_TO_MILES = 0.621371

export function kmToMiles(km: number): number {
  return km * KM_TO_MILES
}

/** Format a kilometer value as US miles, e.g. formatMiles(19.7) -> "12.2 mi" */
export function formatMiles(km: number, digits = 1): string {
  const miles = kmToMiles(km).toLocaleString('en-US', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  })
  return `${miles} mi`
}

const DAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

/** Format working-day indices (0=Sun..6=Sat) as "Mon–Fri" style text. */
export function formatShiftDays(days: number[]): string {
  if (days.length === 7) return 'Every day'
  if (days.length === 0) return 'No days set'
  const sorted = [...days].sort()
  const isWeekdays = sorted.length === 5 && sorted.every((d, i) => d === i + 1)
  if (isWeekdays) return 'Mon–Fri'
  return sorted.map((d) => DAY_SHORT[d]).join(', ')
}

export const constraintLabels: { key: string; label: string; short: string }[] = [
  { key: 'wheelchair', label: 'Wheelchair Required', short: 'WC' },
  { key: 'poweredWheelchair', label: 'Powered Wheelchair', short: 'PWC' },
  { key: 'walker', label: 'Walker Support', short: 'Walker' },
  { key: 'oxygen', label: 'Oxygen Support', short: 'O2' },
  { key: 'caregiverRequired', label: 'Caregiver Required', short: 'Caregiver' },
  { key: 'bariatric', label: 'Bariatric Seating', short: 'Bariatric' },
  { key: 'visualAssist', label: 'Visual Assistance', short: 'Visual' },
  { key: 'cognitiveAssist', label: 'Cognitive Assistance', short: 'Cognitive' },
  { key: 'serviceAnimal', label: 'Service Animal', short: 'Service Animal' },
]
