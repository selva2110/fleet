'use client'

import Link from 'next/link'
import {
  Activity,
  ArrowRight,
  Bus,
  CalendarDays,
  MapPin,
  Route,
  TriangleAlert,
  UserRound,
  Users,
} from 'lucide-react'
import { PageHeader, StatCard, StatusBadge } from '@/components/common'
import { WeeklySchedule } from '@/components/dashboard/weekly-schedule'
import { Card } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Button } from '@/components/ui/button'
import { useFleet } from '@/lib/store'
import { formatMonthDayYear } from '@/lib/date'
import { tripStatusMeta, vehicleStatusMeta } from '@/lib/labels'

export default function DashboardPage() {
  const fleet = useFleet()
  const activeTrips = fleet.trips.filter((t) =>
    ['en-route', 'pickup-in-progress', 'onboard', 'driver-assigned'].includes(t.status),
  )
  const onboard = fleet.trips.filter((t) => t.status === 'onboard').length
  const availableVehicles = fleet.vehicles.filter((v) => v.status === 'available').length
  const availableDrivers = fleet.drivers.filter((d) => d.status === 'available').length
  const scheduledParticipants = fleet.participants.filter((p) =>
    ['scheduled', 'driver-assigned', 'vehicle-assigned'].includes(p.status),
  ).length
  const upcomingEvents = fleet.events.filter((e) => e.status !== 'completed')

  const unassigned = fleet.participants.filter(
    (p) => p.status === 'registered' || p.status === 'scheduled',
  ).length

  return (
    <div className="flex min-h-full flex-col">
      <PageHeader
        title="Operations Overview"
        description="Real-time snapshot of transportation across all care centers."
        actions={
          <Button size="sm" nativeButton={false} render={<Link href="/command-center" />}>
            <MapPin className="size-4" />
            Command Center
          </Button>
        }
      />

      <div className="flex flex-col gap-6 p-6">
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard label="Active Trips" value={activeTrips.length} icon={Route} tone="primary" hint={`${onboard} with participants onboard`} />
          <StatCard label="Participants Today" value={scheduledParticipants} icon={Users} tone="default" hint={`${unassigned} awaiting assignment`} />
          <StatCard label="Available Vehicles" value={availableVehicles} icon={Bus} tone="success" hint={`of ${fleet.vehicles.length} in fleet`} />
          <StatCard label="Available Drivers" value={availableDrivers} icon={UserRound} tone="success" hint={`of ${fleet.drivers.length} on roster`} />
        </div>

        <WeeklySchedule />

        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <div className="flex items-center justify-between border-b border-border px-5 py-3">
              <div className="flex items-center gap-2">
                <Activity className="size-4 text-primary" />
                <h2 className="text-sm font-semibold">Live Trips</h2>
              </div>
              <Button variant="ghost" size="sm" className="h-7 text-xs" nativeButton={false} render={<Link href="/trips" />}>
                View all <ArrowRight className="size-3.5" />
              </Button>
            </div>
            <div className="divide-y divide-border">
              {activeTrips.length === 0 ? (
                <p className="px-5 py-8 text-center text-sm text-muted-foreground">No active trips right now.</p>
              ) : (
                activeTrips.map((t) => {
                  const vehicle = fleet.vehicleById(t.vehicleId)
                  const driver = t.driverId ? fleet.driverById(t.driverId) : undefined
                  const meta = tripStatusMeta[t.status]
                  const picked = t.stops.filter((s) => s.status === 'picked-up').length
                  return (
                    <Link
                      key={t.id}
                      href="/command-center"
                      className="flex items-center gap-4 px-5 py-3 transition-colors hover:bg-muted/50"
                    >
                      <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <Bus className="size-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="truncate text-sm font-medium">{vehicle?.name ?? 'Vehicle'}</span>
                          <span className="font-mono text-[11px] text-muted-foreground">{t.tripNumber}</span>
                        </div>
                        <p className="truncate text-xs text-muted-foreground">
                          {driver?.name ?? 'Unassigned'} · {picked}/{t.stops.length} picked up · ETA {t.etaCenter}
                        </p>
                        <Progress value={t.progress * 100} className="mt-1.5 h-1" />
                      </div>
                      <StatusBadge label={meta.label} cls={meta.cls} />
                    </Link>
                  )
                })
              )}
            </div>
          </Card>

          <div className="flex flex-col gap-6">
            <Card>
              <div className="flex items-center gap-2 border-b border-border px-5 py-3">
                <CalendarDays className="size-4 text-primary" />
                <h2 className="text-sm font-semibold">Upcoming Events</h2>
              </div>
              <div className="divide-y divide-border">
                {upcomingEvents.map((e) => {
                  const center = fleet.centerById(e.centerId)
                  return (
                    <div key={e.id} className="px-5 py-3">
                      <p className="text-sm font-medium leading-tight text-pretty">{e.name}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {center?.name} · {formatMonthDayYear(e.date)} at {e.startTime}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {e.participantIds.length} participants expected
                      </p>
                    </div>
                  )
                })}
              </div>
            </Card>

            <Card className="border-warning/40 bg-warning/5">
              <div className="flex items-center gap-2 border-b border-warning/30 px-5 py-3">
                <TriangleAlert className="size-4 text-warning-foreground" />
                <h2 className="text-sm font-semibold">Attention Needed</h2>
              </div>
              <div className="px-5 py-3 text-sm">
                {unassigned > 0 ? (
                  <p className="text-muted-foreground">
                    <span className="font-semibold text-foreground">{unassigned}</span> participants still need
                    transport assigned.{' '}
                    <Link href="/planner" className="font-medium text-primary hover:underline">
                      Open Planner
                    </Link>
                  </p>
                ) : (
                  <p className="text-muted-foreground">All participants are assigned. Vehicles running smoothly.</p>
                )}
              </div>
            </Card>
          </div>
        </div>

        <Card>
          <div className="flex items-center gap-2 border-b border-border px-5 py-3">
            <Bus className="size-4 text-primary" />
            <h2 className="text-sm font-semibold">Vehicles Status</h2>
          </div>
          <div className="grid gap-px bg-border sm:grid-cols-2 lg:grid-cols-3">
            {fleet.vehicles.map((v) => {
              const meta = vehicleStatusMeta[v.status]
              return (
                <div key={v.id} className="flex items-center gap-3 bg-card px-5 py-3">
                  <div className="flex size-8 items-center justify-center rounded-md bg-muted text-muted-foreground">
                    <Bus className="size-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{v.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {v.capacity} seats · {v.wheelchairCapacity} WC
                    </p>
                  </div>
                  <StatusBadge label={meta.label} cls={meta.cls} />
                </div>
              )
            })}
          </div>
        </Card>
      </div>
    </div>
  )
}
