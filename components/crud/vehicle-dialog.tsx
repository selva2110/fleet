'use client'

import { useEffect, useMemo, useState } from 'react'
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
import { useVehicleMutations } from '@/lib/vehicles/hooks'
import { validateSchema } from '../validation/zod-validation';
import { createVehicleFormSchema } from '../validation/vehicle';
import { VehiclesConfig } from '@/lib/vehicles/config';
import { Vehicle, VehicleForm } from '@/lib/vehicles/types';
import { VehicleUtils } from '@/lib/vehicles/utils';
import { useTranslation } from '../context/language-provider';
import { createFieldSetter } from '../common';
import { useNotifications } from '../context/notification-provider';

export function VehicleDialog({
  open,
  onOpenChange,
  editing,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  editing: Vehicle | null
}) {
  const { saveVehicle } = useVehicleMutations()
  const {t} = useTranslation();
  const { addToast } = useNotifications();
  const VehicleFormSchema = useMemo(() => createVehicleFormSchema(t), [t]);
  const [form, setForm] = useState<VehicleForm>(VehicleUtils.blankVehicle())
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const set = createFieldSetter(setForm, setErrors);

  useEffect(() => {
    if (editing) {
      const { id, status, ...rest } = editing
      void id
      void status
      setForm({
        ...rest,
        location: rest.location ?? null,
        imageUrl: rest.imageUrl ?? null,
      })
    } else {
      setForm(VehicleUtils.blankVehicle())
    }
    setErrors({})
  }, [editing, open])

  function validate() {
    const isValid = validateSchema(VehicleFormSchema, form, setErrors);
    if (!isValid) {
      addToast({
        title: t('common.validationfailed'),
        message: t('common.fixhighlightedfields'),
        kind: 'danger',
      });
    }
    return isValid;
  }

  async function submit() {
    if (!validate()) return
    setSaving(true)
    try {
      await saveVehicle({
        ...form,
        id: editing?.id,
        location: form.location ?? undefined,
      })
      addToast({
        title: t('common.success'),
        message: editing ? t('vehicles.updatedsuccess') : t('vehicles.addedsuccess'),
        kind: 'success',
      })
      onOpenChange(false)
    } catch {
      addToast({
        title: t('common.savefailed'),
        message: t('common.savefailedmessage'),
        kind: 'danger',
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{editing ? t('vehicle.edit') : t('vehicle.add')}</DialogTitle>
          <DialogDescription>{t('vehicle.dialogdesc')}</DialogDescription>
        </DialogHeader>

        <ScrollArea className="-mx-1 max-h-[60vh] px-1">
          <div className="flex flex-col gap-3">
          <TextField
            label={t('vehicle.nameunit')}
            value={form.name}
            onChange={(v) => set('name', v)}
            required
            error={errors.name}
          />
          <AddressField
            label={t('common.address')}
            value={form.address}
            onChange={(v) => set('address', v)}
            location={form.location}
            onLocationChange={(v) => set('location', v)}
            required
            error={errors.address}
          />
          <div className="grid grid-cols-2 gap-3">
            <SelectField label={t('common.type')} value={form.type} options={VehiclesConfig.TYPES} onChange={(v) => set('type', v)} />
            <SelectField label={t('vehicle.fuel')} value={form.fuelType} options={VehiclesConfig.FUEL_OPTIONS} onChange={(v) => set('fuelType', v)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <NumberField
              label={t('vehicle.seatcapacity')}
              value={form.capacity}
              onChange={(v) => set('capacity', v)}
              required
              min={1}
              error={errors.capacity}
            />
            <NumberField
              label={t('vehicle.wheelchairspots')}
              value={form.wheelchairCapacity}
              onChange={(v) => set('wheelchairCapacity', v)}
            />
          </div>
          <TextField
            label={t('common.imageurl')}
            value={form.imageUrl ?? ''}
            onChange={(v) => set('imageUrl', v.trim() ? v : null)}
          />
          <SelectField
            label={t('vehicle.maintenance')}
            value={form.maintenanceStatus}
            options={VehiclesConfig.MAINT}
            onChange={(v) => set('maintenanceStatus', v)}
          />
          <div>
            <Label className="mb-1.5 block text-xs font-medium text-muted-foreground">{t('vehicle.equipment')}</Label>
            <div className="grid grid-cols-1 gap-2">
              <SwitchField label={t('vehicle.wheelchairlift')} checked={form.liftAvailable} onChange={(v) => set('liftAvailable', v)} />
              <SwitchField label={t('vehicle.oxygenequipment')} checked={form.oxygenEquipment} onChange={(v) => set('oxygenEquipment', v)} />
            </div>
          </div>
          </div>
        </ScrollArea>

        <DialogFooter showCloseButton>
          <Button onClick={submit} disabled={saving}>
            {saving ? t('common.saving') : editing ? t('common.savchanges') : t('vehicle.add')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
