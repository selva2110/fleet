'use client'

import { forwardRef } from 'react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import { TableHead } from '../ui/table';
import { AuroraAccent } from '@/lib/aurora/types';
import { AuroraConfig } from '@/lib/aurora/config';
import { useTranslation } from '../context/language-provider';

export const GlassCard = forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { interactive?: boolean }
>(function GlassCard({ className, interactive, ...props }, ref) {
  return (
    <div
      ref={ref}
      className={cn(
        'relative overflow-hidden rounded-2xl border border-border bg-card/95 backdrop-blur-xl',
        'shadow-[0_8px_32px_rgba(2,6,23,0.45)]',
        interactive && 'transition-all duration-300 hover:border-border hover:bg-card/90',
        className,
      )}
      {...props}
    />
  )
})

/** Section title with an accent bullet. */
export function PanelTitle({
  children,
  icon: Icon,
  accent = 'cyan',
  action,
  className
}: {
  children: React.ReactNode
  icon?: React.ComponentType<{ className?: string }>
  accent?: AuroraAccent
  action?: React.ReactNode
  className?:string
}) {
  return (
    <div className={`flex items-center justify-between gap-2 ${className}`}>
      <div className="flex items-center gap-2">
        {Icon ? (
          <span className={cn('flex size-7 items-center justify-center rounded-lg bg-muted/30', AuroraConfig.accentClasses[accent].text)}>
            <Icon className="size-4" />
          </span>
        ) : null}
        <h2 className="text-sm font-semibold tracking-tight text-foreground">{children}</h2>
      </div>
      {action}
    </div>
  )
}

export function Sparkline({
  data,
  color,
  className,
  height = 40,
}: {
  data: number[]
  color: string
  className?: string
  height?: number
}) {
  const w = 120
  const h = height
  const max = Math.max(...data)
  const min = Math.min(...data)
  const range = max - min || 1
  const step = w / (data.length - 1)
  const pts = data.map((d, i) => [i * step, h - ((d - min) / range) * (h - 6) - 3] as const)
  const line = pts.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ')
  const area = `${line} L${w},${h} L0,${h} Z`
  const gid = `spark-${color.replace(/[^a-z0-9]/gi, '')}`
  return (
    <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" className={cn('w-full', className)} style={{ height }}>
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.45" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${gid})`} />
      <path d={line} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

/** Fade/slide-in wrapper for staggered entrance animations. */
export function FadeIn({
  children,
  delay = 0,
  className,
}: {
  children: React.ReactNode
  delay?: number
  className?: string
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay, ease: [0.22, 1, 0.36, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

/** Small colored status/trend pill. */
export function TrendPill({ up, value,sublabel }: { up: boolean; value: string;sublabel:string }) {
  const {t} =useTranslation()
  return (
    <span
      className={cn(
        'inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[11px] font-semibold',
        up ? 'bg-emerald-400/15 text-emerald-700' : 'bg-rose-400/15 text-rose-300',
      )}
    >
      {up ? '▲' : '▼'} {value} {t(sublabel)}
    </span>
  )
}

export function tableHeaderRow(tableHeadings: string[]) {
  return (
    <>
      {tableHeadings.map((item, idx) => (
        <TableHead key={idx}>{item}</TableHead>
      ))}
    </>
  )
}