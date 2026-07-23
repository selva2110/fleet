'use client';

import { useState } from 'react';
import { CalendarDays, Clock, Users, MapPin, Plus, Pencil, Trash2, Loader2 } from 'lucide-react';
import { useEvents, useCenters, useCreateEvent, useUpdateEvent, useDeleteEvent } from '@/lib/hooks';
import { StatusBadge, formatTime } from '@/components/shared/badges';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import type { EventRow } from '@/lib/types';

interface FormState {
  center_id: string; name: string; description: string; start_time: string;
  duration_minutes: string; enrollment_threshold: string; status: string;
}

const emptyForm: FormState = {
  center_id: '', name: '', description: '', start_time: '',
  duration_minutes: '120', enrollment_threshold: '5', status: 'scheduled',
};

export default function EventsPage() {
  const events = useEvents().data;
  const centers = useCenters().data;
  const isLoading = !events;
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editing, setEditing] = useState<EventRow | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const { toast } = useToast();

  const createMut = useCreateEvent();
  const updateMut = useUpdateEvent();
  const deleteMut = useDeleteEvent();

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  function openCreate() { setEditing(null); setForm(emptyForm); setDialogOpen(true); }
  function openEdit(e: EventRow) {
    setEditing(e);
    const dt = new Date(e.start_time);
    const localISO = new Date(dt.getTime() - dt.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
    setForm({
      center_id: e.center_id, name: e.name, description: e.description ?? '',
      start_time: localISO, duration_minutes: String(e.duration_minutes),
      enrollment_threshold: String(e.enrollment_threshold), status: e.status,
    });
    setDialogOpen(true);
  }

  async function handleSubmit() {
    if (!form.name || !form.center_id || !form.start_time) { toast({ title: 'Name, center, and start time are required', variant: 'destructive' }); return; }
    const payload = {
      center_id: form.center_id, name: form.name, description: form.description,
      start_time: new Date(form.start_time).toISOString(),
      duration_minutes: parseInt(form.duration_minutes) || 120,
      enrollment_threshold: parseInt(form.enrollment_threshold) || 5,
      status: form.status,
    };
    try {
      if (editing) { await updateMut.mutateAsync({ id: editing.id, ...payload }); toast({ title: 'Event updated' }); }
      else { await createMut.mutateAsync(payload); toast({ title: 'Event created' }); }
      setDialogOpen(false);
    } catch (e) { toast({ title: 'Error saving event', description: (e as Error).message, variant: 'destructive' }); }
  }

  async function handleDelete() {
    if (!deleteId) return;
    try { await deleteMut.mutateAsync(deleteId); toast({ title: 'Event removed' }); setDeleteId(null); }
    catch (e) { toast({ title: 'Error deleting', description: (e as Error).message, variant: 'destructive' }); }
  }

  const saving = createMut.isPending || updateMut.isPending;

  return (
    <div className="space-y-4 p-4 md:p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Events</h1>
          <p className="text-sm text-muted-foreground">{events?.length} scheduled events</p>
        </div>
        <Button onClick={openCreate} className="gap-2" disabled={!centers}><Plus className="h-4 w-4" /> Add Event</Button>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
        {(events ?? []).map((e) => {
          const start = new Date(e.start_time);
          const enrollmentPct = Math.min(100, ((e.enrollment_count ?? 0) / e.enrollment_threshold) * 100);
          return (
            <Card key={e.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 flex-col items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <span className="text-[10px] font-medium uppercase">{start.toLocaleDateString('en-US', { month: 'short' })}</span>
                      <span className="text-base font-bold leading-none">{start.getDate()}</span>
                    </div>
                    <div>
                      <h3 className="font-semibold">{e.name}</h3>
                      <p className="flex items-center gap-1 text-xs text-muted-foreground"><MapPin className="h-3 w-3" /> {e.center?.name}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-1">
                    <StatusBadge status={e.status} />
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(e)}><Pencil className="h-3.5 w-3.5" /></Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500 hover:text-red-600" onClick={() => setDeleteId(e.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                  </div>
                </div>
                {e.description && <p className="mt-3 text-sm text-muted-foreground">{e.description}</p>}
                <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {formatTime(e.start_time)} · {e.duration_minutes}m</span>
                  <span className="flex items-center gap-1"><Users className="h-3 w-3" /> {e.enrollment_count ?? 0}/{e.enrollment_threshold}</span>
                </div>
                <div className="mt-3">
                  <div className="mb-1 flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Enrollment</span>
                    <span className={cn('font-medium', enrollmentPct >= 100 ? 'text-emerald-600' : '')}>{Math.round(enrollmentPct)}%</span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-secondary">
                    <div className={cn('h-full rounded-full bg-primary transition-all', enrollmentPct >= 100 && 'bg-emerald-500')} style={{ width: `${enrollmentPct}%` }} />
                  </div>
                  {enrollmentPct >= 100 && <p className="mt-1.5 text-xs font-medium text-emerald-600">Threshold reached — route planning triggered</p>}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Event' : 'Add Event'}</DialogTitle>
            <DialogDescription>{editing ? 'Update event details' : 'Schedule a new event'}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-2"><Label htmlFor="e-name">Event Name</Label><Input id="e-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            <div className="grid gap-2">
              <Label>Center</Label>
              <Select value={form.center_id} onValueChange={(v) => setForm({ ...form, center_id: v })}>
                <SelectTrigger><SelectValue placeholder="Select a center" /></SelectTrigger>
                <SelectContent>
                  {(centers ?? []).map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2"><Label htmlFor="e-desc">Description</Label><Textarea id="e-desc" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
            <div className="grid gap-2"><Label htmlFor="e-time">Start Time</Label><Input id="e-time" type="datetime-local" value={form.start_time} onChange={(e) => setForm({ ...form, start_time: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-2"><Label htmlFor="e-dur">Duration (min)</Label><Input id="e-dur" type="number" value={form.duration_minutes} onChange={(e) => setForm({ ...form, duration_minutes: e.target.value })} /></div>
              <div className="grid gap-2"><Label htmlFor="e-thr">Enrollment Threshold</Label><Input id="e-thr" type="number" value={form.enrollment_threshold} onChange={(e) => setForm({ ...form, enrollment_threshold: e.target.value })} /></div>
            </div>
            {editing && (
              <div className="grid gap-2">
                <Label>Status</Label>
                <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="scheduled">Scheduled</SelectItem>
                    <SelectItem value="enrolling">Enrolling</SelectItem>
                    <SelectItem value="route_planning">Route Planning</SelectItem>
                    <SelectItem value="dispatched">Dispatched</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editing ? 'Save Changes' : 'Add Event'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Event?</AlertDialogTitle>
            <AlertDialogDescription>This will permanently delete the event and its enrollments.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
