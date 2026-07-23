'use client';

import { Activity } from 'lucide-react';
import { useSystemEvents, type SystemEventRow } from '@/lib/hooks';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { formatRelativeTime } from '@/components/shared/badges';
import { cn } from '@/lib/utils';

const eventColors: Record<string, string> = {
  ParticipantCreated: 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300',
  ParticipantEnrolled: 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300',
  EventCreated: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  VehicleAssigned: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  DriverAssigned: 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300',
  RouteOptimized: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
  TripCreated: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300',
  TripStarted: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
  ParticipantPickedUp: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300',
  ParticipantDroppedOff: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
  VehicleLocationUpdated: 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300',
  ETAUpdated: 'bg-fuchsia-100 text-fuchsia-700 dark:bg-fuchsia-900/30 dark:text-fuchsia-300',
  TripCompleted: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
};

export default function ActivityPage() {
  const events = useSystemEvents().data;
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
        <h1 className="text-xl font-bold">System Event Log</h1>
        <p className="text-sm text-muted-foreground">
          Event-driven architecture audit trail (RabbitMQ event mirror)
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Activity className="h-5 w-5 text-emerald-500" /> Recent Events
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[calc(100vh-280px)]">
            <div className="space-y-2">
              {(events ?? []).map((ev: SystemEventRow) => (
                <div
                  key={ev.id}
                  className="flex items-start gap-3 rounded-lg border border-border p-3"
                >
                  <span
                    className={cn(
                      'shrink-0 rounded-md px-2 py-1 text-[10px] font-mono font-medium',
                      eventColors[ev.event_type] ?? 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800'
                    )}
                  >
                    {ev.event_type}
                  </span>
                  <div className="flex-1">
                    <pre className="overflow-x-auto text-xs text-muted-foreground">
{JSON.stringify(ev.payload, null, 0)}
                    </pre>
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      {formatRelativeTime(ev.created_at)} · {new Date(ev.created_at).toLocaleTimeString('en-US')}
                    </p>
                  </div>
                </div>
              ))}
              {events?.length === 0 && (
                <p className="py-8 text-center text-sm text-muted-foreground">No events recorded.</p>
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
