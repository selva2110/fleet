import { ACTION_META, findField, OPERATOR_META } from './config'
import type {
  Condition,
  ConditionResult,
  ConditionValue,
  FieldKey,
  Rule,
  RuleAction,
  RuleEntity,
  RuleTestResult,
  TestContext,
} from './types'

export function fieldKey(entity: string, field: string): FieldKey {
  return `${entity}.${field}`
}

/** Distinct field keys referenced across a rule's WHEN block, in order. */
export function referencedFields(rule: Rule): { entity: RuleEntity; field: string }[] {
  const seen = new Set<string>()
  const out: { entity: RuleEntity; field: string }[] = []
  for (const cond of rule.when.conditions) {
    const key = fieldKey(cond.entity, cond.field)
    if (seen.has(key)) continue
    seen.add(key)
    out.push({ entity: cond.entity, field: cond.field })
  }
  return out
}

/** Human-readable sentence for a single condition (used in cards/preview). */
export function describeCondition(cond: Condition): string {
  const field = findField(cond.entity, cond.field)
  const label = field?.label ?? cond.field
  const op = OPERATOR_META[cond.operator]
  if (cond.operator === 'is_true' || cond.operator === 'is_false') {
    return `${label} ${op.label}`
  }
  const value = Array.isArray(cond.value) ? cond.value.join(', ') : String(cond.value)
  const unit = field?.unit ? ` ${field.unit}` : ''
  return `${label} ${op.label} ${value}${unit}`
}

export function describeAction(action: RuleAction): string {
  const meta = ACTION_META[action.kind]
  const weight = meta.hasWeight && action.weight != null ? ` (${action.weight})` : ''
  return `${meta.verb}: ${action.target}${weight}`
}

// -------------------------------------------------------------------------
// Rule JSON — the serialized shape the planner consumes. Kept compact and
// deterministic so the live preview is stable and diff-friendly.
// -------------------------------------------------------------------------

export function toRuleJSON(rule: Rule): Record<string, unknown> {
  return {
    id: rule.id,
    name: rule.name,
    category: rule.category,
    type: rule.type,
    enabled: rule.enabled,
    priority: rule.priority,
    when: {
      logic: rule.when.logic,
      conditions: rule.when.conditions.map((cond) => ({
        entity: cond.entity,
        field: cond.field,
        operator: cond.operator,
        value: cond.value,
      })),
    },
    then: rule.then.map((action) => {
      const base: Record<string, unknown> = { action: action.kind, target: action.target }
      if (ACTION_META[action.kind].hasWeight && action.weight != null) base.weight = action.weight
      return base
    }),
    metadata: {
      ruleSet: rule.ruleSetId,
      version: rule.version,
      status: rule.status,
      updatedAt: rule.updatedAt,
      updatedBy: rule.updatedBy,
    },
  }
}

export function toRuleJSONString(rule: Rule): string {
  return JSON.stringify(toRuleJSON(rule), null, 2)
}

// -------------------------------------------------------------------------
// Evaluation — used by the Test Rule panel
// -------------------------------------------------------------------------

function coerceNumber(value: ConditionValue | undefined): number {
  if (typeof value === 'number') return value
  if (typeof value === 'boolean') return value ? 1 : 0
  const n = Number(value)
  return Number.isFinite(n) ? n : NaN
}

function coerceBoolean(value: ConditionValue | undefined): boolean {
  if (typeof value === 'boolean') return value
  if (typeof value === 'number') return value !== 0
  return String(value).toLowerCase() === 'true'
}

export function evaluateCondition(cond: Condition, actual: ConditionValue | undefined): boolean {
  switch (cond.operator) {
    case 'eq':
      return String(actual) === String(cond.value)
    case 'neq':
      return String(actual) !== String(cond.value)
    case 'gt':
      return coerceNumber(actual) > coerceNumber(cond.value)
    case 'gte':
      return coerceNumber(actual) >= coerceNumber(cond.value)
    case 'lt':
      return coerceNumber(actual) < coerceNumber(cond.value)
    case 'lte':
      return coerceNumber(actual) <= coerceNumber(cond.value)
    case 'in': {
      const set = (Array.isArray(cond.value) ? cond.value : [cond.value]).map(String)
      return set.includes(String(actual))
    }
    case 'not_in': {
      const set = (Array.isArray(cond.value) ? cond.value : [cond.value]).map(String)
      return !set.includes(String(actual))
    }
    case 'is_true':
      return coerceBoolean(actual) === true
    case 'is_false':
      return coerceBoolean(actual) === false
    default:
      return false
  }
}

/**
 * Evaluate a rule against a flat test context keyed by `entity.field`.
 *
 * The WHEN block "fires" when its conditions combine (AND / OR) to true.
 * A fired HARD rule produces a violation (FAIL); a fired SOFT rule flags or
 * penalizes; a fired OPTIMIZATION rule adjusts the score. A rule that does
 * not fire is simply not applicable and passes cleanly.
 */
export function evaluateRule(rule: Rule, context: TestContext): RuleTestResult {
  const conditionResults: ConditionResult[] = rule.when.conditions.map((condition) => {
    const actual = context[fieldKey(condition.entity, condition.field)]
    return { condition, actual, pass: evaluateCondition(condition, actual) }
  })

  const fired =
    conditionResults.length === 0
      ? false
      : rule.when.logic === 'AND'
        ? conditionResults.every((r) => r.pass)
        : conditionResults.some((r) => r.pass)

  const violations: string[] = []
  const notes: string[] = []
  let score = 0

  if (fired) {
    for (const action of rule.then) {
      const meta = ACTION_META[action.kind]
      if (rule.type === 'HARD' && (action.kind === 'block' || action.kind === 'require')) {
        violations.push(describeAction(action))
      } else if (action.kind === 'flag') {
        notes.push(`Flagged: ${action.target}`)
      } else if (action.kind === 'penalize') {
        score -= action.weight ?? 0
        notes.push(`Penalty −${action.weight ?? 0}: ${action.target}`)
      } else if (action.kind === 'boost' || action.kind === 'prefer') {
        score += action.weight ?? 0
        notes.push(`Boost +${action.weight ?? 0}: ${action.target}`)
      } else {
        notes.push(`${meta.verb}: ${action.target}`)
      }
    }
  } else {
    notes.push('Rule not triggered by this scenario — no action taken.')
  }

  const result: 'PASS' | 'FAIL' = violations.length > 0 ? 'FAIL' : 'PASS'
  return { fired, result, conditionResults, violations, notes, score }
}

/** Seed a test context from the field catalog samples for a given rule. */
export function seedTestContext(rule: Rule): TestContext {
  const ctx: TestContext = {}
  for (const cond of rule.when.conditions) {
    const field = findField(cond.entity, cond.field)
    if (field) ctx[fieldKey(cond.entity, cond.field)] = field.sample
  }
  return ctx
}

let nextId = 1000
export function uid(prefix: string): string {
  nextId += 1
  return `${prefix}-${Date.now().toString(36)}-${nextId}`
}
