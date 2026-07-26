'use client'

import { useState } from 'react'
import Link from 'next/link'
import { CalendarDays, Clock, MapPin, Plus, Sparkles, Users } from 'lucide-react'
import { PageHeader, StatusBadge } from '@/components/common'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { RowActions } from '@/components/crud/row-actions'
import { EventDialog } from '@/components/crud/event-dialog'
import { useFleet } from '@/lib/store'
import type { FleetEvent } from '@/lib/types'

const eventStatusMeta: Record<FleetEvent['status'], { label: string; cls: string }> = {
  scheduled: { label: 'Scheduled', cls: 'bg-accent text-accent-foreground' },
  planning: { label: 'Planning', cls: 'bg-warning/20 text-warning-foreground' },
  active: { label: 'Active', cls: 'bg-primary/15 text-primary' },
  completed: { label: 'Completed', cls: 'bg-success/20 text-success' },
}

export default function EventsPage() {
  const fleet = useFleet()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<FleetEvent | null>(null)

  function openAdd() {
    setEditing(null)
    setDialogOpen(true)
  }
  function openEdit(e: FleetEvent) {
    setEditing(e)
    setDialogOpen(true)
  }

  return (
    <div className="flex min-h-full flex-col">
      <PageHeader
        title="Events"
        description="Scheduled programs and appointments requiring transportation."
        actions={
          <Button onClick={openAdd} size="sm">
            <Plus className="size-4" /> Add event
          </Button>
        }
      />
      <div className="grid gap-4 p-6 md:grid-cols-2 xl:grid-cols-3">
        {fleet.events.map((e) => {
          const center = fleet.centerById(e.centerId)
          const meta = eventStatusMeta[e.status]
          const assigned = fleet.trips
            .filter((t) => t.eventId === e.id && t.status !== 'cancelled')
            .flatMap((t) => t.stops.map((s) => s.participantId))
          const assignedCount = new Set(assigned).size
          const total = e.participantIds.length
          return (
            <Card key={e.id} className="flex flex-col overflow-hidden">
              <div className="flex items-start justify-between gap-2 border-b border-border px-4 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-pretty">{e.name}</p>
                  <p className="text-xs text-muted-foreground">{e.type}</p>
                </div>
                <div className="flex items-center gap-1">
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
                  <CalendarDays className="size-3.5 shrink-0" /> {e.date}
                </p>
                <p className="flex items-center gap-2">
                  <Clock className="size-3.5 shrink-0" /> {e.startTime} – {e.endTime}
                </p>
                <p className="flex items-center gap-2">
                  <Users className="size-3.5 shrink-0" /> {total} participants
                </p>
              </div>
              <div className="border-t border-border px-4 py-3">
                <div className="mb-1 flex items-center justify-between text-[11px]">
                  <span className="font-medium text-foreground">Transport assigned</span>
                  <span className="tabular-nums text-muted-foreground">{assignedCount}/{total}</span>
                </div>
                <Progress value={total ? (assignedCount / total) * 100 : 0} className="h-1.5" />
                {assignedCount < total && e.status !== 'completed' ? (
                  <Button
                    size="sm"
                    variant="outline"
                    className="mt-3 w-full"
                    nativeButton={false}
                    render={<Link href={`/planner?id=${e.id}`}/>}
                  >
                    <Sparkles className="size-3.5" /> Plan Transport
                  </Button>
                ) : null}
              </div>
            </Card>
          )
        })}
      </div>

      <EventDialog open={dialogOpen} onOpenChange={setDialogOpen} editing={editing} />
    </div>
  )
}
