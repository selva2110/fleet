'use client';

import { Car, Accessibility, Wind, Users } from 'lucide-react';
import { useVehicles } from '@/lib/hooks';
import { useFleetStore } from '@/lib/store';
import { useLiveTracking } from '@/lib/use-live-tracking';
import { StatusBadge, VehicleTypeBadge, formatEta } from '@/components/shared/badges';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export default function VehiclesPage() {
  useLiveTracking();
  const vehicles = useVehicles().data;
  const isLoading = !vehicles;
  const liveVehicles = useFleetStore((s) => s.liveVehicles);

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
        <h1 className="text-xl font-bold">Vehicles</h1>
        <p className="text-sm text-muted-foreground">{vehicles?.length} vehicles in fleet</p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {(vehicles ?? []).map((v) => {
          const live = liveVehicles[v.id];
          return (
            <Card key={v.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className={cn(
                        'flex h-10 w-10 items-center justify-center rounded-lg',
                        v.status === 'in_service'
                          ? 'bg-amber-50 text-amber-600 dark:bg-amber-900/20'
                          : v.status === 'available'
                          ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20'
                          : 'bg-zinc-100 text-zinc-500 dark:bg-zinc-800'
                      )}
                    >
                      <Car className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="font-semibold">{v.name}</h3>
                      <p className="text-xs text-muted-foreground">{v.plate}</p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1.5">
                    <StatusBadge status={v.status} />
                    <VehicleTypeBadge type={v.vehicle_type} />
                  </div>
                </div>

                {live && (
                  <div className="mt-3 rounded-lg bg-amber-50 p-2.5 dark:bg-amber-900/20">
                    <div className="flex items-center justify-between text-xs">
                      <span className="flex items-center gap-1 font-medium text-amber-700 dark:text-amber-300">
                        <span className="relative flex h-2 w-2">
                          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75" />
                          <span className="relative inline-flex h-2 w-2 rounded-full bg-amber-500" />
                        </span>
                        Live Tracking
                      </span>
                      <span className="text-amber-600 dark:text-amber-400">
                        {Math.round(live.speedKmh)} km/h
                      </span>
                    </div>
                    <div className="mt-1.5 flex items-center justify-between text-xs text-amber-600 dark:text-amber-400">
                      <span>ETA: {formatEta(live.etaSeconds)}</span>
                      <span>{Math.round(live.progress * 100)}% route complete</span>
                    </div>
                  </div>
                )}

                <div className="mt-3 grid grid-cols-2 gap-2 border-t border-border pt-3 text-xs">
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <Users className="h-3.5 w-3.5" /> Capacity: {v.capacity}
                  </div>
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <Accessibility className="h-3.5 w-3.5" /> WC: {v.wheelchair_capacity}
                  </div>
                  <div className={cn('flex items-center gap-1.5', v.has_oxygen ? 'text-cyan-600 dark:text-cyan-400' : 'text-muted-foreground')}>
                    <Wind className="h-3.5 w-3.5" /> Oxygen: {v.has_oxygen ? 'Yes' : 'No'}
                  </div>
                  <div className={cn('flex items-center gap-1.5', v.has_lift ? 'text-teal-600 dark:text-teal-400' : 'text-muted-foreground')}>
                    <Accessibility className="h-3.5 w-3.5" /> Lift: {v.has_lift ? 'Yes' : 'No'}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
