'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useNotifications } from '@/components/context/notification-provider'
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
} from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { NumberField, SelectField, TextField } from '@/components/crud/form-fields'
import { DestinationMap } from '@/components/events/destination-map'
import { useCenters, useEventMutations } from '@/lib/events/hooks'
import { useParticipants } from '@/lib/participant/hooks'
import { formatMonthDayYear, formatTimeOfDay } from '@/lib/date'
import { validateSchema } from '../validation/zod-validation';
import { EventsConfig } from '@/lib/events/config';
import { Participant } from '@/lib/participant/types';
import { EventStatus, EventType, FleetEvent } from '@/lib/events/types';
import { ParticipantUtils } from '@/lib/participant/utils';
import { EventUtils } from '@/lib/events/utils';
import { findById, uppperCaseInitials } from '@/lib/utils';
import { useTranslation } from '../context/language-provider';
import { createFieldSetter } from '../common';
import { createEventSchema } from '../validation/event';

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
  const { centers } = useCenters();
  const { participants } = useParticipants();
  const { saveEvent } = useEventMutations();
  const router = useRouter();
  const { t } = useTranslation();
  const EventSchema = useMemo(() => createEventSchema(t), [t]);

  const centerOptions = centers.map((c) => ({ value: c.id, label: c.name }))
  const [form, setForm] = useState<Omit<FleetEvent, 'id'>>(() => {
    if (editing) {
      const { id, ...rest } = editing
      void id
      return rest
    }
    return EventUtils.blankEvent(centers[0]?.id ?? '')
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
  const [errors, setErrors] = useState<Record<string, string>>({})
  const set = createFieldSetter(setForm, setErrors);

  const { addToast } = useNotifications()
  function validate() {
    const baseValid = validateSchema(EventSchema, form, setErrors)
    if (!baseValid) {
      addToast({
        title: t('common.validationfailed'),
        message: t('common.fixhighlightedfields'),
        kind: 'danger',
      })
      return false
    }

    if (!notifyParticipants) return true

    if (!form.registrationDeadline) {
      setErrors((current) => ({
        ...current,
        registrationDeadline: t('e.regdeadlinereq'),
      }))
      return false
    }

    const eventStart = new Date(`${form.date}T${form.startTime}`)
    const deadline = new Date(form.registrationDeadline)
    const minimumDeadline = new Date(eventStart.getTime() - 3 * 60 * 60 * 1000)

    if (Number.isNaN(deadline.getTime()) || deadline > minimumDeadline) {
      setErrors((current) => ({
        ...current,
        registrationDeadline: t('e.regdeadlinemin'),
      }))
      return false
    }

    setErrors((current) => ({ ...current, registrationDeadline: '' }))
    return true
  }

  const [todayStr, setTodayStr] = useState("");
  const [nowTimeStr, setNowTimeStr] = useState("");

  useEffect(() => {
    const now = new Date();
    setTodayStr(
      `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(
        now.getDate(),
      ).padStart(2, "0")}`,
    );
    setNowTimeStr(
      `${String(now.getHours()).padStart(2, "0")}:${String(
        now.getMinutes(),
      ).padStart(2, "0")}`,
    );
  }, []);

  const center = findById(centers, form.centerId)
  const selected = useMemo(
    () =>
      form.participantIds
        .map((id) => findById(participants, id))
        .filter((p): p is Participant => Boolean(p)),
    [form.participantIds, participants],
  )

  const addable = useMemo(() => {
    const q = addQuery.trim().toLowerCase()
    return participants
      .filter((p)=> p.status === "registered")
      .filter((p) => !form.participantIds.includes(p.id))
      .filter((p) => !q || p.name.toLowerCase().includes(q) || p.address.toLowerCase().includes(q))
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [participants, form.participantIds, addQuery])

  const registrationDeadlineMin = useMemo(() => {
    if (!form.date || !form.startTime) return undefined

    const eventStart = new Date(`${form.date}T${form.startTime}`)
    eventStart.setHours(eventStart.getHours() - 3)

    const pad = (n: number) => String(n).padStart(2, '0')
    return `${eventStart.getFullYear()}-${pad(eventStart.getMonth() + 1)}-${pad(eventStart.getDate())}T${pad(eventStart.getHours())}:${pad(eventStart.getMinutes())}`
  }, [form.date, form.startTime])

  function addParticipant(id: string) {
    setForm((f) => ({ ...f, participantIds: [...f.participantIds, id] }))
  }
  function removeParticipant(id: string) {
    setForm((f) => ({ ...f, participantIds: f.participantIds.filter((p) => p !== id) }))
  }

  async function submit(status: EventStatus) {
    if (!validate()) return
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
      await saveEvent({
        ...form,
        status,
        expectedAttendance: form.expectedAttendance || form.participantIds.length,
        reminders,
        id: editing?.id,
      })

      const recipients: string[] = []
      if (notifyParticipants) recipients.push(t('common.participants').toLowerCase())
      if (notifyDrivers) recipients.push(t('common.drivers').toLowerCase())
      if (notifyCenter) recipients.push(t('e.carecenterrecipient'))

      const recipientText =
        recipients.length === 0
          ? ''
          : recipients.length === 1
          ? recipients[0]
          : `${recipients.slice(0, -1).join(', ')} and ${recipients[recipients.length - 1]}`

      addToast({
        title: editing ? t('e.eventupdated') : t('e.eventcreated'),
        message: recipients.length
          ? t('e.eventcreatednotif').replace('{{recipients}}', recipientText)
          : t('e.eventcreated'),
        kind: 'success',
      })

      router.push('/events')
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

  const timeWindow = `${formatTimeOfDay(form.startTime)} – ${formatTimeOfDay(form.endTime)}`

  return (
    <div className="flex min-h-full flex-col">
      {/* Sticky action header */}
      <div className="sticky top-0 z-20 flex flex-wrap items-center justify-between gap-3 border-b border-border bg-card/95 px-6 py-4 backdrop-blur">
        <div>
          <h1 className="text-lg font-semibold text-balance">
            {editing ? t('e.editEvent') : t('e.createevent')}
          </h1>
          <p className="mt-0.5 text-sm text-muted-foreground text-pretty">
            {t('e.newTrans')}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" onClick={() => router.push('/events')} disabled={saving}>
            {t('common.cancel')}
          </Button>
          <Button variant="outline" onClick={() => submit('draft')} disabled={saving}>
            {t('e.saveasdraft')}
          </Button>
          <Button onClick={() => submit('scheduled')} disabled={saving}>
            {saving ? t('common.saving') : editing ? t('common.savchanges') : t('e.publishev')}
          </Button>
        </div>
      </div>

      <div className="grid gap-6 p-6 lg:grid-cols-4">
        {/* Primary content */}
        <div className="flex flex-col gap-6 lg:col-span-3">
          <SectionCard
            icon={CalendarDays}
            title={t('e.details')}
            description={t('e.form_details')}
          >
            <div className="flex flex-col gap-4">
              <TextField
                label={t('e.name')}
                value={form.name}
                placeholder={t('e.example')}
                onChange={(v) => set('name', v)}
                required
                error={errors.name}
              />
              <div className="grid gap-4 sm:grid-cols-3">
                <TextField
                  label={t('e.startdate')}
                  type="date"
                  value={form.date}
                  min={todayStr}
                  onChange={(v) => set('date', v)}
                  required
                  error={errors.date}
                />
                <TextField
                  label={t('e.startTime')}
                  type="time"
                  value={form.startTime}
                  min={form.date === todayStr ? nowTimeStr : undefined}
                  onChange={(v) => set('startTime', v)}
                  required
                  error={errors.startTime}
                />
                <TextField
                  label={t('e.endTime')}
                  type="time"
                  value={form.endTime}
                  onChange={(v) => set('endTime', v)}
                  required
                  error={errors.endTime}
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-3">
                <TextField
                  label={t('e.regdealine')}
                  type="datetime-local"
                  min={notifyParticipants ? registrationDeadlineMin : undefined}
                  required={notifyParticipants}
                  value={EventUtils.isoToLocalInput(form.registrationDeadline)}
                  onChange={(v) => set('registrationDeadline', EventUtils.localInputToIso(v))}
                  error={errors.registrationDeadline}
                />
                <NumberField
                  label={t('e.expatt')}
                  value={form.expectedAttendance}
                  onChange={(v) => set('expectedAttendance', v)}
                  error={errors.expectedAttendance}
                />
                <SelectField
                label={t('e.eventType')}
                value={form.type}
                options={EventsConfig.TYPE_OPTIONS}
                onChange={(v) => set('type', v as EventType)}
                required
                error={errors.type}
              />
              </div>
              <p className="rounded-md bg-muted/60 px-3 py-2 text-xs text-muted-foreground">
                {t('e.smscutoff')}
              </p>

              {/* Trip type: one-way vs round trip */}
              <div className="rounded-lg border border-border p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <Repeat className="size-4.5" />
                    </span>
                    <div>
                      <p className="text-sm font-medium">{t('e.roundTrip')}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground text-pretty">
                        {form.roundTrip
                          ? t('e.roundTripOn')
                          : t('e.roundTripOff') }
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
                      label={t('e.returndepartsat')}
                      type="time"
                      value={form.returnTime ?? form.endTime}
                      onChange={(v) => set('returnTime', v)}
                      error={errors.returnTime}
                    />
                    <div className="flex items-end">
                      <p className="rounded-md bg-primary/5 px-3 py-2 text-xs text-primary">
                        {t('e.bothlegs')}
                      </p>
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          </SectionCard>

          <SectionCard
            icon={MapPin}
            title={t('common.dest')}
            description={t('e.centerdesc')}
          >
            <div className="flex flex-col gap-4">
              <SelectField
                label={`${t('common.dest')} / ${t('common.carecenter')}`}
                value={form.centerId}
                options={centerOptions}
                onChange={(v) => set('centerId', v)}
                required
                error={errors.centerId}
              />
              {center ? (
                <div className="grid gap-3 sm:grid-cols-2">
                  {/* <DetailPill label="Type" value={center.type} /> */}
                  <DetailPill label={t('e.operatehrs')} value={center.operatingHours} />
                  <DetailPill label={t('common.capacity')} value={`${center.capacity} ${t('common.participants')}`} />
                </div>
              ) : null}
              <div className="h-56 overflow-hidden rounded-lg border border-border">
                <DestinationMap location={center?.location ?? null} label={center?.name} />
              </div>
            </div>
          </SectionCard>

          <SectionCard
            icon={Users}
            title={t('common.participants')}
            description={t('part.transdesc')}
            action={
              <Button size="sm" variant={addOpen ? 'secondary' : 'outline'} onClick={() => setAddOpen((v) => !v)}>
                <Plus className="size-4" /> {t('e.addpart')}
              </Button>
            }
          >
            {errors.participantIds ? (
              <p className="text-sm text-destructive">{errors.participantIds}</p>
            ) : null}

            <div className="flex flex-col gap-3">
              {addOpen ? (
                <div className="rounded-lg border border-border bg-muted/40 p-3">
                  <div className="relative mb-2">
                    <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      value={addQuery}
                      onChange={(e) => setAddQuery(e.target.value)}
                      placeholder={t('e.searchparticipants')}
                      className="pl-8"
                    />
                  </div>

                  <ScrollArea className="h-44 rounded-md border border-border bg-card">
                    {addable.length === 0 ? (
                      <p className="px-3 py-6 text-center text-sm text-muted-foreground">
                        {t('e.noparticipantstoadd')}
                      </p>
                    ) : (
                      <div className="divide-y divide-border">
                        {addable.map((p) => {
                          return (
                            <button
                              key={p.id}
                              type="button"
                              onClick={() => addParticipant(p.id)}
                              className="flex w-full items-center gap-3 px-3 py-2 text-left transition-colors hover:bg-muted/60"
                            >
                              <Avatar className="size-8">
                                <AvatarFallback className="bg-primary/10 text-[11px] font-semibold text-primary">
                                  {uppperCaseInitials(p.name)}
                                </AvatarFallback>
                              </Avatar>
                              <div className="min-w-0 flex-1">
                                <p className="truncate text-sm font-medium">{p.name}</p>
                                <p className="truncate text-xs text-muted-foreground">{p.address}</p>
                              </div>
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
                  {t('e.nopartadded')}
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  {selected.map((p) => {
                    return (
                      <div
                        key={p.id}
                        className="flex items-center gap-3 rounded-lg border border-border bg-card px-3 py-2.5 transition-colors hover:border-primary/30"
                      >
                        <Avatar className="size-9">
                          <AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">
                            {uppperCaseInitials(p.name)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">{p.name}</p>
                          <p className="truncate text-xs text-muted-foreground">{p.address}</p>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => removeParticipant(p.id)}
                          aria-label={t('e.removeparticipant').replace('{{name}}', p.name)}
                        >
                          <Trash2 className="size-4 text-muted-foreground" />
                        </Button>
                      </div>
                    )
                  })}
                </div>
              )}

              <p className="text-xs font-medium text-muted-foreground">
               {t("e.participantsadded")
                .replace("{{count}}", String(selected.length))
                .replace("{{suffix}}", selected.length === 1 ? "" : "s")}
              </p>
            </div>
          </SectionCard>

          <SectionCard
            icon={Bell}
            title={t('e.notification')}
            description={t('e.notdesc')}
          >
            <div className="flex flex-col gap-4">
              <div className="grid gap-2 sm:grid-cols-3">
                <ToggleRow label={t('e.notifypart')} checked={notifyParticipants} onChange={setNotifyParticipants} />
                <ToggleRow label={t('e.drivers')} checked={notifyDrivers} onChange={setNotifyDrivers} />
                <ToggleRow label={t('e.notifycare')} checked={notifyCenter} onChange={setNotifyCenter} />
              </div>

              <div>
                <p className="mb-1.5 text-xs font-medium text-muted-foreground">{t('e.commchan')}</p>
                <div className="flex flex-wrap gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
                    <MessageSquare className="size-3.5" /> {t('common.sms')}
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
                    {t('common.emailcs')}
                  </span>
                </div>
              </div>

              <SelectField
                label={t('e.remfreq')}
                value={reminderFreq}
                options={EventsConfig.REMINDER_FREQ}
                onChange={setReminderFreq}
              />
              {!notifyParticipants ? (
                <p className="text-xs text-muted-foreground">
                  {t('e.partNotifyNote')}
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
                <h2 className="text-sm font-semibold text-foreground">{t('e.summary')}</h2>
              </div>
              <div className="flex flex-col gap-3 p-5">
                <SummaryRow label={t('e.event')} value={form.name || t('e.untitled')} />
                <SummaryRow label={t('common.type')} value={form.type} />
                <SummaryRow
                  icon={CalendarDays}
                  label={t('e.startdate')}
                  value={form.date ? formatMonthDayYear(form.date) : '—'}
                />
                <SummaryRow icon={Clock} label={t('e.timewindow')} value={timeWindow} />
                <SummaryRow icon={MapPin} label={t('common.dest')} value={center?.name ?? '—'} />
                <SummaryRow icon={Users} label={t('common.participants')} value={String(form.participantIds.length)} />
              </div>
            </Card>

            <Card className="overflow-hidden">
              <div className="border-b border-border px-5 py-4">
                <h2 className="text-sm font-semibold text-foreground">{t('e.destdet')}</h2>
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
                  <p className="text-sm text-muted-foreground">{t('e.selectDet')}</p>
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
