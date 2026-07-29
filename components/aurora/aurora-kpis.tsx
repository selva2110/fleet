'use client'

import { motion } from 'framer-motion'
import {
  Bus,
  CalendarDays,
  MessageSquare,
  Route,
  TrendingUp,
  UserRound,
  UtensilsCrossed,
  type LucideIcon,
} from 'lucide-react'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, XAxis, YAxis } from 'recharts'
import {
  AURORA_ACCENTS,
  type AuroraAccent,
  accentClasses,
  GlassCard,
  TrendPill,
} from './aurora-ui'
import { cn } from '@/lib/utils'

const KPI_AXIS = 'rgba(148,163,184,0.6)'
const KPI_GRID = 'rgba(148,163,184,0.14)'

const ICONS: Record<string, LucideIcon> = {
  route: Route,
  calendar: CalendarDays,
  bus: Bus,
  user: UserRound,
  trend: TrendingUp,
  sms: MessageSquare,
  meal: UtensilsCrossed,
}

export interface KpiItem {
  id: string
  label: string
  value: string | number
  accent: AuroraAccent
  icon: keyof typeof ICONS
  trendUp: boolean
  trend: string
  series: number[]
}

export function AuroraKpis({ items }: { items: KpiItem[] }) {
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7">
      {items.map((item, i) => (
        <KpiCard key={item.id} item={item} index={i} />
      ))}
    </div>
  )
}

function KpiCard({ item, index }: { item: KpiItem; index: number }) {
  const Icon = ICONS[item.icon] ?? Route
  const accent = accentClasses[item.accent]
  const color = AURORA_ACCENTS[item.accent]

  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.06, ease: [0.22, 1, 0.36, 1] }}
      whileHover={{ y: -4 }}
    >
      <GlassCard interactive className={cn('group h-full p-4', accent.glow)}>
        {/* accent wash */}
        <div
          className={cn(
            'pointer-events-none absolute -right-6 -top-6 size-24 rounded-full bg-gradient-to-br opacity-40 blur-2xl transition-opacity duration-300 group-hover:opacity-70',
            accent.from,
            'to-transparent',
          )}
        />
        <div className="relative flex items-start justify-between">
          <span
            className={cn(
              'flex size-9 items-center justify-center rounded-xl bg-white/5 ring-1',
              accent.text,
              accent.ring,
            )}
          >
            <Icon className="size-4" />
          </span>
          <TrendPill up={item.trendUp} value={item.trend} />
        </div>

        <div className="relative mt-3">
          <p className="text-2xl font-semibold tabular-nums tracking-tight text-white">{item.value}</p>
          <p className="mt-0.5 text-[11px] font-medium text-slate-300/70">{item.label}</p>
        </div>

        <div className="relative mt-2 h-14">
          <KpiMiniChart data={item.series} color={color} />
        </div>
      </GlassCard>
    </motion.div>
  )
}

/**
 * Compact axis-based mini chart for KPI cards: a small bar chart with a
 * baseline x-axis, subtle horizontal gridlines, and a minimal y-scale so each
 * metric reads as a real chart rather than a free-floating sparkline.
 */
function KpiMiniChart({ data, color }: { data: number[]; color: string }) {
  const chartData = data.map((v, i) => ({ i, v: Math.round(v) }))
  const max = Math.max(...data, 1)
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={chartData} margin={{ top: 2, right: 4, bottom: 0, left: 0 }}>
        <CartesianGrid strokeDasharray="2 3" stroke={KPI_GRID} vertical={false} />
        <XAxis
          dataKey="i"
          tick={false}
          tickLine={false}
          axisLine={{ stroke: 'rgba(148,163,184,0.35)' }}
          height={6}
        />
        <YAxis
          width={22}
          tick={{ fill: KPI_AXIS, fontSize: 8 }}
          tickLine={false}
          axisLine={{ stroke: 'rgba(148,163,184,0.35)' }}
          ticks={[0, Math.round(max)]}
          domain={[0, Math.ceil(max)]}
          allowDecimals={false}
        />
        <Bar dataKey="v" fill={color} radius={[1.5, 1.5, 0, 0]} isAnimationActive={false} />
      </BarChart>
    </ResponsiveContainer>
  )
}
