'use client';

import { useMemo } from 'react';
import dynamic from 'next/dynamic';
import {
  Radar,
  Car,
  Route as RouteIcon,
  AlertTriangle,
  Sparkles,
  Play,
  Pause,
  MapPin,
  Clock,
  Users,
  Gauge,
} from 'lucide-react';
import { useCenters, useDrivers, useParticipants, useTrips, useVehicles, useAllTripStops } from '@/lib/hooks';
import { useFleetStore } from '@/lib/store';
import { useLiveTracking } from '@/lib/use-live-tracking';
import { StatusBadge, VehicleTypeBadge, formatEta, formatTime } from '@/components/shared/badges';
import { cn } from '@/lib/utils';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';

const DispatchMap = dynamic(
  () => import('@/components/dispatch/dispatch-map').then((m) => m.DispatchMap),
  { ssr: false, loading: () => <div className="h-full w-full animate-pulse bg-muted" /> }
);

export default function DispatchPage() {
  useLiveTracking();
  const centers = useCenters().data;
  const participants = useParticipants().data;
  const vehicles = useVehicles().data;
  const drivers = useDrivers().data;
  const trips = useTrips().data;

  const liveVehicles = useFleetStore((s) => s.liveVehicles);
  const simRunning = useFleetStore((s) => s.simRunning);
  const setSimRunning = useFleetStore((s) => s.setSimRunning);
  const selectedVehicleId = useFleetStore((s) => s.selectedVehicleId);
  const selectVehicle = useFleetStore((s) => s.selectVehicle);

  const activeTrips = useMemo(
    () => (trips ?? []).filter((t: NonNullable<typeof trips>[number]) => t.status === 'started' || t.status === 'assigned' || t.status === 'planned'),
    [trips]
  );

  const activeTripIds = activeTrips.map((t) => t.id);
  const { data: stopsByTrip } = useAllTripStops(activeTripIds);

  if (!centers || !participants || !vehicles || !drivers || !trips) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <span className="text-sm">Loading dispatch data…</span>
        </div>
      </div>
    );
  }

  const inServiceVehicles = vehicles.filter((v) => v.status === 'in_service' || v.status === 'assigned');
  const availableVehicles = vehicles.filter((v) => v.status === 'available');
  const totalWheelchairDemand = participants.filter(
    (p) => p.needs_wheelchair || p.needs_power_wheelchair
  ).length;
  const totalWheelchairCapacity = vehicles.reduce((s, v) => s + v.wheelchair_capacity, 0);
  const oxygenDemand = participants.filter((p) => p.needs_oxygen).length;
  const oxygenCapacity = vehicles.filter((v) => v.has_oxygen).length;

  const capacityWarnings: { message: string; severity: 'warning' | 'critical' }[] = [];
  if (totalWheelchairDemand > totalWheelchairCapacity) {
    capacityWarnings.push({
      message: `Wheelchair demand (${totalWheelchairDemand}) exceeds fleet capacity (${totalWheelchairCapacity})`,
      severity: 'critical',
    });
  }
  if (oxygenDemand > oxygenCapacity) {
    capacityWarnings.push({
      message: `Oxygen support needed for ${oxygenDemand} participants but only ${oxygenCapacity} vehicles equipped`,
      severity: 'warning',
    });
  }
  if (availableVehicles.length < 2) {
    capacityWarnings.push({
      message: `Only ${availableVehicles.length} vehicles available for new assignments`,
      severity: 'warning',
    });
  }

  const recommendations = [
    {
      title: 'Re-optimize Dialysis Session route',
      detail: 'Traffic delay detected on Oak St. Reordering stops 3-5 saves ~8 min.',
      icon: RouteIcon,
    },
    {
      title: 'Assign Bus-02 to Senior Wellness Workshop',
      detail: `${availableVehicles.length} vehicles available. Bus-02 (cap 20) best fits 5 pickups.`,
      icon: Sparkles,
    },
    {
      title: 'Priority pickup: Eleanor Bishop',
      detail: 'Critical medical priority. Nearest wheelchair van: MediVan-04.',
      icon: AlertTriangle,
    },
  ];

  return (
    <div className="flex h-full flex-col lg:flex-row">
      {/* Map area */}
      <div className="relative flex-1">
        <DispatchMap
          centers={centers}
          participants={participants}
          vehicles={vehicles}
          trips={activeTrips}
          stopsByTrip={stopsByTrip}
        />
        {/* Overlay controls */}
        <div className="absolute left-4 top-4 z-10 flex items-center gap-2">
          <div className="flex items-center gap-2 rounded-lg bg-card/90 px-3 py-2 shadow-md backdrop-blur">
            <Radar className="h-4 w-4 text-primary" />
            <span className="text-sm font-semibold">Dispatch Command Center</span>
          </div>
        </div>
        <div className="absolute right-4 top-4 z-10 flex items-center gap-2">
          <button
            onClick={() => setSimRunning(!simRunning)}
            className="flex items-center gap-2 rounded-lg bg-card/90 px-3 py-2 text-sm font-medium shadow-md backdrop-blur transition-colors hover:bg-card"
          >
            {simRunning ? (
              <>
                <Pause className="h-4 w-4" /> Pause Live
              </>
            ) : (
              <>
                <Play className="h-4 w-4" /> Resume Live
              </>
            )}
          </button>
        </div>
        {/* Live stats overlay */}
        <div className="absolute bottom-4 left-4 z-10 flex gap-2">
          <div className="rounded-lg bg-card/90 px-3 py-2 shadow-md backdrop-blur">
            <div className="flex items-center gap-1.5">
              <Car className="h-3.5 w-3.5 text-amber-500" />
              <span className="text-xs font-semibold">{inServiceVehicles.length} active</span>
            </div>
          </div>
          <div className="rounded-lg bg-card/90 px-3 py-2 shadow-md backdrop-blur">
            <div className="flex items-center gap-1.5">
              <RouteIcon className="h-3.5 w-3.5 text-blue-500" />
              <span className="text-xs font-semibold">{activeTrips.length} trips</span>
            </div>
          </div>
          <div className="rounded-lg bg-card/90 px-3 py-2 shadow-md backdrop-blur">
            <div className="flex items-center gap-1.5">
              <Users className="h-3.5 w-3.5 text-violet-500" />
              <span className="text-xs font-semibold">{participants.length} riders</span>
            </div>
          </div>
        </div>
      </div>

      {/* Right panel */}
      <div className="flex w-full flex-col border-t border-border lg:w-96 lg:border-l lg:border-t-0">
        <ScrollArea className="h-full">
          <div className="space-y-4 p-4">
            {/* Active Vehicles */}
            <section>
              <div className="mb-2 flex items-center justify-between">
                <h2 className="flex items-center gap-2 text-sm font-semibold">
                  <Car className="h-4 w-4" /> Active Vehicles
                </h2>
                <span className="text-xs text-muted-foreground">{inServiceVehicles.length}</span>
              </div>
              <div className="space-y-2">
                {inServiceVehicles.map((v) => {
                  const live = liveVehicles[v.id];
                  const trip = trips.find((t) => t.vehicle_id === v.id);
                  const isSelected = selectedVehicleId === v.id;
                  return (
                    <Card
                      key={v.id}
                      className={cn(
                        'cursor-pointer p-3 transition-all hover:shadow-md',
                        isSelected && 'ring-2 ring-primary'
                      )}
                      onClick={() => selectVehicle(isSelected ? null : v.id)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div
                            className="flex h-8 w-8 items-center justify-center rounded-lg text-xs font-bold text-white"
                            style={{ background: live ? '#f59e0b' : '#3b82f6' }}
                          >
                            {v.name.split('-')[0].slice(0, 2)}
                          </div>
                          <div>
                            <div className="text-sm font-medium">{v.name}</div>
                            <div className="text-xs text-muted-foreground">{v.plate}</div>
                          </div>
                        </div>
                        <StatusBadge status={live ? 'in_service' : v.status} />
                      </div>
                      {live && (
                        <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Gauge className="h-3 w-3" /> {Math.round(live.speedKmh)} km/h
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" /> ETA {formatEta(live.etaSeconds)}
                          </span>
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" /> {Math.round(live.progress * 100)}%
                          </span>
                        </div>
                      )}
                      {trip && (
                        <div className="mt-1.5 text-xs text-muted-foreground">
                          → {trip.event.name}
                        </div>
                      )}
                    </Card>
                  );
                })}
                {inServiceVehicles.length === 0 && (
                  <p className="py-4 text-center text-xs text-muted-foreground">
                    No vehicles currently in service
                  </p>
                )}
              </div>
            </section>

            <Separator />

            {/* Active Trips */}
            <section>
              <div className="mb-2 flex items-center justify-between">
                <h2 className="flex items-center gap-2 text-sm font-semibold">
                  <RouteIcon className="h-4 w-4" /> Active Trips
                </h2>
                <span className="text-xs text-muted-foreground">{activeTrips.length}</span>
              </div>
              <div className="space-y-2">
                {activeTrips.map((t) => {
                  const v = vehicles.find((x) => x.id === t.vehicle_id);
                  const d = drivers.find((x) => x.id === t.driver_id);
                  return (
                    <Card key={t.id} className="p-3">
                      <div className="flex items-center justify-between">
                        <div className="text-sm font-medium">{t.event.name}</div>
                        <StatusBadge status={t.status} />
                      </div>
                      <div className="mt-1.5 flex items-center gap-2 text-xs text-muted-foreground">
                        {v && <VehicleTypeBadge type={v.vehicle_type} />}
                        <span>{d?.full_name}</span>
                      </div>
                      <div className="mt-1.5 flex items-center gap-3 text-xs text-muted-foreground">
                        <span>{t.total_distance_km} km</span>
                        <span>·</span>
                        <span>{t.estimated_duration_minutes} min est.</span>
                        {t.started_at && (
                          <>
                            <span>·</span>
                            <span>Started {formatTime(t.started_at)}</span>
                          </>
                        )}
                      </div>
                    </Card>
                  );
                })}
              </div>
            </section>

            <Separator />

            {/* AI Recommendations */}
            <section>
              <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold">
                <Sparkles className="h-4 w-4 text-primary" /> AI Recommendations
              </h2>
              <div className="space-y-2">
                {recommendations.map((r, i) => {
                  const Icon = r.icon;
                  return (
                    <Card key={i} className="p-3">
                      <div className="flex gap-2.5">
                        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                          <Icon className="h-3.5 w-3.5" />
                        </div>
                        <div>
                          <div className="text-sm font-medium">{r.title}</div>
                          <div className="mt-0.5 text-xs text-muted-foreground">{r.detail}</div>
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            </section>

            {capacityWarnings.length > 0 && (
              <>
                <Separator />
                <section>
                  <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold">
                    <AlertTriangle className="h-4 w-4 text-orange-500" /> Capacity Warnings
                  </h2>
                  <div className="space-y-2">
                    {capacityWarnings.map((w, i) => (
                      <Card
                        key={i}
                        className={cn(
                          'border-l-4 p-3',
                          w.severity === 'critical'
                            ? 'border-l-red-500'
                            : 'border-l-orange-500'
                        )}
                      >
                        <div className="flex gap-2.5">
                          <AlertTriangle
                            className={cn(
                              'h-4 w-4 shrink-0',
                              w.severity === 'critical' ? 'text-red-500' : 'text-orange-500'
                            )}
                          />
                          <span className="text-xs">{w.message}</span>
                        </div>
                      </Card>
                    ))}
                  </div>
                </section>
              </>
            )}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}
