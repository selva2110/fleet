'use client'

import { useMemo, useState } from 'react'
import {
  GitBranch,
  Layers,
  Plus,
  Scale,
  Search,
  ShieldCheck,
  Sparkles,
  X,
} from 'lucide-react'
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { cn } from '@/lib/utils'
import {
  CATEGORY_META,
  CATEGORY_OPTIONS,
  RULE_SETS,
  RULE_TYPE_META,
  SEED_RULES,
  STATUS_META,
  STATUS_OPTIONS,
  TYPE_OPTIONS,
} from '@/lib/rules/config'
import type { Rule, RuleCategory, RuleStatus, RuleType } from '@/lib/rules/types'
import { describeCondition } from '@/lib/rules/utils'
import { RowActions } from '@/components/crud/row-actions'
import { RuleDrawer, RuleTypeBadge } from '@/components/rules/rule-drawer'

// -------------------------------------------------------------------------
// Compact filter select
// -------------------------------------------------------------------------
function FilterSelect({
  value,
  onChange,
  options,
  allLabel,
  currentLabel,
}: {
  value: string
  onChange: (v: string) => void
  options: { value: string; label: string }[]
  allLabel: string
  currentLabel: string
}) {
  return (
    <Select value={value} onValueChange={(v) => v != null && onChange(v)}>
      <SelectTrigger className="h-9 min-w-36 bg-card">
        <SelectValue>{() => currentLabel}</SelectValue>
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">{allLabel}</SelectItem>
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

function StatCard({
  icon: Icon,
  label,
  value,
  hint,
  tone = 'default',
}: {
  icon: React.ElementType
  label: string
  value: string | number
  hint?: string
  tone?: 'default' | 'danger' | 'warning' | 'primary'
}) {
  const toneCls = {
    default: 'text-foreground',
    danger: 'text-danger',
    warning: 'text-warning-foreground',
    primary: 'text-primary',
  }[tone]
  const iconWrap = {
    default: 'bg-muted text-muted-foreground',
    danger: 'bg-danger-muted text-danger',
    warning: 'bg-warning/20 text-warning-foreground',
    primary: 'bg-primary/15 text-primary',
  }[tone]
  return (
    <div className="flex items-center gap-3 rounded-xl border border-border bg-card p-4">
      <span className={cn('flex size-10 shrink-0 items-center justify-center rounded-lg', iconWrap)}>
        <Icon className="size-5" />
      </span>
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className={cn('text-xl font-semibold tabular-nums', toneCls)}>{value}</p>
        {hint ? <p className="text-[11px] text-muted-foreground">{hint}</p> : null}
      </div>
    </div>
  )
}

export default function RulesPage() {
  const [rules, setRules] = useState<Rule[]>(SEED_RULES)
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState<'all' | RuleCategory>('all')
  const [type, setType] = useState<'all' | RuleType>('all')
  const [status, setStatus] = useState<'all' | RuleStatus>('all')
  const [ruleSetId, setRuleSetId] = useState<string>(RULE_SETS[0].id)

  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editing, setEditing] = useState<Rule | null>(null)

  const activeSet = RULE_SETS.find((s) => s.id === ruleSetId)!

  const setRules_ = rules.filter((r) => r.ruleSetId === ruleSetId)

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return setRules_
      .filter((r) => {
        const matchQuery =
          !q ||
          r.name.toLowerCase().includes(q) ||
          r.description.toLowerCase().includes(q)
        const matchCat = category === 'all' || r.category === category
        const matchType = type === 'all' || r.type === type
        const matchStatus = status === 'all' || r.status === status
        return matchQuery && matchCat && matchType && matchStatus
      })
      .sort((a, b) => a.priority - b.priority)
  }, [setRules_, query, category, type, status])

  const stats = useMemo(() => {
    const active = setRules_.filter((r) => r.enabled && r.status === 'active').length
    const hard = setRules_.filter((r) => r.type === 'HARD').length
    const opt = setRules_.filter((r) => r.type === 'OPTIMIZATION').length
    return { total: setRules_.length, active, hard, opt }
  }, [setRules_])

  const activeFilterCount =
    (category !== 'all' ? 1 : 0) + (type !== 'all' ? 1 : 0) + (status !== 'all' ? 1 : 0) + (query ? 1 : 0)

  function openCreate() {
    setEditing(null)
    setDrawerOpen(true)
  }
  function openEdit(rule: Rule) {
    setEditing(rule)
    setDrawerOpen(true)
  }
  function saveRule(rule: Rule) {
    setRules((prev) => {
      const exists = prev.some((r) => r.id === rule.id)
      return exists ? prev.map((r) => (r.id === rule.id ? rule : r)) : [...prev, rule]
    })
  }
  function deleteRule(id: string) {
    setRules((prev) => prev.filter((r) => r.id !== id))
  }
  function toggleEnabled(id: string) {
    setRules((prev) => prev.map((r) => (r.id === id ? { ...r, enabled: !r.enabled } : r)))
  }

  function resetFilters() {
    setQuery('')
    setCategory('all')
    setType('all')
    setStatus('all')
  }

  return (
    <div className="relative min-h-full bg-background text-foreground">
      <div className="mx-auto w-full max-w-[1600px] px-3 pb-12 pt-5 sm:px-5">
        {/* Header */}
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex size-8 items-center justify-center rounded-lg bg-primary/15 text-primary">
                <Scale className="size-5" />
              </span>
              <h1 className="text-2xl font-semibold tracking-tight text-balance sm:text-3xl">
                Rule Engine
              </h1>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              Author, test, and version the constraints that drive NEMT trip planning.
            </p>
          </div>
          <Button onClick={openCreate} className="gap-1.5">
            <Plus className="size-4" /> New rule
          </Button>
        </div>

        {/* Stats */}
        <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard icon={Layers} label="Rules in set" value={stats.total} hint={activeSet.name} />
          <StatCard icon={ShieldCheck} label="Active" value={stats.active} tone="primary" hint="Enabled & live" />
          <StatCard icon={Scale} label="Hard constraints" value={stats.hard} tone="danger" hint="Block on match" />
          <StatCard icon={Sparkles} label="Optimization" value={stats.opt} tone="warning" hint="Scoring rules" />
        </div>

        {/* Rule set / version bar */}
        <RuleSetBar ruleSetId={ruleSetId} onChange={setRuleSetId} />

        {/* Filters */}
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <div className="relative min-w-52 flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search rules…"
              className="h-9 bg-card pl-9"
            />
          </div>
          <FilterSelect
            value={category}
            onChange={(v) => setCategory(v as 'all' | RuleCategory)}
            options={CATEGORY_OPTIONS}
            allLabel="All categories"
            currentLabel={category === 'all' ? 'All categories' : CATEGORY_META[category].label}
          />
          <FilterSelect
            value={type}
            onChange={(v) => setType(v as 'all' | RuleType)}
            options={TYPE_OPTIONS}
            allLabel="All types"
            currentLabel={type === 'all' ? 'All types' : RULE_TYPE_META[type].label}
          />
          <FilterSelect
            value={status}
            onChange={(v) => setStatus(v as 'all' | RuleStatus)}
            options={STATUS_OPTIONS}
            allLabel="All statuses"
            currentLabel={status === 'all' ? 'All statuses' : STATUS_META[status].label}
          />
          {activeFilterCount > 0 ? (
            <Button variant="ghost" size="sm" onClick={resetFilters} className="h-9 gap-1.5 text-muted-foreground">
              <X className="size-3.5" /> Clear
            </Button>
          ) : null}
        </div>

        {/* Rules table */}
        <div className="mt-3 overflow-hidden rounded-xl border border-border bg-card">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-16">Priority</TableHead>
                <TableHead>Rule</TableHead>
                <TableHead className="hidden lg:table-cell">Logic</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-20 text-center">Enabled</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow className="hover:bg-transparent">
                  <TableCell colSpan={8} className="py-14 text-center text-sm text-muted-foreground">
                    No rules match your filters in {activeSet.name}.
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((rule) => (
                  <TableRow key={rule.id} className={cn(!rule.enabled && 'opacity-60')}>
                    <TableCell>
                      <span className="inline-flex size-6 items-center justify-center rounded-md bg-muted font-mono text-xs font-semibold tabular-nums text-muted-foreground">
                        {rule.priority}
                      </span>
                    </TableCell>
                    <TableCell className="max-w-md">
                      <button
                        type="button"
                        onClick={() => openEdit(rule)}
                        className="text-left"
                      >
                        <p className="font-medium leading-tight hover:text-primary">{rule.name}</p>
                        <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">{rule.description}</p>
                      </button>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      <div className="flex flex-wrap items-center gap-1">
                        {rule.when.conditions.slice(0, 2).map((cond, i) => (
                          <span key={cond.id} className="flex items-center gap-1">
                            {i > 0 ? (
                              <span className="text-[10px] font-semibold text-muted-foreground/70">
                                {rule.when.logic}
                              </span>
                            ) : null}
                            <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-[10.5px] text-muted-foreground">
                              {describeCondition(cond)}
                            </span>
                          </span>
                        ))}
                        {rule.when.conditions.length > 2 ? (
                          <span className="text-[10px] text-muted-foreground">
                            +{rule.when.conditions.length - 2}
                          </span>
                        ) : null}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={cn('rounded-md', CATEGORY_META[rule.category].cls)}>
                        {CATEGORY_META[rule.category].label}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <RuleTypeBadge type={rule.type} />
                    </TableCell>
                    <TableCell>
                      <Badge className={cn('rounded-md', STATUS_META[rule.status].cls)}>
                        {STATUS_META[rule.status].label}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <Switch
                        checked={rule.enabled}
                        onCheckedChange={() => toggleEnabled(rule.id)}
                        aria-label={`Toggle ${rule.name}`}
                      />
                    </TableCell>
                    <TableCell>
                      <RowActions
                        onEdit={() => openEdit(rule)}
                        onDelete={() => deleteRule(rule.id)}
                        deleteTitle="Delete rule"
                        deleteMessage={`Delete "${rule.name}"? This cannot be undone.`}
                      />
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          Showing {filtered.length} of {stats.total} rules in {activeSet.name} · v{activeSet.activeVersion}
        </p>
      </div>

      <RuleDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        editing={editing}
        defaultRuleSetId={ruleSetId}
        onSave={saveRule}
      />
    </div>
  )
}

// -------------------------------------------------------------------------
// Rule-set + version management bar
// -------------------------------------------------------------------------
function RuleSetBar({ ruleSetId, onChange }: { ruleSetId: string; onChange: (id: string) => void }) {
  const [expanded, setExpanded] = useState(false)
  const active = RULE_SETS.find((s) => s.id === ruleSetId)!

  return (
    <div className="mt-4 rounded-xl border border-border bg-card">
      <div className="flex flex-wrap items-center justify-between gap-3 p-4">
        <div className="flex flex-wrap items-center gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary">
            <GitBranch className="size-4.5" />
          </span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <Select value={ruleSetId} onValueChange={(v) => v && onChange(v)}>
                <SelectTrigger className="h-8 bg-card font-semibold">
                  <SelectValue>{() => active.name}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {RULE_SETS.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Badge className="rounded-md bg-primary/15 text-primary">v{active.activeVersion} active</Badge>
              <Badge
                className={cn(
                  'rounded-md',
                  active.versions[0].status === 'published'
                    ? 'bg-success/20 text-success'
                    : 'bg-muted text-muted-foreground',
                )}
              >
                {active.versions[0].status}
              </Badge>
            </div>
            <p className="mt-1 max-w-2xl text-xs text-muted-foreground">{active.description}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setExpanded((v) => !v)}>
            {expanded ? 'Hide versions' : `Version history (${active.versions.length})`}
          </Button>
          <Button variant="outline" size="sm" className="gap-1.5">
            <GitBranch className="size-3.5" /> New version
          </Button>
        </div>
      </div>

      {expanded ? (
        <div className="border-t border-border">
          <div className="flex flex-col divide-y divide-border">
            {active.versions.map((v) => (
              <div key={v.version} className="flex flex-wrap items-center gap-3 px-4 py-3">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-muted font-mono text-xs font-semibold">
                  v{v.version}
                </span>
                <Badge
                  className={cn(
                    'rounded-md',
                    v.status === 'published'
                      ? 'bg-success/20 text-success'
                      : v.status === 'draft'
                        ? 'bg-warning/20 text-warning-foreground'
                        : 'bg-muted text-muted-foreground',
                  )}
                >
                  {v.status}
                </Badge>
                <span className="flex-1 text-sm">{v.note}</span>
                <span className="text-xs text-muted-foreground">{v.ruleCount} rules</span>
                <span className="text-xs text-muted-foreground">{v.createdBy}</span>
                <span className="font-mono text-xs text-muted-foreground">{v.createdAt}</span>
                {v.status === 'archived' ? (
                  <Button variant="ghost" size="sm" className="h-7 px-2 text-xs">
                    Restore
                  </Button>
                ) : v.status === 'draft' ? (
                  <Button variant="ghost" size="sm" className="h-7 px-2 text-xs">
                    Publish
                  </Button>
                ) : (
                  <span className="w-14" />
                )}
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  )
}
