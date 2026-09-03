import type {
  ActionKind,
  FieldDef,
  Operator,
  Rule,
  RuleCategory,
  RuleEntity,
  RuleSet,
  RuleStatus,
  RuleType,
} from './types'

// -------------------------------------------------------------------------
// Display metadata (badge classes reuse the app's semantic design tokens)
// -------------------------------------------------------------------------

export const ENTITY_META: Record<
  RuleEntity,
  { label: string; cls: string; icon: string }
> = {
  participant: { label: 'Participant', cls: 'bg-primary/15 text-primary', icon: 'user' },
  driver: { label: 'Driver', cls: 'bg-accent text-accent-foreground', icon: 'wheel' },
  vehicle: { label: 'Vehicle', cls: 'bg-chart-2/20 text-foreground', icon: 'truck' },
  trip: { label: 'Trip', cls: 'bg-chart-3/20 text-foreground', icon: 'route' },
  event: { label: 'Event', cls: 'bg-chart-4/25 text-foreground', icon: 'calendar' },
}

export const RULE_TYPE_META: Record<
  RuleType,
  { label: string; cls: string; dot: string; description: string }
> = {
  HARD: {
    label: 'Hard',
    cls: 'bg-danger-muted text-danger border border-danger-border',
    dot: 'bg-danger',
    description: 'Must never be broken. A match blocks the plan.',
  },
  SOFT: {
    label: 'Soft',
    cls: 'bg-warning/20 text-warning-foreground',
    dot: 'bg-warning',
    description: 'Applies penalties or flags but still allows a plan.',
  },
  OPTIMIZATION: {
    label: 'Optimization',
    cls: 'bg-primary/15 text-primary',
    dot: 'bg-primary',
    description: 'Nudges scoring to shape preferred plans.',
  },
}

export const STATUS_META: Record<RuleStatus, { label: string; cls: string }> = {
  active: { label: 'Active', cls: 'bg-success/20 text-success' },
  draft: { label: 'Draft', cls: 'bg-muted text-muted-foreground' },
  disabled: { label: 'Disabled', cls: 'bg-muted text-muted-foreground/70' },
}

export const CATEGORY_META: Record<RuleCategory, { label: string; cls: string }> = {
  eligibility: { label: 'Eligibility', cls: 'bg-primary/15 text-primary' },
  safety: { label: 'Safety', cls: 'bg-danger-muted text-danger' },
  capacity: { label: 'Capacity', cls: 'bg-chart-2/20 text-foreground' },
  scheduling: { label: 'Scheduling', cls: 'bg-chart-4/25 text-foreground' },
  cost: { label: 'Cost', cls: 'bg-chart-3/20 text-foreground' },
  compliance: { label: 'Compliance', cls: 'bg-accent text-accent-foreground' },
}

export const ACTION_META: Record<
  ActionKind,
  { label: string; cls: string; verb: string; hasWeight: boolean }
> = {
  block: { label: 'Block', cls: 'bg-danger-muted text-danger', verb: 'Block assignment', hasWeight: false },
  require: { label: 'Require', cls: 'bg-primary/15 text-primary', verb: 'Require', hasWeight: false },
  flag: { label: 'Flag', cls: 'bg-warning/20 text-warning-foreground', verb: 'Flag for review', hasWeight: false },
  penalize: { label: 'Penalize', cls: 'bg-warning/20 text-warning-foreground', verb: 'Apply penalty', hasWeight: true },
  boost: { label: 'Boost', cls: 'bg-success/20 text-success', verb: 'Boost score', hasWeight: true },
  prefer: { label: 'Prefer', cls: 'bg-success/20 text-success', verb: 'Prefer', hasWeight: true },
}

// -------------------------------------------------------------------------
// Operators — which ones are valid for each field type
// -------------------------------------------------------------------------

export const OPERATOR_META: Record<Operator, { label: string; symbol: string }> = {
  eq: { label: 'is', symbol: '=' },
  neq: { label: 'is not', symbol: '≠' },
  gt: { label: 'greater than', symbol: '>' },
  gte: { label: 'at least', symbol: '≥' },
  lt: { label: 'less than', symbol: '<' },
  lte: { label: 'at most', symbol: '≤' },
  in: { label: 'is any of', symbol: '∈' },
  not_in: { label: 'is none of', symbol: '∉' },
  is_true: { label: 'is true', symbol: '✓' },
  is_false: { label: 'is false', symbol: '✕' },
}

export const OPERATORS_BY_TYPE: Record<FieldDef['type'], Operator[]> = {
  number: ['eq', 'neq', 'gt', 'gte', 'lt', 'lte'],
  enum: ['eq', 'neq', 'in', 'not_in'],
  boolean: ['is_true', 'is_false'],
}

