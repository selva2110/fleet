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
import { Checkbox } from '@/components/ui/checkbox'
import { ScrollArea } from '@/components/ui/scroll-area'
import { X } from 'lucide-react'
import { Field, NumberField, SelectField, TextField } from './form-fields'
import { useFleet } from '@/lib/store'
import type { EventStatus, EventType, FleetEvent } from '@/lib/types'

const TYPES: { value: EventType; label: string }[] = [
  { value: 'Dialysis Session', label: 'Dialysis Session' },
  { value: 'Clinical Appointment', label: 'Clinical Appointment' },
  { value: 'Vaccination Camp', label: 'Vaccination Camp' },
  { value: 'Community Program', label: 'Community Program' },
  { value: 'Therapy Session', label: 'Therapy Session' },
  { value: 'Rehabilitation Session', label: 'Rehabilitation Session' },
  { value: 'Health Screening', label: 'Health Screening' },
]
const STATUS: { value: EventStatus; label: string }[] = [
  { value: 'planning', label: 'Planning' },
  { value: 'scheduled', label: 'Scheduled' },
  { value: 'active', label: 'Active' },
  { value: 'completed', label: 'Completed' },
]

function blank(centerId: string): Omit<FleetEvent, 'id'> {
  return {
    name: '',
    type: 'Clinical Appointment',
    centerId,
    date: new Date().toISOString().slice(0, 10),
    startTime: '09:00',
    endTime: '12:00',
    expectedAttendance: 0,
    participantIds: [],
    reminders: [],
    status: 'planning',
  }
}

function parseReminderOffsets(value: string) {
  return value
    .split(',')
    .map((segment) => Number.parseInt(segment.trim(), 10))
    .filter((offset): offset is number => Number.isFinite(offset) && offset > 0)
}

