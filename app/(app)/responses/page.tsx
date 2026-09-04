'use client'

import { useMemo, useState } from 'react'
import {
  BellRing,
  Bus,
  CalendarDays,
  CheckCircle2,
  Clock,
  Download,
  Filter,
  Inbox,
  Loader2,
  MessageSquare,
  Phone,
  Search,
  Send,
  SlidersHorizontal,
  Users,
  XCircle,
} from 'lucide-react'
import { PageHeader, StatCard, StatusBadge } from '@/components/common'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useEvents, useSmsNotifications, useNotificationActions } from '@/lib/events/hooks'
import { useParticipants } from '@/lib/participant/hooks'
import { formatMonthDayYear, formatMonthDayYearTime } from '@/lib/date'
import { cn, findById, firstLetterInitials } from '@/lib/utils'
import { tableHeaderRow } from '@/components/aurora/aurora-ui';
import { PartResponseConfig } from '@/lib/responses/config';
import { SmsNotification } from '@/lib/notification/types';
import { DeliveryFilter, PartResponseRow, ResponseFilter } from '@/lib/responses/types';
import { NotificationUtils } from '@/lib/notification/utils';
import { PartResponseUtils } from '@/lib/responses/utils';
import { useTranslation } from '@/components/context/language-provider';
import { ParticipantConfig } from '@/lib/participant/config';

/** Section label inside the left filter rail. */
function RailLabel({ icon: Icon, children }: { icon: React.ElementType; children: React.ReactNode }) {
  return (
    <span className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
      <Icon className="size-3.5" />
      {children}
    </span>
  )
}

/** Styled native select used for the long event list in the rail. */
function RailSelect<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T
  onChange: (v: T) => void
  options: { value: T; label: string }[]
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as T)}
      className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground shadow-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40"
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  )
}

/** Vertical segmented pill list; the active option glows in the accent color. */
function PillGroup<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T
  onChange: (v: T) => void
  options: { value: T; label: string; count?: number; dot?: string }[]
}) {
  return (
    <div className="flex flex-col gap-1">
      {options.map((o) => {
        const active = o.value === value
        return (
          <button
            key={o.value}
            type="button"
            onClick={() => onChange(o.value)}
            className={cn(
              'flex items-center justify-between gap-2 rounded-lg border px-3 py-2 text-left text-sm transition-colors',
              active
                ? 'border-primary/40 bg-primary/10 font-medium text-primary shadow-sm'
                : 'border-transparent text-foreground hover:bg-muted',
            )}
          >
            <span className="flex min-w-0 items-center gap-2">
              {o.dot ? <span className={cn('size-2 shrink-0 rounded-full', o.dot)} /> : null}
              <span className="truncate">{o.label}</span>
            </span>
            {typeof o.count === 'number' ? (
              <span
                className={cn(
                  'shrink-0 rounded-full px-1.5 py-0.5 text-[11px] font-semibold tabular-nums',
                  active ? 'bg-primary/15 text-primary' : 'bg-muted text-muted-foreground',
                )}
              >
                {o.count}
              </span>
            ) : null}
          </button>
        )
      })}
    </div>
  )
}