// -------------------------------------------------------------------------
// Field catalog — the NEMT domain fields available to the rule builder
// -------------------------------------------------------------------------

export const FIELD_CATALOG: FieldDef[] = [
  // Participant
  {
    entity: 'participant', field: 'mobilityLevel', label: 'Mobility level', type: 'enum', sample: 'wheelchair',
    options: [
      { value: 'ambulatory', label: 'Ambulatory' },
      { value: 'wheelchair', label: 'Wheelchair' },
      { value: 'stretcher', label: 'Stretcher' },
      { value: 'bariatric', label: 'Bariatric' },
    ],
  },
  {
    entity: 'participant', field: 'medicalPriority', label: 'Medical priority', type: 'enum', sample: 'high',
    options: [
      { value: 'low', label: 'Low' },
      { value: 'medium', label: 'Medium' },
      { value: 'high', label: 'High' },
      { value: 'critical', label: 'Critical' },
    ],
  },
  { entity: 'participant', field: 'requiresOxygen', label: 'Requires oxygen', type: 'boolean', sample: true },
  { entity: 'participant', field: 'requiresEscort', label: 'Requires escort', type: 'boolean', sample: false },
  { entity: 'participant', field: 'eligibilityActive', label: 'Eligibility active', type: 'boolean', sample: true },
  { entity: 'participant', field: 'weightLbs', label: 'Weight', type: 'number', unit: 'lb', sample: 210 },
  { entity: 'participant', field: 'age', label: 'Age', type: 'number', unit: 'yrs', sample: 72 },
  { entity: 'participant', field: 'maxTravelMinutes', label: 'Max travel time', type: 'number', unit: 'min', sample: 45 },

  // Driver
  { entity: 'driver', field: 'hasWheelchairCert', label: 'Wheelchair certified', type: 'boolean', sample: true },
  { entity: 'driver', field: 'hasCprCert', label: 'CPR certified', type: 'boolean', sample: true },
  { entity: 'driver', field: 'backgroundCheckValid', label: 'Background check valid', type: 'boolean', sample: true },
  { entity: 'driver', field: 'rating', label: 'Rating', type: 'number', unit: '★', sample: 4.6 },
  { entity: 'driver', field: 'hoursOnDutyToday', label: 'Hours on duty today', type: 'number', unit: 'hrs', sample: 6 },
  { entity: 'driver', field: 'yearsExperience', label: 'Years experience', type: 'number', unit: 'yrs', sample: 5 },

  // Vehicle
  {
    entity: 'vehicle', field: 'type', label: 'Vehicle type', type: 'enum', sample: 'Wheelchair Accessible Van',
    options: [
      { value: 'Sedan', label: 'Sedan' },
      { value: 'SUV', label: 'SUV' },
      { value: 'Van', label: 'Van' },
      { value: 'Wheelchair Accessible Van', label: 'Wheelchair Accessible Van' },
      { value: 'Medical Transport Vehicle', label: 'Medical Transport Vehicle' },
      { value: 'Ambulance', label: 'Ambulance' },
    ],
  },
  {
    entity: 'vehicle', field: 'maintenanceStatus', label: 'Maintenance status', type: 'enum', sample: 'good',
    options: [
      { value: 'good', label: 'Good' },
      { value: 'due-soon', label: 'Due soon' },
      { value: 'service-required', label: 'Service required' },
    ],
  },
  { entity: 'vehicle', field: 'wheelchairCapacity', label: 'Wheelchair capacity', type: 'number', unit: 'spaces', sample: 2 },
  { entity: 'vehicle', field: 'capacity', label: 'Seat capacity', type: 'number', unit: 'seats', sample: 6 },
  { entity: 'vehicle', field: 'hasOxygen', label: 'Oxygen equipped', type: 'boolean', sample: true },
  { entity: 'vehicle', field: 'hasLift', label: 'Lift available', type: 'boolean', sample: true },
  { entity: 'vehicle', field: 'bariatricCapable', label: 'Bariatric capable', type: 'boolean', sample: false },
  { entity: 'vehicle', field: 'stretcherCapable', label: 'Stretcher capable', type: 'boolean', sample: false },

  // Trip
  { entity: 'trip', field: 'distanceMiles', label: 'Distance', type: 'number', unit: 'mi', sample: 12 },
  { entity: 'trip', field: 'durationMinutes', label: 'Duration', type: 'number', unit: 'min', sample: 35 },
  { entity: 'trip', field: 'passengerCount', label: 'Passenger count', type: 'number', unit: 'pax', sample: 3 },
  { entity: 'trip', field: 'pickupHour', label: 'Pickup hour', type: 'number', unit: 'h', sample: 8 },
  { entity: 'trip', field: 'costUsd', label: 'Estimated cost', type: 'number', unit: '$', sample: 48 },
  { entity: 'trip', field: 'sharedRide', label: 'Shared ride', type: 'boolean', sample: true },

  // Event
  {
    entity: 'event', field: 'type', label: 'Event type', type: 'enum', sample: 'dialysis',
    options: [
      { value: 'dialysis', label: 'Dialysis' },
      { value: 'medical-appointment', label: 'Medical appointment' },
      { value: 'adult-day', label: 'Adult day program' },
      { value: 'therapy', label: 'Therapy' },
      { value: 'pharmacy', label: 'Pharmacy' },
    ],
  },
  { entity: 'event', field: 'startHour', label: 'Start hour', type: 'number', unit: 'h', sample: 9 },
  { entity: 'event', field: 'attendeeCount', label: 'Attendee count', type: 'number', unit: 'pax', sample: 14 },
  { entity: 'event', field: 'recurring', label: 'Recurring', type: 'boolean', sample: true },
]

