'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { CalendarDays, ChevronLeft, ChevronRight, Clock, GripVertical, MapPin, Users } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useFleet } from '@/lib/store'
import { formatMonthDayYear } from '@/lib/date'
import type { EventStatus } from '@/lib/types'
import { cn } from '@/lib/utils'

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

const statusAccent: Record<EventStatus, { bar: string; chip: string; dot: string }> = {
  draft: {
    bar: 'border-l-muted-foreground/40',
    chip: 'bg-muted/50 hover:bg-muted/70',
    dot: 'bg-muted-foreground',
  },
  active: { bar: 'border-l-primary', chip: 'bg-primary/5 hover:bg-primary/10', dot: 'bg-primary' },
  planning: {
    bar: 'border-l-warning',
    chip: 'bg-warning/5 hover:bg-warning/10',
    dot: 'bg-warning',
  },
  scheduled: {
    bar: 'border-l-accent-foreground',
    chip: 'bg-accent/40 hover:bg-accent/60',
    dot: 'bg-accent-foreground',
  },
  completed: {
    bar: 'border-l-success',
    chip: 'bg-success/5 hover:bg-success/10',
    dot: 'bg-success',
  },
}

function startOfWeek(d: Date) {
  const x = new Date(d)
  const day = (x.getDay() + 6) % 7 // Monday = 0
  x.setDate(x.getDate() - day)
  x.setHours(0, 0, 0, 0)
  return x
}

function dateKey(d: Date) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function to12h(hhmm: string) {
  const [h, m] = hhmm.split(':').map(Number)
  const period = h >= 12 ? 'PM' : 'AM'
  const hour = h % 12 === 0 ? 12 : h % 12
  return `${hour}:${String(m).padStart(2, '0')} ${period}`
}

