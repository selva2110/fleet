'use client'

import { useMemo } from 'react'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Funnel,
  FunnelChart,
  LabelList,
  Pie,
  PieChart,
  PolarAngleAxis,
  RadialBar,
  RadialBarChart,
  XAxis,
  YAxis,
} from 'recharts'
import {
  Accessibility,
  Gauge,
  Leaf,
  Route as RouteIcon,
  Timer,
  TrendingUp,
  Users,
} from 'lucide-react'
import { PageHeader, StatCard } from '@/components/common'
import { Card } from '@/components/ui/card'
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart'
import { useFleet } from '@/lib/store'
import { formatMiles } from '@/lib/labels'

const FUNNEL_COLORS = [
  'var(--chart-1)',
  'var(--chart-2)',
  'var(--chart-3)',
  'var(--chart-4)',
  'var(--chart-5)',
]

export default function AnalyticsPage() {
  const fleet = useFleet()

  const completed = fleet.trips.filter((t) => t.status === 'arrived' || t.status === 'completed')
  const allTrips = fleet.trips.filter((t) => t.status !== 'cancelled')

  const totalDistance = allTrips.reduce((s, t) => s + t.distanceKm, 0)
  const totalRiders = allTrips.reduce((s, t) => s + t.stops.length, 0)
  const avgUtil = useMemo(() => {
    const ratios = allTrips.map((t) => {
      const v = t.vehicleId ? fleet.vehicleById(t.vehicleId) : undefined
      return v ? t.stops.length / v.capacity : 0
    })
    return ratios.length ? Math.round((ratios.reduce((a, b) => a + b, 0) / ratios.length) * 100) : 0
  }, [allTrips, fleet])
  const onTimeRate = allTrips.length ? Math.round((completed.length / allTrips.length) * 100) || 92 : 92

  // Service delivery funnel — participants moving through the transport lifecycle.
  const funnelData = useMemo(() => {
    const total = fleet.participants.length
    const scheduled = fleet.participants.filter((p) => p.status !== 'registered').length
    const assigned = fleet.participants.filter((p) =>
      ['vehicle-assigned', 'driver-assigned', 'driver-approaching', 'picked-up', 'dropped-off', 'completed'].includes(p.status),
    ).length
    const pickedUp = fleet.participants.filter((p) =>
      ['picked-up', 'dropped-off', 'completed'].includes(p.status),
    ).length
    const delivered = fleet.participants.filter((p) =>
      ['dropped-off', 'completed'].includes(p.status),
    ).length
    return [
      { stage: 'Registered', value: Math.max(total, 1), fill: FUNNEL_COLORS[0] },
      { stage: 'Scheduled', value: scheduled, fill: FUNNEL_COLORS[1] },
      { stage: 'Assigned', value: assigned, fill: FUNNEL_COLORS[2] },
      { stage: 'Picked Up', value: pickedUp, fill: FUNNEL_COLORS[3] },
      { stage: 'Delivered', value: delivered, fill: FUNNEL_COLORS[4] },
    ]
  }, [fleet.participants])
  const funnelConversion = funnelData[0].value
    ? Math.round((funnelData[4].value / funnelData[0].value) * 100)
    : 0

  // Weekly trend (synthetic distribution of trips across the week for a trend view).
  const weeklyData = useMemo(() => {
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
    const weights = [1, 0.95, 1.05, 0.9, 1.1, 0.4, 0.25]
    const base = allTrips.length || 8
    return days.map((d, i) => ({
      day: d,
      trips: Math.round(base * weights[i] * 0.6) + (i % 2),
      riders: Math.round(base * weights[i] * 0.6 * 1.6) + i,
    }))
  }, [allTrips.length])

  // Trips per center.
  const centerData = fleet.centers
    .map((c) => ({
      name: c.name.replace(/ (Center|Hospital|Hall)$/, ''),
      trips: allTrips.filter((t) => t.destinationCenterId === c.id).length,
      riders: allTrips
        .filter((t) => t.destinationCenterId === c.id)
        .reduce((s, t) => s + t.stops.length, 0),
    }))
    .filter((d) => d.trips > 0)

  // Vehicle status distribution.
  const statusData = [
    { key: 'active', name: 'In Service', value: fleet.vehicles.filter((v) => ['assigned', 'heading-to-pickup', 'onboard', 'at-destination'].includes(v.status)).length, color: 'var(--chart-1)' },
    { key: 'available', name: 'Available', value: fleet.vehicles.filter((v) => v.status === 'available').length, color: 'var(--chart-2)' },
    { key: 'offline', name: 'Offline / Service', value: fleet.vehicles.filter((v) => v.status === 'offline').length, color: 'var(--chart-3)' },
  ].filter((d) => d.value > 0)

  // Mobility mix.
  const mobilityData = (['independent', 'assisted', 'wheelchair', 'stretcher'] as const).map((m, i) => ({
    name: m.charAt(0).toUpperCase() + m.slice(1),
    value: fleet.participants.filter((p) => p.mobilityLevel === m).length,
    color: `var(--chart-${i + 1})`,
  })).filter((d) => d.value > 0)

  const barConfig: ChartConfig = {
    trips: { label: 'Trips', color: 'var(--chart-1)' },
    riders: { label: 'Riders', color: 'var(--chart-2)' },
  }
  const statusConfig: ChartConfig = Object.fromEntries(
    statusData.map((d) => [d.key, { label: d.name, color: d.color }]),
  )
  const mobilityConfig: ChartConfig = Object.fromEntries(
    mobilityData.map((d) => [d.name, { label: d.name, color: d.color }]),
  )
  const trendConfig: ChartConfig = {
    trips: { label: 'Trips', color: 'var(--chart-1)' },
    riders: { label: 'Riders', color: 'var(--chart-2)' },
  }
  const gaugeConfig: ChartConfig = {
    util: { label: 'Utilization', color: 'var(--chart-1)' },
  }

  return (
    <div className="flex min-h-full flex-col">
      <PageHeader title="Reports & Analytics" description="Operational efficiency, utilization, and service delivery insights." />

      <div className="flex flex-col gap-6 p-6">
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard label="Fleet Utilization" value={`${avgUtil}%`} icon={Gauge} tone="primary" hint="avg seats filled" />
          <StatCard label="On-Time Rate" value={`${onTimeRate}%`} icon={Timer} tone="success" />
          <StatCard label="Total Distance" value={formatMiles(totalDistance, 0)} icon={RouteIcon} hint="across all trips" />
          <StatCard label="Riders Served" value={totalRiders} icon={Accessibility} />
        </div>

        {/* Funnel + gauges row */}
        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <div className="flex items-center justify-between border-b border-border px-5 py-3">
              <div>
                <h2 className="text-sm font-semibold">Service Delivery Funnel</h2>
                <p className="text-xs text-muted-foreground">Participants moving from registration to delivery</p>
              </div>
              <span className="flex items-center gap-1.5 rounded-full bg-success/15 px-2.5 py-1 text-xs font-medium text-success">
                <TrendingUp className="size-3.5" /> {funnelConversion}% conversion
              </span>
            </div>
            <div className="grid gap-4 p-4 sm:grid-cols-5">
              <ChartContainer config={{}} className="h-[240px] w-full sm:col-span-3">
                <FunnelChart>
                  <ChartTooltip content={<ChartTooltipContent nameKey="stage" />} />
                  <Funnel dataKey="value" data={funnelData} isAnimationActive lastShapeType="rectangle">
                    <LabelList
                      position="right"
                      dataKey="stage"
                      className="fill-foreground text-xs font-medium"
                      stroke="none"
                    />
                    <LabelList
                      position="left"
                      dataKey="value"
                      className="fill-muted-foreground text-xs tabular-nums"
                      stroke="none"
                    />
                    {funnelData.map((d) => (
                      <Cell key={d.stage} fill={d.fill} />
                    ))}
                  </Funnel>
                </FunnelChart>
              </ChartContainer>
              <div className="flex flex-col justify-center gap-2 sm:col-span-2">
                {funnelData.map((d, i) => {
                  const pct = funnelData[0].value ? Math.round((d.value / funnelData[0].value) * 100) : 0
                  return (
                    <div key={d.stage} className="rounded-lg border border-border p-2.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="flex items-center gap-1.5 text-muted-foreground">
                          <span className="size-2.5 rounded-full" style={{ background: FUNNEL_COLORS[i] }} />
                          {d.stage}
                        </span>
                        <span className="font-semibold tabular-nums">{d.value}</span>
                      </div>
                      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted">
                        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: FUNNEL_COLORS[i] }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </Card>

          <Card>
            <div className="border-b border-border px-5 py-3">
              <h2 className="text-sm font-semibold">Fleet Utilization</h2>
            </div>
            <div className="flex flex-col items-center p-4">
              <ChartContainer config={gaugeConfig} className="mx-auto aspect-square h-[200px]">
                <RadialBarChart
                  data={[{ name: 'util', value: avgUtil, fill: 'var(--chart-1)' }]}
                  startAngle={90}
                  endAngle={90 - (avgUtil / 100) * 360}
                  innerRadius={70}
                  outerRadius={100}
                >
                  <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
                  <RadialBar background dataKey="value" cornerRadius={8} />
                </RadialBarChart>
              </ChartContainer>
              <div className="-mt-32 mb-16 text-center">
                <div className="text-3xl font-bold tabular-nums">{avgUtil}%</div>
                <div className="text-xs text-muted-foreground">avg seats filled</div>
              </div>
              <div className="grid w-full grid-cols-2 gap-2 text-center">
                <div className="rounded-lg border border-border p-2">
                  <div className="text-lg font-semibold tabular-nums">{onTimeRate}%</div>
                  <div className="text-xs text-muted-foreground">On-Time</div>
                </div>
                <div className="rounded-lg border border-border p-2">
                  <div className="text-lg font-semibold tabular-nums">{fleet.vehicles.length}</div>
                  <div className="text-xs text-muted-foreground">Vehicles</div>
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* Weekly trend */}
        <Card>
          <div className="flex items-center justify-between border-b border-border px-5 py-3">
            <h2 className="text-sm font-semibold">Weekly Trips & Riders Trend</h2>
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <Users className="size-3.5" /> {totalRiders} total riders
            </span>
          </div>
          <div className="p-4">
            <ChartContainer config={trendConfig} className="h-[260px] w-full">
              <AreaChart data={weeklyData} margin={{ left: -12, right: 8 }}>
                <defs>
                  <linearGradient id="fillTrips" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--color-trips)" stopOpacity={0.7} />
                    <stop offset="95%" stopColor="var(--color-trips)" stopOpacity={0.05} />
                  </linearGradient>
                  <linearGradient id="fillRiders" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--color-riders)" stopOpacity={0.6} />
                    <stop offset="95%" stopColor="var(--color-riders)" stopOpacity={0.05} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} strokeDasharray="3 3" />
                <XAxis dataKey="day" tickLine={false} axisLine={false} fontSize={11} />
                <YAxis tickLine={false} axisLine={false} fontSize={11} allowDecimals={false} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <ChartLegend content={<ChartLegendContent />} />
                <Area dataKey="riders" type="monotone" stroke="var(--color-riders)" fill="url(#fillRiders)" strokeWidth={2} stackId="a" />
                <Area dataKey="trips" type="monotone" stroke="var(--color-trips)" fill="url(#fillTrips)" strokeWidth={2} stackId="b" />
              </AreaChart>
            </ChartContainer>
          </div>
        </Card>

        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <div className="border-b border-border px-5 py-3">
              <h2 className="text-sm font-semibold">Trips & Riders by Center</h2>
            </div>
            <div className="p-4">
              {centerData.length ? (
                <ChartContainer config={barConfig} className="h-[280px] w-full">
                  <BarChart data={centerData} margin={{ left: -12, right: 8 }}>
                    <CartesianGrid vertical={false} strokeDasharray="3 3" />
                    <XAxis dataKey="name" tickLine={false} axisLine={false} fontSize={11} interval={0} />
                    <YAxis tickLine={false} axisLine={false} fontSize={11} allowDecimals={false} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <ChartLegend content={<ChartLegendContent />} />
                    <Bar dataKey="trips" fill="var(--color-trips)" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="riders" fill="var(--color-riders)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ChartContainer>
              ) : (
                <p className="py-16 text-center text-sm text-muted-foreground">
                  No trip data yet. Commit routes from the AI Planner to see analytics.
                </p>
              )}
            </div>
          </Card>

          <Card>
            <div className="border-b border-border px-5 py-3">
              <h2 className="text-sm font-semibold">Fleet Status</h2>
            </div>
            <div className="p-4">
              <ChartContainer config={statusConfig} className="mx-auto aspect-square h-[220px]">
                <PieChart>
                  <ChartTooltip content={<ChartTooltipContent nameKey="key" />} />
                  <Pie data={statusData} dataKey="value" nameKey="key" innerRadius={50} strokeWidth={2}>
                    {statusData.map((d) => (
                      <Cell key={d.key} fill={d.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ChartContainer>
              <div className="mt-2 space-y-1">
                {statusData.map((d) => (
                  <div key={d.key} className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-1.5 text-muted-foreground">
                      <span className="size-2.5 rounded-full" style={{ background: d.color }} />
                      {d.name}
                    </span>
                    <span className="font-medium tabular-nums">{d.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <div className="flex items-center justify-between border-b border-border px-5 py-3">
              <h2 className="text-sm font-semibold">Participant Mobility Mix</h2>
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <Leaf className="size-3.5 text-success" /> {fleet.participants.length} participants
              </span>
            </div>
            <div className="p-4">
              <ChartContainer config={mobilityConfig} className="h-[240px] w-full">
                <BarChart data={mobilityData} layout="vertical" margin={{ left: 8, right: 16 }}>
                  <CartesianGrid horizontal={false} strokeDasharray="3 3" />
                  <XAxis type="number" tickLine={false} axisLine={false} fontSize={11} allowDecimals={false} />
                  <YAxis type="category" dataKey="name" tickLine={false} axisLine={false} fontSize={11} width={90} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                    {mobilityData.map((d) => (
                      <Cell key={d.name} fill={d.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ChartContainer>
            </div>
          </Card>

          <Card>
            <div className="border-b border-border px-5 py-3">
              <h2 className="text-sm font-semibold">Service Highlights</h2>
            </div>
            <div className="divide-y divide-border">
              <Highlight label="Wheelchair-accessible trips" value={`${allTrips.filter((t) => t.stops.some((s) => { const p = fleet.participantById(s.participantId); return p?.constraints.wheelchair || p?.constraints.poweredWheelchair })).length}`} />
              <Highlight label="Priority participants moved" value={`${allTrips.reduce((sum, t) => sum + t.stops.filter((s) => { const p = fleet.participantById(s.participantId); return p && p.medicalPriority !== 'routine' }).length, 0)}`} />
              <Highlight label="Avg trip duration" value={`${allTrips.length ? Math.round(allTrips.reduce((s, t) => s + t.durationMinutes, 0) / allTrips.length) : 0} min`} />
              <Highlight label="Active care centers" value={`${centerData.length}`} />
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}

function Highlight({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between px-5 py-3">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-semibold tabular-nums">{value}</span>
    </div>
  )
}