export const ENTITIES: RuleEntity[] = ['participant', 'driver', 'vehicle', 'trip', 'event']

export function fieldsForEntity(entity: RuleEntity): FieldDef[] {
  return FIELD_CATALOG.filter((f) => f.entity === entity)
}

export function findField(entity: RuleEntity, field: string): FieldDef | undefined {
  return FIELD_CATALOG.find((f) => f.entity === entity && f.field === field)
}

export const CATEGORY_OPTIONS = (Object.keys(CATEGORY_META) as RuleCategory[]).map((value) => ({
  value,
  label: CATEGORY_META[value].label,
}))

export const TYPE_OPTIONS = (Object.keys(RULE_TYPE_META) as RuleType[]).map((value) => ({
  value,
  label: RULE_TYPE_META[value].label,
}))

export const STATUS_OPTIONS = (Object.keys(STATUS_META) as RuleStatus[]).map((value) => ({
  value,
  label: STATUS_META[value].label,
}))

// -------------------------------------------------------------------------
// Dummy rule sets + versions
// -------------------------------------------------------------------------

export const RULE_SETS: RuleSet[] = [
  {
    id: 'rs-core',
    name: 'NEMT Core Compliance',
    description: 'Baseline safety and eligibility constraints applied to every plan.',
    activeVersion: 3,
    versions: [
      { version: 3, status: 'published', createdAt: '2026-08-18', createdBy: 'A. Reyes', note: 'Added duty-hour cap + stretcher rule', ruleCount: 7 },
      { version: 2, status: 'archived', createdAt: '2026-06-02', createdBy: 'A. Reyes', note: 'Tightened oxygen requirement', ruleCount: 6 },
      { version: 1, status: 'archived', createdAt: '2026-03-11', createdBy: 'System', note: 'Initial import', ruleCount: 4 },
    ],
  },
  {
    id: 'rs-ca-medicaid',
    name: 'California Medicaid Ruleset',
    description: 'State-specific compliance overlays for Medi-Cal NEMT authorizations.',
    activeVersion: 2,
    versions: [
      { version: 2, status: 'published', createdAt: '2026-07-29', createdBy: 'M. Okafor', note: 'Escort policy for minors', ruleCount: 2 },
      { version: 1, status: 'archived', createdAt: '2026-05-14', createdBy: 'M. Okafor', note: 'Initial state overlay', ruleCount: 1 },
    ],
  },
  {
    id: 'rs-optimization',
    name: 'Optimization & Cost',
    description: 'Preference and scoring rules that shape lower-cost, higher-quality plans.',
    activeVersion: 1,
    versions: [
      { version: 1, status: 'draft', createdAt: '2026-08-25', createdBy: 'J. Lin', note: 'Draft scoring model', ruleCount: 3 },
    ],
  },
]

// -------------------------------------------------------------------------
// Dummy rules
// -------------------------------------------------------------------------

let cid = 0
const c = () => `c-${++cid}`
let aid = 0
const a = () => `a-${++aid}`

