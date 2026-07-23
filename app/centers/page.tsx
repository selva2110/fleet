'use client';

import { Building2, MapPin, Phone, CalendarDays } from 'lucide-react';
import { useCenters, useEvents } from '@/lib/hooks';
import { CenterTypeBadge, StatusBadge, formatTime } from '@/components/shared/badges';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { Center, EventRow } from '@/lib/types';

export default function CentersPage() {
  const centers = useCenters().data;
  const events = useEvents().data;

  if (!centers || !events) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  const eventList: (EventRow & { center: Center })[] = events ?? [];
  const eventsByCenter: Record<string, (EventRow & { center: Center })[]> = {};
  for (const e of eventList) {
    if (!eventsByCenter[e.center_id]) eventsByCenter[e.center_id] = [];
    eventsByCenter[e.center_id].push(e);
  }

  return (
    <div className="space-y-4 p-4 md:p-6">
      <div>
        <h1 className="text-xl font-bold">Centers &amp; Events</h1>
        <p className="text-sm text-muted-foreground">{centers?.length} facilities hosting events</p>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {(centers ?? []).map((c: Center) => {
          const centerEvents = eventsByCenter[c.id] ?? [];
          return (
            <Card key={c.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-50 text-red-600 dark:bg-red-900/20">
                      <Building2 className="h-5 w-5" />
                    </div>
                    <div>
                      <CardTitle className="text-base">{c.name}</CardTitle>
                      <div className="mt-1">
                        <CenterTypeBadge type={c.center_type} />
                      </div>
                    </div>
                  </div>
                  <Badge variant="secondary">{centerEvents.length} events</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-1 text-sm text-muted-foreground">
                  <p className="flex items-center gap-2">
                    <MapPin className="h-3.5 w-3.5" /> {c.address}
                  </p>
                  {c.phone && (
                    <p className="flex items-center gap-2">
                      <Phone className="h-3.5 w-3.5" /> {c.phone}
                    </p>
                  )}
                </div>

                {centerEvents.length > 0 && (
                  <div className="mt-4 space-y-2">
                    {centerEvents.map((e: EventRow & { center: Center }) => (
                      <div
                        key={e.id}
                        className="flex items-center justify-between rounded-lg border border-border p-2.5"
                      >
                        <div className="flex items-center gap-2.5">
                          <CalendarDays className="h-4 w-4 text-primary" />
                          <div>
                            <div className="text-sm font-medium">{e.name}</div>
                            <div className="text-xs text-muted-foreground">
                              {new Date(e.start_time).toLocaleDateString('en-US', {
                                weekday: 'short',
                                month: 'short',
                                day: 'numeric',
                              })}{' '}
                              at {formatTime(e.start_time)}
                            </div>
                          </div>
                        </div>
                        <StatusBadge status={e.status} />
                      </div>
                    ))}
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