export function EventDialog({
  open,
  onOpenChange,
  editing,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  editing: FleetEvent | null
}) {
  const fleet = useFleet()
  const centerOptions = fleet.centers.map((c) => ({ value: c.id, label: c.name }))
  const [form, setForm] = useState(() => blank(fleet.centers[0]?.id ?? ''))
  const [saving, setSaving] = useState(false)
  const [reminderOffsets, setReminderOffsets] = useState<number[]>([240])

  useEffect(() => {
    if (editing) {
      const { id, ...rest } = editing
      void id
      setForm(rest)
      setReminderOffsets(
        editing.reminders?.length
          ? editing.reminders.map((reminder) => reminder.offsetMinutes)
          : [240],
      )
    } else {
      setForm(blank(fleet.centers[0]?.id ?? ''))
      setReminderOffsets([240])
    }
    // Only reset the form when the dialog is opened/closed or switches between
    // add/edit — not on every background data refresh (the live-tracking poll
    // hands back a new `fleet.centers` array reference every ~2s even when
    // nothing changed, which was wiping out in-progress input).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editing, open])

  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) =>
    setForm((f) => ({ ...f, [k]: v }))

  // Dates/times before now can't be picked for a new (or rescheduled) event.
  const today = new Date()
  const todayStr = today.toISOString().slice(0, 10)
  const nowTimeStr = `${String(today.getHours()).padStart(2, '0')}:${String(today.getMinutes()).padStart(2, '0')}`

  const updateReminder = (index: number, minutes: number) => {
    setReminderOffsets((current) => {
      const next = [...current]
      next[index] = minutes
      return next
    })
  }

  const removeReminder = (index: number) => {
    setReminderOffsets((current) => current.filter((_, i) => i !== index))
  }

  const addReminder = () => {
    setReminderOffsets((current) => [...current, 240])
  }

  const minutesToTimeString = (minutes: number): string => {
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`
  }

  const timeStringToMinutes = (timeStr: string): number => {
    const [hours, mins] = timeStr.split(':').map((part) => Number.parseInt(part, 10))
    return hours * 60 + mins
  }

  const toggleParticipant = (id: string) =>
    setForm((f) => ({
      ...f,
      participantIds: f.participantIds.includes(id)
        ? f.participantIds.filter((p) => p !== id)
        : [...f.participantIds, id],
    }))

  const sortedParticipants = useMemo(
    () => [...fleet.participants].sort((a, b) => a.name.localeCompare(b.name)),
    [fleet.participants],
  )

  async function submit() {
    if (!form.name.trim()) return
    setSaving(true)
    try {
      const reminderPayload = reminderOffsets
        .filter((minutes) => minutes > 0)
        .map((offsetMinutes) => ({
          id: `${form.date}-${form.startTime}-${offsetMinutes}`,
          offsetMinutes,
          scheduledAt: '',
          sent: false,
        }))

      await fleet.saveEvent({
        ...form,
        expectedAttendance: form.expectedAttendance || form.participantIds.length,
        reminders: reminderPayload.length > 0 ? reminderPayload : editing?.reminders ?? [],
        id: editing?.id,
      })
      onOpenChange(false)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg flex flex-col h-[90vh] max-h-[90vh]">
        <DialogHeader className="shrink-0">
          <DialogTitle>{editing ? 'Edit event' : 'Create event'}</DialogTitle>
          <DialogDescription>Schedule a session and assign the participants who need transport.</DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 min-h-0">
          <div className="flex flex-col gap-3 px-4">
          <TextField label="Event name" value={form.name} onChange={(v) => set('name', v)} />
          <div className="grid grid-cols-2 gap-3">
            <SelectField label="Type" value={form.type} options={TYPES} onChange={(v) => set('type', v)} />
            <SelectField label="Destination center" value={form.centerId} options={centerOptions} onChange={(v) => set('centerId', v)} />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <TextField label="Date" type="date" value={form.date} min={todayStr} onChange={(v) => set('date', v)} />
            <TextField
              label="Start"
              type="time"
              value={form.startTime}
              min={form.date === todayStr ? nowTimeStr : undefined}
              onChange={(v) => set('startTime', v)}
            />
            <TextField label="End" type="time" value={form.endTime} onChange={(v) => set('endTime', v)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <NumberField label="Expected attendance" value={form.expectedAttendance} onChange={(v) => set('expectedAttendance', v)} />
            <SelectField label="Status" value={form.status} options={STATUS} onChange={(v) => set('status', v)} />
          </div>

          <Field label="Reminders (hours:minutes before start)">
            <div className="space-y-2">
              <div className="flex flex-wrap gap-2">
                {reminderOffsets.map((minutes, index) => (
                  <div key={index} className="flex items-center gap-1 bg-muted/50 rounded-md p-1.5">
                    <TextField
                      label=""
                      type="time"
                      value={minutesToTimeString(minutes)}
                      onChange={(v) => updateReminder(index, timeStringToMinutes(v))}
                    />
                    {reminderOffsets.length > 1 ? (
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => removeReminder(index)}
                        className="shrink-0 h-auto p-0.5"
                      >
                        <X className="size-3" />
                      </Button>
                    ) : null}
                  </div>
                ))}
              </div>
              <Button variant="outline" size="sm" onClick={addReminder} className="w-full">
                + Add reminder
              </Button>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              Set reminders using a clock interface. New events default to 4 hours before the event starts.
            </p>
          </Field>

          <Field label={`Participants (${form.participantIds.length} selected)`}>
            <ScrollArea className="h-40 rounded-md border border-border">
              <div className="divide-y divide-border">
                {sortedParticipants.map((p) => (
                  <label
                    key={p.id}
                    className="flex cursor-pointer items-center gap-3 px-3 py-2 text-sm hover:bg-muted/50"
                  >
                    <Checkbox
                      checked={form.participantIds.includes(p.id)}
                      onCheckedChange={() => toggleParticipant(p.id)}
                    />
                    <span className="flex-1 truncate">{p.name}</span>
                    <span className="text-xs capitalize text-muted-foreground">{p.mobilityLevel}</span>
                  </label>
                ))}
              </div>
            </ScrollArea>
          </Field>
          </div>
        </ScrollArea>

        <DialogFooter showCloseButton className="shrink-0 border-t border-border mt-4">
          <Button onClick={submit} disabled={saving || !form.name.trim()}>
            {saving ? 'Saving…' : editing ? 'Save changes' : 'Create event'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
