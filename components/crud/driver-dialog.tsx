'use client'

import { useEffect, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { ScrollArea } from '@/components/ui/scroll-area'
import { AddressField, DaysOfWeekField, NumberField, SelectField, SwitchField, TextField } from './form-fields'
import { useFleet } from '@/lib/store'
import type { Driver } from '@/lib/types'

type DriverForm = Omit<Driver, 'id' | 'status' | 'location'> & {
  location: Driver['location'] | null
}

function blank(): DriverForm {
  return {
    name: '',
    phone: '',
    address: '',
    location: null,
    license: '',
    certifications: { wheelchairAssist: false, medicalTransport: false },
    assignedVehicleId: null,
    rating: 4.5,
    shiftStart: '08:00',
    shiftEnd: '16:00',
    shiftDays: [1, 2, 3, 4, 5],
    imageUrl: null,
  }
}

export function DriverDialog({
  open,
  onOpenChange,
  editing,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  editing: Driver | null
}) {
  const fleet = useFleet()
  const [form, setForm] = useState<DriverForm>(blank())
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (editing) {
      const { id, status, ...rest } = editing
      void id
      void status
      setForm({ ...rest, location: rest.location ?? null })
    } else {
      setForm(blank())
    }
  }, [editing, open])

  const set = <K extends keyof DriverForm>(k: K, v: DriverForm[K]) =>
    setForm((f) => ({ ...f, [k]: v }))

  const vehicleOptions = [
    { value: '__none__', label: 'Unassigned' },
    ...fleet.vehicles.map((v) => ({ value: v.id, label: v.name })),
  ]

  async function submit() {
    if (!form.name.trim()) return
    setSaving(true)
    try {
      await fleet.saveDriver({
        ...form,
        id: editing?.id,
        location: form.location ?? undefined,
      })
      onOpenChange(false)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{editing ? 'Edit driver' : 'Add driver'}</DialogTitle>
          <DialogDescription>
            Certifications gate assignment to specialized trips; shift hours and working days gate assignment to
            routes outside the driver&apos;s availability.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="-mx-1 max-h-[60vh] px-1">
          <div className="flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-3">
            <TextField label="Full name" value={form.name} onChange={(v) => set('name', v)} />
            <TextField label="Phone" value={form.phone} onChange={(v) => set('phone', v)} />
          </div>
          <AddressField
            label="Address"
            value={form.address}
            onChange={(v) => set('address', v)}
            location={form.location}
            onLocationChange={(v) => set('location', v)}
          />
          <div className="grid grid-cols-2 gap-3">
            <TextField label="License #" value={form.license} onChange={(v) => set('license', v)} />
            <NumberField label="Rating" value={form.rating} onChange={(v) => set('rating', v)} min={0} />
          </div>
          <TextField
            label="Image URL"
            value={form.imageUrl ?? ''}
            onChange={(v) => set('imageUrl', v.trim() ? v : null)}
          />
          <SelectField
            label="Assigned vehicle"
            value={form.assignedVehicleId ?? '__none__'}
            options={vehicleOptions}
            onChange={(v) => set('assignedVehicleId', v === '__none__' ? null : v)}
          />
          <div className="grid grid-cols-2 gap-3">
            <TextField
              label="Shift start"
              type="time"
              value={form.shiftStart}
              onChange={(v) => set('shiftStart', v)}
            />
            <TextField
              label="Shift end"
              type="time"
              value={form.shiftEnd}
              onChange={(v) => set('shiftEnd', v)}
            />
          </div>
          <DaysOfWeekField
            label="Working days"
            value={form.shiftDays}
            onChange={(v) => set('shiftDays', v)}
          />
          <div>
            <Label className="mb-1.5 block text-xs font-medium text-muted-foreground">Certifications</Label>
            <div className="grid grid-cols-1 gap-2">
              <SwitchField
                label="Wheelchair assist"
                checked={form.certifications.wheelchairAssist}
                onChange={(v) => set('certifications', { ...form.certifications, wheelchairAssist: v })}
              />
              <SwitchField
                label="Medical transport"
                checked={form.certifications.medicalTransport}
                onChange={(v) => set('certifications', { ...form.certifications, medicalTransport: v })}
              />
            </div>
          </div>
          </div>
        </ScrollArea>

        <DialogFooter showCloseButton>
          <Button onClick={submit} disabled={saving || !form.name.trim()}>
            {saving ? 'Saving…' : editing ? 'Save changes' : 'Add driver'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
