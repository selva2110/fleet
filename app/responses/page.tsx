'use client'

import { useMemo, useState } from 'react'
import {
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
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useFleet } from '@/lib/store'
import { formatMonthDayYear, formatMonthDayYearTime } from '@/lib/date'
import { RESPONSE_META, isResponseWindowOpen } from '@/lib/notifications'
import { cn } from '@/lib/utils'
import type { FleetEvent, Participant, SmsNotification, SmsResponseCode } from '@/lib/types'

const deliveryMeta: Record<string, { label: string; cls: string }> = {
  queued: { label: 'Queued', cls: 'bg-muted text-muted-foreground' },
  sent: { label: 'Sent', cls: 'bg-accent text-accent-foreground' },
  delivered: { label: 'Delivered', cls: 'bg-success/20 text-success' },
  received: { label: 'Replied', cls: 'bg-primary/15 text-primary' },
  undelivered: { label: 'Undelivered', cls: 'bg-warning/20 text-warning-foreground' },
  failed: { label: 'Failed', cls: 'bg-destructive/15 text-destructive' },
}

type ResponseFilter = 'all' | SmsResponseCode | 'none'
type DeliveryFilter = 'all' | 'delivered' | 'pending' | 'failed' | 'replied'

interface Row {
  key: string
  participant: Participant
  event: FleetEvent
  notif: SmsNotification | null
}

