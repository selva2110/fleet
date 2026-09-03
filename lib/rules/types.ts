// -------------------------------------------------------------------------
// Rule Engine domain model
//
// A rule reads like a sentence:
//   WHEN <conditions on participant / driver / vehicle / trip / event>
//   THEN <one or more actions>
//
// HARD rules are constraints the planner must never break (a fired HARD rule
// is a violation). SOFT rules apply penalties/flags but still allow a plan.
// OPTIMIZATION rules nudge scoring (boost / penalize) to shape preferred plans.
// -------------------------------------------------------------------------

export type RuleEntity = 'participant' | 'driver' | 'vehicle' | 'trip' | 'event'

export type RuleType = 'HARD' | 'SOFT' | 'OPTIMIZATION'

export type RuleStatus = 'active' | 'draft' | 'disabled'

export type RuleCategory =
  | 'eligibility'
  | 'safety'
  | 'capacity'
  | 'scheduling'
  | 'cost'
  | 'compliance'

export type FieldType = 'number' | 'boolean' | 'enum'

export type Operator =
  | 'eq'
  | 'neq'
  | 'gt'
  | 'gte'
  | 'lt'
  | 'lte'
  | 'in'
  | 'not_in'
  | 'is_true'
  | 'is_false'

/** A selectable field within one entity, used to build conditions. */
export interface FieldDef {
  /** Field name within its entity (e.g. `mobilityLevel`). */
  field: string
  entity: RuleEntity
  label: string
  type: FieldType
  /** Allowed values for enum fields. */
  options?: { value: string; label: string }[]
  /** Suffix shown in the builder / test panel (e.g. `min`, `mi`, `lb`). */
  unit?: string
  /** Default value seeded into the Test Rule panel. */
  sample: string | number | boolean
}

export type ConditionValue = string | number | boolean | string[]

export interface Condition {
  id: string
  entity: RuleEntity
  field: string
  operator: Operator
  value: ConditionValue
}

export type LogicOp = 'AND' | 'OR'

/** The WHEN block: a list of conditions joined by a single logic operator. */
export interface ConditionGroup {
  logic: LogicOp
  conditions: Condition[]
}

export type ActionKind =
  | 'block'
  | 'require'
  | 'flag'
  | 'penalize'
  | 'boost'
  | 'prefer'

export interface RuleAction {
  id: string
  kind: ActionKind
  /** Human-readable target / message (e.g. "wheelchair-accessible vehicle"). */
  target: string
  /** Score weight for SOFT / OPTIMIZATION actions. */
  weight?: number
}

export interface Rule {
  id: string
  name: string
  description: string
  category: RuleCategory
  type: RuleType
  status: RuleStatus
  enabled: boolean
  /** 1 = highest. Lower numbers evaluate first. */
  priority: number
  when: ConditionGroup
  then: RuleAction[]
  ruleSetId: string
  version: number
  updatedAt: string
  updatedBy: string
}

export type RuleVersionStatus = 'published' | 'draft' | 'archived'

export interface RuleSetVersion {
  version: number
  status: RuleVersionStatus
  createdAt: string
  createdBy: string
  note: string
  ruleCount: number
}

export interface RuleSet {
  id: string
  name: string
  description: string
  activeVersion: number
  versions: RuleSetVersion[]
}

// -------------------------------------------------------------------------
// Test-panel evaluation result shapes
// -------------------------------------------------------------------------

/** A flattened field key: `${entity}.${field}`. */
export type FieldKey = string

export type TestContext = Record<FieldKey, ConditionValue>

export interface ConditionResult {
  condition: Condition
  actual: ConditionValue | undefined
  pass: boolean
}

export interface RuleTestResult {
  /** Did the WHEN block match the scenario? */
  fired: boolean
  /** Overall PASS / FAIL for the scenario against this rule. */
  result: 'PASS' | 'FAIL'
  conditionResults: ConditionResult[]
  violations: string[]
  notes: string[]
  /** Net score delta contributed by SOFT / OPTIMIZATION actions. */
  score: number
}
