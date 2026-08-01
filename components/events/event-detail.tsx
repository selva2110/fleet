'use client'

import { useMemo, useState } from 'react'
import {
  AlertCircle,
  Bus,
  CheckCircle2,
  ChevronDown,
  Clock,
  Download,
  Loader2,
  MapPin,
  MessageSquare,
  Phone,
  Send,
  Users,
  X,
  XCircle,
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { StatusBadge } from '@/components/common'
import { useFleet } from '@/lib/store'
import { formatMonthDayYear, formatMonthDayYearTime } from '@/lib/date'
import {
  RESPONSE_META,
  isResponseWindowOpen,
  responseCutoff,
} from '@/lib/notifications'
import { cn } from '@/lib/utils'
import type { FleetEvent, Participant, SmsNotification } from '@/lib/types'

const deliveryMeta: Record<
  string,
  { label: string; cls: string }
> = {
  queued: { label: 'Queued', cls: 'bg-muted text-muted-foreground' },
  sent: { label: 'Sent', cls: 'bg-accent text-accent-foreground' },
  delivered: { label: 'Delivered', cls: 'bg-success/20 text-success' },
  received: { label: 'Replied', cls: 'bg-primary/15 text-primary' },
  undelivered: { label: 'Undelivered', cls: 'bg-warning/20 text-warning-foreground' },
  failed: { label: 'Failed', cls: 'bg-destructive/15 text-destructive' },
}

const CONSTRAINT_LABELS: Record<string, string> = {
  wheelchair: 'Wheelchair',
  poweredWheelchair: 'Powered wheelchair',
  walker: 'Walker',
  oxygen: 'Oxygen',
  caregiverRequired: 'Caregiver required',
  bariatric: 'Bariatric',
  visualAssist: 'Visual assist',
  cognitiveAssist: 'Cognitive assist',
  serviceAnimal: 'Service animal',
}

function StatCard({
  label,
  value,
  icon,
  tone = 'default',
}: {
  label: string
  value: number
  icon: React.ReactNode
  tone?: 'default' | 'primary' | 'success' | 'danger' | 'warning'
}) {
  const toneCls: Record<string, string> = {
    default: 'text-foreground',
    primary: 'text-primary',
    success: 'text-success',
    danger: 'text-destructive',
    warning: 'text-warning-foreground',
  }
  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2.5">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
          {label}
        </span>
        <span className="text-muted-foreground">{icon}</span>
      </div>
      <p className={cn('mt-1 text-2xl font-semibold tabular-nums', toneCls[tone])}>{value}</p>
    </div>
  )
}

