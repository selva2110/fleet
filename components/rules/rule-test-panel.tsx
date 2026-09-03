'use client'

import { useMemo, useState } from 'react'
import { CircleCheck, CircleX, FlaskConical, RotateCcw, TriangleAlert } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'
import { ENTITY_META, findField, RULE_TYPE_META } from '@/lib/rules/config'
import type { ConditionValue, Rule, TestContext } from '@/lib/rules/types'
import { describeCondition, evaluateRule, fieldKey, referencedFields, seedTestContext } from '@/lib/rules/utils'

/**
 * Interactive tester. Inputs are generated from the fields the rule actually
 * references, seeded with realistic NEMT samples. Editing any input re-runs
 * the evaluator immediately and updates the PASS/FAIL verdict.
 */
export function RuleTestPanel({ rule }: { rule: Rule }) {
  const seed = useMemo(() => seedTestContext(rule), [rule.id, rule.when.conditions.length])
  const [context, setContext] = useState<TestContext>(seed)
  const [dirtyKey, setDirtyKey] = useState(0)

  // Re-seed when the rule identity changes (opening a different rule).
  useMemo(() => {
    setContext(seedTestContext(rule))
    setDirtyKey((k) => k + 1)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rule.id])

  const fields = referencedFields(rule)
  const result = evaluateRule(rule, context)

  function setValue(key: string, value: ConditionValue) {
    setContext((prev) => ({ ...prev, [key]: value }))
  }

  return (
    <div className="flex flex-col gap-3" key={dirtyKey}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FlaskConical className="size-4 text-primary" />
          <h3 className="text-sm font-semibold">Test rule</h3>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 gap-1.5 px-2 text-xs"
          onClick={() => setContext(seedTestContext(rule))}
        >
          <RotateCcw className="size-3.5" /> Reset scenario
        </Button>
      </div>

      {/* Verdict banner */}
      <div
        className={cn(
          'flex items-start gap-3 rounded-lg border p-3',
          result.result === 'PASS'
            ? 'border-success/30 bg-success/10'
            : 'border-danger-border bg-danger-muted',
        )}
      >
        {result.result === 'PASS' ? (
          <CircleCheck className="mt-0.5 size-5 shrink-0 text-success" />
        ) : (
          <CircleX className="mt-0.5 size-5 shrink-0 text-danger" />
        )}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={cn(
                'text-sm font-semibold',
                result.result === 'PASS' ? 'text-success' : 'text-danger',
              )}
            >
              {result.result}
            </span>
            <Badge className={cn('rounded-md', RULE_TYPE_META[rule.type].cls)}>
              {RULE_TYPE_META[rule.type].label}
            </Badge>
            <span className="text-xs text-muted-foreground">
              {result.fired ? 'Rule triggered' : 'Rule not triggered'}
            </span>
            {result.score !== 0 ? (
              <span
                className={cn(
                  'font-mono text-xs font-semibold tabular-nums',
                  result.score > 0 ? 'text-success' : 'text-warning-foreground',
                )}
              >
                {result.score > 0 ? '+' : ''}
                {result.score} pts
              </span>
            ) : null}
          </div>
          {result.violations.length > 0 ? (
            <ul className="mt-2 flex flex-col gap-1">
              {result.violations.map((v, i) => (
                <li key={i} className="flex items-start gap-1.5 text-xs text-danger">
                  <TriangleAlert className="mt-0.5 size-3.5 shrink-0" />
                  <span>{v}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-1 text-xs text-muted-foreground">{result.notes[0]}</p>
          )}
        </div>
      </div>

      {/* Scenario inputs generated from referenced fields */}
      {fields.length > 0 ? (
        <div className="rounded-lg border border-border">
          <div className="border-b border-border px-3 py-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Scenario inputs
            </span>
          </div>
          <div className="flex flex-col divide-y divide-border">
            {fields.map(({ entity, field }) => {
              const def = findField(entity, field)
              if (!def) return null
              const key = fieldKey(entity, field)
              const value = context[key]
              return (
                <div key={key} className="flex items-center justify-between gap-3 px-3 py-2.5">
                  <div className="flex min-w-0 items-center gap-2">
                    <Badge className={cn('rounded-md text-[10px]', ENTITY_META[entity].cls)}>
                      {ENTITY_META[entity].label}
                    </Badge>
                    <span className="truncate text-sm">{def.label}</span>
                  </div>
                  <TestValueInput
                    value={value}
                    def={def}
                    onChange={(v) => setValue(key, v)}
                  />
                </div>
              )
            })}
          </div>
        </div>
      ) : (
        <p className="rounded-lg border border-dashed border-border py-6 text-center text-xs text-muted-foreground">
          Add conditions to test this rule against a scenario.
        </p>
      )}

      {/* Per-condition breakdown */}
      {result.conditionResults.length > 0 ? (
        <div className="rounded-lg border border-border">
          <div className="border-b border-border px-3 py-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Condition results ({rule.when.logic})
            </span>
          </div>
          <div className="flex flex-col divide-y divide-border">
            {result.conditionResults.map((cr) => (
              <div key={cr.condition.id} className="flex items-center justify-between gap-3 px-3 py-2">
                <span className="min-w-0 truncate text-xs text-foreground">
                  {describeCondition(cr.condition)}
                </span>
                <div className="flex shrink-0 items-center gap-2">
                  <span className="font-mono text-[11px] text-muted-foreground">
                    actual: {formatActual(cr.actual)}
                  </span>
                  {cr.pass ? (
                    <CircleCheck className="size-4 text-success" />
                  ) : (
                    <CircleX className="size-4 text-muted-foreground/50" />
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  )
}

function formatActual(value: ConditionValue | undefined): string {
  if (value === undefined) return '—'
  if (typeof value === 'boolean') return value ? 'true' : 'false'
  if (Array.isArray(value)) return value.join(', ')
  return String(value)
}

function TestValueInput({
  value,
  def,
  onChange,
}: {
  value: ConditionValue | undefined
  def: NonNullable<ReturnType<typeof findField>>
  onChange: (v: ConditionValue) => void
}) {
  if (def.type === 'boolean') {
    return (
      <Switch
        checked={Boolean(value)}
        onCheckedChange={onChange}
      />
    )
  }

  if (def.type === 'enum' && def.options) {
    const active = def.options.find((o) => String(o.value) === String(value))
    return (
      <Select value={String(value ?? '')} onValueChange={(v) => v != null && onChange(v)}>
        <SelectTrigger size="sm" className="h-8 w-48 bg-card">
          <SelectValue>{() => active?.label ?? '—'}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          {def.options.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    )
  }

  return (
    <div className="flex items-center gap-1.5">
      <Input
        type="number"
        value={Number.isFinite(Number(value)) ? Number(value) : 0}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-8 w-28 bg-card"
      />
      {def.unit ? <span className="w-8 text-xs text-muted-foreground">{def.unit}</span> : null}
    </div>
  )
}
