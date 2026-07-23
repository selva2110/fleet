'use client';

import { BarChart3, Car, Users, Route as RouteIcon, Building2, TrendingUp, Clock } from 'lucide-react';
import { useCenters, useDrivers, useEvents, useParticipants, useTrips, useVehicles } from '@/lib/hooks';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StatusBadge, CenterTypeBadge } from '@/components/shared/badges';
import { cn } from '@/lib/utils';

export default function ReportsPage() {
  const centers = useCenters().data;
  const events = useEvents().data;
  const participants = useParticipants().data;
  const vehicles = useVehicles().data;
  const drivers = useDrivers().data;
  const trips = useTrips().data;

  if (!centers || !events || !participants || !vehicles || !drivers || !trips) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  const totalDistance = trips.reduce((s, t) => s + Number(t.total_distance_km), 0);
  const totalDuration = trips.reduce((s, t) => s + t.estimated_duration_minutes, 0);
  const completedTrips = trips.filter((t) => t.status === 'completed').length;
  const activeTrips = trips.filter((t) => t.status === 'started' || t.status === 'assigned').length;

  const vehicleTypeStats = vehicles.reduce<Record<string, number>>((acc, v) => {
    acc[v.vehicle_type] = (acc[v.vehicle_type] ?? 0) + 1;
    return acc;
  }, {});

  const centerTypeStats = centers.reduce<Record<string, number>>((acc, c) => {
    acc[c.center_type] = (acc[c.center_type] ?? 0) + 1;
    return acc;
  }, {});

  const needStats = {
    wheelchair: participants.filter((p) => p.needs_wheelchair || p.needs_power_wheelchair).length,
    oxygen: participants.filter((p) => p.needs_oxygen).length,
    caregiver: participants.filter((p) => p.needs_caregiver).length,
    bariatric: participants.filter((p) => p.needs_bariatric).length,
    mobility: participants.filter((p) => p.needs_mobility_assistance).length,
  };

  const summaryCards = [
    { label: 'Total Trips', value: trips.length, icon: RouteIcon, color: 'text-blue-500', bg: 'bg-blue-50 dark:bg-blue-900/20' },
    { label: 'Active Trips', value: activeTrips, icon: TrendingUp, color: 'text-amber-500', bg: 'bg-amber-50 dark:bg-amber-900/20' },
    { label: 'Completed', value: completedTrips, icon: BarChart3, color: 'text-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-900/20' },
    { label: 'Total Distance', value: `${totalDistance.toFixed(1)} km`, icon: RouteIcon, color: 'text-violet-500', bg: 'bg-violet-50 dark:bg-violet-900/20' },
    { label: 'Total Duration', value: `${totalDuration} min`, icon: Clock, color: 'text-cyan-500', bg: 'bg-cyan-50 dark:bg-cyan-900/20' },
    { label: 'Fleet Utilization', value: `${Math.round((vehicles.filter(v => v.status !== 'available').length / vehicles.length) * 100)}%`, icon: Car, color: 'text-orange-500', bg: 'bg-orange-50 dark:bg-orange-900/20' },
  ];

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div>
        <h1 className="text-xl font-bold">Reports &amp; Analytics</h1>
        <p className="text-sm text-muted-foreground">Fleet performance and operational metrics</p>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
        {summaryCards.map((c) => {
          const Icon = c.icon;
          return (
            <Card key={c.label}>
              <CardContent className="p-4">
                <div className={cn('mb-2 flex h-9 w-9 items-center justify-center rounded-lg', c.bg)}>
                  <Icon className={cn('h-4.5 w-4.5', c.color)} />
                </div>
                <p className="text-xs text-muted-foreground">{c.label}</p>
                <p className="mt-0.5 text-xl font-bold">{c.value}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Vehicle type distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Car className="h-5 w-5 text-primary" /> Vehicle Type Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(vehicleTypeStats).map(([type, count]) => {
                const pct = (count / vehicles.length) * 100;
                return (
                  <div key={type}>
                    <div className="mb-1 flex items-center justify-between text-sm">
                      <span className="capitalize">{type.replace(/_/g, ' ')}</span>
                      <span className="text-muted-foreground">{count}</span>
                    </div>
                    <div className="h-2 rounded-full bg-muted">
                      <div
                        className="h-2 rounded-full bg-primary transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Participant needs */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Users className="h-5 w-5 text-violet-500" /> Participant Accessibility Needs
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              {Object.entries(needStats).map(([need, count]) => (
                <div key={need} className="rounded-lg border border-border p-3">
                  <p className="text-xs capitalize text-muted-foreground">{need.replace(/_/g, ' ')}</p>
                  <p className="mt-1 text-2xl font-bold">{count}</p>
                  <p className="text-xs text-muted-foreground">
                    {Math.round((count / participants.length) * 100)}% of riders
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Center types */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Building2 className="h-5 w-5 text-red-500" /> Center Types
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {Object.entries(centerTypeStats).map(([type, count]) => (
                <div key={type} className="flex items-center gap-2 rounded-lg border border-border p-2.5">
                  <CenterTypeBadge type={type as any} />
                  <span className="text-sm font-semibold">{count}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Trip status summary */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <RouteIcon className="h-5 w-5 text-blue-500" /> Trip Status Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {['planned', 'assigned', 'started', 'completed', 'cancelled'].map((status) => {
                const count = trips.filter((t) => t.status === status).length;
                return (
                  <div key={status} className="flex items-center justify-between rounded-lg border border-border p-2.5">
                    <StatusBadge status={status} />
                    <span className="text-sm font-semibold">{count}</span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
