'use client'

import { Plus, Trash2, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import {
  ACTION_META,
  ENTITIES,
  ENTITY_META,
  fieldsForEntity,
  findField,
  OPERATOR_META,
  OPERATORS_BY_TYPE,
} from '@/lib/rules/config'
import type {
  ActionKind,
  Condition,
  ConditionGroup,
  LogicOp,
  Operator,
  RuleAction,
  RuleEntity,
} from '@/lib/rules/types'
import { uid } from '@/lib/rules/utils'

// -------------------------------------------------------------------------
// Compact inline select used throughout the builder
// -------------------------------------------------------------------------
function MiniSelect({
  value,
  options,
  onChange,
  className,
  placeholder,
}: {
  value: string
  options: { value: string; label: string }[]
  onChange: (v: string) => void
  className?: string
  placeholder?: string
}) {
  const active = options.find((o) => o.value === value)
  return (
    <Select value={value} onValueChange={(v) => v != null && onChange(v)}>
      <SelectTrigger size="sm" className={cn('h-8 bg-card', className)}>
        <SelectValue placeholder={placeholder}>{() => active?.label ?? placeholder ?? ''}</SelectValue>
      </SelectTrigger>
      <SelectContent>
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

// -------------------------------------------------------------------------
// Value editor: adapts to the field type (number / boolean / enum / multi)
// -------------------------------------------------------------------------
function ValueEditor({ condition, onChange }: { condition: Condition; onChange: (next: Condition) => void }) {
  const field = findField(condition.entity, condition.field)
  if (!field) return null

  // Boolean operators carry the value implicitly — nothing to edit.
  if (condition.operator === 'is_true' || condition.operator === 'is_false') {
    return <span className="text-xs text-muted-foreground">no value needed</span>
  }

  // Multi-value (in / not_in) enum picker rendered as toggle chips.
  if ((condition.operator === 'in' || condition.operator === 'not_in') && field.options) {
    const selected = Array.isArray(condition.value) ? condition.value.map(String) : [String(condition.value)]
    const toggle = (v: string) => {
      const next = selected.includes(v) ? selected.filter((s) => s !== v) : [...selected, v]
      onChange({ ...condition, value: next })
    }
    return (
      <div className="flex flex-wrap gap-1">
        {field.options.map((opt) => {
          const on = selected.includes(opt.value)
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => toggle(opt.value)}
              className={cn(
                'rounded-md border px-2 py-1 text-xs font-medium transition-colors',
                on
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'border-border text-muted-foreground hover:bg-muted',
              )}
            >
              {opt.label}
            </button>
          )
        })}
      </div>
    )
  }

  if (field.type === 'enum' && field.options) {
    return (
      <MiniSelect
        value={String(condition.value)}
        options={field.options}
        onChange={(v) => onChange({ ...condition, value: v })}
        className="min-w-40"
      />
    )
  }

  // number
  return (
    <div className="flex items-center gap-1.5">
      <Input
        type="number"
        value={Number.isFinite(Number(condition.value)) ? Number(condition.value) : 0}
        onChange={(e) => onChange({ ...condition, value: Number(e.target.value) })}
        className="h-8 w-28 bg-card"
      />
      {field.unit ? <span className="text-xs text-muted-foreground">{field.unit}</span> : null}
    </div>
  )
}

// -------------------------------------------------------------------------
// Single condition row
// -------------------------------------------------------------------------
function ConditionRow({
  condition,
  index,
  logic,
  onChange,
  onRemove,
}: {
  condition: Condition
  index: number
  logic: LogicOp
  onChange: (next: Condition) => void
  onRemove: () => void
}) {
  const field = findField(condition.entity, condition.field)
  const entityFields = fieldsForEntity(condition.entity)
  const validOps = field ? OPERATORS_BY_TYPE[field.type] : []

  function changeEntity(entity: RuleEntity) {
    const first = fieldsForEntity(entity)[0]
    const op = OPERATORS_BY_TYPE[first.type][0]
    onChange({
      ...condition,
      entity,
      field: first.field,
      operator: op,
      value: defaultValueFor(first.type, op, first),
    })
  }

  function changeField(fieldName: string) {
    const next = findField(condition.entity, fieldName)!
    const op = OPERATORS_BY_TYPE[next.type].includes(condition.operator)
      ? condition.operator
      : OPERATORS_BY_TYPE[next.type][0]
    onChange({ ...condition, field: fieldName, operator: op, value: defaultValueFor(next.type, op, next) })
  }

  function changeOperator(op: Operator) {
    let value = condition.value
    if ((op === 'in' || op === 'not_in') && !Array.isArray(value)) value = value ? [String(value)] : []
    if ((op === 'is_true' || op === 'is_false')) value = op === 'is_true'
    onChange({ ...condition, operator: op, value })
  }

  return (
    <div className="relative rounded-lg border border-border bg-muted/40 p-3">
      <div className="flex items-center gap-2">
        <Badge className={cn('shrink-0 rounded-md', ENTITY_META[condition.entity].cls)}>
          {index === 0 ? 'WHEN' : logic}
        </Badge>
        <div className="flex flex-1 flex-wrap items-center gap-2">
          <MiniSelect
            value={condition.entity}
            options={ENTITIES.map((e) => ({ value: e, label: ENTITY_META[e].label }))}
            onChange={(v) => changeEntity(v as RuleEntity)}
            className="min-w-32"
          />
          <MiniSelect
            value={condition.field}
            options={entityFields.map((f) => ({ value: f.field, label: f.label }))}
            onChange={changeField}
            className="min-w-40"
          />
          <MiniSelect
            value={condition.operator}
            options={validOps.map((op) => ({ value: op, label: OPERATOR_META[op].label }))}
            onChange={(v) => changeOperator(v as Operator)}
            className="min-w-36"
          />
          <ValueEditor condition={condition} onChange={onChange} />
        </div>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={onRemove}
          aria-label="Remove condition"
          className="shrink-0 text-muted-foreground hover:text-destructive"
        >
          <X className="size-4" />
        </Button>
      </div>
    </div>
  )
}

function defaultValueFor(type: string, op: Operator, field: ReturnType<typeof findField>) {
  if (op === 'is_true') return true
  if (op === 'is_false') return false
  if (op === 'in' || op === 'not_in') return field?.options?.[0] ? [field.options[0].value] : []
  if (type === 'enum') return field?.options?.[0]?.value ?? ''
  if (type === 'boolean') return true
  return typeof field?.sample === 'number' ? field.sample : 0
}

// -------------------------------------------------------------------------
// WHEN block
// -------------------------------------------------------------------------
export function WhenBuilder({
  group,
  onChange,
}: {
  group: ConditionGroup
  onChange: (next: ConditionGroup) => void
}) {
  function addCondition() {
    const first = fieldsForEntity('participant')[0]
    const op = OPERATORS_BY_TYPE[first.type][0]
    onChange({
      ...group,
      conditions: [
        ...group.conditions,
        {
          id: uid('c'),
          entity: 'participant',
          field: first.field,
          operator: op,
          value: defaultValueFor(first.type, op, first),
        },
      ],
    })
  }

  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold">Conditions</h3>
          {group.conditions.length > 1 ? (
            <div className="inline-flex overflow-hidden rounded-md border border-border">
              {(['AND', 'OR'] as LogicOp[]).map((op) => (
                <button
                  key={op}
                  type="button"
                  onClick={() => onChange({ ...group, logic: op })}
                  className={cn(
                    'px-2.5 py-1 text-xs font-semibold transition-colors',
                    group.logic === op
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-card text-muted-foreground hover:bg-muted',
                  )}
                >
                  {op}
                </button>
              ))}
            </div>
          ) : null}
        </div>
        <Button variant="outline" size="sm" onClick={addCondition} className="gap-1.5">
          <Plus className="size-3.5" /> Add condition
        </Button>
      </div>

      {group.conditions.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border py-8 text-center text-sm text-muted-foreground">
          No conditions yet — this rule would apply to every assignment.
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {group.conditions.map((condition, i) => (
            <ConditionRow
              key={condition.id}
              condition={condition}
              index={i}
              logic={group.logic}
              onChange={(next) =>
                onChange({
                  ...group,
                  conditions: group.conditions.map((c) => (c.id === condition.id ? next : c)),
                })
              }
              onRemove={() =>
                onChange({ ...group, conditions: group.conditions.filter((c) => c.id !== condition.id) })
              }
            />
          ))}
        </div>
      )}
    </div>
  )
}

