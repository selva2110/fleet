'use client';

import { useState } from 'react';
import { Search, Plus, Phone, MapPin, Accessibility, Pencil, Trash2, Loader2 } from 'lucide-react';
import { useParticipants, useCreateParticipant, useUpdateParticipant, useDeleteParticipant } from '@/lib/hooks';
import type { Participant } from '@/lib/types';
import { PriorityBadge } from '@/components/shared/badges';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

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

interface FormState {
  full_name: string;
  phone: string;
  home_address: string;
  lng: string;
  lat: string;
  needs_wheelchair: boolean;
  needs_power_wheelchair: boolean;
  needs_oxygen: boolean;
  needs_caregiver: boolean;
  needs_bariatric: boolean;
  needs_mobility_assistance: boolean;
  medical_priority: string;
}

const emptyForm: FormState = {
  full_name: '', phone: '', home_address: '', lng: '-96.78', lat: '32.78',
  needs_wheelchair: false, needs_power_wheelchair: false, needs_oxygen: false,
  needs_caregiver: false, needs_bariatric: false, needs_mobility_assistance: false,
  medical_priority: 'normal',
};

export default function ParticipantsPage() {
  const participants = useParticipants().data;
  const isLoading = !participants;
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'critical' | 'high' | 'wheelchair' | 'oxygen'>('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editing, setEditing] = useState<Participant | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const { toast } = useToast();

  const createMut = useCreateParticipant();
  const updateMut = useUpdateParticipant();
  const deleteMut = useDeleteParticipant();

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

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setDialogOpen(true);
  }

  function openEdit(p: Participant) {
    setEditing(p);
    setForm({
      full_name: p.full_name,
      phone: p.phone ?? '',
      home_address: p.home_address,
      lng: String(p.home_location.coordinates[0]),
      lat: String(p.home_location.coordinates[1]),
      needs_wheelchair: p.needs_wheelchair,
      needs_power_wheelchair: p.needs_power_wheelchair,
      needs_oxygen: p.needs_oxygen,
      needs_caregiver: p.needs_caregiver,
      needs_bariatric: p.needs_bariatric,
      needs_mobility_assistance: p.needs_mobility_assistance,
      medical_priority: p.medical_priority,
    });
    setDialogOpen(true);
  }

  async function handleSubmit() {
    if (!form.full_name || !form.home_address) {
      toast({ title: 'Name and address are required', variant: 'destructive' });
      return;
    }
    const payload = {
      full_name: form.full_name,
      phone: form.phone,
      home_address: form.home_address,
      lng: parseFloat(form.lng),
      lat: parseFloat(form.lat),
      needs_wheelchair: form.needs_wheelchair,
      needs_power_wheelchair: form.needs_power_wheelchair,
      needs_oxygen: form.needs_oxygen,
      needs_caregiver: form.needs_caregiver,
      needs_bariatric: form.needs_bariatric,
      needs_mobility_assistance: form.needs_mobility_assistance,
      medical_priority: form.medical_priority,
    };
    try {
      if (editing) {
        await updateMut.mutateAsync({ id: editing.id, ...payload });
        toast({ title: 'Participant updated' });
      } else {
        await createMut.mutateAsync(payload);
        toast({ title: 'Participant added' });
      }
      setDialogOpen(false);
    } catch (e) {
      toast({ title: 'Error saving participant', description: (e as Error).message, variant: 'destructive' });
    }
  }

  async function handleDelete() {
    if (!deleteId) return;
    try {
      await deleteMut.mutateAsync(deleteId);
      toast({ title: 'Participant removed' });
      setDeleteId(null);
    } catch (e) {
      toast({ title: 'Error deleting', description: (e as Error).message, variant: 'destructive' });
    }
  }

  const saving = createMut.isPending || updateMut.isPending;

  return (
    <div className="space-y-4 p-4 md:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold">Participants</h1>
          <p className="text-sm text-muted-foreground">{participants?.length} registered riders</p>
        </div>
        <Button onClick={openCreate} className="gap-2">
          <Plus className="h-4 w-4" /> Add Participant
        </Button>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search by name or address…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
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
                filter === f.key ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'
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
                  (form as unknown as Record<string, unknown>)[key] ? (
                    <span key={key} className={cn('rounded-md px-2 py-0.5 text-[10px] font-medium', needColors[key])}>
                      {label}
                    </span>
                  ) : null
                )}
                {!p.needs_wheelchair && !p.needs_power_wheelchair && !p.needs_oxygen && !p.needs_caregiver && !p.needs_bariatric && !p.needs_mobility_assistance && (
                  <span className="rounded-md bg-zinc-100 px-2 py-0.5 text-[10px] text-muted-foreground dark:bg-zinc-800">No special needs</span>
                )}
              </div>

              <div className="mt-3 flex items-center justify-between border-t border-border pt-3">
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  {p.pickup_window_start && p.pickup_window_end && (
                    <span className="flex items-center gap-1"><Accessibility className="h-3 w-3" /> {p.pickup_window_start}–{p.pickup_window_end}</span>
                  )}
                  {p.max_travel_minutes && <span>Max travel: {p.max_travel_minutes} min</span>}
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(p)}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500 hover:text-red-600" onClick={() => setDeleteId(p.id)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filtered.length === 0 && <div className="py-12 text-center text-sm text-muted-foreground">No participants match your filters.</div>}

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Participant' : 'Add Participant'}</DialogTitle>
            <DialogDescription>{editing ? 'Update participant details' : 'Register a new rider'}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label htmlFor="p-name">Full Name</Label>
              <Input id="p-name" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="p-phone">Phone</Label>
              <Input id="p-phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="p-addr">Home Address</Label>
              <Input id="p-addr" value={form.home_address} onChange={(e) => setForm({ ...form, home_address: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-2">
                <Label htmlFor="p-lng">Longitude</Label>
                <Input id="p-lng" value={form.lng} onChange={(e) => setForm({ ...form, lng: e.target.value })} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="p-lat">Latitude</Label>
                <Input id="p-lat" value={form.lat} onChange={(e) => setForm({ ...form, lat: e.target.value })} />
              </div>
            </div>
            <div className="grid gap-2">
              <Label>Medical Priority</Label>
              <Select value={form.medical_priority} onValueChange={(v) => setForm({ ...form, medical_priority: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {needLabels.map(({ key, label }) => (
                <div key={key} className="flex items-center gap-2">
                  <Checkbox id={`p-${key}`} checked={(form as unknown as Record<string, unknown>)[key] as boolean} onCheckedChange={(v) => setForm({ ...form, [key]: !!v })} />
                  <Label htmlFor={`p-${key}`} className="text-xs font-normal">{label}</Label>
                </div>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editing ? 'Save Changes' : 'Add Participant'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Participant?</AlertDialogTitle>
            <AlertDialogDescription>This will permanently delete the participant and their enrollments.</AlertDialogDescription>
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
