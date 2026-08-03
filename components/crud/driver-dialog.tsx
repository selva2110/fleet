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
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (editing) {
      const { id, status, ...rest } = editing
      void id
      void status
      setForm({ ...rest, location: rest.location ?? null })
    } else {
      setForm(blank())
    }
    setErrors({})
  }, [editing, open])

  const set = <K extends keyof DriverForm>(k: K, v: DriverForm[K]) => {
    setForm((f) => ({ ...f, [k]: v }))
    setErrors((e) => (e[k as string] ? { ...e, [k as string]: '' } : e))
  }

  const vehicleOptions = [
    { value: '__none__', label: 'Unassigned' },
    ...fleet.vehicles.map((v) => ({ value: v.id, label: v.name })),
  ]

  function validate() {
    const next: Record<string, string> = {}
    if (!form.name.trim()) next.name = 'Full name is required.'
    if (!form.phone.trim()) next.phone = 'Phone number is required.'
    if (!form.address.trim()) next.address = 'Address is required.'
    if (!form.license.trim()) next.license = 'License number is required.'
    setErrors(next)
    return Object.keys(next).length === 0
  }

  async function submit() {
    if (!validate()) return
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
            <TextField
              label="Full name"
              value={form.name}
              onChange={(v) => set('name', v)}
              required
              error={errors.name}
            />
            <TextField
              label="Phone"
              value={form.phone}
              onChange={(v) => set('phone', v)}
              required
              error={errors.phone}
            />
          </div>
          <AddressField
            label="Address"
            value={form.address}
            onChange={(v) => set('address', v)}
            location={form.location}
            onLocationChange={(v) => set('location', v)}
            required
            error={errors.address}
          />
          <div className="grid grid-cols-2 gap-3">
            <TextField
              label="License #"
              value={form.license}
              onChange={(v) => set('license', v)}
              required
              error={errors.license}
            />
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
          <Button onClick={submit} disabled={saving}>
            {saving ? 'Saving…' : editing ? 'Save changes' : 'Add driver'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
