import { cn } from '@/lib/utils';
import type {
  CenterType,
  DriverStatus,
  EventStatus,
  MedicalPriority,
  TripStatus,
  VehicleStatus,
  VehicleType,
} from '@/lib/types';

const base =
  'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap';

export function StatusBadge({
  status,
  className,
}: {
  status: string;
  className?: string;
}) {
  const map: Record<string, string> = {
    available: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
    assigned: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
    in_service: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
    maintenance: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300',
    offline: 'bg-zinc-200 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400',
    scheduled: 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400',
    enrolling: 'bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300',
    route_planning: 'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300',
    dispatched: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
    in_progress: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
    completed: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
    cancelled: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
    planned: 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400',
    started: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
    on_break: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300',
    off_duty: 'bg-zinc-200 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400',
  };
  return (
    <span className={cn(base, map[status] ?? 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400', className)}>
      {status.replace(/_/g, ' ')}
    </span>
  );
}

export function PriorityBadge({ priority }: { priority: MedicalPriority }) {
  const map: Record<MedicalPriority, string> = {
    low: 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400',
    normal: 'bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300',
    high: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300',
    critical: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
  };
  return <span className={cn(base, map[priority])}>{priority}</span>;
}

export function VehicleTypeBadge({ type }: { type: VehicleType }) {
  const map: Record<VehicleType, string> = {
    minivan: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
    wheelchair_van: 'bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300',
    bus: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300',
    ambulance: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
    sedan: 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400',
  };
  return <span className={cn(base, map[type])}>{type.replace(/_/g, ' ')}</span>;
}

export function CenterTypeBadge({ type }: { type: CenterType }) {
  const map: Record<CenterType, string> = {
    hospital: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
    clinic: 'bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300',
    rehabilitation: 'bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300',
    dialysis: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-300',
    community_hall: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
    senior_center: 'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300',
  };
  return <span className={cn(base, map[type])}>{type.replace(/_/g, ' ')}</span>;
}

export function formatTime(iso: string | null): string {
  if (!iso) return '--';
  return new Date(iso).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
}

export function formatRelativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export function formatEta(seconds: number | null): string {
  if (seconds === null) return '--';
  if (seconds <= 0) return 'Arrived';
  const mins = Math.ceil(seconds / 60);
  if (mins < 60) return `${mins} min`;
  const hrs = Math.floor(mins / 60);
  return `${hrs}h ${mins % 60}m`;
}

export type { EventStatus, TripStatus, VehicleStatus, DriverStatus };
