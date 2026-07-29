'use client'

import Link from 'next/link'
import {
  Cell,
  Pie,
  PieChart,
  PolarAngleAxis,
  RadialBar,
  RadialBarChart,
  ResponsiveContainer,
} from 'recharts'
import {
  AlertTriangle,
  Bus,
  CircleCheck,
  Gauge,
  HeartPulse,
  Info,
  PieChart as PieIcon,
  UserRound,
  Users,
  UtensilsCrossed,
} from 'lucide-react'
import { AURORA_ACCENTS, GlassCard, PanelTitle } from './aurora-ui'
import { useAuroraData } from './use-aurora-data'
import { useFleet } from '@/lib/store'
import { mealStatusMeta } from '@/lib/labels'
import { cn } from '@/lib/utils'

export function AuroraWidgets() {
  return (
    <div className="flex flex-col gap-4">
      <TodaysOverview />
      <MealDeliveryWidget />
      <AlertsCenter />
      <DriverStatus />
      <FleetUtilization />
      <AttendanceAnalytics />
      <PaceInsights />
    </div>
  )
}

function MealDeliveryWidget() {
  const data = useAuroraData()
  const runs = data.allMeals
  const deliveredPct =
    data.mealStopsTotal > 0 ? Math.round((data.mealStopsDelivered / data.mealStopsTotal) * 100) : 0

  return (
    <GlassCard className="p-0 pb-4">
      <PanelTitle
        icon={UtensilsCrossed}
        accent="emerald"
        action={
          <Link href="/command-center?tab=meals" className="text-[11px] font-medium text-emerald-300 hover:text-emerald-200">
            View all
          </Link>
        }
      >
        Meal Delivery
      </PanelTitle>
      <div className="mt-2 px-5">
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-semibold tabular-nums text-white">{data.mealsOut}</span>
          <span className="text-xs text-slate-400">
            meals out · {data.mealStopsDelivered}/{data.mealStopsTotal} stops delivered
          </span>
        </div>
        <span className="mt-2 block h-1.5 overflow-hidden rounded-full bg-white/10">
          <span
            className="block h-full rounded-full bg-gradient-to-r from-emerald-400 to-cyan-400"
            style={{ width: `${deliveredPct}%` }}
          />
        </span>
        <div className="mt-3 space-y-1.5">
          {runs.length === 0 ? (
            <p className="py-2 text-xs text-slate-400">No meal runs scheduled yet.</p>
          ) : (
            runs.slice(0, 4).map((m) => (
              <div key={m.id} className="flex items-center justify-between rounded-lg bg-white/[0.03] px-2.5 py-1.5">
                <span className="flex items-center gap-2 text-xs text-slate-300">
                  <span
                    className="size-2 rounded-full"
                    style={{ background: mealStatusMeta[m.status].map }}
                  />
                  <span className="font-mono text-[11px]">{m.runNumber}</span>
                  <span className="text-slate-500">{m.mealType}</span>
                </span>
                <span className="text-[11px] tabular-nums text-slate-400">
                  {m.totalMeals} meals · {mealStatusMeta[m.status].label}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </GlassCard>
  )
}

function TodaysOverview() {
  const data = useAuroraData()
  const slices = [
    { name: 'Live', value: data.tripStatusCounts.live, color: AURORA_ACCENTS.cyan },
    { name: 'Completed', value: data.tripStatusCounts.completed, color: AURORA_ACCENTS.emerald },
    { name: 'Planned', value: data.tripStatusCounts.planned, color: AURORA_ACCENTS.violet },
    { name: 'Cancelled', value: data.tripStatusCounts.cancelled, color: AURORA_ACCENTS.rose },
  ].filter((s) => s.value > 0)
  const total = slices.reduce((s, d) => s + d.value, 0)

  return (
    <GlassCard className="p-0 pb-4">
      <PanelTitle icon={PieIcon} accent="cyan">
        Today&apos;s Overview
      </PanelTitle>
      <div className="mt-2 flex items-center gap-4 px-5">
        <div className="relative size-32 shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={total > 0 ? slices : [{ name: 'None', value: 1, color: '#334155' }]}
                dataKey="value"
                innerRadius={42}
                outerRadius={60}
                paddingAngle={total > 0 ? 3 : 0}
                stroke="none"
                startAngle={90}
                endAngle={-270}
              >
                {(total > 0 ? slices : [{ color: '#334155' }]).map((s, i) => (
                  <Cell key={i} fill={s.color} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-xl font-semibold tabular-nums text-white">{total}</span>
            <span className="text-[10px] uppercase tracking-wide text-slate-400">trips</span>
          </div>
        </div>
        <div className="flex-1 space-y-1.5">
          {slices.length === 0 ? (
            <p className="text-xs text-slate-400">No trips recorded yet today.</p>
          ) : (
            slices.map((s) => (
              <div key={s.name} className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-2 text-slate-300">
                  <span className="size-2.5 rounded-full" style={{ background: s.color }} />
                  {s.name}
                </span>
                <span className="font-medium tabular-nums text-white">{s.value}</span>
              </div>
            ))
          )}
        </div>
      </div>
    </GlassCard>
  )
}

function AlertsCenter() {
  const data = useAuroraData()
  const meta = {
    critical: { cls: 'border-rose-400/25 bg-rose-400/10 text-rose-200', icon: AlertTriangle, dot: 'bg-rose-400' },
    warning: { cls: 'border-amber-400/25 bg-amber-400/10 text-amber-200', icon: AlertTriangle, dot: 'bg-amber-400' },
    info: { cls: 'border-cyan-400/20 bg-cyan-400/10 text-cyan-200', icon: Info, dot: 'bg-cyan-400' },
  } as const

  return (
    <GlassCard className="p-0 pb-4">
      <PanelTitle icon={AlertTriangle} accent="rose">
        Alerts Center
      </PanelTitle>
      <div className="mt-3 flex flex-col gap-2 px-4">
        {data.alerts.map((a) => {
          const m = meta[a.severity]
          const Icon = m.icon
          return (
            <Link
              key={a.id}
              href={a.href}
              className={cn('flex items-start gap-2.5 rounded-xl border p-3 transition-colors hover:brightness-125', m.cls)}
            >
              <Icon className="mt-0.5 size-4 shrink-0" />
              <div className="min-w-0">
                <p className="text-[13px] font-medium leading-tight text-white">{a.title}</p>
                <p className="mt-0.5 text-xs text-slate-300/80">{a.detail}</p>
              </div>
            </Link>
          )
        })}
      </div>
    </GlassCard>
  )
}

function DriverStatus() {
  const data = useAuroraData()
  const s = data.driverStatusCounts
  const total = s.available + s.onTrip + s.break + s.offline || 1
  const segs = [
    { label: 'Available', value: s.available, color: AURORA_ACCENTS.emerald },
    { label: 'On trip', value: s.onTrip, color: AURORA_ACCENTS.cyan },
    { label: 'On break', value: s.break, color: AURORA_ACCENTS.amber },
    { label: 'Offline', value: s.offline, color: '#64748b' },
  ]
  return (
    <GlassCard className="p-0 pb-4">
      <PanelTitle icon={UserRound} accent="emerald">
        Driver Status
      </PanelTitle>
      <div className="mt-3 px-5">
        <div className="flex h-3 w-full overflow-hidden rounded-full bg-white/5">
          {segs.map((seg) =>
            seg.value > 0 ? (
              <span
                key={seg.label}
                style={{ width: `${(seg.value / total) * 100}%`, background: seg.color }}
                className="h-full"
              />
            ) : null,
          )}
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2">
          {segs.map((seg) => (
            <div key={seg.label} className="flex items-center justify-between rounded-lg bg-white/[0.03] px-2.5 py-1.5">
              <span className="flex items-center gap-1.5 text-xs text-slate-300">
                <span className="size-2 rounded-full" style={{ background: seg.color }} />
                {seg.label}
              </span>
              <span className="text-xs font-semibold tabular-nums text-white">{seg.value}</span>
            </div>
          ))}
        </div>
      </div>
    </GlassCard>
  )
}

function FleetUtilization() {
  const data = useAuroraData()
  const pct = data.fleetUtilization
  const chartData = [{ name: 'util', value: pct, fill: AURORA_ACCENTS.blue }]
  return (
    <GlassCard className="p-0 pb-4">
      <PanelTitle icon={Gauge} accent="blue">
        Fleet Utilization
      </PanelTitle>
      <div className="mt-2 flex items-center gap-4 px-5">
        <div className="relative size-32 shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <RadialBarChart
              innerRadius="72%"
              outerRadius="100%"
              data={chartData}
              startAngle={90}
              endAngle={-270}
            >
              <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
              <RadialBar background={{ fill: 'rgba(255,255,255,0.06)' }} dataKey="value" cornerRadius={8} />
            </RadialBarChart>
          </ResponsiveContainer>
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-xl font-semibold tabular-nums text-white">{pct}%</span>
            <span className="text-[10px] uppercase tracking-wide text-slate-400">in use</span>
          </div>
        </div>
        <div className="flex-1 space-y-2 text-xs">
          <Metric icon={Bus} label="In use" value={data.vehiclesInUse} color={AURORA_ACCENTS.blue} />
          <Metric icon={CircleCheck} label="Available" value={data.vehiclesAvailable} color={AURORA_ACCENTS.emerald} />
          <Metric icon={Bus} label="Total fleet" value={data.totals.vehicles} color="#94a3b8" />
        </div>
      </div>
    </GlassCard>
  )
}

function Metric({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>
  label: string
  value: number
  color: string
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="flex items-center gap-1.5 text-slate-300">
        <Icon className="size-3.5" style={{ color }} />
        {label}
      </span>
      <span className="font-semibold tabular-nums text-white">{value}</span>
    </div>
  )
}

function AttendanceAnalytics() {
  const data = useAuroraData()
  const rows = [
    { label: 'Needs transport', value: data.attendingTransport, color: AURORA_ACCENTS.cyan },
    { label: 'Own transport', value: data.attendingSelf, color: AURORA_ACCENTS.emerald },
    { label: 'Not attending', value: data.notAttending, color: AURORA_ACCENTS.rose },
    { label: 'No response', value: data.noResponse, color: AURORA_ACCENTS.amber },
  ]
  const max = Math.max(1, ...rows.map((r) => r.value))
  return (
    <GlassCard className="p-0 pb-4">
      <PanelTitle icon={Users} accent="amber">
        Participant Attendance
      </PanelTitle>
      <div className="mt-3 space-y-2.5 px-5">
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-semibold tabular-nums text-white">{data.attendanceRate}%</span>
          <span className="text-xs text-slate-400">confirmed attendance · {data.responded} replies</span>
        </div>
        {rows.map((r) => (
          <div key={r.label}>
            <div className="mb-1 flex items-center justify-between text-xs">
              <span className="text-slate-300">{r.label}</span>
              <span className="font-medium tabular-nums text-white">{r.value}</span>
            </div>
            <span className="block h-1.5 overflow-hidden rounded-full bg-white/10">
              <span
                className="block h-full rounded-full"
                style={{ width: `${(r.value / max) * 100}%`, background: r.color }}
              />
            </span>
          </div>
        ))}
      </div>
    </GlassCard>
  )
}

function PaceInsights() {
  const fleet = useFleet()
  const data = useAuroraData()
  const eligible = fleet.participants.filter((p) => p.eligible).length
  const registered = data.totals.participants
  const scheduled = data.scheduled
  const enrolled = registered > 0 ? Math.round((scheduled / registered) * 100) : 0

  const funnel = [
    { label: 'Registered', value: registered, color: AURORA_ACCENTS.violet },
    { label: 'Eligible', value: eligible, color: AURORA_ACCENTS.blue },
    { label: 'Scheduled', value: scheduled, color: AURORA_ACCENTS.cyan },
    { label: 'Transport requests', value: data.attendingTransport, color: AURORA_ACCENTS.emerald },
  ]
  const max = Math.max(1, ...funnel.map((f) => f.value))

  return (
    <GlassCard className="p-0 pb-4">
      <PanelTitle icon={HeartPulse} accent="violet">
        PACE Program Registration
      </PanelTitle>
      <div className="mt-3 px-5">
        <div className="mb-3 flex items-baseline gap-2">
          <span className="text-2xl font-semibold tabular-nums text-white">{enrolled}%</span>
          <span className="text-xs text-slate-400">scheduled-to-registered rate</span>
        </div>
        <div className="space-y-2">
          {funnel.map((f) => (
            <div key={f.label} className="flex items-center gap-3">
              <span className="w-32 shrink-0 text-xs text-slate-300">{f.label}</span>
              <span className="h-2 flex-1 overflow-hidden rounded-full bg-white/10">
                <span
                  className="block h-full rounded-full"
                  style={{ width: `${(f.value / max) * 100}%`, background: f.color }}
                />
              </span>
              <span className="w-6 shrink-0 text-right text-xs font-semibold tabular-nums text-white">
                {f.value}
              </span>
            </div>
          ))}
        </div>
      </div>
    </GlassCard>
  )
}
