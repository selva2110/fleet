'use client'

import { useEffect, useState } from 'react'
import { Sheet, SheetContent, SheetDescription, SheetTitle } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'
import {
  CATEGORY_OPTIONS,
  CATEGORY_META,
  RULE_TYPE_META,
  RULE_SETS,
  STATUS_META,
} from '@/lib/rules/config'
import type { Rule, RuleCategory, RuleStatus, RuleType } from '@/lib/rules/types'
import { uid } from '@/lib/rules/utils'
import { ThenBuilder, WhenBuilder } from './rule-builder'
import { RuleJsonPreview } from './rule-json-preview'
import { RuleTestPanel } from './rule-test-panel'

function emptyRule(ruleSetId: string): Rule {
  return {
    id: uid('rule'),
    name: '',
    description: '',
    category: 'safety',
    type: 'HARD',
    status: 'draft',
    enabled: true,
    priority: 10,
    ruleSetId,
    version: RULE_SETS.find((s) => s.id === ruleSetId)?.activeVersion ?? 1,
    updatedAt: new Date().toISOString().slice(0, 10),
    updatedBy: 'You',
    when: {
      logic: 'AND',
      conditions: [
        { id: uid('c'), entity: 'participant', field: 'mobilityLevel', operator: 'eq', value: 'wheelchair' },
      ],
    },
    then: [{ id: uid('a'), kind: 'block', target: '' }],
  }
}

const TYPE_LIST = Object.keys(RULE_TYPE_META) as RuleType[]

