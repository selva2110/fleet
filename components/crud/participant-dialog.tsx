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
import { useFleet } from '@/lib/store'
import type { MedicalPriority, MobilityLevel, Participant, TransportConstraints } from '@/lib/types'

const MOBILITY: { value: MobilityLevel; label: string }[] = [
  { value: 'independent', label: 'Independent' },
  { value: 'assisted', label: 'Assisted' },
  { value: 'wheelchair', label: 'Wheelchair' },
  { value: 'stretcher', label: 'Stretcher' },
]
const PRIORITY: { value: MedicalPriority; label: string }[] = [
  { value: 'routine', label: 'Routine' },
  { value: 'elevated', label: 'Elevated' },
  { value: 'critical', label: 'Critical' },
]

const CONSTRAINT_KEYS: { key: keyof TransportConstraints; label: string }[] = [
  { key: 'wheelchair', label: 'Wheelchair' },
  { key: 'poweredWheelchair', label: 'Powered wheelchair' },
  { key: 'walker', label: 'Walker' },
  { key: 'oxygen', label: 'Oxygen' },
  { key: 'caregiverRequired', label: 'Caregiver required' },
  { key: 'bariatric', label: 'Bariatric' },
  { key: 'visualAssist', label: 'Visual assist' },
  { key: 'cognitiveAssist', label: 'Cognitive assist' },
  { key: 'serviceAnimal', label: 'Service animal' },
]
 
type ParticipantForm = Omit<Participant, 'id' | 'status' | 'location'> & {
  location: Participant['location'] | null
}

function blank(): ParticipantForm {
  return {
    name: '',
    phone: '',
    emergencyContact: '',
    address: '',
    medicalNotes: '',
    constraints: {},
    maxTravelMinutes: 40,
    pickupWindow: '',
    mobilityLevel: 'independent',
    medicalPriority: 'routine',
    eligible: true,
    eventId: null,
    location: null,
  }
}

export function ParticipantDialog({
  open,
  onOpenChange,
  editing,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  editing: Participant | null
}) {
  const fleet = useFleet()
  const [form, setForm] = useState<ParticipantForm>(blank())
  const [saving, setSaving] = useState(false)
 
  useEffect(() => {
    if (editing) {
      const { id, location, status, ...rest } = editing
      void id
      void status
      setForm({ ...rest, location })
    } else {
      setForm(blank())
    }
  }, [editing, open])

  const set = <K extends keyof ParticipantForm>(k: K, v: ParticipantForm[K]) =>
    setForm((f) => ({ ...f, [k]: v }))
 
  async function submit() {
    if (!form.name.trim()) return
    setSaving(true)
    try {
      await fleet.saveParticipant({
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
          <DialogTitle>{editing ? 'Edit participant' : 'Add participant'}</DialogTitle>
          <DialogDescription>
            Medical and mobility details drive vehicle matching in the planner.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="-mx-1 max-h-[60vh] px-1">
          <div className="flex flex-col gap-3">
            <div className="grid grid-cols-2 gap-3">
              <TextField label="Full name" value={form.name} onChange={(v) => set('name', v)} />
              <TextField label="Phone" value={form.phone} onChange={(v) => set('phone', v)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <TextField
                label="Emergency contact"
                value={form.emergencyContact}
                onChange={(v) => set('emergencyContact', v)}
              />
            </div>
            <AddressField
              label="Address"
              value={form.address}
              onChange={(v) => set('address', v)}
              location={form.location}
              onLocationChange={(v) => set('location', v)}
            />
 
            <div className="grid grid-cols-3 gap-3">
              <SelectField
                label="Mobility"
                value={form.mobilityLevel}
                options={MOBILITY}
                onChange={(v) => set('mobilityLevel', v)}
              />
              <SelectField
                label="Priority"
                value={form.medicalPriority}
                options={PRIORITY}
                onChange={(v) => set('medicalPriority', v)}
              />
              <NumberField
                label="Max travel (min)"
                value={form.maxTravelMinutes}
                onChange={(v) => set('maxTravelMinutes', v)}
              />
            </div>

            <Field label="Medical notes">
              <Textarea
                rows={2}
                value={form.medicalNotes}
                onChange={(e) => set('medicalNotes', e.target.value)}
              />
            </Field>

            <div>
              <Label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                Transport requirements
              </Label>
              <div className="grid grid-cols-2 gap-2">
                {CONSTRAINT_KEYS.map((c) => (
                  <SwitchField
                    key={c.key}
                    label={c.label}
                    checked={!!form.constraints[c.key]}
                    onChange={(v) =>
                      set('constraints', { ...form.constraints, [c.key]: v })
                    }
                  />
                ))}
              </div>
            </div>

            <SwitchField
              label="Eligible for transport"
              checked={form.eligible}
              onChange={(v) => set('eligible', v)}
            />
          </div>
        </ScrollArea>

        <DialogFooter showCloseButton>
          <Button onClick={submit} disabled={saving || !form.name.trim()}>
            {saving ? 'Saving…' : editing ? 'Save changes' : 'Add participant'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
