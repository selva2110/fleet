'use client';

import { useState } from 'react';
import { Car, Accessibility, Wind, Users, Plus, Pencil, Trash2, Loader2 } from 'lucide-react';
import { useVehicles, useCreateVehicle, useUpdateVehicle, useDeleteVehicle } from '@/lib/hooks';
import { useFleetStore } from '@/lib/store';
import { useLiveTracking } from '@/lib/use-live-tracking';
import { StatusBadge, VehicleTypeBadge, formatEta } from '@/components/shared/badges';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import type { Vehicle } from '@/lib/types';

interface FormState {
  name: string; plate: string; vehicle_type: string; capacity: string;
  wheelchair_capacity: string; has_oxygen: boolean; has_lift: boolean;
  status: string; lng: string; lat: string;
}

const emptyForm: FormState = {
  name: '', plate: '', vehicle_type: 'minivan', capacity: '8',
  wheelchair_capacity: '0', has_oxygen: false, has_lift: false,
  status: 'available', lng: '-96.78', lat: '32.78',
};

export default function VehiclesPage() {
  useLiveTracking();
  const vehicles = useVehicles().data;
  const isLoading = !vehicles;
  const liveVehicles = useFleetStore((s) => s.liveVehicles);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editing, setEditing] = useState<Vehicle | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const { toast } = useToast();

  const createMut = useCreateVehicle();
  const updateMut = useUpdateVehicle();
  const deleteMut = useDeleteVehicle();

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  function openCreate() { setEditing(null); setForm(emptyForm); setDialogOpen(true); }
  function openEdit(v: Vehicle) {
    setEditing(v);
    setForm({
      name: v.name, plate: v.plate, vehicle_type: v.vehicle_type,
      capacity: String(v.capacity), wheelchair_capacity: String(v.wheelchair_capacity),
      has_oxygen: v.has_oxygen, has_lift: v.has_lift, status: v.status,
      lng: v.current_location ? String(v.current_location.coordinates[0]) : '-96.78',
      lat: v.current_location ? String(v.current_location.coordinates[1]) : '32.78',
    });
    setDialogOpen(true);
  }

  async function handleSubmit() {
    if (!form.name || !form.plate) { toast({ title: 'Name and plate are required', variant: 'destructive' }); return; }
    const payload = {
      name: form.name, plate: form.plate, vehicle_type: form.vehicle_type,
      capacity: parseInt(form.capacity) || 0, wheelchair_capacity: parseInt(form.wheelchair_capacity) || 0,
      has_oxygen: form.has_oxygen, has_lift: form.has_lift, status: form.status,
      lng: parseFloat(form.lng), lat: parseFloat(form.lat),
    };
    try {
      if (editing) { await updateMut.mutateAsync({ id: editing.id, ...payload }); toast({ title: 'Vehicle updated' }); }
      else { await createMut.mutateAsync(payload); toast({ title: 'Vehicle added' }); }
      setDialogOpen(false);
    } catch (e) { toast({ title: 'Error saving vehicle', description: (e as Error).message, variant: 'destructive' }); }
  }

  async function handleDelete() {
    if (!deleteId) return;
    try { await deleteMut.mutateAsync(deleteId); toast({ title: 'Vehicle removed' }); setDeleteId(null); }
    catch (e) { toast({ title: 'Error deleting', description: (e as Error).message, variant: 'destructive' }); }
  }

  const saving = createMut.isPending || updateMut.isPending;

  return (
    <div className="space-y-4 p-4 md:p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Vehicles</h1>
          <p className="text-sm text-muted-foreground">{vehicles?.length} vehicles in fleet</p>
        </div>
        <Button onClick={openCreate} className="gap-2"><Plus className="h-4 w-4" /> Add Vehicle</Button>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {(vehicles ?? []).map((v) => {
          const live = liveVehicles[v.id];
          return (
            <Card key={v.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className={cn('flex h-10 w-10 items-center justify-center rounded-lg',
                      v.status === 'in_service' ? 'bg-amber-50 text-amber-600 dark:bg-amber-900/20' :
                      v.status === 'available' ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20' :
                      'bg-zinc-100 text-zinc-500 dark:bg-zinc-800')}>
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
                      <span className="text-amber-600 dark:text-amber-400">{Math.round(live.speedKmh)} km/h</span>
                    </div>
                    <div className="mt-1.5 flex items-center justify-between text-xs text-amber-600 dark:text-amber-400">
                      <span>ETA: {formatEta(live.etaSeconds)}</span>
                      <span>{Math.round(live.progress * 100)}% route complete</span>
                    </div>
                  </div>
                )}

                <div className="mt-3 grid grid-cols-2 gap-2 border-t border-border pt-3 text-xs">
                  <div className="flex items-center gap-1.5 text-muted-foreground"><Users className="h-3.5 w-3.5" /> Capacity: {v.capacity}</div>
                  <div className="flex items-center gap-1.5 text-muted-foreground"><Accessibility className="h-3.5 w-3.5" /> WC: {v.wheelchair_capacity}</div>
                  <div className={cn('flex items-center gap-1.5', v.has_oxygen ? 'text-cyan-600 dark:text-cyan-400' : 'text-muted-foreground')}><Wind className="h-3.5 w-3.5" /> Oxygen: {v.has_oxygen ? 'Yes' : 'No'}</div>
                  <div className={cn('flex items-center gap-1.5', v.has_lift ? 'text-teal-600 dark:text-teal-400' : 'text-muted-foreground')}><Accessibility className="h-3.5 w-3.5" /> Lift: {v.has_lift ? 'Yes' : 'No'}</div>
                </div>

                <div className="mt-3 flex justify-end gap-1 border-t border-border pt-2">
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(v)}><Pencil className="h-3.5 w-3.5" /></Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500 hover:text-red-600" onClick={() => setDeleteId(v.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Vehicle' : 'Add Vehicle'}</DialogTitle>
            <DialogDescription>{editing ? 'Update vehicle details' : 'Register a new vehicle'}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-2"><Label htmlFor="v-name">Name</Label><Input id="v-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
              <div className="grid gap-2"><Label htmlFor="v-plate">Plate</Label><Input id="v-plate" value={form.plate} onChange={(e) => setForm({ ...form, plate: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-2">
                <Label>Vehicle Type</Label>
                <Select value={form.vehicle_type} onValueChange={(v) => setForm({ ...form, vehicle_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="minivan">Minivan</SelectItem>
                    <SelectItem value="wheelchair_van">Wheelchair Van</SelectItem>
                    <SelectItem value="bus">Bus</SelectItem>
                    <SelectItem value="ambulance">Ambulance</SelectItem>
                    <SelectItem value="sedan">Sedan</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Status</Label>
                <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="available">Available</SelectItem>
                    <SelectItem value="assigned">Assigned</SelectItem>
                    <SelectItem value="in_service">In Service</SelectItem>
                    <SelectItem value="maintenance">Maintenance</SelectItem>
                    <SelectItem value="offline">Offline</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-2"><Label htmlFor="v-cap">Capacity</Label><Input id="v-cap" type="number" value={form.capacity} onChange={(e) => setForm({ ...form, capacity: e.target.value })} /></div>
              <div className="grid gap-2"><Label htmlFor="v-wc">Wheelchair Capacity</Label><Input id="v-wc" type="number" value={form.wheelchair_capacity} onChange={(e) => setForm({ ...form, wheelchair_capacity: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex items-center justify-between rounded-lg border p-3">
                <Label htmlFor="v-o2">Has Oxygen</Label>
                <Switch id="v-o2" checked={form.has_oxygen} onCheckedChange={(v) => setForm({ ...form, has_oxygen: v })} />
              </div>
              <div className="flex items-center justify-between rounded-lg border p-3">
                <Label htmlFor="v-lift">Has Lift</Label>
                <Switch id="v-lift" checked={form.has_lift} onCheckedChange={(v) => setForm({ ...form, has_lift: v })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-2"><Label htmlFor="v-lng">Longitude</Label><Input id="v-lng" value={form.lng} onChange={(e) => setForm({ ...form, lng: e.target.value })} /></div>
              <div className="grid gap-2"><Label htmlFor="v-lat">Latitude</Label><Input id="v-lat" value={form.lat} onChange={(e) => setForm({ ...form, lat: e.target.value })} /></div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editing ? 'Save Changes' : 'Add Vehicle'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Vehicle?</AlertDialogTitle>
            <AlertDialogDescription>This will permanently delete the vehicle from the fleet.</AlertDialogDescription>
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