export function WeeklySchedule() {
  const fleet = useFleet()
  const router = useRouter()
  const [anchor, setAnchor] = useState(() => startOfWeek(new Date()))
  // Drag-and-drop reschedule state.
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [dragOverKey, setDragOverKey] = useState<string | null>(null)

  function handleDrop(targetKey: string) {
    const id = draggingId
    setDragOverKey(null)
    setDraggingId(null)
    if (!id) return
    const ev = fleet.events.find((e) => e.id === id)
    if (!ev || ev.date === targetKey) return
    void fleet.rescheduleEvent(id, targetKey)
  }

  const days = useMemo(
    () =>
      Array.from({ length: 7 }, (_, i) => {
        const d = new Date(anchor)
        d.setDate(anchor.getDate() + i)
        return d
      }),
    [anchor],
  )

  const todayKey = dateKey(new Date())

  const eventsByDay = useMemo(() => {
    const map = new Map<string, typeof fleet.events>()
    for (const d of days) map.set(dateKey(d), [])
    for (const ev of fleet.events) {
      const bucket = map.get(ev.date)
      if (bucket) bucket.push(ev)
    }
    for (const [, list] of map) list.sort((a, b) => a.startTime.localeCompare(b.startTime))
    return map
  }, [days, fleet.events])

  const weekEventCount = days.reduce((n, d) => n + (eventsByDay.get(dateKey(d))?.length ?? 0), 0)

  const rangeLabel = `${formatMonthDayYear(days[0])} – ${formatMonthDayYear(days[6])}`

  function shiftWeek(delta: number) {
    const next = new Date(anchor)
    next.setDate(anchor.getDate() + delta * 7)
    setAnchor(startOfWeek(next))
  }

  return (
    <Card>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-3">
        <div className="flex items-center gap-2">
          <CalendarDays className="size-4 text-primary" />
          <h2 className="text-sm font-semibold">Weekly Schedule</h2>
          <span className="hidden text-xs text-muted-foreground sm:inline">
            {weekEventCount} event{weekEventCount === 1 ? '' : 's'}
          </span>
          <span className="hidden items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground lg:inline-flex">
            <GripVertical className="size-3" /> Drag to reschedule
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="mr-1 text-xs font-medium text-muted-foreground">{rangeLabel}</span>
          <Button
            variant="outline"
            size="sm"
            className="h-7 px-2"
            onClick={() => shiftWeek(-1)}
            aria-label="Previous week"
          >
            <ChevronLeft className="size-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-7 px-3 text-xs"
            onClick={() => setAnchor(startOfWeek(new Date()))}
          >
            Today
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-7 px-2"
            onClick={() => shiftWeek(1)}
            aria-label="Next week"
          >
            <ChevronRight className="size-4" />
          </Button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <div className="grid min-w-[840px] grid-cols-7 divide-x divide-border">
          {days.map((d) => {
            const key = dateKey(d)
            const isToday = key === todayKey
            const dayEvents = eventsByDay.get(key) ?? []
            const isDropTarget = dragOverKey === key && draggingId !== null
            return (
              <div
                key={key}
                onDragOver={(e) => {
                  if (draggingId) {
                    e.preventDefault()
                    e.dataTransfer.dropEffect = 'move'
                    if (dragOverKey !== key) setDragOverKey(key)
                  }
                }}
                onDragLeave={(e) => {
                  // Only clear when the pointer actually leaves the column.
                  if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                    setDragOverKey((prev) => (prev === key ? null : prev))
                  }
                }}
                onDrop={(e) => {
                  e.preventDefault()
                  handleDrop(key)
                }}
                className={cn(
                  'flex min-h-64 flex-col transition-colors',
                  isDropTarget && 'bg-primary/5 ring-2 ring-inset ring-primary/40',
                )}
              >
                <div
                  className={cn(
                    'flex items-center justify-between px-3 py-2',
                    isToday ? 'bg-primary/10' : 'bg-muted/30',
                  )}
                >
                  <div className="flex flex-col">
                    <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                      {WEEKDAYS[(d.getDay() + 6) % 7]}
                    </span>
                    <span
                      className={cn(
                        'text-lg font-semibold leading-tight',
                        isToday ? 'text-primary' : 'text-foreground',
                      )}
                    >
                      {d.getDate()}
                    </span>
                  </div>
                  {isToday ? (
                    <span className="rounded-full bg-primary px-2 py-0.5 text-[10px] font-semibold text-primary-foreground">
                      Today
                    </span>
                  ) : null}
                </div>

                <div className="flex flex-1 flex-col gap-1.5 p-2">
                  {dayEvents.length === 0 ? (
                    <div className="flex flex-1 items-center justify-center py-6">
                      <span className="text-[11px] text-muted-foreground/60">No events</span>
                    </div>
                  ) : (
                    dayEvents.map((ev) => {
                      const center = fleet.centerById(ev.centerId)
                      const accent = statusAccent[ev.status]
                      const isDragging = draggingId === ev.id
                      return (
                        <div
                          key={ev.id}
                          role="button"
                          tabIndex={0}
                          draggable
                          onDragStart={(e) => {
                            setDraggingId(ev.id)
                            e.dataTransfer.effectAllowed = 'move'
                            e.dataTransfer.setData('text/plain', ev.id)
                          }}
                          onDragEnd={() => {
                            setDraggingId(null)
                            setDragOverKey(null)
                          }}
                          onClick={() => router.push('/events')}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault()
                              router.push('/events')
                            }
                          }}
                          title={`${ev.name} · ${to12h(ev.startTime)}–${to12h(ev.endTime)} · drag to reschedule`}
                          className={cn(
                            'block cursor-grab rounded-md border border-border border-l-2 px-2 py-1.5 transition-colors active:cursor-grabbing',
                            accent.bar,
                            accent.chip,
                            isDragging && 'opacity-40',
                          )}
                        >
                          <div className="flex items-center gap-1 text-[10px] font-medium text-muted-foreground">
                            <Clock className="size-3 shrink-0" />
                            <span className="tabular-nums">{to12h(ev.startTime)}</span>
                          </div>
                          <p className="mt-0.5 line-clamp-2 text-xs font-semibold leading-tight text-pretty">
                            {ev.name}
                          </p>
                          {center ? (
                            <p className="mt-0.5 flex items-center gap-1 text-[10px] text-muted-foreground">
                              <MapPin className="size-2.5 shrink-0" />
                              <span className="truncate">{center.name}</span>
                            </p>
                          ) : null}
                          <p className="mt-1 flex items-center gap-1 text-[10px] text-muted-foreground">
                            <Users className="size-2.5 shrink-0" />
                            {ev.participantIds.length || ev.expectedAttendance} riders
                          </p>
                        </div>
                      )
                    })
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </Card>
  )
}