export function RuleDrawer({
  open,
  onOpenChange,
  editing,
  defaultRuleSetId,
  onSave,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  editing: Rule | null
  defaultRuleSetId: string
  onSave: (rule: Rule) => void
}) {
  const [draft, setDraft] = useState<Rule>(() => editing ?? emptyRule(defaultRuleSetId))

  useEffect(() => {
    if (open) setDraft(editing ? { ...editing } : emptyRule(defaultRuleSetId))
  }, [open, editing, defaultRuleSetId])

  function patch<K extends keyof Rule>(key: K, value: Rule[K]) {
    setDraft((d) => ({ ...d, [key]: value }))
  }

  const nameMissing = draft.name.trim().length === 0

  function handleSave() {
    if (nameMissing) return
    onSave({ ...draft, updatedAt: new Date().toISOString().slice(0, 10), updatedBy: 'You' })
    onOpenChange(false)
  }

  const ruleSet = RULE_SETS.find((s) => s.id === draft.ruleSetId)

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
  side="right"
  className="!top-0 !h-dvh !w-screen !max-w-none gap-0 border-l border-border p-0"
>
        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b border-border px-5 py-4 pr-16">
          <div className="min-w-0">
            <SheetTitle className="text-lg">
              {editing ? 'Edit rule' : 'Create rule'}
            </SheetTitle>
            <SheetDescription className="mt-0.5">
              Define when the rule applies and what the planner should do.
            </SheetDescription>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={nameMissing}>
              {editing ? 'Save changes' : 'Create rule'}
            </Button>
          </div>
        </div>

        {/* Body: two columns — builder (left) / preview+test (right) */}
        <div className="grid min-h-0 flex-1 grid-cols-[minmax(0,1fr)_26rem] overflow-hidden">
          {/* Left: settings + builder */}
          <div className="thin-scrollbar min-h-0 overflow-y-auto border-r border-border p-5">
            <div className="flex flex-col gap-5">
              {/* Identity */}
              <div className="flex flex-col gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Rule name</label>
                  <Input
                    value={draft.name}
                    placeholder="e.g. Wheelchair riders require accessible vehicle"
                    onChange={(e) => patch('name', e.target.value)}
                    aria-invalid={nameMissing}
                  />
                  {nameMissing ? (
                    <span className="text-xs text-destructive">A rule name is required.</span>
                  ) : null}
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Description</label>
                  <textarea
                    value={draft.description}
                    placeholder="Explain the intent of this rule for other coordinators."
                    onChange={(e) => patch('description', e.target.value)}
                    rows={2}
                    className="min-h-16 w-full resize-y rounded-lg border border-input bg-transparent px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                  />
                </div>
              </div>

              {/* Type selector */}
              <div className="flex flex-col gap-2">
                <label className="text-xs font-medium text-muted-foreground">Rule type</label>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                  {TYPE_LIST.map((type) => {
                    const meta = RULE_TYPE_META[type]
                    const active = draft.type === type
                    return (
                      <button
                        key={type}
                        type="button"
                        onClick={() => {
                          patch('type', type)
                          // Realign actions to the new type's allowed kinds.
                          patch(
                            'then',
                            draft.then.map((a) => ({
                              ...a,
                              kind: type === 'HARD' ? (a.kind === 'block' || a.kind === 'require' || a.kind === 'flag' ? a.kind : 'block') : (a.kind === 'penalize' || a.kind === 'boost' || a.kind === 'prefer' || a.kind === 'flag' ? a.kind : 'penalize'),
                            })),
                          )
                        }}
                        className={cn(
                          'flex flex-col items-start gap-1 rounded-lg border p-3 text-left transition-colors',
                          active
                            ? 'border-primary bg-primary/5 ring-1 ring-primary/30'
                            : 'border-border hover:bg-muted',
                        )}
                      >
                        <span className="flex items-center gap-1.5">
                          <span className={cn('size-2 rounded-full', meta.dot)} />
                          <span className="text-sm font-semibold">{meta.label}</span>
                        </span>
                        <span className="text-xs leading-snug text-muted-foreground">{meta.description}</span>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Meta row: category / priority / status / enabled */}
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Category</label>
                  <Select value={draft.category} onValueChange={(v) => v && patch('category', v as RuleCategory)}>
                    <SelectTrigger className="h-9 w-full bg-card">
                      <SelectValue>{() => CATEGORY_META[draft.category].label}</SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORY_OPTIONS.map((o) => (
                        <SelectItem key={o.value} value={o.value}>
                          {o.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Priority</label>
                  <Input
                    type="number"
                    min={1}
                    value={draft.priority}
                    onChange={(e) => patch('priority', Math.max(1, Number(e.target.value)))}
                    className="h-9 bg-card"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Status</label>
                  <Select value={draft.status} onValueChange={(v) => v && patch('status', v as RuleStatus)}>
                    <SelectTrigger className="h-9 w-full bg-card">
                      <SelectValue>{() => STATUS_META[draft.status].label}</SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {(Object.keys(STATUS_META) as RuleStatus[]).map((s) => (
                        <SelectItem key={s} value={s}>
                          {STATUS_META[s].label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Enabled</label>
                  <div className="flex h-9 items-center gap-2">
                    <Switch checked={draft.enabled} onCheckedChange={(v) => patch('enabled', v)} />
                    <span className="text-sm text-muted-foreground">{draft.enabled ? 'On' : 'Off'}</span>
                  </div>
                </div>
              </div>

              {/* Rule set */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-muted-foreground">Rule set</label>
                <Select value={draft.ruleSetId} onValueChange={(v) => v && patch('ruleSetId', v)}>
                  <SelectTrigger className="h-9 w-full bg-card">
                    <SelectValue>{() => ruleSet?.name ?? '—'}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {RULE_SETS.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name} · v{s.activeVersion}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="h-px bg-border" />

              {/* WHEN builder */}
              <WhenBuilder group={draft.when} onChange={(next) => patch('when', next)} />

              <div className="h-px bg-border" />

              {/* THEN builder */}
              <ThenBuilder actions={draft.then} ruleType={draft.type} onChange={(next) => patch('then', next)} />
            </div>
          </div>

          {/* Right: JSON preview + test */}
          <div className="min-h-0 bg-muted/30">
            <Tabs defaultValue="preview" className="flex h-full min-h-0 flex-col gap-0">
              <div className="border-b border-border px-4 pt-3">
                <TabsList variant="line" className="gap-3">
                  <TabsTrigger value="preview">Rule JSON</TabsTrigger>
                  <TabsTrigger value="test">Test rule</TabsTrigger>
                </TabsList>
              </div>
              <TabsContent
  value="preview"
  className="thin-scrollbar min-h-0 flex-1 overflow-y-auto p-4"
>
                <RuleJsonPreview rule={draft} />
              </TabsContent>
              <TabsContent
                value="test"
                className="thin-scrollbar min-h-0 flex-1 overflow-y-auto p-4"
              >
                <RuleTestPanel rule={draft} />
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}

/** Small inline badge used by the page for a rule's type. */
export function RuleTypeBadge({ type }: { type: RuleType }) {
  const meta = RULE_TYPE_META[type]
  return (
    <Badge className={cn('rounded-md', meta.cls)}>
      <span className={cn('size-1.5 rounded-full', meta.dot)} />
      {meta.label}
    </Badge>
  )
}
