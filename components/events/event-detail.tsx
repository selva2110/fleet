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
import { useCenters, useSmsNotifications, useNotificationActions } from '@/lib/events/hooks'
import { useParticipants } from '@/lib/participant/hooks'
import { formatMonthDayYear, formatMonthDayYearTime, formatTimeOfDay } from '@/lib/date'
import { cn, findById } from '@/lib/utils'
import { PartResponseConfig } from '@/lib/responses/config';
import { ParticipantConfig } from '@/lib/participant/config';
import { EventsConfig } from '@/lib/events/config';
import { Participant } from '@/lib/participant/types';
import { FleetEvent } from '@/lib/events/types';
import { SmsNotification } from '@/lib/notification/types';
import { NotificationUtils } from '@/lib/notification/utils';
import { EventUtils } from '@/lib/events/utils';
import { useTranslation } from '../context/language-provider';

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
  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2.5">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
          {label}
        </span>
        <span className="text-muted-foreground">{icon}</span>
      </div>
      <p className={cn('mt-1 text-2xl font-semibold tabular-nums', EventsConfig.toneCls[tone])}>{value}</p>
    </div>
  )
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
  const { centers } = useCenters()
  const { participants } = useParticipants()
  const { smsNotifications } = useSmsNotifications(useMemo(() => (event ? [event] : []), [event]))
  const { sendEventNotifications, assignTransport } = useNotificationActions()
  const {t} = useTranslation()
  const [expanded, setExpanded] = useState<string | null>(null)
  const [sending, setSending] = useState(false)
  const [assigning, setAssigning] = useState(false)
  const [banner, setBanner] = useState<{ tone: 'success' | 'error'; text: string } | null>(null)

  const center = findById(centers, event?.centerId)

  const notifByParticipant = useMemo(() => {
    const map = new Map<string, SmsNotification>()
    if (!event) return map
    for (const n of smsNotifications) {
      if (n.eventId === event.id) map.set(n.participantId, n)
    }
    return map
  }, [smsNotifications, event])

  const roster = useMemo<Participant[]>(() => {
    if (!event) return []
    const participantIds = Array.isArray(event.participantIds) ? event.participantIds : []
    return participantIds
      .map((id) => findById(participants, id))
      .filter((p): p is Participant => Boolean(p))
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [event, participants])

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

  const windowOpen = NotificationUtils.isResponseWindowOpen(event)
  const cutoff = NotificationUtils.responseCutoff(event)

  async function handleSend() {
    if (!event) return
    setSending(true)
    setBanner(null)
    try {
      const result = await sendEventNotifications(event.id)
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
      const { assigned } = await assignTransport(event.id)
      setBanner({
        tone: 'success',
        text: t('e.queuedtransport')
          .replace('{{count}}', String(assigned))
          .replace('{{suffix}}', assigned === 1 ? '' : 's'),
      })
    } catch (err) {
      setBanner({ tone: 'error', text: (err as Error).message })
    } finally {
      setAssigning(false)
    }
  }

  function exportResponses() {
    if (!event) return
    const header = [t('common.name'), t('common.phone'), t('resp.delivery'), t('resp.response'), t('e.respondedat'), t('common.mobility'), t('common.priority')]
    const rows = roster.map((p) => {
      const n = notifByParticipant.get(p.id)
      return [
        p.name,
        p.phone,
        n ? t(PartResponseConfig.deliveryMeta[n.deliveryStatus]?.label) ?? n.deliveryStatus : t('e.notsent'),
        n?.response ? t(PartResponseConfig.RESPONSE_META[n.response].label) : t('e.noresponse'),
        n?.respondedAt ? formatMonthDayYearTime(n.respondedAt) : '',
      ]
    })
    EventUtils.downloadCsv(`${event.name.replace(/\s+/g, '-')}-responses.csv`, [header, ...rows])
  }

  function exportTransportRequests() {
    if (!event) return
    const header = [t('common.name'), t('common.phone'), t('common.address')]
    const rows = roster
      .filter((p) => notifByParticipant.get(p.id)?.response === 'attending_transport')
      .map((p) => [p.name, p.phone, p.address])
    EventUtils.downloadCsv(`${event.name.replace(/\s+/g, '-')}-transport-requests.csv`, [header, ...rows])
  }

  const metaRow = (
    <>
      <span className="inline-flex items-center gap-1">
        <MapPin className="size-3.5" /> {center?.name ?? t('e.nocenter')}
      </span>
      <span className="inline-flex items-center gap-1">
        <Clock className="size-3.5" /> {formatMonthDayYear(event.date)} · {formatTimeOfDay(event.startTime)}–{formatTimeOfDay(event.endTime)}
      </span>
      <span>{t(EventsConfig.TYPE_OPTION_LABELS[event.type])}</span>
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
        {windowOpen ? t('e.responsesopen') : t('e.responsesclosed')}
      </span>
      {cutoff ? (
        <span className="text-xs text-muted-foreground">
          {t('e.cutoff')} {formatMonthDayYearTime(cutoff.toISOString())}
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
                {stats.sent > 0 ? t('e.resendsms') : t('e.sendsmsto').replace('{{count}}', String(stats.total))}
              </Button>
              <Button onClick={handleAssign} disabled={assigning || stats.needTransport === 0} size="sm" variant="outline">
                {assigning ? <Loader2 className="size-4 animate-spin" /> : <Bus className="size-4" />}
                {t('e.assigntransport')} ({stats.needTransport})
              </Button>
              <Button onClick={exportResponses} size="sm" variant="outline">
                <Download className="size-4" /> {t('e.exportresponses')}
              </Button>
              <Button onClick={exportTransportRequests} size="sm" variant="ghost" disabled={stats.needTransport === 0}>
                <Download className="size-4" /> {t('e.transportlist')}
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
                {t('e.notificationdelivery')}
              </h3>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                <StatCard label={t('e.sent')} value={stats.sent} icon={<MessageSquare className="size-3.5" />} />
                <StatCard label={t('common.delivered')} value={stats.delivered} icon={<CheckCircle2 className="size-3.5" />} tone="success" />
                <StatCard label={t('e.pending')} value={stats.pending} icon={<Clock className="size-3.5" />} tone="warning" />
                <StatCard label={t('e.failed')} value={stats.failed} icon={<XCircle className="size-3.5" />} tone="danger" />
              </div>
            </div>

            {/* Response stats */}
            <div>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {t('e.attendanceresponses')}
              </h3>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                <StatCard label={t('e.needtransport')} value={stats.needTransport} icon={<Bus className="size-3.5" />} tone="primary" />
                <StatCard label={t('e.owntransport')} value={stats.attendingSelf} icon={<CheckCircle2 className="size-3.5" />} tone="success" />
                <StatCard label={t('e.notattending')} value={stats.notAttending} icon={<XCircle className="size-3.5" />} tone="danger" />
                <StatCard label={t('e.noresponse')} value={stats.noResponse} icon={<Users className="size-3.5" />} />
              </div>
            </div>

            {/* Participant list */}
            <div>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {t('common.participants')} ({roster.length})
              </h3>
              {roster.length === 0 ? (
                <p className="rounded-md border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">
                  {t('e.noroster')}
                </p>
              ) : (
                <ul className="divide-y divide-border overflow-hidden rounded-lg border border-border">
                  {roster.map((p) => {
                    const n = notifByParticipant.get(p.id)
                    const isOpen = expanded === p.id
                    const activeConstraints = Object.entries(p.constraints)
                      .filter(([, v]) => v)
                      .map(([k]) => t(ParticipantConfig.CONSTRAINT_LABELS[k]) ?? k)
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
                          </div>
                          {n?.response ? (
                            <StatusBadge label={t(PartResponseConfig.RESPONSE_META[n.response].short)} cls={PartResponseConfig.RESPONSE_META[n.response].cls} />
                          ) : (
                            <span className="text-[11px] text-muted-foreground">{t('e.noreply')}</span>
                          )}
                          {n ? (
                            <StatusBadge
                              label={t(PartResponseConfig.deliveryMeta[n.deliveryStatus]?.label) ?? n.deliveryStatus}
                              cls={PartResponseConfig.deliveryMeta[n.deliveryStatus]?.cls ?? 'bg-muted text-muted-foreground'}
                            />
                          ) : (
                            <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
                              {t('e.notsent')}
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
                                <span>{p.phone || t('e.nophone')}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <MapPin className="size-3.5 text-muted-foreground" />
                                <span className="truncate">{p.address || t('e.noaddress')}</span>
                              </div>
                              <div className="sm:col-span-2">
                                <dt className="text-xs text-muted-foreground">{t('e.transportconstraints')}</dt>
                                <dd className="mt-1 flex flex-wrap gap-1">
                                  {activeConstraints.length ? (
                                    activeConstraints.map((c) => (
                                      <span key={c} className="rounded-full bg-secondary px-2 py-0.5 text-xs text-secondary-foreground">
                                        {c}
                                      </span>
                                    ))
                                  ) : (
                                    <span className="text-muted-foreground">{t('e.nonelabel')}</span>
                                  )}
                                </dd>
                              </div>
                              {p.medicalNotes ? (
                                <div className="sm:col-span-2">
                                  <dt className="text-xs text-muted-foreground">{t('part.medicalNotes')}</dt>
                                  <dd className="text-pretty">{p.medicalNotes}</dd>
                                </div>
                              ) : null}
                              <div className="sm:col-span-2 rounded-md border border-border bg-card px-3 py-2">
                                <dt className="mb-1 text-xs font-medium text-muted-foreground">{t('e.smsstatus')}</dt>
                                <dd className="space-y-0.5 text-xs">
                                  {n ? (
                                    <>
                                      <p>
                                        {t('e.deliverylabel')}{' '}
                                        <span className="font-medium">
                                          {t(PartResponseConfig.deliveryMeta[n.deliveryStatus]?.label) ?? n.deliveryStatus}
                                        </span>
                                        {n.sentAt ? ` · ${t('e.sent')} ${formatMonthDayYearTime(n.sentAt)}` : ''}
                                      </p>
                                      <p>
                                        {t('e.responselabel')}{' '}
                                        <span className="font-medium">
                                          {n.response ? t(PartResponseConfig.RESPONSE_META[n.response].label) : t('e.awaitingreply')}
                                        </span>
                                        {n.respondedAt ? ` · ${formatMonthDayYearTime(n.respondedAt)}` : ''}
                                      </p>
                                    </>
                                  ) : (
                                    <p className="text-muted-foreground">{t('e.nonotification')}</p>
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
            aria-label={t('e.closedetails')}
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