function initials(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('')
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
  const fleet = useFleet()
  const [eventFilter, setEventFilter] = useState<string>('all')
  const [responseFilter, setResponseFilter] = useState<ResponseFilter>('all')
  const [deliveryFilter, setDeliveryFilter] = useState<DeliveryFilter>('all')
  const [query, setQuery] = useState('')
  const [sending, setSending] = useState(false)
  const [assigning, setAssigning] = useState(false)
  const [banner, setBanner] = useState<{ tone: 'success' | 'error'; text: string } | null>(null)

  // Events that actually have a roster, most recent first, for the event filter.
  const eventOptions = useMemo(() => {
    const opts = [...fleet.events]
      .sort((a, b) => (a.date < b.date ? 1 : -1))
      .map((e) => ({ value: e.id, label: `${e.name} · ${formatMonthDayYear(e.date)}` }))
    return [{ value: 'all', label: 'All events' }, ...opts]
  }, [fleet.events])

  // Fast lookup of notifications by event+participant.
  const notifIndex = useMemo(() => {
    const map = new Map<string, SmsNotification>()
    for (const n of fleet.smsNotifications) map.set(`${n.eventId}:${n.participantId}`, n)
    return map
  }, [fleet.smsNotifications])

  // Build one row per participant on each event's roster (scoped to the
  // selected event), attaching their latest SMS notification if present.
  const scopedRows = useMemo<Row[]>(() => {
    const events =
      eventFilter === 'all' ? fleet.events : fleet.events.filter((e) => e.id === eventFilter)
    const rows: Row[] = []
    for (const event of events) {
      for (const pid of event.participantIds) {
        const participant = fleet.participantById(pid)
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
  }, [eventFilter, fleet, notifIndex])

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
      .sort((a, b) => {
        // Most recently responded first, then by participant name.
        const at = a.notif?.respondedAt ?? ''
        const bt = b.notif?.respondedAt ?? ''
        if (at !== bt) return at < bt ? 1 : -1
        return a.participant.name.localeCompare(b.participant.name)
      })
  }, [scopedRows, responseFilter, deliveryFilter, query])

  // Counts per response filter, so the rail pills can show live badges.
  const responseOptions = useMemo(
    () => [
      { value: 'all' as ResponseFilter, label: 'All responses', count: stats.total },
      { value: 'attending_transport' as ResponseFilter, label: 'Needs transport', count: stats.needTransport, dot: 'bg-primary' },
      { value: 'attending_self' as ResponseFilter, label: 'Own transport', count: stats.attendingSelf, dot: 'bg-success' },
      { value: 'not_attending' as ResponseFilter, label: 'Not attending', count: stats.notAttending, dot: 'bg-destructive' },
      { value: 'none' as ResponseFilter, label: 'No response', count: stats.noResponse, dot: 'bg-muted-foreground' },
    ],
    [stats],
  )

  const deliveryOptions = useMemo(
    () => [
      { value: 'all' as DeliveryFilter, label: 'All delivery' },
      { value: 'delivered' as DeliveryFilter, label: 'Delivered', dot: 'bg-success' },
      { value: 'replied' as DeliveryFilter, label: 'Replied', dot: 'bg-primary' },
      { value: 'pending' as DeliveryFilter, label: 'Pending', dot: 'bg-warning' },
      { value: 'failed' as DeliveryFilter, label: 'Failed', dot: 'bg-destructive' },
    ],
    [],
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

  const singleEvent = eventFilter === 'all' ? null : fleet.events.find((e) => e.id === eventFilter) ?? null

  async function handleSend() {
    if (!singleEvent) return
    setSending(true)
    setBanner(null)
    try {
      const result = await fleet.sendEventNotifications(singleEvent.id)
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
      const { assigned } = await fleet.assignTransport(singleEvent.id)
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
    const header = ['Participant', 'Event', 'Date', 'Phone', 'Delivery', 'Response', 'Responded at']
    const data = rows.map(({ participant, event, notif }) => [
      participant.name,
      event.name,
      formatMonthDayYear(event.date),
      participant.phone,
      notif ? deliveryMeta[notif.deliveryStatus]?.label ?? notif.deliveryStatus : 'Not sent',
      notif?.response ? RESPONSE_META[notif.response].label : 'No response',
      notif?.respondedAt ? formatMonthDayYearTime(notif.respondedAt) : '',
    ])
    downloadCsv('sms-responses.csv', [header, ...data])
  }

  function exportTransportList() {
    const header = ['Participant', 'Event', 'Date', 'Phone', 'Address', 'Mobility', 'Pickup window']
    const data = rows
      .filter(({ notif }) => notif?.response === 'attending_transport')
      .map(({ participant, event }) => [
        participant.name,
        event.name,
        formatMonthDayYear(event.date),
        participant.phone,
        participant.address,
        participant.mobilityLevel,
        participant.pickupWindow,
      ])
    downloadCsv('transport-requests.csv', [header, ...data])
  }

  return (
    <div className="flex min-h-full flex-col">
      <PageHeader
        title="SMS Responses"
        description="Live participant replies to program notifications, with transport planning tools."
        actions={
          <>
            <Button variant="outline" size="sm" onClick={exportResponses} disabled={rows.length === 0}>
              <Download className="size-4" /> Export
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={exportTransportList}
              disabled={stats.needTransport === 0}
            >
              <Bus className="size-4" /> Transport list
            </Button>
          </>
        }
      />

      <div className="flex-1 p-4 sm:p-6">
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[280px_minmax(0,1fr)]">
          {/* Left filter rail */}
          <aside className="lg:sticky lg:top-6 lg:self-start">
            <Card className="overflow-hidden p-0">
              <div className="flex items-center justify-between gap-2 border-b border-border bg-gradient-to-br from-primary/10 to-accent/10 px-4 py-3">
                <span className="flex items-center gap-2 text-sm font-semibold">
                  <SlidersHorizontal className="size-4 text-primary" />
                  Filters
                </span>
                {activeFilterCount > 0 ? (
                  <button
                    type="button"
                    onClick={resetFilters}
                    className="rounded-full bg-background/70 px-2 py-0.5 text-[11px] font-medium text-muted-foreground transition-colors hover:text-foreground"
                  >
                    Clear ({activeFilterCount})
                  </button>
                ) : null}
              </div>

              <div className="space-y-5 p-4">
                <div>
                  <RailLabel icon={Search}>Search</RailLabel>
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder="Name or phone"
                      className="pl-9"
                    />
                  </div>
                </div>

                <div>
                  <RailLabel icon={CalendarDays}>Event</RailLabel>
                  <RailSelect value={eventFilter} onChange={setEventFilter} options={eventOptions} />
                </div>

                <div>
                  <RailLabel icon={MessageSquare}>Response</RailLabel>
                  <PillGroup value={responseFilter} onChange={setResponseFilter} options={responseOptions} />
                </div>

                <div>
                  <RailLabel icon={Filter}>Delivery</RailLabel>
                  <PillGroup value={deliveryFilter} onChange={setDeliveryFilter} options={deliveryOptions} />
                </div>
              </div>

              {/* Per-event actions appear when a single event is selected */}
              {singleEvent ? (
                <div className="space-y-2 border-t border-border p-4">
                  <span
                    className={cn(
                      'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium',
                      isResponseWindowOpen(singleEvent)
                        ? 'bg-success/15 text-success'
                        : 'bg-muted text-muted-foreground',
                    )}
                  >
                    <span
                      className={cn(
                        'size-1.5 rounded-full',
                        isResponseWindowOpen(singleEvent) ? 'bg-success' : 'bg-muted-foreground',
                      )}
                    />
                    {isResponseWindowOpen(singleEvent) ? 'Responses open' : 'Responses closed'}
                  </span>
                  <Button size="sm" className="w-full" onClick={handleSend} disabled={sending}>
                    {sending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
                    {stats.sent > 0 ? 'Resend SMS' : `Send SMS to ${stats.total}`}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full"
                    onClick={handleAssign}
                    disabled={assigning || stats.needTransport === 0}
                  >
                    {assigning ? <Loader2 className="size-4 animate-spin" /> : <Bus className="size-4" />}
                    Assign transport ({stats.needTransport})
                  </Button>
                </div>
              ) : null}
            </Card>
          </aside>

          {/* Main content */}
          <div className="min-w-0 space-y-5">
            {/* Summary stats */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <StatCard label="Notifications" value={stats.sent} icon={MessageSquare} hint={`${stats.total} on roster`} />
              <StatCard label="Delivered" value={stats.delivered} icon={CheckCircle2} tone="success" />
              <StatCard label="Needs transport" value={stats.needTransport} icon={Bus} tone="primary" />
              <StatCard label="Own transport" value={stats.attendingSelf} icon={CheckCircle2} tone="success" />
              <StatCard label="Not attending" value={stats.notAttending} icon={XCircle} tone="danger" />
              <StatCard label="No response" value={stats.noResponse} icon={Users} tone="warning" />
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
                <p className="text-sm font-medium">No responses to show</p>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  Send SMS notifications from an event to start collecting replies.
                </p>
              </div>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Participant</TableHead>
                  <TableHead>Event</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Delivery</TableHead>
                  <TableHead>Response</TableHead>
                  <TableHead>Responded</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map(({ key, participant, event, notif }) => (
                  <TableRow key={key}>
                    <TableCell>
                      <div className="flex items-center gap-2.5">
                        <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[11px] font-semibold text-primary">
                          {initials(participant.name)}
                        </span>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">{participant.name}</p>
                          <p className="truncate text-xs capitalize text-muted-foreground">
                            {participant.mobilityLevel} · {participant.medicalPriority}
                          </p>
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
                          label={deliveryMeta[notif.deliveryStatus]?.label ?? notif.deliveryStatus}
                          cls={deliveryMeta[notif.deliveryStatus]?.cls ?? 'bg-muted text-muted-foreground'}
                        />
                      ) : (
                        <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
                          Not sent
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      {notif?.response ? (
                        <StatusBadge label={RESPONSE_META[notif.response].short} cls={RESPONSE_META[notif.response].cls} />
                      ) : (
                        <span className="text-[11px] text-muted-foreground">No reply</span>
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
