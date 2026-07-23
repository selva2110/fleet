'use client';

import { useState } from 'react';
import { Building2, MapPin, Phone, CalendarDays, Plus, Pencil, Trash2, Loader2 } from 'lucide-react';
import { useCenters, useEvents, useCreateCenter, useUpdateCenter, useDeleteCenter } from '@/lib/hooks';
import { CenterTypeBadge, StatusBadge, formatTime } from '@/components/shared/badges';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import type { Center } from '@/lib/types';

interface FormState {
  name: string; center_type: string; address: string; phone: string; lng: string; lat: string;
}

const emptyForm: FormState = { name: '', center_type: 'hospital', address: '', phone: '', lng: '-96.78', lat: '32.78' };

export default function CentersPage() {
  const centers = useCenters().data;
  const events = useEvents().data;
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editing, setEditing] = useState<Center | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const { toast } = useToast();

  const createMut = useCreateCenter();
  const updateMut = useUpdateCenter();
  const deleteMut = useDeleteCenter();

  if (!centers || !events) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  const eventsByCenter: Record<string, typeof events> = {};
  for (const e of events) {
    if (!eventsByCenter[e.center_id]) eventsByCenter[e.center_id] = [];
    eventsByCenter[e.center_id].push(e);
  }

  function openCreate() { setEditing(null); setForm(emptyForm); setDialogOpen(true); }
  function openEdit(c: Center) {
    setEditing(c);
    setForm({ name: c.name, center_type: c.center_type, address: c.address, phone: c.phone ?? '', lng: String(c.location.coordinates[0]), lat: String(c.location.coordinates[1]) });
    setDialogOpen(true);
  }

  async function handleSubmit() {
    if (!form.name || !form.address) { toast({ title: 'Name and address are required', variant: 'destructive' }); return; }
    const payload = { name: form.name, center_type: form.center_type, address: form.address, phone: form.phone, lng: parseFloat(form.lng), lat: parseFloat(form.lat) };
    try {
      if (editing) { await updateMut.mutateAsync({ id: editing.id, ...payload }); toast({ title: 'Center updated' }); }
      else { await createMut.mutateAsync(payload); toast({ title: 'Center added' }); }
      setDialogOpen(false);
    } catch (e) { toast({ title: 'Error saving center', description: (e as Error).message, variant: 'destructive' }); }
  }

  async function handleDelete() {
    if (!deleteId) return;
    try { await deleteMut.mutateAsync(deleteId); toast({ title: 'Center removed' }); setDeleteId(null); }
    catch (e) { toast({ title: 'Error deleting', description: (e as Error).message, variant: 'destructive' }); }
  }

  const saving = createMut.isPending || updateMut.isPending;

  return (
    <div className="space-y-4 p-4 md:p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Centers &amp; Events</h1>
          <p className="text-sm text-muted-foreground">{centers.length} facilities hosting events</p>
        </div>
        <Button onClick={openCreate} className="gap-2"><Plus className="h-4 w-4" /> Add Center</Button>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {centers.map((c) => {
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
                      <div className="mt-1"><CenterTypeBadge type={c.center_type} /></div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">{centerEvents.length} events</Badge>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(c)}><Pencil className="h-3.5 w-3.5" /></Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500 hover:text-red-600" onClick={() => setDeleteId(c.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-1 text-sm text-muted-foreground">
                  <p className="flex items-center gap-2"><MapPin className="h-3.5 w-3.5" /> {c.address}</p>
                  {c.phone && <p className="flex items-center gap-2"><Phone className="h-3.5 w-3.5" /> {c.phone}</p>}
                </div>
                {centerEvents.length > 0 && (
                  <div className="mt-4 space-y-2">
                    {centerEvents.map((e) => (
                      <div key={e.id} className="flex items-center justify-between rounded-lg border border-border p-2.5">
                        <div className="flex items-center gap-2.5">
                          <CalendarDays className="h-4 w-4 text-primary" />
                          <div>
                            <div className="text-sm font-medium">{e.name}</div>
                            <div className="text-xs text-muted-foreground">
                              {new Date(e.start_time).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })} at {formatTime(e.start_time)}
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

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Center' : 'Add Center'}</DialogTitle>
            <DialogDescription>{editing ? 'Update facility details' : 'Register a new facility'}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-2"><Label htmlFor="c-name">Name</Label><Input id="c-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            <div className="grid gap-2">
              <Label>Center Type</Label>
              <Select value={form.center_type} onValueChange={(v) => setForm({ ...form, center_type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="hospital">Hospital</SelectItem>
                  <SelectItem value="clinic">Clinic</SelectItem>
                  <SelectItem value="rehabilitation">Rehabilitation</SelectItem>
                  <SelectItem value="dialysis">Dialysis</SelectItem>
                  <SelectItem value="community_hall">Community Hall</SelectItem>
                  <SelectItem value="senior_center">Senior Center</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2"><Label htmlFor="c-addr">Address</Label><Input id="c-addr" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></div>
            <div className="grid gap-2"><Label htmlFor="c-phone">Phone</Label><Input id="c-phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-2"><Label htmlFor="c-lng">Longitude</Label><Input id="c-lng" value={form.lng} onChange={(e) => setForm({ ...form, lng: e.target.value })} /></div>
              <div className="grid gap-2"><Label htmlFor="c-lat">Latitude</Label><Input id="c-lat" value={form.lat} onChange={(e) => setForm({ ...form, lat: e.target.value })} /></div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editing ? 'Save Changes' : 'Add Center'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Center?</AlertDialogTitle>
            <AlertDialogDescription>This will permanently delete the center and all its events.</AlertDialogDescription>
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
