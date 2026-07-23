'use client';

import { CalendarDays, Clock, Users, MapPin } from 'lucide-react';
import { useEvents } from '@/lib/hooks';
import { StatusBadge, formatTime } from '@/components/shared/badges';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export default function EventsPage() {
  const events = useEvents().data;
  const isLoading = !events;

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
        <h1 className="text-xl font-bold">Events</h1>
        <p className="text-sm text-muted-foreground">{events?.length} scheduled events</p>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
        {(events ?? []).map((e) => {
          const start = new Date(e.start_time);
          const isUpcoming = start.getTime() > Date.now();
          const enrollmentPct = Math.min(
            100,
            ((e.enrollment_count ?? 0) / e.enrollment_threshold) * 100
          );
          return (
            <Card key={e.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 flex-col items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <span className="text-[10px] font-medium uppercase">
                        {start.toLocaleDateString('en-US', { month: 'short' })}
                      </span>
                      <span className="text-base font-bold leading-none">{start.getDate()}</span>
                    </div>
                    <div>
                      <h3 className="font-semibold">{e.name}</h3>
                      <p className="flex items-center gap-1 text-xs text-muted-foreground">
                        <MapPin className="h-3 w-3" /> {e.center?.name}
                      </p>
                    </div>
                  </div>
                  <StatusBadge status={e.status} />
                </div>

                {e.description && (
                  <p className="mt-3 text-sm text-muted-foreground">{e.description}</p>
                )}

                <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" /> {formatTime(e.start_time)} · {e.duration_minutes}m
                  </span>
                  <span className="flex items-center gap-1">
                    <Users className="h-3 w-3" /> {e.enrollment_count ?? 0}/{e.enrollment_threshold}
                  </span>
                </div>

                <div className="mt-3">
                  <div className="mb-1 flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Enrollment</span>
                    <span className={cn('font-medium', enrollmentPct >= 100 ? 'text-emerald-600' : '')}>
                      {Math.round(enrollmentPct)}%
                    </span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-secondary">
                    <div
                      className={cn(
                        'h-full rounded-full bg-primary transition-all',
                        enrollmentPct >= 100 && 'bg-emerald-500'
                      )}
                      style={{ width: `${enrollmentPct}%` }}
                    />
                  </div>
                  {enrollmentPct >= 100 && (
                    <p className="mt-1.5 text-xs font-medium text-emerald-600">
                      Threshold reached — route planning triggered
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
