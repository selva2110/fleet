'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Bell,
  Building2,
  CalendarDays,
  Clock,
  MapPin,
  MessageSquare,
  Plus,
  Repeat,
  Search,
  Trash2,
  Users,
  X,
} from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { NumberField, SelectField, TextField } from '@/components/crud/form-fields'
import { DestinationMap } from '@/components/events/destination-map'
import { useFleet } from '@/lib/store'
import { formatMonthDayYear } from '@/lib/date'
import type { EventStatus, EventType, FleetEvent, MobilityLevel, Participant } from '@/lib/types'

const MOBILITY_FILTERS: { value: 'all' | MobilityLevel; label: string }[] = [
  { value: 'all', label: 'All mobility' },
  { value: 'independent', label: 'Independent' },
  { value: 'assisted', label: 'Assisted' },
  { value: 'wheelchair', label: 'Wheelchair' },
  { value: 'stretcher', label: 'Stretcher' },
]

const STATUS: { value: EventStatus; label: string }[] = [
  { value: 'draft', label: 'Draft' },
  { value: 'planning', label: 'Planning' },
  { value: 'scheduled', label: 'Scheduled' },
  { value: 'active', label: 'Active' },
  { value: 'completed', label: 'Completed' },
]

const REMINDER_FREQ: { value: string; label: string }[] = [
  { value: '1440', label: 'Send reminder 24 hours before' },
  { value: '720', label: 'Send reminder 12 hours before' },
  { value: '120', label: 'Send reminder 2 hours before' },
  { value: '60', label: 'Send reminder 1 hour before' },
  { value: '0', label: 'No automatic reminder' },
]

// Transport type derived from a participant's mobility level, with a
// healthcare-coded badge (blue = wheelchair, green = ambulatory, orange = stretcher).
function transportBadge(level: MobilityLevel): { label: string; cls: string } {
  switch (level) {
    case 'wheelchair':
      return { label: 'Wheelchair', cls: 'bg-primary/10 text-primary' }
    case 'stretcher':
      return { label: 'Stretcher', cls: 'bg-warning/20 text-warning-foreground' }
    default:
      return { label: 'Ambulatory', cls: 'bg-success/15 text-success' }
  }
}

function initials(name: string) {
  return name
    .split(' ')
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

function isoToLocalInput(iso: string | null | undefined): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function localInputToIso(value: string): string | null {
  if (!value) return null
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? null : d.toISOString()
}

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
    registrationDeadline: null,
    roundTrip: false,
    returnTime: null,
    status: 'draft',
  }
}

function SectionCard({
  icon: Icon,
  title,
  description,
  action,
  children,
}: {
  icon: React.ElementType
  title: string
  description?: string
  action?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <Card className="overflow-hidden">
      <div className="flex items-start justify-between gap-3 border-b border-border px-5 py-4">
        <div className="flex items-start gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Icon className="size-4.5" />
          </span>
          <div>
            <h2 className="text-sm font-semibold text-foreground">{title}</h2>
            {description ? (
              <p className="mt-0.5 text-xs text-muted-foreground text-pretty">{description}</p>
            ) : null}
          </div>
        </div>
        {action}
      </div>
      <div className="p-5">{children}</div>
    </Card>
  )
}

