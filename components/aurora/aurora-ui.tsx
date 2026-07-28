'use client'

import { forwardRef } from 'react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

/**
 * Aurora is an immersive, self-contained "premium" surface: a dark neon
 * command-center canvas that intentionally uses its own fixed palette rather
 * than the app's themeable design tokens. These primitives keep that styling
 * consistent across every Aurora widget.
 */

export const AURORA_ACCENTS = {
  cyan: '#22d3ee',
  blue: '#60a5fa',
  violet: '#a78bfa',
  emerald: '#34d399',
  amber: '#fbbf24',
  rose: '#fb7185',
} as const

export type AuroraAccent = keyof typeof AURORA_ACCENTS

/** Tailwind fragments for a given accent (text / ring / soft glow bg). */
export const accentClasses: Record<
  AuroraAccent,
  { text: string; glow: string; ring: string; from: string }
> = {
  cyan: { text: 'text-cyan-300', glow: 'shadow-[0_0_30px_-6px_rgba(34,211,238,0.55)]', ring: 'ring-cyan-400/30', from: 'from-cyan-500/25' },
  blue: { text: 'text-blue-300', glow: 'shadow-[0_0_30px_-6px_rgba(96,165,250,0.55)]', ring: 'ring-blue-400/30', from: 'from-blue-500/25' },
  violet: { text: 'text-violet-300', glow: 'shadow-[0_0_30px_-6px_rgba(167,139,250,0.55)]', ring: 'ring-violet-400/30', from: 'from-violet-500/25' },
  emerald: { text: 'text-emerald-300', glow: 'shadow-[0_0_30px_-6px_rgba(52,211,153,0.55)]', ring: 'ring-emerald-400/30', from: 'from-emerald-500/25' },
  amber: { text: 'text-amber-300', glow: 'shadow-[0_0_30px_-6px_rgba(251,191,36,0.55)]', ring: 'ring-amber-400/30', from: 'from-amber-500/25' },
  rose: { text: 'text-rose-300', glow: 'shadow-[0_0_30px_-6px_rgba(251,113,133,0.55)]', ring: 'ring-rose-400/30', from: 'from-rose-500/25' },
}

/** Frosted-glass container used for every card/panel in Aurora. */
export const GlassCard = forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { interactive?: boolean }
>(function GlassCard({ className, interactive, ...props }, ref) {
  return (
    <div
      ref={ref}
      className={cn(
        'relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04] backdrop-blur-xl',
        'shadow-[0_8px_32px_rgba(2,6,23,0.45)]',
        interactive && 'transition-all duration-300 hover:border-white/20 hover:bg-white/[0.07]',
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
}: {
  children: React.ReactNode
  icon?: React.ComponentType<{ className?: string }>
  accent?: AuroraAccent
  action?: React.ReactNode
}) {
  return (
    <div className="flex items-center justify-between gap-2 px-5 pt-4">
      <div className="flex items-center gap-2">
        {Icon ? (
          <span className={cn('flex size-7 items-center justify-center rounded-lg bg-white/5', accentClasses[accent].text)}>
            <Icon className="size-4" />
          </span>
        ) : null}
        <h2 className="text-sm font-semibold tracking-tight text-white">{children}</h2>
      </div>
      {action}
    </div>
  )
}

/**
 * Deterministic pseudo-random series (Lehmer PRNG) so SSR and client render
 * identical sparklines — random-per-render would cause hydration mismatches.
 */
export function seededSeries(seed: number, points = 18, base = 50, variance = 34): number[] {
  let s = Math.floor(seed) % 2147483647
  if (s <= 0) s += 2147483646
  const out: number[] = []
  for (let i = 0; i < points; i++) {
    s = (s * 16807) % 2147483647
    const r = (s - 1) / 2147483646
    const wave = Math.sin(i / 2.4) * variance * 0.35
    out.push(Math.max(3, base + (r - 0.5) * variance + wave))
  }
  return out
}

/** Lightweight SVG sparkline with gradient area fill. */
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
export function TrendPill({ up, value }: { up: boolean; value: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[11px] font-semibold',
        up ? 'bg-emerald-400/15 text-emerald-300' : 'bg-rose-400/15 text-rose-300',
      )}
    >
      {up ? '▲' : '▼'} {value}
    </span>
  )
}
