'use client';

import { useState } from 'react';
import { Search, Plus, Phone, MapPin, Accessibility } from 'lucide-react';
import { useParticipants } from '@/lib/hooks';
import type { Participant } from '@/lib/types';
import { PriorityBadge } from '@/components/shared/badges';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

const needLabels: { key: keyof Participant; label: string }[] = [
  { key: 'needs_wheelchair', label: 'Wheelchair' },
  { key: 'needs_power_wheelchair', label: 'Power WC' },
  { key: 'needs_oxygen', label: 'Oxygen' },
  { key: 'needs_caregiver', label: 'Caregiver' },
  { key: 'needs_bariatric', label: 'Bariatric' },
  { key: 'needs_mobility_assistance', label: 'Mobility' },
];

const needColors: Record<string, string> = {
  needs_wheelchair: 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300',
  needs_power_wheelchair: 'bg-fuchsia-100 text-fuchsia-700 dark:bg-fuchsia-900/30 dark:text-fuchsia-300',
  needs_oxygen: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300',
  needs_caregiver: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  needs_bariatric: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
  needs_mobility_assistance: 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300',
};

export default function ParticipantsPage() {
  const participants = useParticipants().data;
  const isLoading = !participants;
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'critical' | 'high' | 'wheelchair' | 'oxygen'>('all');

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  const filtered = (participants ?? []).filter((p) => {
    if (search && !p.full_name.toLowerCase().includes(search.toLowerCase()) && !p.home_address.toLowerCase().includes(search.toLowerCase())) return false;
    if (filter === 'critical' && p.medical_priority !== 'critical') return false;
    if (filter === 'high' && p.medical_priority !== 'high') return false;
    if (filter === 'wheelchair' && !p.needs_wheelchair && !p.needs_power_wheelchair) return false;
    if (filter === 'oxygen' && !p.needs_oxygen) return false;
    return true;
  });

  return (
    <div className="space-y-4 p-4 md:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold">Participants</h1>
          <p className="text-sm text-muted-foreground">{participants?.length} registered riders</p>
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by name or address…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-1.5 overflow-x-auto">
          {([
            { key: 'all', label: 'All' },
            { key: 'critical', label: 'Critical' },
            { key: 'high', label: 'High Priority' },
            { key: 'wheelchair', label: 'Wheelchair' },
            { key: 'oxygen', label: 'Oxygen' },
          ] as const).map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={cn(
                'shrink-0 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors',
                filter === f.key
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
        {filtered.map((p) => (
          <Card key={p.id} className="overflow-hidden">
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold">{p.full_name}</h3>
                  <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                    <MapPin className="h-3 w-3" /> {p.home_address}
                  </p>
                  {p.phone && (
                    <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                      <Phone className="h-3 w-3" /> {p.phone}
                    </p>
                  )}
                </div>
                <PriorityBadge priority={p.medical_priority} />
              </div>

              <div className="mt-3 flex flex-wrap gap-1.5">
                {needLabels.map(({ key, label }) =>
                  p[key] ? (
                    <span
                      key={key}
                      className={cn(
                        'rounded-md px-2 py-0.5 text-[10px] font-medium',
                        needColors[key]
                      )}
                    >
                      {label}
                    </span>
                  ) : null
                )}
                {!p.needs_wheelchair &&
                  !p.needs_power_wheelchair &&
                  !p.needs_oxygen &&
                  !p.needs_caregiver &&
                  !p.needs_bariatric &&
                  !p.needs_mobility_assistance && (
                    <span className="rounded-md bg-zinc-100 px-2 py-0.5 text-[10px] text-muted-foreground dark:bg-zinc-800">
                      No special needs
                    </span>
                  )}
              </div>

              <div className="mt-3 flex items-center gap-4 border-t border-border pt-3 text-xs text-muted-foreground">
                {p.pickup_window_start && p.pickup_window_end && (
                  <span className="flex items-center gap-1">
                    <Accessibility className="h-3 w-3" />
                    Pickup {p.pickup_window_start}–{p.pickup_window_end}
                  </span>
                )}
                {p.max_travel_minutes && (
                  <span>Max travel: {p.max_travel_minutes} min</span>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="py-12 text-center text-sm text-muted-foreground">
          No participants match your filters.
        </div>
      )}
    </div>
  );
}
