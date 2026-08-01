'use client'

import { Fragment, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { CalendarDays, Clock, MapPin, Plus, Repeat, Sparkles, UtensilsCrossed, Users } from 'lucide-react'
import { MealDeliveryTab } from '@/components/events/meal-tabs'
import { PageHeader, StatusBadge } from '@/components/common'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { RowActions } from '@/components/crud/row-actions'
import { EventDetail } from '@/components/events/event-detail'
import {
  CheckboxGroupFilter,
  DataToolbar,
  EmptyState,
  FilterRail,
  FilterSection,
  ListLayout,
  compareValues,
  useDataView,
  type SortOption,
} from '@/components/data-view/data-view'
import { useFleet } from '@/lib/store'
import { formatMonthDayYear } from '@/lib/date'
import type { FleetEvent } from '@/lib/types'

const eventStatusMeta: Record<FleetEvent['status'], { label: string; cls: string }> = {
  draft: { label: 'Draft', cls: 'bg-muted text-muted-foreground' },
  scheduled: { label: 'Scheduled', cls: 'bg-accent text-accent-foreground' },
  planning: { label: 'Planning', cls: 'bg-warning/20 text-warning-foreground' },
  active: { label: 'Active', cls: 'bg-primary/15 text-primary' },
  completed: { label: 'Completed', cls: 'bg-success/20 text-success' },
}

const TYPE_OPTIONS = [
  'Dialysis Session',
  'Clinical Appointment',
  'Vaccination Camp',
  'Community Program',
  'Therapy Session',
  'Rehabilitation Session',
  'Health Screening',
].map((v) => ({ value: v, label: v }))

const STATUS_OPTIONS = Object.entries(eventStatusMeta).map(([value, m]) => ({
  value,
  label: m.label,
}))

const SORT_OPTIONS: SortOption[] = [
  { key: 'date', label: 'Date' },
  { key: 'name', label: 'Name' },
  { key: 'type', label: 'Type' },
  { key: 'status', label: 'Status' },
  { key: 'expectedAttendance', label: 'Attendance' },
]

export default function EventsPage() {
  const fleet = useFleet()
  const router = useRouter()
  const dv = useDataView('date')
  const [detailId, setDetailId] = useState<string | null>(null)
  const [tab, setTab] = useState('events')
  const [mealDialogOpen, setMealDialogOpen] = useState(false)

  const [types, setTypes] = useState<string[]>([])
  const [statuses, setStatuses] = useState<string[]>([])
  const [centerIds, setCenterIds] = useState<string[]>([])

  const CENTER_OPTIONS = fleet.centers.map((c) => ({ value: c.id, label: c.name }))

  const activeFilterCount =
    (types.length ? 1 : 0) + (statuses.length ? 1 : 0) + (centerIds.length ? 1 : 0)

  function resetFilters() {
    setTypes([])
    setStatuses([])
    setCenterIds([])
  }

  const filtered = useMemo(() => {
    const q = dv.query.trim().toLowerCase()
    const list = fleet.events.filter((e) => {
      const center = fleet.centerById(e.centerId)
      const matchQuery =
        !q ||
        e.name.toLowerCase().includes(q) ||
        e.type.toLowerCase().includes(q) ||
        (center?.name.toLowerCase().includes(q) ?? false)
      const matchType = types.length === 0 || types.includes(e.type)
      const matchStatus = statuses.length === 0 || statuses.includes(e.status)
      const matchCenter = centerIds.length === 0 || centerIds.includes(e.centerId)
      return matchQuery && matchType && matchStatus && matchCenter
    })
    return list.sort((a, b) =>
      compareValues(a[dv.sortKey as keyof FleetEvent], b[dv.sortKey as keyof FleetEvent], dv.sortDir),
    )
  }, [fleet.events, fleet, dv.query, dv.sortKey, dv.sortDir, types, statuses, centerIds])

  function assignedInfo(e: FleetEvent) {
    const assigned = fleet.trips
      .filter((t) => t.eventId === e.id && t.status !== 'cancelled')
      .flatMap((t) => t.stops.map((s) => s.participantId))
    return { assignedCount: new Set(assigned).size, total: e.participantIds.length }
  }

  function openAdd() {
    router.push('/events/new')
  }
  function openEdit(e: FleetEvent) {
    router.push(`/events/new?id=${e.id}`)
  }
  // Toggle the detail panel: clicking the same event again closes it.
  function toggleDetail(e: FleetEvent) {
    setDetailId((prev) => (prev === e.id ? null : e.id))
  }

  return (
    <div className="flex min-h-full flex-col">
      <PageHeader
        title="Events"
        description="Scheduled programs and appointments requiring transportation."
        actions={
          tab === 'meal-delivery' ? (
            <Button onClick={() => setMealDialogOpen(true)} size="sm">
              <Plus className="size-4" /> Plan new run
            </Button>
          ) : (
            <Button onClick={openAdd} size="sm">
              <Plus className="size-4" /> Add event
            </Button>
          )
        }
      />

      <div className="p-6">
        <Tabs value={tab} onValueChange={setTab} className="flex flex-col gap-4">
          <TabsList className="w-fit">
            <TabsTrigger value="events">
              <CalendarDays className="size-4" /> Events
            </TabsTrigger>
            <TabsTrigger value="meal-delivery">
              <UtensilsCrossed className="size-4" /> Meal Delivery
            </TabsTrigger>
          </TabsList>

          <TabsContent value="events">
            <ListLayout
              filters={
                <FilterRail activeCount={activeFilterCount} onReset={resetFilters}>
              <FilterSection title="Event type">
                <CheckboxGroupFilter options={TYPE_OPTIONS} selected={types} onChange={setTypes} />
              </FilterSection>
              <FilterSection title="Status">
                <CheckboxGroupFilter options={STATUS_OPTIONS} selected={statuses} onChange={setStatuses} />
              </FilterSection>
              <FilterSection title="Center">
                <CheckboxGroupFilter options={CENTER_OPTIONS} selected={centerIds} onChange={setCenterIds} />
              </FilterSection>
            </FilterRail>
          }
        >
          <div className="flex flex-col gap-6">
        <DataToolbar
          query={dv.query}
          onQueryChange={dv.setQuery}
          searchPlaceholder="Search event, type, or center"
          sortOptions={SORT_OPTIONS}
          sortKey={dv.sortKey}
          onSortKeyChange={dv.setSortKey}
          sortDir={dv.sortDir}
          onToggleSortDir={dv.toggleSortDir}
          view={dv.view}
          onViewChange={dv.setView}
          resultCount={filtered.length}
        />

        {filtered.length === 0 ? (
          <EmptyState message="No events match your search and filters." />
        ) : dv.view === 'grid' ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {filtered.map((e) => {
              const center = fleet.centerById(e.centerId)
              const meta = eventStatusMeta[e.status]
              const { assignedCount, total } = assignedInfo(e)
              return (
                <Fragment key={e.id}>
                <Card
                  onClick={() => toggleDetail(e)}
                  data-active={detailId === e.id}
                  className="flex cursor-pointer flex-col overflow-hidden transition-colors hover:border-primary/40 data-[active=true]:border-primary/50"
                >
                  <div className="flex items-start justify-between gap-2 border-b border-border px-4 py-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-pretty">{e.name}</p>
                      <p className="text-xs text-muted-foreground">{e.type}</p>
                    </div>
                    <div className="flex items-center gap-1" onClick={(ev) => ev.stopPropagation()}>
                      <StatusBadge label={meta.label} cls={meta.cls} />
                      <RowActions
                        onEdit={() => openEdit(e)}
                        onDelete={() => fleet.deleteEvent(e.id, e.name)}
                        deleteTitle="Delete event"
                        deleteMessage={`Delete ${e.name}? Committed trips for this event will also be cancelled.`}
                      />
                    </div>
                  </div>
                  <div className="flex-1 space-y-2 px-4 py-3 text-xs text-muted-foreground">
                    <p className="flex items-center gap-2">
                      <MapPin className="size-3.5 shrink-0" /> {center?.name}
                    </p>
                    <p className="flex items-center gap-2">
                      <CalendarDays className="size-3.5 shrink-0" /> {formatMonthDayYear(e.date)}
                    </p>
                    <p className="flex items-center gap-2">
                      <Clock className="size-3.5 shrink-0" /> {e.startTime} – {e.endTime}
                      {e.roundTrip ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
                          <Repeat className="size-3" /> Round trip
                        </span>
                      ) : null}
                    </p>
                    <p className="flex items-center gap-2">
                      <Users className="size-3.5 shrink-0" /> {total} participants
                    </p>
                  </div>
                  <div className="border-t border-border px-4 py-3" onClick={(ev) => ev.stopPropagation()}>
                    <div className="mb-1 flex items-center justify-between text-[11px]">
                      <span className="font-medium text-foreground">Transport assigned</span>
                      <span className="tabular-nums text-muted-foreground">
                        {assignedCount}/{total}
                      </span>
                    </div>
                    <Progress value={total ? (assignedCount / total) * 100 : 0} className="h-1.5" />
                    {assignedCount < total && e.status !== 'completed' ? (
                      <Button
                        size="sm"
                        variant="outline"
                        className="mt-3 w-full"
                        nativeButton={false}
                        render={<Link href={`/planner?id=${e.id}`} />}
                      >
                        <Sparkles className="size-3.5" /> Plan Transport
                      </Button>
                    ) : null}
                  </div>
                </Card>
                {detailId === e.id ? (
                  <div className="md:col-span-2 xl:col-span-3">
                    <EventDetail
                      inline
                      open
                      onOpenChange={(v) => !v && setDetailId(null)}
                      event={e}
                    />
                  </div>
                ) : null}
                </Fragment>
              )
            })}
          </div>
        ) : (
          <Card className="overflow-hidden py-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Event</TableHead>
                    <TableHead>Center</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Time</TableHead>
                    <TableHead>Transport</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-10" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((e) => {
                    const center = fleet.centerById(e.centerId)
                    const meta = eventStatusMeta[e.status]
                    const { assignedCount, total } = assignedInfo(e)
                    return (
                      <Fragment key={e.id}>
                      <TableRow
                        onClick={() => toggleDetail(e)}
                        data-active={detailId === e.id}
                        className="cursor-pointer data-[active=true]:bg-muted/60"
                      >
                        <TableCell>
                          <p className="text-sm font-medium">{e.name}</p>
                          <p className="text-xs text-muted-foreground">{e.type}</p>
                        </TableCell>
                        <TableCell className="text-sm">{center?.name}</TableCell>
                        <TableCell className="text-sm tabular-nums">{formatMonthDayYear(e.date)}</TableCell>
                        <TableCell className="text-sm tabular-nums text-muted-foreground">
                          <span className="flex items-center gap-1.5">
                            {e.startTime}–{e.endTime}
                            {e.roundTrip ? (
                              <Repeat className="size-3.5 text-primary" aria-label="Round trip" />
                            ) : null}
                          </span>
                        </TableCell>
                        <TableCell className="w-40">
                          <div className="flex items-center gap-2">
                            <Progress
                              value={total ? (assignedCount / total) * 100 : 0}
                              className="h-1.5 flex-1"
                            />
                            <span className="text-[11px] tabular-nums text-muted-foreground">
                              {assignedCount}/{total}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <StatusBadge label={meta.label} cls={meta.cls} />
                        </TableCell>
                        <TableCell onClick={(ev) => ev.stopPropagation()}>
                          <RowActions
                            onEdit={() => openEdit(e)}
                            onDelete={() => fleet.deleteEvent(e.id, e.name)}
                            deleteTitle="Delete event"
                            deleteMessage={`Delete ${e.name}? Committed trips for this event will also be cancelled.`}
                          />
                        </TableCell>
                      </TableRow>
                      {detailId === e.id ? (
                        <TableRow className="hover:bg-transparent">
                          <TableCell colSpan={7} className="bg-muted/20 p-3">
                            <EventDetail
                              inline
                              open
                              onOpenChange={(v) => !v && setDetailId(null)}
                              event={e}
                            />
                          </TableCell>
                        </TableRow>
                      ) : null}
                      </Fragment>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          </Card>
        )}
          </div>
            </ListLayout>
          </TabsContent>

          <TabsContent value="meal-delivery">
            <MealDeliveryTab dialogOpen={mealDialogOpen} onDialogOpenChange={setMealDialogOpen} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