export const SEED_RULES: Rule[] = [
  {
    id: 'rule-wc-vehicle',
    name: 'Wheelchair riders require accessible vehicle',
    description: 'A wheelchair participant can only be assigned to a vehicle with wheelchair capacity and a lift.',
    category: 'safety',
    type: 'HARD',
    status: 'active',
    enabled: true,
    priority: 1,
    ruleSetId: 'rs-core',
    version: 3,
    updatedAt: '2026-08-18',
    updatedBy: 'A. Reyes',
    when: {
      logic: 'AND',
      conditions: [
        { id: c(), entity: 'participant', field: 'mobilityLevel', operator: 'eq', value: 'wheelchair' },
        { id: c(), entity: 'vehicle', field: 'wheelchairCapacity', operator: 'lt', value: 1 },
      ],
    },
    then: [{ id: a(), kind: 'block', target: 'Assignment to non-accessible vehicle' }],
  },
  {
    id: 'rule-oxygen',
    name: 'Oxygen-dependent riders need equipped vehicle',
    description: 'Participants requiring oxygen must be matched to an oxygen-equipped vehicle.',
    category: 'safety',
    type: 'HARD',
    status: 'active',
    enabled: true,
    priority: 2,
    ruleSetId: 'rs-core',
    version: 3,
    updatedAt: '2026-08-18',
    updatedBy: 'A. Reyes',
    when: {
      logic: 'AND',
      conditions: [
        { id: c(), entity: 'participant', field: 'requiresOxygen', operator: 'is_true', value: true },
        { id: c(), entity: 'vehicle', field: 'hasOxygen', operator: 'is_false', value: false },
      ],
    },
    then: [{ id: a(), kind: 'block', target: 'Assignment without onboard oxygen' }],
  },
  {
    id: 'rule-stretcher',
    name: 'Stretcher riders require stretcher-capable vehicle',
    description: 'Stretcher-bound participants require a stretcher-capable vehicle.',
    category: 'capacity',
    type: 'HARD',
    status: 'active',
    enabled: true,
    priority: 3,
    ruleSetId: 'rs-core',
    version: 3,
    updatedAt: '2026-08-18',
    updatedBy: 'A. Reyes',
    when: {
      logic: 'AND',
      conditions: [
        { id: c(), entity: 'participant', field: 'mobilityLevel', operator: 'eq', value: 'stretcher' },
        { id: c(), entity: 'vehicle', field: 'stretcherCapable', operator: 'is_false', value: false },
      ],
    },
    then: [{ id: a(), kind: 'block', target: 'Assignment to non-stretcher vehicle' }],
  },
  {
    id: 'rule-duty-hours',
    name: 'Driver duty hours cannot exceed 10',
    description: 'A driver already at or beyond 10 on-duty hours cannot take another trip.',
    category: 'compliance',
    type: 'HARD',
    status: 'active',
    enabled: true,
    priority: 4,
    ruleSetId: 'rs-core',
    version: 3,
    updatedAt: '2026-08-18',
    updatedBy: 'A. Reyes',
    when: {
      logic: 'AND',
      conditions: [{ id: c(), entity: 'driver', field: 'hoursOnDutyToday', operator: 'gte', value: 10 }],
    },
    then: [{ id: a(), kind: 'block', target: 'Driver over duty-hour limit' }],
  },
  {
    id: 'rule-maintenance',
    name: 'Out-of-service vehicles cannot be assigned',
    description: 'Vehicles flagged service-required are excluded from planning.',
    category: 'safety',
    type: 'HARD',
    status: 'active',
    enabled: true,
    priority: 5,
    ruleSetId: 'rs-core',
    version: 3,
    updatedAt: '2026-08-18',
    updatedBy: 'A. Reyes',
    when: {
      logic: 'AND',
      conditions: [{ id: c(), entity: 'vehicle', field: 'maintenanceStatus', operator: 'eq', value: 'service-required' }],
    },
    then: [{ id: a(), kind: 'block', target: 'Assignment of out-of-service vehicle' }],
  },
  {
    id: 'rule-bariatric',
    name: 'Bariatric riders require capable vehicle',
    description: 'Bariatric participants (or riders over 300 lb) require a bariatric-capable vehicle.',
    category: 'capacity',
    type: 'HARD',
    status: 'active',
    enabled: true,
    priority: 6,
    ruleSetId: 'rs-core',
    version: 3,
    updatedAt: '2026-08-18',
    updatedBy: 'A. Reyes',
    when: {
      logic: 'OR',
      conditions: [
        { id: c(), entity: 'participant', field: 'mobilityLevel', operator: 'eq', value: 'bariatric' },
        { id: c(), entity: 'participant', field: 'weightLbs', operator: 'gt', value: 300 },
      ],
    },
    then: [{ id: a(), kind: 'require', target: 'Bariatric-capable vehicle' }],
  },
  {
    id: 'rule-critical-travel',
    name: 'Critical priority within 30 minutes',
    description: 'Critical-priority riders should not spend more than 30 minutes in transit.',
    category: 'scheduling',
    type: 'SOFT',
    status: 'active',
    enabled: true,
    priority: 7,
    ruleSetId: 'rs-core',
    version: 3,
    updatedAt: '2026-08-18',
    updatedBy: 'A. Reyes',
    when: {
      logic: 'AND',
      conditions: [
        { id: c(), entity: 'participant', field: 'medicalPriority', operator: 'eq', value: 'critical' },
        { id: c(), entity: 'trip', field: 'durationMinutes', operator: 'gt', value: 30 },
      ],
    },
    then: [{ id: a(), kind: 'penalize', target: 'Excess transit time for critical rider', weight: 50 }],
  },
  {
    id: 'rule-minor-escort',
    name: 'Escort required for minors',
    description: 'Participants under 18 without a booked escort are flagged for coordinator review.',
    category: 'compliance',
    type: 'SOFT',
    status: 'active',
    enabled: true,
    priority: 8,
    ruleSetId: 'rs-ca-medicaid',
    version: 2,
    updatedAt: '2026-07-29',
    updatedBy: 'M. Okafor',
    when: {
      logic: 'AND',
      conditions: [
        { id: c(), entity: 'participant', field: 'age', operator: 'lt', value: 18 },
        { id: c(), entity: 'participant', field: 'requiresEscort', operator: 'is_false', value: false },
      ],
    },
    then: [{ id: a(), kind: 'flag', target: 'Minor without booked escort' }],
  },
  {
    id: 'rule-inactive-eligibility',
    name: 'Block riders with inactive eligibility',
    description: 'Participants whose Medi-Cal eligibility is not active cannot be scheduled.',
    category: 'eligibility',
    type: 'HARD',
    status: 'active',
    enabled: true,
    priority: 9,
    ruleSetId: 'rs-ca-medicaid',
    version: 2,
    updatedAt: '2026-07-29',
    updatedBy: 'M. Okafor',
    when: {
      logic: 'AND',
      conditions: [{ id: c(), entity: 'participant', field: 'eligibilityActive', operator: 'is_false', value: false }],
    },
    then: [{ id: a(), kind: 'block', target: 'Scheduling with inactive eligibility' }],
  },
  {
    id: 'rule-prefer-rated',
    name: 'Prefer high-rated drivers for high priority',
    description: 'Boost the score of drivers rated 4.5★+ when serving high or critical riders.',
    category: 'scheduling',
    type: 'OPTIMIZATION',
    status: 'active',
    enabled: true,
    priority: 10,
    ruleSetId: 'rs-optimization',
    version: 1,
    updatedAt: '2026-08-25',
    updatedBy: 'J. Lin',
    when: {
      logic: 'AND',
      conditions: [
        { id: c(), entity: 'participant', field: 'medicalPriority', operator: 'in', value: ['high', 'critical'] },
        { id: c(), entity: 'driver', field: 'rating', operator: 'gte', value: 4.5 },
      ],
    },
    then: [{ id: a(), kind: 'boost', target: 'High-rated driver match', weight: 20 }],
  },
  {
    id: 'rule-shared-ride',
    name: 'Prefer shared rides to lower cost',
    description: 'Reward shared trips to reduce empty-seat miles and cost.',
    category: 'cost',
    type: 'OPTIMIZATION',
    status: 'active',
    enabled: true,
    priority: 11,
    ruleSetId: 'rs-optimization',
    version: 1,
    updatedAt: '2026-08-25',
    updatedBy: 'J. Lin',
    when: {
      logic: 'AND',
      conditions: [{ id: c(), entity: 'trip', field: 'sharedRide', operator: 'is_true', value: true }],
    },
    then: [{ id: a(), kind: 'boost', target: 'Shared-ride efficiency', weight: 15 }],
  },
  {
    id: 'rule-peak-dialysis',
    name: 'Avoid peak-hour dialysis pickups',
    description: 'Penalize dialysis pickups scheduled during the 7–9am congestion window.',
    category: 'scheduling',
    type: 'SOFT',
    status: 'draft',
    enabled: false,
    priority: 12,
    ruleSetId: 'rs-optimization',
    version: 1,
    updatedAt: '2026-08-25',
    updatedBy: 'J. Lin',
    when: {
      logic: 'AND',
      conditions: [
        { id: c(), entity: 'event', field: 'type', operator: 'eq', value: 'dialysis' },
        { id: c(), entity: 'trip', field: 'pickupHour', operator: 'in', value: ['7', '8', '9'] },
      ],
    },
    then: [{ id: a(), kind: 'penalize', target: 'Peak-hour dialysis pickup', weight: 10 }],
  },
]
