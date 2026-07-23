'use client';

import { useState } from 'react';
import { UserCog, Phone, Star, Car, Plus, Pencil, Trash2, Loader2 } from 'lucide-react';
import { useDrivers, useVehicles, useCreateDriver, useUpdateDriver, useDeleteDriver } from '@/lib/hooks';
import { StatusBadge } from '@/components/shared/badges';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import type { Driver } from '@/lib/types';

interface FormState {
  full_name: string; phone: string; license_class: string; status: string; assigned_vehicle_id: string;
}

const emptyForm: FormState = { full_name: '', phone: '', license_class: 'B', status: 'available', assigned_vehicle_id: '' };

export default function DriversPage() {
  const drivers = useDrivers().data;
  const vehicles = useVehicles().data;
  const isLoading = !drivers;
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editing, setEditing] = useState<Driver | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const { toast } = useToast();

  const createMut = useCreateDriver();
  const updateMut = useUpdateDriver();
  const deleteMut = useDeleteDriver();

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  function openCreate() { setEditing(null); setForm(emptyForm); setDialogOpen(true); }
  function openEdit(d: Driver) {
    setEditing(d);
    setForm({ full_name: d.full_name, phone: d.phone ?? '', license_class: d.license_class, status: d.status, assigned_vehicle_id: d.assigned_vehicle_id ?? '' });
    setDialogOpen(true);
  }

  async function handleSubmit() {
    if (!form.full_name) { toast({ title: 'Name is required', variant: 'destructive' }); return; }
    const payload = { full_name: form.full_name, phone: form.phone, license_class: form.license_class, status: form.status, assigned_vehicle_id: form.assigned_vehicle_id || undefined };
    try {
      if (editing) { await updateMut.mutateAsync({ id: editing.id, ...payload }); toast({ title: 'Driver updated' }); }
      else { await createMut.mutateAsync(payload); toast({ title: 'Driver added' }); }
      setDialogOpen(false);
    } catch (e) { toast({ title: 'Error saving driver', description: (e as Error).message, variant: 'destructive' }); }
  }

  async function handleDelete() {
    if (!deleteId) return;
    try { await deleteMut.mutateAsync(deleteId); toast({ title: 'Driver removed' }); setDeleteId(null); }
    catch (e) { toast({ title: 'Error deleting', description: (e as Error).message, variant: 'destructive' }); }
  }

  const saving = createMut.isPending || updateMut.isPending;

  return (
    <div className="space-y-4 p-4 md:p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Drivers</h1>
          <p className="text-sm text-muted-foreground">{drivers?.length} drivers on roster</p>
        </div>
        <Button onClick={openCreate} className="gap-2"><Plus className="h-4 w-4" /> Add Driver</Button>
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
                      <p className="flex items-center gap-1 text-xs text-muted-foreground"><UserCog className="h-3 w-3" /> License Class {d.license_class}</p>
                    </div>
                  </div>
                  <StatusBadge status={d.status} />
                </div>
                <div className="mt-3 space-y-1.5 border-t border-border pt-3 text-xs">
                  {d.phone && <p className="flex items-center gap-1.5 text-muted-foreground"><Phone className="h-3.5 w-3.5" /> {d.phone}</p>}
                  <p className="flex items-center gap-1.5 text-muted-foreground"><Star className="h-3.5 w-3.5 text-amber-400" /> Rating: {Number(d.rating).toFixed(1)} / 5.0</p>
                  {vehicle && <p className="flex items-center gap-1.5 text-muted-foreground"><Car className="h-3.5 w-3.5" /> Assigned: {vehicle.name}</p>}
                </div>
                <div className="mt-3 flex justify-end gap-1 border-t border-border pt-2">
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(d)}><Pencil className="h-3.5 w-3.5" /></Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500 hover:text-red-600" onClick={() => setDeleteId(d.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Driver' : 'Add Driver'}</DialogTitle>
            <DialogDescription>{editing ? 'Update driver details' : 'Add a new driver to the roster'}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-2"><Label htmlFor="d-name">Full Name</Label><Input id="d-name" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} /></div>
            <div className="grid gap-2"><Label htmlFor="d-phone">Phone</Label><Input id="d-phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-2">
                <Label>License Class</Label>
                <Select value={form.license_class} onValueChange={(v) => setForm({ ...form, license_class: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="A">A</SelectItem><SelectItem value="B">B</SelectItem>
                    <SelectItem value="C">C</SelectItem><SelectItem value="CDL">CDL</SelectItem>
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
                    <SelectItem value="on_break">On Break</SelectItem>
                    <SelectItem value="off_duty">Off Duty</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid gap-2">
              <Label>Assigned Vehicle</Label>
              <Select value={form.assigned_vehicle_id || 'none'} onValueChange={(v) => setForm({ ...form, assigned_vehicle_id: v === 'none' ? '' : v })}>
                <SelectTrigger><SelectValue placeholder="No vehicle assigned" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No vehicle assigned</SelectItem>
                  {(vehicles ?? []).map((v) => <SelectItem key={v.id} value={v.id}>{v.name} ({v.plate})</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editing ? 'Save Changes' : 'Add Driver'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Driver?</AlertDialogTitle>
            <AlertDialogDescription>This will permanently remove the driver from the roster.</AlertDialogDescription>
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
