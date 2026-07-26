import type { ComponentType } from 'react'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { constraintLabels } from '@/lib/labels'
import type { MedicalPriority, TransportConstraints } from '@/lib/types'

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string
  description?: string
  actions?: React.ReactNode
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border bg-card px-6 py-4">
      <div>
        <h1 className="text-lg font-semibold text-foreground text-balance">{title}</h1>
        {description ? (
          <p className="mt-0.5 text-sm text-muted-foreground text-pretty">{description}</p>
        ) : null}
      </div>
      {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
    </div>
  )
}

export function StatCard({
  label,
  value,
  icon: Icon,
  hint,
  tone = 'default',
}: {
  label: string
  value: string | number
  icon?: ComponentType<{ className?: string }>
  hint?: string
  tone?: 'default' | 'success' | 'warning' | 'danger' | 'primary'
}) {
  const toneCls = {
    default: 'bg-muted text-muted-foreground',
    success: 'bg-success/15 text-success',
    warning: 'bg-warning/20 text-warning-foreground',
    danger: 'bg-destructive/15 text-destructive',
    primary: 'bg-primary/15 text-primary',
  }[tone]
  return (
    <Card className="flex flex-col items-center gap-3 p-4 text-center">
      {Icon ? (
        <div className={cn('flex size-10 shrink-0 items-center justify-center rounded-lg', toneCls)}>
          <Icon className="size-5" />
        </div>
      ) : null}
      <div className="min-w-0">
        <p className="text-2xl font-semibold tabular-nums leading-none text-foreground">{value}</p>
        <p className="mt-1 truncate text-xs font-medium text-muted-foreground">{label}</p>
        {hint ? <p className="mt-0.5 truncate text-[11px] text-muted-foreground/70">{hint}</p> : null}
      </div>
    </Card>
  )
}

export function StatusBadge({ label, cls }: { label: string; cls: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium',
        cls,
      )}
    >
      {label}
    </span>
  )
}

const priorityMeta: Record<MedicalPriority, { label: string; cls: string }> = {
  routine: { label: 'Routine', cls: 'bg-muted text-muted-foreground' },
  elevated: { label: 'Elevated', cls: 'bg-warning/20 text-warning-foreground' },
  critical: { label: 'Critical', cls: 'bg-destructive/15 text-destructive' },
}

export function PriorityBadge({ priority }: { priority: MedicalPriority }) {
  const m = priorityMeta[priority]
  return <StatusBadge label={m.label} cls={m.cls} />
}

export function ConstraintChips({
  constraints,
  max = 99,
}: {
  constraints: TransportConstraints
  max?: number
}) {
  const active = constraintLabels.filter((c) => constraints[c.key as keyof TransportConstraints])
  if (active.length === 0)
    return <span className="text-xs text-muted-foreground">No special needs</span>
  const shown = active.slice(0, max)
  return (
    <div className="flex flex-wrap gap-1">
      {shown.map((c) => (
        <Badge key={c.key} variant="secondary" className="px-1.5 py-0 text-[10px] font-medium">
          {c.short}
        </Badge>
      ))}
      {active.length > max ? (
        <Badge variant="secondary" className="px-1.5 py-0 text-[10px]">
          +{active.length - max}
        </Badge>
      ) : null}
    </div>
  )
}
