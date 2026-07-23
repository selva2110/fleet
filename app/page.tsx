'use client';

import Link from 'next/link';
import {
  Car,
  Users,
  Route as RouteIcon,
  Building2,
  CalendarDays,
  TrendingUp,
  AlertTriangle,
  Clock,
  CheckCircle2,
  Activity,
  ArrowRight,
  Radar,
} from 'lucide-react';
import { useCenters, useDrivers, useEvents, useParticipants, useTrips, useVehicles, useSystemEvents } from '@/lib/hooks';
import { useFleetStore } from '@/lib/store';
import { useLiveTracking } from '@/lib/use-live-tracking';
import { StatusBadge, PriorityBadge, formatRelativeTime, formatEta } from '@/components/shared/badges';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

export default function DashboardPage() {
  useLiveTracking();
  const centers = useCenters().data;
  const events = useEvents().data;
  const participants = useParticipants().data;
  const vehicles = useVehicles().data;
  const drivers = useDrivers().data;
  const trips = useTrips().data;
  const systemEvents = useSystemEvents().data;
  const liveVehicles = useFleetStore((s) => s.liveVehicles);

  const isLoading = !centers || !events || !participants || !vehicles || !drivers || !trips;

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <span className="text-sm">Loading dashboard…</span>
        </div>
      </div>
    );
  }

  const activeTrips = trips.filter((t) => t.status === 'started' || t.status === 'assigned');
  const inServiceVehicles = vehicles.filter((v) => v.status === 'in_service' || v.status === 'assigned');
  const availableVehicles = vehicles.filter((v) => v.status === 'available');
  const availableDrivers = drivers.filter((d) => d.status === 'available');
  const criticalParticipants = participants.filter((p) => p.medical_priority === 'critical');
  const upcomingEvents = events
    .filter((e) => new Date(e.start_time).getTime() > Date.now())
    .slice(0, 5);

  const kpis = [
    {
      label: 'Active Trips',
      value: activeTrips.length,
      icon: RouteIcon,
      color: 'text-blue-500',
      bg: 'bg-blue-50 dark:bg-blue-900/20',
    },
    {
      label: 'Vehicles In Service',
      value: inServiceVehicles.length,
      sub: `${availableVehicles.length} available`,
      icon: Car,
      color: 'text-amber-500',
      bg: 'bg-amber-50 dark:bg-amber-900/20',
    },
    {
      label: 'Available Drivers',
      value: availableDrivers.length,
      sub: `${drivers.length} total`,
      icon: Users,
      color: 'text-emerald-500',
      bg: 'bg-emerald-50 dark:bg-emerald-900/20',
    },
    {
      label: 'Total Participants',
      value: participants.length,
      sub: `${criticalParticipants.length} critical`,
      icon: Users,
      color: 'text-violet-500',
      bg: 'bg-violet-50 dark:bg-violet-900/20',
    },
  ];

  return (
    <div className="space-y-6 p-4 md:p-6">
      {/* Hero banner */}
      <div className="overflow-hidden rounded-xl bg-gradient-to-r from-sky-500 to-cyan-500 p-6 text-white">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold">Fleet Operations Dashboard</h1>
            <p className="mt-1 text-sm text-sky-100">
              Real-time overview of fleet, trips, and event transportation
            </p>
          </div>
          <Link
            href="/dispatch"
            className="inline-flex items-center gap-2 rounded-lg bg-white/20 px-4 py-2.5 text-sm font-medium backdrop-blur transition-colors hover:bg-white/30"
          >
            <Radar className="h-4 w-4" />
            Open Dispatch Center
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {kpis.map((kpi) => {
          const Icon = kpi.icon;
          return (
            <Card key={kpi.label}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">{kpi.label}</p>
                    <p className="mt-1 text-2xl font-bold">{kpi.value}</p>
                    {kpi.sub && <p className="mt-0.5 text-xs text-muted-foreground">{kpi.sub}</p>}
                  </div>
                  <div className={cn('flex h-12 w-12 items-center justify-center rounded-xl', kpi.bg)}>
                    <Icon className={cn('h-6 w-6', kpi.color)} />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Active trips */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <RouteIcon className="h-5 w-5 text-blue-500" /> Active Trips
            </CardTitle>
          </CardHeader>
          <CardContent>
            {activeTrips.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">No active trips</p>
            ) : (
              <div className="space-y-3">
                {activeTrips.map((trip) => {
                  const v = vehicles.find((x) => x.id === trip.vehicle_id);
                  const d = drivers.find((x) => x.id === trip.driver_id);
                  const live = v ? liveVehicles[v.id] : undefined;
                  return (
                    <div
                      key={trip.id}
                      className="flex items-center justify-between rounded-lg border border-border p-3"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-900/20">
                          <RouteIcon className="h-5 w-5" />
                        </div>
                        <div>
                          <div className="text-sm font-medium">{trip.event.name}</div>
                          <div className="text-xs text-muted-foreground">
                            {v?.name} · {d?.full_name}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        {live && (
                          <div className="hidden text-right sm:block">
                            <div className="text-xs font-medium text-amber-600">
                              ETA {formatEta(live.etaSeconds)}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {Math.round(live.progress * 100)}% complete
                            </div>
                          </div>
                        )}
                        <StatusBadge status={trip.status} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Live vehicle positions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Car className="h-5 w-5 text-amber-500" /> Live Vehicle Positions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {inServiceVehicles.map((v) => {
                const live = liveVehicles[v.id];
                return (
                  <div key={v.id} className="flex items-center justify-between rounded-lg bg-muted/50 p-2.5">
                    <div className="flex items-center gap-2">
                      <span className="relative flex h-2.5 w-2.5">
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75" />
                        <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-amber-500" />
                      </span>
                      <span className="text-sm font-medium">{v.name}</span>
                    </div>
                    {live ? (
                      <span className="text-xs text-muted-foreground">
                        {Math.round(live.speedKmh)} km/h · {Math.round(live.progress * 100)}%
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground">Idle</span>
                    )}
                  </div>
                );
              })}
              {inServiceVehicles.length === 0 && (
                <p className="py-4 text-center text-xs text-muted-foreground">No vehicles in service</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Upcoming events */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <CalendarDays className="h-5 w-5 text-primary" /> Upcoming Events
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {upcomingEvents.map((e) => (
                <div key={e.id} className="flex items-center justify-between rounded-lg border border-border p-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 flex-col items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <span className="text-[10px] font-medium uppercase">
                        {new Date(e.start_time).toLocaleDateString('en-US', { month: 'short' })}
                      </span>
                      <span className="text-sm font-bold leading-none">
                        {new Date(e.start_time).getDate()}
                      </span>
                    </div>
                    <div>
                      <div className="text-sm font-medium">{e.name}</div>
                      <div className="text-xs text-muted-foreground">{e.center?.name}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">
                      {new Date(e.start_time).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    <StatusBadge status={e.status} />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Event log */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Activity className="h-5 w-5 text-emerald-500" /> System Event Log
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-72">
              <div className="space-y-2">
                {systemEvents?.map((ev) => (
                  <div key={ev.id} className="flex items-start gap-2.5">
                    <div className="mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                    </div>
                    <div className="flex-1 pb-2">
                      <div className="text-xs font-medium">{ev.event_type}</div>
                      <div className="text-[11px] text-muted-foreground">
                        {formatRelativeTime(ev.created_at)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      {/* Critical participants alert */}
      {criticalParticipants.length > 0 && (
        <Card className="border-l-4 border-l-red-500">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <AlertTriangle className="h-5 w-5 text-red-500" /> Critical Priority Participants
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {criticalParticipants.map((p) => (
                <div key={p.id} className="flex items-center justify-between rounded-lg border border-border p-3">
                  <div>
                    <div className="text-sm font-medium">{p.full_name}</div>
                    <div className="text-xs text-muted-foreground">{p.home_address}</div>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {p.needs_wheelchair && <span className="text-[10px] rounded bg-violet-100 px-1.5 py-0.5 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300">Wheelchair</span>}
                      {p.needs_oxygen && <span className="text-[10px] rounded bg-cyan-100 px-1.5 py-0.5 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300">Oxygen</span>}
                      {p.needs_caregiver && <span className="text-[10px] rounded bg-blue-100 px-1.5 py-0.5 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">Caregiver</span>}
                    </div>
                  </div>
                  <PriorityBadge priority={p.medical_priority} />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
