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
import { AddressField, NumberField, SelectField, SwitchField, TextField } from './form-fields'
import { useFleet } from '@/lib/store'
import type { Vehicle, VehicleType } from '@/lib/types'

const TYPES: { value: VehicleType; label: string }[] = [
  { value: 'Sedan', label: 'Sedan' },
  { value: 'SUV', label: 'SUV' },
  { value: 'Van', label: 'Van' },
  { value: 'Wheelchair Accessible Van', label: 'Wheelchair Accessible Van' },
  { value: 'Medical Transport Vehicle', label: 'Medical Transport Vehicle' },
  { value: 'Mini Bus', label: 'Mini Bus' },
  { value: 'Shuttle Bus', label: 'Shuttle Bus' },
  { value: 'Ambulance', label: 'Ambulance' },
]
const FUELS: { value: Vehicle['fuelType']; label: string }[] = [
  { value: 'Gas', label: 'Gas' },
  { value: 'Diesel', label: 'Diesel' },
  { value: 'Hybrid', label: 'Hybrid' },
  { value: 'Electric', label: 'Electric' },
]
const MAINT: { value: Vehicle['maintenanceStatus']; label: string }[] = [
  { value: 'good', label: 'Good' },
  { value: 'due-soon', label: 'Service due soon' },
  { value: 'service-required', label: 'Service required' },
]

type VehicleForm = Omit<Vehicle, 'id' | 'status' | 'location'> & {
  address: string
  location: Vehicle['location'] | null
}

function blank(): VehicleForm {
  return {
    name: '',
    type: 'Van',
    address: '',
    location: null,
    capacity: 6,
    wheelchairCapacity: 0,
    oxygenEquipment: false,
    liftAvailable: false,
    bariatricCapable: false,
    stretcherCapable: false,
    fuelType: 'Gas',
    maintenanceStatus: 'good',
    imageUrl: null,
  }
}

export function VehicleDialog({
  open,
  onOpenChange,
  editing,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  editing: Vehicle | null
}) {
  const fleet = useFleet()
  const [form, setForm] = useState<VehicleForm>(blank())
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

  const set = <K extends keyof VehicleForm>(k: K, v: VehicleForm[K]) =>
    setForm((f) => ({ ...f, [k]: v }))

  async function submit() {
    if (!form.name.trim()) return
    setSaving(true)
    try {
      await fleet.saveVehicle({
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
          <DialogTitle>{editing ? 'Edit vehicle' : 'Add vehicle'}</DialogTitle>
          <DialogDescription>Capabilities determine which participants it can serve.</DialogDescription>
        </DialogHeader>

        <ScrollArea className="-mx-1 max-h-[60vh] px-1">
          <div className="flex flex-col gap-3">
          <TextField label="Name / unit" value={form.name} onChange={(v) => set('name', v)} />
          <AddressField
            label="Address"
            value={form.address}
            onChange={(v) => set('address', v)}
            location={form.location}
            onLocationChange={(v) => set('location', v)}
          />
          <div className="grid grid-cols-2 gap-3">
            <SelectField label="Type" value={form.type} options={TYPES} onChange={(v) => set('type', v)} />
            <SelectField label="Fuel" value={form.fuelType} options={FUELS} onChange={(v) => set('fuelType', v)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <NumberField label="Seat capacity" value={form.capacity} onChange={(v) => set('capacity', v)} />
            <NumberField
              label="Wheelchair spots"
              value={form.wheelchairCapacity}
              onChange={(v) => set('wheelchairCapacity', v)}
            />
          </div>
          <TextField
            label="Image URL"
            value={form.imageUrl ?? ''}
            onChange={(v) => set('imageUrl', v.trim() ? v : null)}
          />
          <SelectField
            label="Maintenance"
            value={form.maintenanceStatus}
            options={MAINT}
            onChange={(v) => set('maintenanceStatus', v)}
          />
          <div>
            <Label className="mb-1.5 block text-xs font-medium text-muted-foreground">Equipment</Label>
            <div className="grid grid-cols-1 gap-2">
              <SwitchField label="Wheelchair lift" checked={form.liftAvailable} onChange={(v) => set('liftAvailable', v)} />
              <SwitchField label="Oxygen equipment" checked={form.oxygenEquipment} onChange={(v) => set('oxygenEquipment', v)} />
              <SwitchField label="Bariatric capable" checked={form.bariatricCapable} onChange={(v) => set('bariatricCapable', v)} />
              <SwitchField label="Stretcher / gurney capable" checked={form.stretcherCapable} onChange={(v) => set('stretcherCapable', v)} />
            </div>
          </div>
          </div>
        </ScrollArea>

        <DialogFooter showCloseButton>
          <Button onClick={submit} disabled={saving || !form.name.trim()}>
            {saving ? 'Saving…' : editing ? 'Save changes' : 'Add vehicle'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
