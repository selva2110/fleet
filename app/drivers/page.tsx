'use client';

import { UserCog, Phone, Star, Car } from 'lucide-react';
import { useDrivers, useVehicles } from '@/lib/hooks';
import { StatusBadge } from '@/components/shared/badges';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export default function DriversPage() {
  const drivers = useDrivers().data;
  const vehicles = useVehicles().data;
  const isLoading = !drivers;

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
        <h1 className="text-xl font-bold">Drivers</h1>
        <p className="text-sm text-muted-foreground">{drivers?.length} drivers on roster</p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {(drivers ?? []).map((d) => {
          const vehicle = vehicles?.find((v) => v.id === d.assigned_vehicle_id);
          return (
            <Card key={d.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                      {d.full_name.split(' ').map((n) => n[0]).join('').slice(0, 2)}
                    </div>
                    <div>
                      <h3 className="font-semibold">{d.full_name}</h3>
                      <p className="flex items-center gap-1 text-xs text-muted-foreground">
                        <UserCog className="h-3 w-3" /> License Class {d.license_class}
                      </p>
                    </div>
                  </div>
                  <StatusBadge status={d.status} />
                </div>

                <div className="mt-3 space-y-1.5 border-t border-border pt-3 text-xs">
                  {d.phone && (
                    <p className="flex items-center gap-1.5 text-muted-foreground">
                      <Phone className="h-3.5 w-3.5" /> {d.phone}
                    </p>
                  )}
                  <p className="flex items-center gap-1.5 text-muted-foreground">
                    <Star className="h-3.5 w-3.5 text-amber-400" /> Rating: {Number(d.rating).toFixed(1)} / 5.0
                  </p>
                  {vehicle && (
                    <p className="flex items-center gap-1.5 text-muted-foreground">
                      <Car className="h-3.5 w-3.5" /> Assigned: {vehicle.name}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
