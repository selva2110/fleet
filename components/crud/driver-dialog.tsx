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
import { AddressField, DaysOfWeekField, NumberField, SelectField, SwitchField, TextField } from './form-fields'
import { useDrivers, useDriverMutations } from '@/lib/driver/hooks'
import { validateSchema } from '../validation/zod-validation';
import { createDriverFormSchema } from '../validation/driver';
import { Driver, DriverForm } from '@/lib/driver/types';
import { DriverUtils } from '@/lib/driver/utils';
import { useTranslation } from '../context/language-provider';
import { createFieldSetter } from '../common';
import { useNotifications } from '../context/notification-provider';

export function DriverDialog({
  open,
  onOpenChange,
  editing,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  editing: Driver | null
}) {
  const { drivers } = useDrivers()
  const { saveDriver } = useDriverMutations()
  const {t} = useTranslation();
  const { addToast } = useNotifications();
  const DriverFormSchema = useMemo(() => createDriverFormSchema(t), [t]);
  const [form, setForm] = useState<DriverForm>(DriverUtils.blankDriver())
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const set = createFieldSetter(setForm, setErrors);

  useEffect(() => {
    if (editing) {
      const { id, status, ...rest } = editing
      void id
      void status
      setForm({ ...rest, location: rest.location ?? null })
    } else {
      setForm(DriverUtils.blankDriver())
    }
    setErrors({})
  }, [editing, open])

  function validate() {
    const isValid = validateSchema(DriverFormSchema, form, setErrors);
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
    if (!validate()) return;
    setSaving(true);
    try {
      const duplicatePhoneNumber = drivers.find(
        (item) => form.mobile_number === item.mobile_number && item.id !== editing?.id,
      );
      if (duplicatePhoneNumber) {
        addToast({
          title: t('driver.duplicatephonetitle'),
          message: t('driver.duplicatephonemessage'),
          kind: "info",
        });
        return;
      }
      await saveDriver({
        ...form,
        id: editing?.id,
        location: form.location ?? undefined,
      });
      addToast({
        title: t('common.success'),
        message: editing
          ? t('driver.updatedsuccess')
          : t('driver.addedsuccess'),
        kind: "success",
      });
      onOpenChange(false);
    } catch {
      addToast({
        title: t('common.savefailed'),
        message: t('common.savefailedmessage'),
        kind: "danger",
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{editing ? t('driver.edit') : t('driver.add')}</DialogTitle>
          <DialogDescription>
            {t('driver.dialogdesc')}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="-mx-1 max-h-[60vh] px-1">
          <div className="flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-3">
            <TextField
              label={t('common.fullname')}
              value={form.name}
              onChange={(v) => set('name', v)}
              required
              error={errors.name}
            />
            <div className="flex items-center gap-2 justify-center">
              <TextField
              label={t('common.code')}
              className="w-10"
              value={form.dial_code}
              onChange={()=>{}}
            />
            <TextField
              label={t('common.phone')}
              value={form.mobile_number}
              onChange={(v) => set('mobile_number', v)}
              required
              error={errors.mobile_number}
            />
            </div>
          </div>
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
            <TextField
              label={`${t('driver.license')} #`}
              value={form.license_number}
              onChange={(v) => set('license_number', v)}
              required
              error={errors.license_number}
            />
             <TextField
              label={t('part.bloodgroup')}
              value={form.blood_group}
              onChange={(v) => set('blood_group', v)}
              required
              error={errors.license_number}
            />
            <NumberField label={t('driver.rating')} value={form.rating} onChange={(v) => set('rating', v)} min={0} />
          </div>
          {/* <TextField
            label={t('common.imageurl')}
            value={form.imageUrl ?? ''}
            onChange={(v) => set('imageUrl', v.trim() ? v : null)}
          /> */}
          {/* <SelectField
            label={t('driver.assignedvehicle')}
            value={form.assignedVehicleId ?? '__none__'}
            options={vehicleOptions}
            onChange={(v) => set('assignedVehicleId', v === '__none__' ? null : v)}
          /> */}
          <div className="grid grid-cols-2 gap-3">
            <TextField
              label={t('driver.shstart')}
              type="time"
              value={form.shiftStart}
              onChange={(v) => set('shiftStart', v)}
              error={errors.shiftStart}
            />
            <TextField
              label={t('driver.shend')}
              type="time"
              value={form.shiftEnd}
              onChange={(v) => set('shiftEnd', v)}
              error={errors.shiftEnd}
            />
          </div>
          <DaysOfWeekField
            label={t('driver.workingdays')}
            value={form.shiftDays}
            onChange={(v) => set('shiftDays', v)}
            error={errors.shiftDays}
          />
          <div>
            <Label className="mb-1.5 block text-xs font-medium text-muted-foreground">{t('common.cert')}</Label>
            <div className="grid grid-cols-1 gap-2">
              <SwitchField
                label={t('driver.whassist')}
                checked={form.certifications.wheelchairAssist.enabled}
                onChange={(v) =>
                  set('certifications', {
                    ...form.certifications,
                    wheelchairAssist: { ...form.certifications.wheelchairAssist, enabled: v },
                  })
                }
              />
              {form.certifications.wheelchairAssist.enabled && (
                <TextField
                  label={`${t('driver.whassist')} #`}
                  value={form.certifications.wheelchairAssist.certificateNo}
                  onChange={(v) =>
                    set('certifications', {
                      ...form.certifications,
                      wheelchairAssist: { ...form.certifications.wheelchairAssist, certificateNo: v },
                    })
                  }
                />
              )}
              <SwitchField
                label={t('driver.medtrans')}
                checked={form.certifications.medicalTransport.enabled}
                onChange={(v) =>
                  set('certifications', {
                    ...form.certifications,
                    medicalTransport: { ...form.certifications.medicalTransport, enabled: v },
                  })
                }
              />
              {form.certifications.medicalTransport.enabled && (
                <TextField
                  label={`${t('driver.medtrans')} #`}
                  value={form.certifications.medicalTransport.certificateNo}
                  onChange={(v) =>
                    set('certifications', {
                      ...form.certifications,
                      medicalTransport: { ...form.certifications.medicalTransport, certificateNo: v },
                    })
                  }
                />
              )}
            </div>
          </div>
          </div>
        </ScrollArea>

        <DialogFooter showCloseButton>
          <Button onClick={submit} disabled={saving}>
            {saving ? t('common.saving') : editing ? t('common.savchanges') : t('driver.add')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
