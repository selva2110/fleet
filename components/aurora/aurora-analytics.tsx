'use client'

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { Truck } from 'lucide-react'
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

export function AuroraAnalytics() {
  const data = useAuroraData()

  return (
    <div className="flex flex-col gap-4">
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
    </div>
  )
}

function EmptyChart({ label }: { label: string }) {
  return (
    <div className="flex h-full items-center justify-center text-sm text-slate-400">{label}</div>
  )
}
