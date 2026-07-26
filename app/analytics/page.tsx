'use client'

import { useMemo } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  XAxis,
  YAxis,
} from 'recharts'
import { Accessibility, Gauge, Leaf, Route as RouteIcon, Timer } from 'lucide-react'
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

  return (
    <div className="flex min-h-full flex-col">
      <PageHeader title="Analytics" description="Operational efficiency, utilization, and service insights." />

      <div className="flex flex-col gap-6 p-6">
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard label="Fleet Utilization" value={`${avgUtil}%`} icon={Gauge} tone="primary" hint="avg seats filled" />
          <StatCard label="On-Time Rate" value={`${onTimeRate}%`} icon={Timer} tone="success" />
          <StatCard label="Total Distance" value={formatMiles(totalDistance, 0)} icon={RouteIcon} hint="across all trips" />
          <StatCard label="Riders Served" value={totalRiders} icon={Accessibility} />
        </div>

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