export default function ResponsesPage() {
  const { events } = useEvents()
  const { smsNotifications } = useSmsNotifications(events)
  const { participants } = useParticipants()
  const { sendEventNotifications, assignTransport, processDueReminders } = useNotificationActions()
  const {t} = useTranslation()
  const [eventFilter, setEventFilter] = useState<string>('all')
  const [responseFilter, setResponseFilter] = useState<ResponseFilter>('all')
  const [deliveryFilter, setDeliveryFilter] = useState<DeliveryFilter>('all')
  const [query, setQuery] = useState('')
  const [sending, setSending] = useState(false)
  const [assigning, setAssigning] = useState(false)
  const [processingReminders, setProcessingReminders] = useState(false)
  const [banner, setBanner] = useState<{ tone: 'success' | 'error'; text: string } | null>(null)

  const eventOptions = useMemo(() => {
    const opts = [...events]
      .sort((a, b) => (a.date < b.date ? 1 : -1))
      .map((e) => ({ value: e.id, label: `${e.name} · ${formatMonthDayYear(e.date)}` }))
    return [{ value: 'all', label: t('resp.allevents') }, ...opts]
  }, [events, t])

  const notifIndex = useMemo(() => {
    const map = new Map<string, SmsNotification>()
    for (const n of smsNotifications) map.set(`${n.eventId}:${n.participantId}`, n)
    return map
  }, [smsNotifications])

  const scopedRows = useMemo<PartResponseRow[]>(() => {
    const scopedEvents =
      eventFilter === 'all' ? events : events.filter((e) => e.id === eventFilter)
    const rows: PartResponseRow[] = []
    for (const event of scopedEvents) {
      for (const pid of event.participantIds) {
        const participant = findById(participants, pid)
        if (!participant) continue
        rows.push({
          key: `${event.id}:${pid}`,
          participant,
          event,
          notif: notifIndex.get(`${event.id}:${pid}`) ?? null,
        })
      }
    }

    return rows
  }, [eventFilter, events, participants, notifIndex])

  // Stats reflect the selected event scope, independent of the row filters.
  const stats = useMemo(() => {
    const s = {
      total: scopedRows.length,
      sent: 0,
      delivered: 0,
      pending: 0,
      failed: 0,
      needTransport: 0,
      attendingSelf: 0,
      notAttending: 0,
      noResponse: 0,
    }
    for (const { notif } of scopedRows) {
      if (notif) {
        s.sent += 1
        if (notif.deliveryStatus === 'delivered' || notif.deliveryStatus === 'received') s.delivered += 1
        if (notif.deliveryStatus === 'queued' || notif.deliveryStatus === 'sent') s.pending += 1
        if (notif.deliveryStatus === 'failed' || notif.deliveryStatus === 'undelivered') s.failed += 1
      }
      switch (notif?.response) {
        case 'attending_transport':
          s.needTransport += 1
          break
        case 'attending_self':
          s.attendingSelf += 1
          break
        case 'not_attending':
          s.notAttending += 1
          break
        default:
          s.noResponse += 1
      }
    }
    return s
  }, [scopedRows])

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase()
    return scopedRows
      .filter(({ notif }) => {
        if (responseFilter === 'all') return true
        if (responseFilter === 'none') return !notif?.response
        return notif?.response === responseFilter
      })
      .filter(({ notif }) => {
        if (deliveryFilter === 'all') return true
        if (!notif) return false
        const d = notif.deliveryStatus
        if (deliveryFilter === 'delivered') return d === 'delivered' || d === 'received'
        if (deliveryFilter === 'replied') return d === 'received' || Boolean(notif.response)
        if (deliveryFilter === 'pending') return d === 'queued' || d === 'sent'
        if (deliveryFilter === 'failed') return d === 'failed' || d === 'undelivered'
        return true
      })
      .filter(({ participant }) => {
        if (!q) return true
        return (
          participant.name.toLowerCase().includes(q) ||
          participant.phone.toLowerCase().includes(q)
        )
      })
      .map((row, idx) => ({
      ...row,
      idx: idx + 1,
    }))
  }, [scopedRows, responseFilter, deliveryFilter, query])

  // Counts per response filter, so the rail pills can show live badges.
  const responseOptions = useMemo(
    () => [
      { value: 'all' as ResponseFilter, label: t('resp.allresponses'), count: stats.total },
      { value: 'attending_transport' as ResponseFilter, label: t('resp.needstransport'), count: stats.needTransport, dot: 'bg-primary' },
      { value: 'attending_self' as ResponseFilter, label: t('e.owntransport'), count: stats.attendingSelf, dot: 'bg-success' },
      { value: 'not_attending' as ResponseFilter, label: t('e.notattending'), count: stats.notAttending, dot: 'bg-destructive' },
      { value: 'none' as ResponseFilter, label: t('e.noresponse'), count: stats.noResponse, dot: 'bg-muted-foreground' },
    ],
    [stats, t],
  )

  const deliveryOptions = useMemo(
    () => [
      { value: 'all' as DeliveryFilter, label: t('resp.alldelivery') },
      { value: 'delivered' as DeliveryFilter, label: t('common.delivered'), dot: 'bg-success' },
      { value: 'replied' as DeliveryFilter, label: t('resp.replied'), dot: 'bg-primary' },
      { value: 'pending' as DeliveryFilter, label: t('e.pending'), dot: 'bg-warning' },
      { value: 'failed' as DeliveryFilter, label: t('e.failed'), dot: 'bg-destructive' },
    ],
    [t],
  )

  const activeFilterCount =
    (eventFilter !== 'all' ? 1 : 0) +
    (responseFilter !== 'all' ? 1 : 0) +
    (deliveryFilter !== 'all' ? 1 : 0) +
    (query.trim() ? 1 : 0)

  function resetFilters() {
    setEventFilter('all')
    setResponseFilter('all')
    setDeliveryFilter('all')
    setQuery('')
  }

  const singleEvent = eventFilter === 'all' ? null : events.find((e) => e.id === eventFilter) ?? null

  async function handleSend() {
    if (!singleEvent) return
    setSending(true)
    setBanner(null)
    try {
      const result = await sendEventNotifications(singleEvent.id)
      setBanner({ tone: result.sent > 0 ? 'success' : 'error', text: result.message })
    } catch (err) {
      setBanner({ tone: 'error', text: (err as Error).message })
    } finally {
      setSending(false)
    }
  }

  async function handleAssign() {
    if (!singleEvent) return
    setAssigning(true)
    setBanner(null)
    try {
      const { assigned } = await assignTransport(singleEvent.id)
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

  async function handleProcessReminders() {
    setProcessingReminders(true)
    setBanner(null)
    try {
      const result = await processDueReminders()
      const text = t('resp.remindersprocessed')
        .replace('{{fired}}', String(result.reminders))
        .replace('{{events}}', String(result.processedEvents))
      setBanner({ tone: result.reminders > 0 ? 'success' : 'error', text })
    } catch (err) {
      setBanner({ tone: 'error', text: (err as Error).message })
    } finally {
      setProcessingReminders(false)
    }
  }

  function exportResponses() {
    const header = [t('common.participant'), t('e.event'), t('common.date'), t('common.phone'), t('resp.delivery'), t('resp.response'), t('e.respondedat')]
    const data = rows.map(({ participant, event, notif }) => [
      participant.name,
      event.name,
      formatMonthDayYear(event.date),
      participant.phone,
      notif ? PartResponseConfig.deliveryMeta[notif.deliveryStatus]?.label ?? notif.deliveryStatus : t('e.notsent'),
      notif?.response ? t(PartResponseConfig.RESPONSE_META[notif.response].label) : t('e.noresponse'),
      notif?.respondedAt ? formatMonthDayYearTime(notif.respondedAt) : '',
    ])
    PartResponseUtils.downloadCsv('sms-responses.csv', [header, ...data])
  }

  function exportTransportList() {
    const header = [t('common.participant'), t('e.event'), t('common.date'), t('common.phone'), t('common.address'), t('common.mobility'), t('e.pickupwindow')]
    const data = rows
      .filter(({ notif }) => notif?.response === 'attending_transport')
      .map(({ participant, event }) => [
        participant.name,
        event.name,
        formatMonthDayYear(event.date),
        participant.phone,
        participant.address,
      ])
    PartResponseUtils.downloadCsv('transport-requests.csv', [header, ...data])
  }

  return (
    <div className="flex min-h-full flex-col">
      <PageHeader
        title={'Event Responses'}
        description={t('resp.desc')}
        actions={
          <>
            <Button variant="outline" size="sm" onClick={handleProcessReminders} disabled={processingReminders}>
              {processingReminders ? <Loader2 className="size-4 animate-spin" /> : <BellRing className="size-4" />}
              {t('resp.processreminders')}
            </Button>
            <Button variant="outline" size="sm" onClick={exportResponses} disabled={rows.length === 0}>
              <Download className="size-4" /> {t('common.export')}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={exportTransportList}
              disabled={stats.needTransport === 0}
            >
              <Bus className="size-4" /> {t('e.transportlist')}
            </Button>
          </>
        }
      />

      <div className="flex-1 p-4 sm:p-6">
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[280px_minmax(0,1fr)]">
          {/* Left filter rail */}
          <aside className="lg:sticky lg:top-6 lg:self-start">
            <Card className="overflow-hidden p-0">
              <div className="flex items-center justify-between gap-2 border-b border-border bg-linear-to-br from-primary/10 to-accent/10 px-4 py-3">
                <span className="flex items-center gap-2 text-sm font-semibold">
                  <SlidersHorizontal className="size-4 text-primary" />
                  {t('common.filters')}
                </span>
                {activeFilterCount > 0 ? (
                  <button
                    type="button"
                    onClick={resetFilters}
                    className="rounded-full bg-background/70 px-2 py-0.5 text-[11px] font-medium text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {t('common.clear')} ({activeFilterCount})
                  </button>
                ) : null}
              </div>

              <div className="space-y-5 p-4">
                <div>
                  <RailLabel icon={Search}>{t('common.search')}</RailLabel>
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder={t('resp.nameorphone')}
                      className="pl-9"
                    />
                  </div>
                </div>

                <div>
                  <RailLabel icon={CalendarDays}>{t('e.event')}</RailLabel>
                  <RailSelect value={eventFilter} onChange={setEventFilter} options={eventOptions} />
                </div>

                <div>
                  <RailLabel icon={MessageSquare}>{t('resp.response')}</RailLabel>
                  <PillGroup value={responseFilter} onChange={setResponseFilter} options={responseOptions} />
                </div>

                <div>
                  <RailLabel icon={Filter}>{t('resp.delivery')}</RailLabel>
                  <PillGroup value={deliveryFilter} onChange={setDeliveryFilter} options={deliveryOptions} />
                </div>
              </div>

              {/* Per-event actions appear when a single event is selected */}
              {singleEvent ? (
                <div className="space-y-2 border-t border-border p-4">
                  <span
                    className={cn(
                      'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium',
                      NotificationUtils.isResponseWindowOpen(singleEvent)
                        ? 'bg-success/15 text-success'
                        : 'bg-muted text-muted-foreground',
                    )}
                  >
                    <span
                      className={cn(
                        'size-1.5 rounded-full',
                        NotificationUtils.isResponseWindowOpen(singleEvent) ? 'bg-success' : 'bg-muted-foreground',
                      )}
                    />
                    {NotificationUtils.isResponseWindowOpen(singleEvent) ? t('e.responsesopen') : t('e.responsesclosed')}
                  </span>
                  <Button size="sm" className="w-full" onClick={handleSend} disabled={sending}>
                    {sending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
                    {stats.sent > 0 ? t('e.resendsms') : t('e.sendsmsto').replace('{{count}}', String(stats.total))}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full"
                    onClick={handleAssign}
                    disabled={assigning || stats.needTransport === 0}
                  >
                    {assigning ? <Loader2 className="size-4 animate-spin" /> : <Bus className="size-4" />}
                    {t('e.assigntransport')} ({stats.needTransport})
                  </Button>
                </div>
              ) : null}
            </Card>
          </aside>

          {/* Main content */}
          <div className="min-w-0 space-y-5">
            {/* Summary stats */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <StatCard label={t('notif.notifications')} value={stats.sent} icon={MessageSquare} hint={`${stats.total} ${t('resp.onroster')}`} />
              <StatCard label={t('common.delivered')} value={stats.delivered} icon={CheckCircle2} tone="success" />
              <StatCard label={t('resp.needstransport')} value={stats.needTransport} icon={Bus} tone="primary" />
              <StatCard label={t('e.owntransport')} value={stats.attendingSelf} icon={CheckCircle2} tone="success" />
              <StatCard label={t('e.notattending')} value={stats.notAttending} icon={XCircle} tone="danger" />
              <StatCard label={t('e.noresponse')} value={stats.noResponse} icon={Users} tone="warning" />
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
                {banner.tone === 'success' ? <CheckCircle2 className="size-4" /> : <XCircle className="size-4" />}
                <span>{banner.text}</span>
              </div>
            ) : null}

            {/* Response table */}
            <Card className="overflow-hidden p-0">
          {rows.length === 0 ? (
            <div className="flex flex-col items-center gap-3 px-6 py-16 text-center">
              <div className="flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
                <Inbox className="size-6" />
              </div>
              <div>
                <p className="text-sm font-medium">{t('resp.noresponses')}</p>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  {t('resp.sendsmshint')}
                </p>
              </div>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  {tableHeaderRow([t('common.sno'),t('common.participant'), t('e.event'), t('resp.contact'), t('resp.delivery'), t('resp.response'), t('resp.responded')])}
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map(({ key, participant, event, notif, idx }) => (
                  <TableRow key={key}>
                    <TableCell>
                      <p className="font-medium text-center">{idx}</p>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2.5">
                        <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[11px] font-semibold text-primary">
                          {firstLetterInitials(participant.name)}
                        </span>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">{participant.name}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <p className="text-sm">{event.name}</p>
                      <p className="text-xs text-muted-foreground">{formatMonthDayYear(event.date)}</p>
                    </TableCell>
                    <TableCell>
                      <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
                        <Phone className="size-3.5" />
                        {participant.phone || '—'}
                      </span>
                    </TableCell>
                    <TableCell>
                      {notif ? (
                        <StatusBadge
                          label={t(PartResponseConfig.deliveryMeta[notif.deliveryStatus]?.label) ?? notif.deliveryStatus}
                          cls={PartResponseConfig.deliveryMeta[notif.deliveryStatus]?.cls ?? 'bg-muted text-muted-foreground'}
                        />
                      ) : (
                        <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
                          {t('e.notsent')}
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      {notif?.response ? (
                        <StatusBadge label={t(PartResponseConfig.RESPONSE_META[notif.response].short)} cls={PartResponseConfig.RESPONSE_META[notif.response].cls} />
                      ) : (
                        <span className="text-[11px] text-muted-foreground">{t('resp.noresponsebadge')}</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                        {notif?.respondedAt ? (
                          <>
                            <Clock className="size-3.5" />
                            {formatMonthDayYearTime(notif.respondedAt)}
                          </>
                        ) : (
                          '—'
                        )}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
