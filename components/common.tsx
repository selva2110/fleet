import type { ComponentType } from 'react'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { ParticipantConfig } from '@/lib/participant/config';
import { TransportConstraints } from '@/lib/participant/types';
import { useTranslation } from './context/language-provider';
import { Tooltip, TooltipContent, TooltipTrigger } from './context/tooltip-provdier';

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: React.ReactNode
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
        'inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-medium flex-wrap',
        cls,
      )}
    >
      {label}
    </span>
  )
}

export function ConstraintChips({
  constraints,
  max = 99,
}: {
  constraints: TransportConstraints
  max?: number
}) {
  const {t} = useTranslation();
  const active = ParticipantConfig.constraintLabels.filter((c) => constraints[c.key as keyof TransportConstraints])
  if (active.length === 0)
    return <span className="text-xs text-muted-foreground">{t('part.nospecialneeds')}</span>
  const shown = active.slice(0, max)
  return (
    <div className="flex flex-wrap gap-1">
      {shown.map((c) => (
        <Badge key={c.key} variant="secondary" className="px-1.5 py-0 text-[10px] font-medium">
          {t(c.short)}
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

export const HoverTooltip = ({
  children,
  message,
}: {
  children: React.ReactNode;
  message: string;
}) => {
  return (
    <Tooltip>
      <TooltipTrigger>{children}</TooltipTrigger>
      <TooltipContent>{message}</TooltipContent>
    </Tooltip>
  );
};

export const createFieldSetter = <T extends object>(
  setForm: React.Dispatch<React.SetStateAction<T>>,
  setErrors: React.Dispatch<React.SetStateAction<Record<string, string>>>,
) => {
  return <K extends keyof T>(key: K, value: T[K]) => {
    setForm((prev) => ({
      ...prev,
      [key]: value,
    }));

    setErrors((prev) =>
      prev[key as string]
        ? { ...prev, [key as string]: "" }
        : prev
    );
  };
};