export function EventForm({ editing }: { editing: FleetEvent | null }) {
  const fleet = useFleet()
  const router = useRouter()

  const centerOptions = fleet.centers.map((c) => ({ value: c.id, label: c.name }))
  const [form, setForm] = useState<Omit<FleetEvent, 'id'>>(() => {
    if (editing) {
      const { id, ...rest } = editing
      void id
      return rest
    }
    return blank(fleet.centers[0]?.id ?? '')
  })
  const [reminderFreq, setReminderFreq] = useState<string>(() => {
    const first = editing?.reminders?.[0]?.offsetMinutes
    return first ? String(first) : '1440'
  })
  const [notifyParticipants, setNotifyParticipants] = useState(true)
  const [notifyDrivers, setNotifyDrivers] = useState(true)
  const [notifyCenter, setNotifyCenter] = useState(false)
  const [saving, setSaving] = useState(false)
  const [addOpen, setAddOpen] = useState(false)
  const [addQuery, setAddQuery] = useState('')
  const [mobilityFilter, setMobilityFilter] = useState<'all' | MobilityLevel>('all')
  const [eligibleOnly, setEligibleOnly] = useState(true)

  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) =>
    setForm((f) => ({ ...f, [k]: v }))

  const today = new Date()
  const todayStr = today.toISOString().slice(0, 10)
  const nowTimeStr = `${String(today.getHours()).padStart(2, '0')}:${String(today.getMinutes()).padStart(2, '0')}`

  const center = fleet.centerById(form.centerId)
  const selected = useMemo(
    () =>
      form.participantIds
        .map((id) => fleet.participantById(id))
        .filter((p): p is Participant => Boolean(p)),
    [form.participantIds, fleet],
  )

  const addable = useMemo(() => {
    const q = addQuery.trim().toLowerCase()
    return fleet.participants
      .filter((p) => !form.participantIds.includes(p.id))
      .filter((p) => !eligibleOnly || p.eligible)
      .filter((p) => mobilityFilter === 'all' || p.mobilityLevel === mobilityFilter)
      .filter((p) => !q || p.name.toLowerCase().includes(q) || p.address.toLowerCase().includes(q))
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [fleet.participants, form.participantIds, addQuery, mobilityFilter, eligibleOnly])

  function addParticipant(id: string) {
    setForm((f) => ({ ...f, participantIds: [...f.participantIds, id] }))
  }
  function removeParticipant(id: string) {
    setForm((f) => ({ ...f, participantIds: f.participantIds.filter((p) => p !== id) }))
  }

  async function submit(status: EventStatus) {
    if (!form.name.trim()) return
    setSaving(true)
    try {
      const offset = Number.parseInt(reminderFreq, 10)
      const reminders =
        notifyParticipants && offset > 0
          ? [
              {
                id: `${form.date}-${form.startTime}-${offset}`,
                offsetMinutes: offset,
                scheduledAt: '',
                sent: false,
              },
            ]
          : []
      await fleet.saveEvent({
        ...form,
        status,
        expectedAttendance: form.expectedAttendance || form.participantIds.length,
        reminders,
        id: editing?.id,
      })
      router.push('/events')
    } finally {
      setSaving(false)
    }
  }

  const timeWindow = `${form.startTime} – ${form.endTime}`

  return (
    <div className="flex min-h-full flex-col">
      {/* Sticky action header */}
      <div className="sticky top-0 z-20 flex flex-wrap items-center justify-between gap-3 border-b border-border bg-card/95 px-6 py-4 backdrop-blur">
        <div>
          <h1 className="text-lg font-semibold text-balance">
            {editing ? 'Edit Event' : 'Create New Event'}
          </h1>
          <p className="mt-0.5 text-sm text-muted-foreground text-pretty">
            Schedule a new transportation event for participants.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" onClick={() => router.push('/events')} disabled={saving}>
            Cancel
          </Button>
          <Button
            variant="outline"
            onClick={() => submit('draft')}
            disabled={saving || !form.name.trim()}
          >
            Save as Draft
          </Button>
          <Button onClick={() => submit('scheduled')} disabled={saving || !form.name.trim()}>
            {saving ? 'Saving…' : editing ? 'Save changes' : 'Publish Event'}
          </Button>
        </div>
      </div>

      <div className="grid gap-6 p-6 lg:grid-cols-4">
        {/* Primary content */}
        <div className="flex flex-col gap-6 lg:col-span-3">
          <SectionCard
            icon={CalendarDays}
            title="Event Details"
            description="Core information about the program and its schedule."
          >
            <div className="flex flex-col gap-4">
              <TextField
                label="Event name"
                value={form.name}
                placeholder="e.g. Tuesday Dialysis Session"
                onChange={(v) => set('name', v)}
              />
              <SelectField label="Status" value={form.status} options={STATUS} onChange={(v) => set('status', v)} />
              <div className="grid gap-4 sm:grid-cols-3">
                <TextField label="Start date" type="date" value={form.date} min={todayStr} onChange={(v) => set('date', v)} />
                <TextField
                  label="Start time"
                  type="time"
                  value={form.startTime}
                  min={form.date === todayStr ? nowTimeStr : undefined}
                  onChange={(v) => set('startTime', v)}
                />
                <TextField label="End time" type="time" value={form.endTime} onChange={(v) => set('endTime', v)} />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <TextField
                  label="Registration / reporting deadline"
                  type="datetime-local"
                  value={isoToLocalInput(form.registrationDeadline)}
                  onChange={(v) => set('registrationDeadline', localInputToIso(v))}
                />
                <NumberField
                  label="Expected attendance"
                  value={form.expectedAttendance}
                  onChange={(v) => set('expectedAttendance', v)}
                />
              </div>
              <p className="rounded-md bg-muted/60 px-3 py-2 text-xs text-muted-foreground">
                SMS responses are accepted until the deadline above, and always close one hour before
                the event starts — whichever comes first.
              </p>

              {/* Trip type: one-way vs round trip */}
              <div className="rounded-lg border border-border p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <Repeat className="size-4.5" />
                    </span>
                    <div>
                      <p className="text-sm font-medium">Round trip</p>
                      <p className="mt-0.5 text-xs text-muted-foreground text-pretty">
                        {form.roundTrip
                          ? 'Transport is assigned for both the outbound and return leg. A matching return trip (center → home) is created automatically when you dispatch.'
                          : 'One-way only (home → center). Turn on to also schedule the return journey.'}
                      </p>
                    </div>
                  </div>
                  <Switch
                    checked={!!form.roundTrip}
                    onCheckedChange={(v) =>
                      setForm((f) => ({
                        ...f,
                        roundTrip: v,
                        returnTime: v ? (f.returnTime ?? f.endTime) : null,
                      }))
                    }
                  />
                </div>
                {form.roundTrip ? (
                  <div className="mt-4 grid gap-4 sm:grid-cols-2">
                    <TextField
                      label="Return departs center at"
                      type="time"
                      value={form.returnTime ?? form.endTime}
                      onChange={(v) => set('returnTime', v)}
                    />
                    <div className="flex items-end">
                      <p className="rounded-md bg-primary/5 px-3 py-2 text-xs text-primary">
                        Both legs use the same vehicle, driver, and riders.
                      </p>
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          </SectionCard>

          <SectionCard
            icon={MapPin}
            title="Destination"
            description="Where participants are being transported."
          >
            <div className="flex flex-col gap-4">
              <SelectField
                label="Destination / care center"
                value={form.centerId}
                options={centerOptions}
                onChange={(v) => set('centerId', v)}
              />
              {center ? (
                <div className="grid gap-3 sm:grid-cols-3">
                  <DetailPill label="Type" value={center.type} />
                  <DetailPill label="Operating hours" value={center.operatingHours} />
                  <DetailPill label="Capacity" value={`${center.capacity} participants`} />
                </div>
              ) : null}
              <div className="h-56 overflow-hidden rounded-lg border border-border">
                <DestinationMap location={center?.location ?? null} label={center?.name} />
              </div>
            </div>
          </SectionCard>

          <SectionCard
            icon={Users}
            title="Participants"
            description="People who need transportation to this event."
            action={
              <Button size="sm" variant={addOpen ? 'secondary' : 'outline'} onClick={() => setAddOpen((v) => !v)}>
                <Plus className="size-4" /> Add Participant
              </Button>
            }
          >
            <div className="flex flex-col gap-3">
              {addOpen ? (
                <div className="rounded-lg border border-border bg-muted/40 p-3">
                  <div className="relative mb-2">
                    <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      value={addQuery}
                      onChange={(e) => setAddQuery(e.target.value)}
                      placeholder="Search participants by name or address"
                      className="pl-8"
                    />
                  </div>

                  {/* Participant filters */}
                  <div className="mb-2 flex flex-wrap items-center gap-1.5">
                    {MOBILITY_FILTERS.map((m) => {
                      const active = mobilityFilter === m.value
                      return (
                        <button
                          key={m.value}
                          type="button"
                          onClick={() => setMobilityFilter(m.value)}
                          className={`rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors ${
                            active
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-card text-muted-foreground hover:text-foreground'
                          }`}
                        >
                          {m.label}
                        </button>
                      )
                    })}
                    <button
                      type="button"
                      onClick={() => setEligibleOnly((v) => !v)}
                      className={`ml-auto rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors ${
                        eligibleOnly
                          ? 'bg-success/15 text-success'
                          : 'bg-card text-muted-foreground hover:text-foreground'
                      }`}
                      aria-pressed={eligibleOnly}
                    >
                      {eligibleOnly ? 'Eligible only' : 'All statuses'}
                    </button>
                  </div>
                  <ScrollArea className="h-44 rounded-md border border-border bg-card">
                    {addable.length === 0 ? (
                      <p className="px-3 py-6 text-center text-sm text-muted-foreground">
                        No more participants to add.
                      </p>
                    ) : (
                      <div className="divide-y divide-border">
                        {addable.map((p) => {
                          const badge = transportBadge(p.mobilityLevel)
                          return (
                            <button
                              key={p.id}
                              type="button"
                              onClick={() => addParticipant(p.id)}
                              className="flex w-full items-center gap-3 px-3 py-2 text-left transition-colors hover:bg-muted/60"
                            >
                              <Avatar className="size-8">
                                <AvatarFallback className="bg-primary/10 text-[11px] font-semibold text-primary">
                                  {initials(p.name)}
                                </AvatarFallback>
                              </Avatar>
                              <div className="min-w-0 flex-1">
                                <p className="truncate text-sm font-medium">{p.name}</p>
                                <p className="truncate text-xs text-muted-foreground">{p.address}</p>
                              </div>
                              <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${badge.cls}`}>
                                {badge.label}
                              </span>
                              <Plus className="size-4 shrink-0 text-muted-foreground" />
                            </button>
                          )
                        })}
                      </div>
                    )}
                  </ScrollArea>
                </div>
              ) : null}

              {selected.length === 0 ? (
                <div className="rounded-lg border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
                  No participants added yet. Use “Add Participant” to include riders.
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  {selected.map((p) => {
                    const badge = transportBadge(p.mobilityLevel)
                    return (
                      <div
                        key={p.id}
                        className="flex items-center gap-3 rounded-lg border border-border bg-card px-3 py-2.5 transition-colors hover:border-primary/30"
                      >
                        <Avatar className="size-9">
                          <AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">
                            {initials(p.name)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">{p.name}</p>
                          <p className="truncate text-xs text-muted-foreground">{p.address}</p>
                        </div>
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${badge.cls}`}>
                          {badge.label}
                        </span>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => removeParticipant(p.id)}
                          aria-label={`Remove ${p.name}`}
                        >
                          <Trash2 className="size-4 text-muted-foreground" />
                        </Button>
                      </div>
                    )
                  })}
                </div>
              )}

              <p className="text-xs font-medium text-muted-foreground">
                {selected.length} participant{selected.length === 1 ? '' : 's'} added
              </p>
            </div>
          </SectionCard>

          <SectionCard
            icon={Bell}
            title="Notification Preferences"
            description="Control who is notified and how reminders are sent."
          >
            <div className="flex flex-col gap-4">
              <div className="grid gap-2 sm:grid-cols-3">
                <ToggleRow label="Notify participants" checked={notifyParticipants} onChange={setNotifyParticipants} />
                <ToggleRow label="Notify drivers" checked={notifyDrivers} onChange={setNotifyDrivers} />
                <ToggleRow label="Notify care center" checked={notifyCenter} onChange={setNotifyCenter} />
              </div>

              <div>
                <p className="mb-1.5 text-xs font-medium text-muted-foreground">Communication channels</p>
                <div className="flex flex-wrap gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
                    <MessageSquare className="size-3.5" /> SMS
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
                    Email — coming soon
                  </span>
                </div>
              </div>

              <SelectField
                label="Reminder frequency"
                value={reminderFreq}
                options={REMINDER_FREQ}
                onChange={setReminderFreq}
              />
              {!notifyParticipants ? (
                <p className="text-xs text-muted-foreground">
                  Participant notifications are off — no reminders will be scheduled.
                </p>
              ) : null}
            </div>
          </SectionCard>
        </div>

        {/* Sticky summary sidebar */}
        <div className="flex flex-col gap-6 lg:col-span-1">
          <div className="lg:sticky lg:top-24 flex flex-col gap-6">
            <Card className="overflow-hidden">
              <div className="border-b border-border bg-primary/5 px-5 py-4">
                <h2 className="text-sm font-semibold text-foreground">Event Summary</h2>
              </div>
              <div className="flex flex-col gap-3 p-5">
                <SummaryRow label="Event" value={form.name || 'Untitled event'} />
                <SummaryRow label="Type" value={form.type} />
                <SummaryRow
                  icon={CalendarDays}
                  label="Start date"
                  value={form.date ? formatMonthDayYear(form.date) : '—'}
                />
                <SummaryRow icon={Clock} label="Time window" value={timeWindow} />
                <SummaryRow icon={MapPin} label="Destination" value={center?.name ?? '—'} />
                <SummaryRow icon={Users} label="Participants" value={String(form.participantIds.length)} />
              </div>
            </Card>

            <Card className="overflow-hidden">
              <div className="border-b border-border px-5 py-4">
                <h2 className="text-sm font-semibold text-foreground">Destination Details</h2>
              </div>
              <div className="flex flex-col gap-3 p-5">
                {center ? (
                  <>
                    <div className="flex items-start gap-3">
                      <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-accent text-accent-foreground">
                        <Building2 className="size-4.5" />
                      </span>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-pretty">{center.name}</p>
                        <p className="text-xs text-muted-foreground">{center.type}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2 text-xs text-muted-foreground">
                      <MapPin className="mt-0.5 size-3.5 shrink-0" />
                      <span className="text-pretty">{center.address}</span>
                    </div>
                    <div className="flex items-start gap-2 text-xs text-muted-foreground">
                      <Clock className="mt-0.5 size-3.5 shrink-0" />
                      <span>{center.operatingHours}</span>
                    </div>
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">Select a destination center to see details.</p>
                )}
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}

function DetailPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-muted/40 px-3 py-2">
      <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-0.5 truncate text-sm font-medium text-foreground">{value}</p>
    </div>
  )
}

function ToggleRow({
  label,
  checked,
  onChange,
}: {
  label: string
  checked: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-2 rounded-lg border border-border bg-card px-3 py-2.5">
      <span className="text-sm font-medium">{label}</span>
      <Switch checked={checked} onCheckedChange={onChange} />
    </label>
  )
}

function SummaryRow({
  icon: Icon,
  label,
  value,
}: {
  icon?: React.ElementType
  label: string
  value: string
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
        {Icon ? <Icon className="size-3.5" /> : null}
        {label}
      </span>
      <span className="truncate text-right text-sm font-medium text-foreground">{value}</span>
    </div>
  )
}
