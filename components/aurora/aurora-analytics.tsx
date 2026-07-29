'use client'

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { BarChart3, Truck, Users } from 'lucide-react'
import { AURORA_ACCENTS, GlassCard, PanelTitle } from './aurora-ui'
import { useAuroraData } from './use-aurora-data'

const AXIS = 'rgba(148,163,184,0.75)' // slate-400-ish
const GRID = 'rgba(148,163,184,0.14)'

const tooltipStyle = {
  background: 'rgba(15,23,42,0.95)',
  border: '1px solid rgba(148,163,184,0.25)',
  borderRadius: 12,
  color: '#e2e8f0',
  fontSize: 12,
}

const axisProps = {
  stroke: AXIS,
  tick: { fill: AXIS, fontSize: 11 },
  tickLine: { stroke: GRID },
  axisLine: { stroke: GRID },
}

const PIE_COLORS = [
  AURORA_ACCENTS.cyan,
  AURORA_ACCENTS.emerald,
  AURORA_ACCENTS.violet,
  AURORA_ACCENTS.amber,
]

export function AuroraAnalytics() {
  const data = useAuroraData()

  return (
    <div className="flex flex-col gap-4">
      {/* Weekly demand — real events + riders + meals bucketed by weekday */}
      <GlassCard className="p-0 pb-4">
        <PanelTitle icon={BarChart3} accent="cyan" action={<Legendish />}>
          Weekly Demand
        </PanelTitle>
        <div className="mt-3 h-64 px-3">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data.weeklySeries} margin={{ top: 8, right: 12, bottom: 4, left: -12 }}>
              <defs>
                <linearGradient id="gEvents" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={AURORA_ACCENTS.cyan} stopOpacity={0.5} />
                  <stop offset="100%" stopColor={AURORA_ACCENTS.cyan} stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gRiders" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={AURORA_ACCENTS.violet} stopOpacity={0.45} />
                  <stop offset="100%" stopColor={AURORA_ACCENTS.violet} stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gMeals" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={AURORA_ACCENTS.emerald} stopOpacity={0.45} />
                  <stop offset="100%" stopColor={AURORA_ACCENTS.emerald} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={GRID} vertical={false} />
              <XAxis dataKey="day" {...axisProps} />
              <YAxis allowDecimals={false} {...axisProps} />
              <Tooltip contentStyle={tooltipStyle} cursor={{ stroke: GRID }} />
              <Area
                type="monotone"
                dataKey="events"
                name="Events"
                stroke={AURORA_ACCENTS.cyan}
                strokeWidth={2}
                fill="url(#gEvents)"
              />
              <Area
                type="monotone"
                dataKey="riders"
                name="Riders"
                stroke={AURORA_ACCENTS.violet}
                strokeWidth={2}
                fill="url(#gRiders)"
              />
              <Area
                type="monotone"
                dataKey="meals"
                name="Meals"
                stroke={AURORA_ACCENTS.emerald}
                strokeWidth={2}
                fill="url(#gMeals)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </GlassCard>

      {/* Load per care center — real trips + riders */}
      <GlassCard className="p-0 pb-4">
        <PanelTitle icon={Truck} accent="blue">
          Load by Care Center
        </PanelTitle>
        <div className="mt-3 h-64 px-3">
          {data.centerSeries.length === 0 ? (
            <EmptyChart label="No trips or deliveries scheduled yet." />
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.centerSeries} margin={{ top: 8, right: 12, bottom: 4, left: -12 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={GRID} vertical={false} />
                <XAxis dataKey="name" {...axisProps} interval={0} angle={-12} textAnchor="end" height={48} />
                <YAxis allowDecimals={false} {...axisProps} />
                <Tooltip contentStyle={tooltipStyle} cursor={{ fill: 'rgba(148,163,184,0.08)' }} />
                <Legend wrapperStyle={{ fontSize: 11, color: AXIS }} />
                <Bar dataKey="trips" name="Trips" fill={AURORA_ACCENTS.cyan} radius={[4, 4, 0, 0]} maxBarSize={26} />
                <Bar dataKey="riders" name="Riders" fill={AURORA_ACCENTS.blue} radius={[4, 4, 0, 0]} maxBarSize={26} />
                <Bar dataKey="meals" name="Meals" fill={AURORA_ACCENTS.emerald} radius={[4, 4, 0, 0]} maxBarSize={26} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </GlassCard>

      <div className="grid gap-4 md:grid-cols-2">
        {/* Vehicle status distribution — real */}
        <GlassCard className="p-0 pb-4">
          <PanelTitle icon={Truck} accent="emerald">
            Fleet Status Mix
          </PanelTitle>
          <div className="mt-3 h-56 px-3">
            {data.vehicleStatusSeries.length === 0 ? (
              <EmptyChart label="No vehicles in the fleet." />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Tooltip contentStyle={tooltipStyle} />
                  <Legend wrapperStyle={{ fontSize: 11, color: AXIS }} />
                  <Pie
                    data={data.vehicleStatusSeries}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={44}
                    outerRadius={72}
                    paddingAngle={3}
                    stroke="none"
                  >
                    {data.vehicleStatusSeries.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </GlassCard>

        {/* Participant mobility mix — real */}
        <GlassCard className="p-0 pb-4">
          <PanelTitle icon={Users} accent="violet">
            Participant Mobility Mix
          </PanelTitle>
          <div className="mt-3 h-56 px-3">
            {data.mobilitySeries.length === 0 ? (
              <EmptyChart label="No participants registered." />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={data.mobilitySeries}
                  layout="vertical"
                  margin={{ top: 4, right: 16, bottom: 4, left: 8 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke={GRID} horizontal={false} />
                  <XAxis type="number" allowDecimals={false} {...axisProps} />
                  <YAxis type="category" dataKey="name" width={84} {...axisProps} />
                  <Tooltip contentStyle={tooltipStyle} cursor={{ fill: 'rgba(148,163,184,0.08)' }} />
                  <Bar dataKey="value" name="Participants" radius={[0, 4, 4, 0]} maxBarSize={22}>
                    {data.mobilitySeries.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </GlassCard>
      </div>
    </div>
  )
}

function Legendish() {
  const items = [
    { label: 'Events', color: AURORA_ACCENTS.cyan },
    { label: 'Riders', color: AURORA_ACCENTS.violet },
    { label: 'Meals', color: AURORA_ACCENTS.emerald },
  ]
  return (
    <div className="hidden items-center gap-3 sm:flex">
      {items.map((i) => (
        <span key={i.label} className="flex items-center gap-1.5 text-[11px] text-slate-400">
          <span className="size-2 rounded-full" style={{ background: i.color }} />
          {i.label}
        </span>
      ))}
    </div>
  )
}

function EmptyChart({ label }: { label: string }) {
  return (
    <div className="flex h-full items-center justify-center text-sm text-slate-400">{label}</div>
  )
}