function toCsv(rows: string[][]): string {
  return rows
    .map((r) => r.map((cell) => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(','))
    .join('\n')
}

function downloadCsv(filename: string, rows: string[][]) {
  const blob = new Blob([toCsv(rows)], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export function EventDetail({
  open,
  onOpenChange,
  event,
  inline = false,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  event: FleetEvent | null
  /** When true, render as an in-flow expandable panel instead of a modal dialog. */
  inline?: boolean
}) {
  const fleet = useFleet()
  const [expanded, setExpanded] = useState<string | null>(null)
  const [sending, setSending] = useState(false)
  const [assigning, setAssigning] = useState(false)
  const [banner, setBanner] = useState<{ tone: 'success' | 'error'; text: string } | null>(null)

  const center = fleet.centerById(event?.centerId)

  const notifByParticipant = useMemo(() => {
    const map = new Map<string, SmsNotification>()
    if (!event) return map
    for (const n of fleet.smsNotifications) {
      if (n.eventId === event.id) map.set(n.participantId, n)
    }
    return map
  }, [fleet.smsNotifications, event])

  const roster = useMemo<Participant[]>(() => {
    if (!event) return []
    return event.participantIds
      .map((id) => fleet.participantById(id))
      .filter((p): p is Participant => Boolean(p))
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [event, fleet])

  const stats = useMemo(() => {
    const notifs = [...notifByParticipant.values()]
    const s = {
      total: roster.length,
      sent: notifs.length,
      delivered: notifs.filter((n) => n.deliveryStatus === 'delivered' || n.deliveryStatus === 'received').length,
      pending: notifs.filter((n) => n.deliveryStatus === 'queued' || n.deliveryStatus === 'sent').length,
      failed: notifs.filter((n) => n.deliveryStatus === 'failed' || n.deliveryStatus === 'undelivered').length,
      attendingSelf: notifs.filter((n) => n.response === 'attending_self').length,
      needTransport: notifs.filter((n) => n.response === 'attending_transport').length,
      notAttending: notifs.filter((n) => n.response === 'not_attending').length,
      noResponse: roster.length - notifs.filter((n) => n.response).length,
    }
    return s
  }, [notifByParticipant, roster])

  if (!event) return null

  const windowOpen = isResponseWindowOpen(event)
  const cutoff = responseCutoff(event)

  async function handleSend() {
    if (!event) return
    setSending(true)
    setBanner(null)
    try {
      const result = await fleet.sendEventNotifications(event.id)
      setBanner({
        tone: result.sent > 0 ? 'success' : 'error',
        text: result.message,
      })
    } catch (err) {
      setBanner({ tone: 'error', text: (err as Error).message })
    } finally {
      setSending(false)
    }
  }

  async function handleAssign() {
    if (!event) return
    setAssigning(true)
    setBanner(null)
    try {
      const { assigned } = await fleet.assignTransport(event.id)
      setBanner({
        tone: 'success',
        text: `Queued ${assigned} participant${assigned === 1 ? '' : 's'} needing transport for planning.`,
      })
    } catch (err) {
      setBanner({ tone: 'error', text: (err as Error).message })
    } finally {
      setAssigning(false)
    }
  }

  function exportResponses() {
    if (!event) return
    const header = ['Name', 'Phone', 'Delivery', 'Response', 'Responded at', 'Mobility', 'Priority']
    const rows = roster.map((p) => {
      const n = notifByParticipant.get(p.id)
      return [
        p.name,
        p.phone,
        n ? deliveryMeta[n.deliveryStatus]?.label ?? n.deliveryStatus : 'Not sent',
        n?.response ? RESPONSE_META[n.response].label : 'No response',
        n?.respondedAt ? formatMonthDayYearTime(n.respondedAt) : '',
        p.mobilityLevel,
        p.medicalPriority,
      ]
    })
    downloadCsv(`${event.name.replace(/\s+/g, '-')}-responses.csv`, [header, ...rows])
  }

  function exportTransportRequests() {
    if (!event) return
    const header = ['Name', 'Phone', 'Address', 'Mobility', 'Priority', 'Pickup window']
    const rows = roster
      .filter((p) => notifByParticipant.get(p.id)?.response === 'attending_transport')
      .map((p) => [p.name, p.phone, p.address, p.mobilityLevel, p.medicalPriority, p.pickupWindow])
    downloadCsv(`${event.name.replace(/\s+/g, '-')}-transport-requests.csv`, [header, ...rows])
  }

  const metaRow = (
    <>
      <span className="inline-flex items-center gap-1">
        <MapPin className="size-3.5" /> {center?.name ?? 'No center'}
      </span>
      <span className="inline-flex items-center gap-1">
        <Clock className="size-3.5" /> {formatMonthDayYear(event.date)} · {event.startTime}–{event.endTime}
      </span>
      <span>{event.type}</span>
    </>
  )

  const statusRow = (
    <div className="mt-2 flex flex-wrap items-center gap-2">
      <span
        className={cn(
          'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium',
          windowOpen ? 'bg-success/15 text-success' : 'bg-muted text-muted-foreground',
        )}
      >
        <span className={cn('size-1.5 rounded-full', windowOpen ? 'bg-success' : 'bg-muted-foreground')} />
        {windowOpen ? 'Responses open' : 'Responses closed'}
      </span>
      {cutoff ? (
        <span className="text-xs text-muted-foreground">
          Cutoff: {formatMonthDayYearTime(cutoff.toISOString())}
        </span>
      ) : null}
    </div>
  )

  const body = (
    <div className="space-y-5 px-5 py-4">
            {/* Action bar */}
            <div className="flex flex-wrap items-center gap-2">
              <Button onClick={handleSend} disabled={sending} size="sm">
                {sending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
                {stats.sent > 0 ? 'Resend SMS' : `Send SMS to ${stats.total}`}
              </Button>
              <Button onClick={handleAssign} disabled={assigning || stats.needTransport === 0} size="sm" variant="outline">
                {assigning ? <Loader2 className="size-4 animate-spin" /> : <Bus className="size-4" />}
                Assign transport ({stats.needTransport})
              </Button>
              <Button onClick={exportResponses} size="sm" variant="outline">
                <Download className="size-4" /> Export responses
              </Button>
              <Button onClick={exportTransportRequests} size="sm" variant="ghost" disabled={stats.needTransport === 0}>
                <Download className="size-4" /> Transport list
              </Button>
            </div>

            {banner ? (
              <div
                className={cn(
                  'flex items-center gap-2 rounded-md border px-3 py-2 text-sm',
                  banner.tone === 'success'
                    ? 'border-success/30 bg-success/10 text-success'
                    : 'border-destructive/30 bg-destructive/10 text-destructive',
                )}
              >
                {banner.tone === 'success' ? <CheckCircle2 className="size-4" /> : <AlertCircle className="size-4" />}
                <span>{banner.text}</span>
              </div>
            ) : null}

            {/* Delivery stats */}
            <div>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Notification delivery
              </h3>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                <StatCard label="Sent" value={stats.sent} icon={<MessageSquare className="size-3.5" />} />
                <StatCard label="Delivered" value={stats.delivered} icon={<CheckCircle2 className="size-3.5" />} tone="success" />
                <StatCard label="Pending" value={stats.pending} icon={<Clock className="size-3.5" />} tone="warning" />
                <StatCard label="Failed" value={stats.failed} icon={<XCircle className="size-3.5" />} tone="danger" />
              </div>
            </div>

            {/* Response stats */}
            <div>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Attendance responses
              </h3>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                <StatCard label="Need transport" value={stats.needTransport} icon={<Bus className="size-3.5" />} tone="primary" />
                <StatCard label="Own transport" value={stats.attendingSelf} icon={<CheckCircle2 className="size-3.5" />} tone="success" />
                <StatCard label="Not attending" value={stats.notAttending} icon={<XCircle className="size-3.5" />} tone="danger" />
                <StatCard label="No response" value={stats.noResponse} icon={<Users className="size-3.5" />} />
              </div>
            </div>

            {/* Participant list */}
            <div>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Participants ({roster.length})
              </h3>
              {roster.length === 0 ? (
                <p className="rounded-md border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">
                  No participants on the roster. Edit the event to add participants.
                </p>
              ) : (
                <ul className="divide-y divide-border overflow-hidden rounded-lg border border-border">
                  {roster.map((p) => {
                    const n = notifByParticipant.get(p.id)
                    const isOpen = expanded === p.id
                    const activeConstraints = Object.entries(p.constraints)
                      .filter(([, v]) => v)
                      .map(([k]) => CONSTRAINT_LABELS[k] ?? k)
                    return (
                      <li key={p.id} className="bg-card">
                        <button
                          type="button"
                          onClick={() => setExpanded(isOpen ? null : p.id)}
                          className="flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-muted/50"
                          aria-expanded={isOpen}
                        >
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium">{p.name}</p>
                            <p className="truncate text-xs text-muted-foreground capitalize">
                              {p.mobilityLevel} · {p.medicalPriority}
                            </p>
                          </div>
                          {n?.response ? (
                            <StatusBadge label={RESPONSE_META[n.response].short} cls={RESPONSE_META[n.response].cls} />
                          ) : (
                            <span className="text-[11px] text-muted-foreground">No reply</span>
                          )}
                          {n ? (
                            <StatusBadge
                              label={deliveryMeta[n.deliveryStatus]?.label ?? n.deliveryStatus}
                              cls={deliveryMeta[n.deliveryStatus]?.cls ?? 'bg-muted text-muted-foreground'}
                            />
                          ) : (
                            <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
                              Not sent
                            </span>
                          )}
                          <ChevronDown
                            className={cn(
                              'size-4 shrink-0 text-muted-foreground transition-transform',
                              isOpen && 'rotate-180',
                            )}
                          />
                        </button>
                        {isOpen ? (
                          <div className="border-t border-border bg-muted/20 px-3 py-3">
                            <dl className="grid grid-cols-1 gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
                              <div className="flex items-center gap-2">
                                <Phone className="size-3.5 text-muted-foreground" />
                                <span>{p.phone || 'No phone'}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <MapPin className="size-3.5 text-muted-foreground" />
                                <span className="truncate">{p.address || 'No address'}</span>
                              </div>
                              <div>
                                <dt className="text-xs text-muted-foreground">Pickup window</dt>
                                <dd>{p.pickupWindow || '—'}</dd>
                              </div>
                              <div>
                                <dt className="text-xs text-muted-foreground">Emergency contact</dt>
                                <dd>{p.emergencyContact || '—'}</dd>
                              </div>
                              <div className="sm:col-span-2">
                                <dt className="text-xs text-muted-foreground">Transport constraints</dt>
                                <dd className="mt-1 flex flex-wrap gap-1">
                                  {activeConstraints.length ? (
                                    activeConstraints.map((c) => (
                                      <span key={c} className="rounded-full bg-secondary px-2 py-0.5 text-xs text-secondary-foreground">
                                        {c}
                                      </span>
                                    ))
                                  ) : (
                                    <span className="text-muted-foreground">None</span>
                                  )}
                                </dd>
                              </div>
                              {p.medicalNotes ? (
                                <div className="sm:col-span-2">
                                  <dt className="text-xs text-muted-foreground">Medical notes</dt>
                                  <dd className="text-pretty">{p.medicalNotes}</dd>
                                </div>
                              ) : null}
                              <div className="sm:col-span-2 rounded-md border border-border bg-card px-3 py-2">
                                <dt className="mb-1 text-xs font-medium text-muted-foreground">SMS status</dt>
                                <dd className="space-y-0.5 text-xs">
                                  {n ? (
                                    <>
                                      <p>
                                        Delivery:{' '}
                                        <span className="font-medium">
                                          {deliveryMeta[n.deliveryStatus]?.label ?? n.deliveryStatus}
                                        </span>
                                        {n.sentAt ? ` · sent ${formatMonthDayYearTime(n.sentAt)}` : ''}
                                      </p>
                                      <p>
                                        Response:{' '}
                                        <span className="font-medium">
                                          {n.response ? RESPONSE_META[n.response].label : 'Awaiting reply'}
                                        </span>
                                        {n.respondedAt ? ` · ${formatMonthDayYearTime(n.respondedAt)}` : ''}
                                      </p>
                                    </>
                                  ) : (
                                    <p className="text-muted-foreground">No notification sent yet.</p>
                                  )}
                                </dd>
                              </div>
                            </dl>
                          </div>
                        ) : null}
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>
    </div>
  )

  // Inline mode: an in-flow expandable panel rendered directly below the
  // clicked event in the list. Clicking the same event again unmounts it.
  if (inline) {
    return (
      <div className="overflow-hidden rounded-lg border border-primary/30 bg-card shadow-sm">
        <div className="flex items-start justify-between gap-3 border-b border-border bg-muted/30 px-5 py-4">
          <div className="min-w-0">
            <h2 className="text-base font-semibold text-pretty">{event.name}</h2>
            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
              {metaRow}
            </div>
            {statusRow}
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onOpenChange(false)}
            aria-label="Close details"
            className="shrink-0"
          >
            <X className="size-4" />
          </Button>
        </div>
        {body}
      </div>
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[92vh] max-h-[92vh] flex-col p-0 sm:max-w-3xl">
        <DialogHeader className="shrink-0 border-b border-border px-5 py-4">
          <div className="flex items-start justify-between gap-3 pr-6">
            <div className="min-w-0">
              <DialogTitle className="text-pretty">{event.name}</DialogTitle>
              <DialogDescription className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
                {metaRow}
              </DialogDescription>
            </div>
          </div>
          {statusRow}
        </DialogHeader>

        <ScrollArea className="min-h-0 flex-1">{body}</ScrollArea>
      </DialogContent>
    </Dialog>
  )
}
