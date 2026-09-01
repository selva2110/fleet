'use client'
import { useEffect, useMemo, useState } from 'react'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  AddressField,
  Field,
  NumberField,
  SelectField,
  SwitchField,
  TextField,
} from './form-fields'
import { useParticipantMutations } from '@/lib/participant/hooks'
import { createParticipantFormSchema } from '../validation/participant';
import { validateSchema } from '../validation/zod-validation';
import { ParticipantConfig } from '@/lib/participant/config';
import { Participant, ParticipantForm } from '@/lib/participant/types';
import { ParticipantUtils } from '@/lib/participant/utils';
import { useTranslation } from '../context/language-provider';
import { createFieldSetter } from '../common';
import { useNotifications } from '../context/notification-provider';

export function ParticipantDialog({
  open,
  onOpenChange,
  editing,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  editing: Participant | null
}) {
  const { saveParticipant } = useParticipantMutations()
  const {t} = useTranslation();
  const { addToast } = useNotifications();
  const ParticipantFormSchema = useMemo(
    () => createParticipantFormSchema(t),
    [t],
  );
  const [form, setForm] = useState<ParticipantForm>(ParticipantUtils.participantBlank())
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const set = createFieldSetter(setForm, setErrors);

  // companionDetails/emergencyContactDetails hold both `address` and
  // `location`, which AddressField updates via two synchronous callbacks
  // (onChange then onLocationChange) in the same event. set() builds its
  // value from the outer `form` closure, so the second call would overwrite
  // the first's change before either commits. Merging from `prev` avoids that.
  function setNested<K extends "companionDetails" | "emergencyContactDetails">(
    key: K,
    patch: Partial<ParticipantForm[K]>,
  ) {
    setForm((prev) => ({
      ...prev,
      [key]: { ...prev[key], ...patch },
    }));
  }

  useEffect(() => {
    if (editing) {
      const { id, location, status, ...rest } = editing
      void id
      void status
      setForm({
        ...rest,
        location,
        emergencyContactDetails:
          rest.emergencyContactDetails ?? ParticipantUtils.personalDetails(),
        companionDetails:
          rest.companionDetails ?? ParticipantUtils.personalDetails(),
      })
    } else {
      setForm(ParticipantUtils.participantBlank())
    }
    setErrors({})
  }, [editing, open])

  function validate() {
    const isValid = validateSchema(ParticipantFormSchema, form, setErrors);
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
      await saveParticipant({
        ...form,
        id: editing?.id,
        location: form.location ?? undefined,
      })
      addToast({
        title: t('common.success'),
        message: editing ? t('part.updatedsuccess') : t('part.addedsuccess'),
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
          <DialogTitle>
            {editing ? t("part.editmember") : t("part.addmember")}
          </DialogTitle>
          <DialogDescription>{t("part.dialogdesc")}</DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] px-1 w-full overflow-hidden">
          <div className="flex flex-col gap-3">
            <div className="grid grid-cols-2 gap-3">
              <TextField
                label={t("common.fullname")}
                value={form.name}
                onChange={(v) => set("name", v)}
                required
                error={errors.name}
              />
              <TextField
                label={t("common.phone")}
                value={form.phone}
                onChange={(v) => set("phone", v)}
                required
                error={errors.phone}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <NumberField
                label={`${t("common.maxTravel")} (${t("common.min")})`}
                value={form.maxTravelMinutes}
                onChange={(v) => set("maxTravelMinutes", v)}
                error={errors.maxTravelMinutes}
              />
              <TextField
                label={t('part.bloodgroup')}
                value={form.bloodGroup}
                onChange={(v) => set("bloodGroup", v)}
                required
                error={errors.bloodGroup}
              />
            </div>

            <AddressField
              label={t("common.address")}
              value={form.address}
              onChange={(v) => set("address", v)}
              location={form.location}
              onLocationChange={(v) => set("location", v)}
              required
              error={errors.address ?? errors.location}
            />

            <div className="rounded-md">
              <SwitchField
                label={t('part.companionrequired')}
                checked={form.companionNeeded}
                onChange={(v) => set("companionNeeded", v)}
              />
              <div className="rounded-md border border-border px-3 py-2 mt-2">
                <div className="grid grid-cols-2 gap-3">
                  <TextField
                    label={t("common.fullname")}
                    value={form.companionDetails.name}
                    onChange={(v) => setNested("companionDetails", { name: v })}
                    required={form.companionNeeded}
                    error={errors["companionDetails.name"]}
                  />

                  <TextField
                    label={t("common.phone")}
                    value={form.companionDetails.phone}
                    onChange={(v) => setNested("companionDetails", { phone: v })}
                    required={form.companionNeeded}
                    error={errors["companionDetails.phone"]}
                  />
                </div>

                <AddressField
                  label={t("common.address")}
                  value={form.companionDetails.address}
                  onChange={(v) => setNested("companionDetails", { address: v })}
                  location={form.companionDetails.location}
                  onLocationChange={(v) =>
                    setNested("companionDetails", { location: v })
                  }
                  required={form.companionNeeded}
                  error={
                    errors["companionDetails.address"] ??
                    errors["companionDetails.location"]
                  }
                />

                <TextField
                  label={t('part.relation')}
                  value={form.companionDetails.relation}
                  onChange={(v) => setNested("companionDetails", { relation: v })}
                  required={form.companionNeeded}
                  error={errors["companionDetails.relation"]}
                />
              </div>
            </div>

            <div className="flex gap-2 flex-col rounded-md border border-border">
              <span className=" px-3 py-2">{t('part.emergencycontactdetails')}</span>
              <div className="px-3 py-2 flex flex-col gap-2">
              <div className="grid grid-cols-2 gap-3">
                <TextField
                  label={t("common.fullname")}
                  value={form.emergencyContactDetails.name}
                  onChange={(v) =>
                    setNested("emergencyContactDetails", { name: v })
                  }
                  required
                  error={errors["emergencyContactDetails.name"]}
                />

                <TextField
                  label={t("common.phone")}
                  value={form.emergencyContactDetails.phone}
                  onChange={(v) =>
                    setNested("emergencyContactDetails", { phone: v })
                  }
                  required
                  error={errors["emergencyContactDetails.phone"]}
                />
              </div>
              <AddressField
                label={t("common.address")}
                value={form.emergencyContactDetails.address}
                onChange={(v) =>
                  setNested("emergencyContactDetails", { address: v })
                }
                location={form.emergencyContactDetails.location}
                onLocationChange={(v) =>
                  setNested("emergencyContactDetails", { location: v })
                }
                required
                error={
                  errors["emergencyContactDetails.address"] ??
                  errors["emergencyContactDetails.location"]
                }
              />
              <TextField
                label="Relation"
                value={form.emergencyContactDetails.relation}
                onChange={(v) =>
                  setNested("emergencyContactDetails", { relation: v })
                }
                required
                error={errors["emergencyContactDetails.relation"]}
              />
              </div>
            </div>

            <Field label={t("part.medicalNotes")}>
              <Textarea
                rows={2}
                value={form.medicalNotes}
                className="resize-none"
                maxLength={500}
                onChange={(e) => set("medicalNotes", e.target.value)}
              />
              {form.medicalNotes && (
                <div className="flex items-center justify-end text-xs mx-2 mt-1">
                  {form.medicalNotes.length}/500
                </div>
              )}
            </Field>
            <Field label={t('part.routenotes')}>
              <Textarea
                rows={2}
                value={form.routeNotes}
                className="resize-none"
                maxLength={500}
                onChange={(e) => set("routeNotes", e.target.value)}
              />
              {form.routeNotes && (
                <div className="flex items-center justify-end text-xs mx-2 mt-1">
                  {form.routeNotes.length}/500
                </div>
              )}
            </Field>
            <div>
              <Label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                {t("part.transportreq")}
              </Label>
              <div className="grid grid-cols-2 gap-2">
                {ParticipantConfig.CONSTRAINT_KEYS.map((c) => (
                  <SwitchField
                    key={c.key}
                    label={t(c.label)}
                    checked={!!form.constraints[c.key]}
                    onChange={(v) =>
                      set("constraints", { ...form.constraints, [c.key]: v })
                    }
                  />
                ))}
              </div>
            </div>
          </div>
        </ScrollArea>

        <DialogFooter>
          <Button onClick={submit} disabled={saving}>
            {saving
              ? t("common.saving")
              : editing
                ? t("common.savchanges")
                : t("part.addmember")}
          </Button>
          <DialogClose render={<Button variant="outline" />}>
            {t("common.close")}
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