// -------------------------------------------------------------------------
// THEN block
// -------------------------------------------------------------------------
const ACTION_KINDS = Object.keys(ACTION_META) as ActionKind[]

export function ThenBuilder({
  actions,
  ruleType,
  onChange,
}: {
  actions: RuleAction[]
  ruleType: string
  onChange: (next: RuleAction[]) => void
}) {
  // HARD rules constrain; SOFT/OPTIMIZATION rules score. Offer sensible kinds.
  const allowed =
    ruleType === 'HARD'
      ? (['block', 'require', 'flag'] as ActionKind[])
      : (['penalize', 'boost', 'prefer', 'flag'] as ActionKind[])

  function addAction() {
    onChange([...actions, { id: uid('a'), kind: allowed[0], target: '', weight: ACTION_META[allowed[0]].hasWeight ? 10 : undefined }])
  }

  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Then</h3>
        <Button variant="outline" size="sm" onClick={addAction} className="gap-1.5">
          <Plus className="size-3.5" /> Add action
        </Button>
      </div>

      {actions.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border py-8 text-center text-sm text-muted-foreground">
          Add at least one action for this rule to take effect.
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {actions.map((action) => {
            const meta = ACTION_META[action.kind]
            return (
              <div key={action.id} className="rounded-lg border border-border bg-muted/40 p-3">
                <div className="flex items-center gap-2">
                  <Badge className={cn('shrink-0 rounded-md', meta.cls)}>THEN</Badge>
                  <MiniSelect
                    value={action.kind}
                    options={(allowed.length ? allowed : ACTION_KINDS).map((k) => ({
                      value: k,
                      label: ACTION_META[k].label,
                    }))}
                    onChange={(v) => {
                      const kind = v as ActionKind
                      onChange(
                        actions.map((x) =>
                          x.id === action.id
                            ? { ...x, kind, weight: ACTION_META[kind].hasWeight ? (x.weight ?? 10) : undefined }
                            : x,
                        ),
                      )
                    }}
                    className="min-w-32"
                  />
                  <Input
                    value={action.target}
                    placeholder="Describe the target / message"
                    onChange={(e) =>
                      onChange(actions.map((x) => (x.id === action.id ? { ...x, target: e.target.value } : x)))
                    }
                    className="h-8 flex-1 bg-card"
                  />
                  {meta.hasWeight ? (
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs text-muted-foreground">weight</span>
                      <Input
                        type="number"
                        value={action.weight ?? 0}
                        onChange={(e) =>
                          onChange(
                            actions.map((x) => (x.id === action.id ? { ...x, weight: Number(e.target.value) } : x)),
                          )
                        }
                        className="h-8 w-20 bg-card"
                      />
                    </div>
                  ) : null}
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => onChange(actions.filter((x) => x.id !== action.id))}
                    aria-label="Remove action"
                    className="shrink-0 text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
