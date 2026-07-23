'use client';

import { useState } from 'react';
import { Route as RouteIcon, Clock, MapPin, Car, User, ChevronDown, ChevronRight } from 'lucide-react';
import { useTrips, useTripStops, useVehicles, useDrivers } from '@/lib/hooks';
import { useFleetStore } from '@/lib/store';
import { useLiveTracking } from '@/lib/use-live-tracking';
import { StatusBadge, VehicleTypeBadge, formatTime, formatEta } from '@/components/shared/badges';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export default function TripsPage() {
  useLiveTracking();
  const trips = useTrips().data;
  const vehicles = useVehicles().data;
  const drivers = useDrivers().data;
  const isLoading = !trips;
  const [expandedTrip, setExpandedTrip] = useState<string | null>(null);
  const liveVehicles = useFleetStore((s) => s.liveVehicles);

  const stopsQuery = useTripStops(expandedTrip);

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-4 p-4 md:p-6">
      <div>
        <h1 className="text-xl font-bold">Trips</h1>
        <p className="text-sm text-muted-foreground">{trips?.length} trips planned</p>
      </div>

      <div className="space-y-3">
        {(trips ?? []).map((trip) => {
          const v = vehicles?.find((x) => x.id === trip.vehicle_id);
          const d = drivers?.find((x) => x.id === trip.driver_id);
          const live = v ? liveVehicles[v.id] : undefined;
          const isExpanded = expandedTrip === trip.id;
          const stops = isExpanded ? stopsQuery.data : undefined;
          return (
            <Card key={trip.id}>
              <CardContent className="p-4">
                <button
                  className="flex w-full items-center justify-between text-left"
                  onClick={() => setExpandedTrip(isExpanded ? null : trip.id)}
                >
                  <div className="flex items-center gap-3">
                    {isExpanded ? (
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    )}
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-900/20">
                      <RouteIcon className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="font-semibold">{trip.event.name}</h3>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Car className="h-3 w-3" /> {v?.name}
                        </span>
                        <span className="flex items-center gap-1">
                          <User className="h-3 w-3" /> {d?.full_name}
                        </span>
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
                    <div className="text-right">
                      <div className="text-xs text-muted-foreground">{trip.total_distance_km} km</div>
                      <div className="text-xs text-muted-foreground">
                        {trip.estimated_duration_minutes} min
                      </div>
                    </div>
                    <StatusBadge status={trip.status} />
                  </div>
                </button>

                {isExpanded && (
                  <div className="mt-4 border-t border-border pt-4">
                    {stopsQuery.isLoading ? (
                      <p className="text-sm text-muted-foreground">Loading stops…</p>
                    ) : stops && stops.length > 0 ? (
                      <div className="space-y-2">
                        {stops.map((stop) => (
                          <div
                            key={stop.id}
                            className={cn(
                              'flex items-center justify-between rounded-lg border border-border p-2.5',
                              stop.status === 'completed' && 'bg-emerald-50 dark:bg-emerald-900/10'
                            )}
                          >
                            <div className="flex items-center gap-3">
                              <div
                                className={cn(
                                  'flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold',
                                  stop.stop_type === 'pickup'
                                    ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300'
                                    : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
                                )}
                              >
                                {stop.sequence_index}
                              </div>
                              <div>
                                <div className="text-sm font-medium">
                                  {stop.participant?.full_name ?? 'Stop'}
                                </div>
                                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                  <MapPin className="h-3 w-3" /> {stop.address ?? '—'}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="text-xs text-muted-foreground">
                                {stop.stop_type === 'pickup' ? 'Pickup' : 'Dropoff'}
                              </span>
                              {stop.planned_eta && (
                                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                                  <Clock className="h-3 w-3" /> {formatTime(stop.planned_eta)}
                                </span>
                              )}
                              <StatusBadge status={stop.status} />
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">No stops found.</p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
