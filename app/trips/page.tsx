'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { MapPin, Trash2 } from 'lucide-react'
import { PageHeader, StatusBadge } from '@/components/common'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useFleet } from '@/lib/store'
import { tripStatusMeta } from '@/lib/labels'

const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'active', label: 'Active' },
  { key: 'planned', label: 'Planned' },
  { key: 'completed', label: 'Completed' },
  { key: 'cancelled', label: 'Cancelled' },
] as const

const ACTIVE = ['en-route', 'pickup-in-progress', 'onboard']
const PLANNED = ['planned', 'vehicle-assigned', 'driver-assigned']

export default function TripsPage() {
  const fleet = useFleet()
  const [filter, setFilter] = useState<string>('all')
  const [clearOpen, setClearOpen] = useState(false)
  const [clearing, setClearing] = useState(false)

  const trips = useMemo(() => {
    return fleet.trips.filter((t) => {
      if (filter === 'all') return true
      if (filter === 'active') return ACTIVE.includes(t.status)
      if (filter === 'planned') return PLANNED.includes(t.status)
      if (filter === 'completed') return t.status === 'arrived' || t.status === 'completed'
      if (filter === 'cancelled') return t.status === 'cancelled'
      return true
    })
  }, [fleet.trips, filter])

  async function confirmClearAll() {
    setClearing(true)
    try {
      await fleet.clearAllTrips()
      setClearOpen(false)
    } finally {
      setClearing(false)
    }
  }

  return (
    <div className="flex min-h-full flex-col">
      <PageHeader
        title="Trips"
        description="Every planned, active, and completed transport run."
        actions={
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              className="text-destructive hover:text-destructive"
              onClick={() => setClearOpen(true)}
              disabled={fleet.trips.length === 0}
            >
              <Trash2 className="size-4" /> Clear all trips
            </Button>
            <Button size="sm" variant="outline" nativeButton={false} render={<Link href="/command-center" />}>
              <MapPin className="size-4" /> Live map
            </Button>
          </div>
        }
      />

      <div className="flex flex-col gap-4 p-6">
        <Tabs value={filter} onValueChange={setFilter}>
          <TabsList>
            {FILTERS.map((f) => (
              <TabsTrigger key={f.key} value={f.key}>
                {f.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        <Card className="overflow-hidden py-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Trip</TableHead>
                  <TableHead>Event</TableHead>
                  <TableHead>Vehicle / Driver</TableHead>
                  <TableHead>Riders</TableHead>
                  <TableHead>Progress</TableHead>
                  <TableHead>ETA</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {trips.map((t) => {
                  const vehicle = t.vehicleId ? fleet.vehicleById(t.vehicleId) : undefined
                  const driver = t.driverId ? fleet.driverById(t.driverId) : undefined
                  const event = fleet.eventById(t.eventId)
                  const meta = tripStatusMeta[t.status]
                  const picked = t.stops.filter((s) => s.status === 'picked-up').length
                  return (
                    <TableRow key={t.id}>
                      <TableCell className="font-mono text-xs">{t.tripNumber}</TableCell>
                      <TableCell className="text-sm">{event?.name}</TableCell>
                      <TableCell>
                        <p className="text-sm font-medium">{vehicle?.name ?? '—'}</p>
                        <p className="text-xs text-muted-foreground">{driver?.name ?? 'Unassigned'}</p>
                      </TableCell>
                      <TableCell className="text-sm tabular-nums">
                        {picked}/{t.stops.length}
                      </TableCell>
                      <TableCell className="w-40">
                        <div className="flex items-center gap-2">
                          <Progress value={t.progress * 100} className="h-1.5 flex-1" />
                          <span className="text-[11px] tabular-nums text-muted-foreground">
                            {Math.round(t.progress * 100)}%
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm tabular-nums text-muted-foreground">
                        {t.status === 'cancelled' ? '—' : t.etaCenter}
                      </TableCell>
                      <TableCell>
                        <StatusBadge label={meta.label} cls={meta.cls} />
                      </TableCell>
                    </TableRow>
                  )
                })}
                {trips.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="py-10 text-center text-sm text-muted-foreground">
                      No trips in this category.
                    </TableCell>
                  </TableRow>
                ) : null}
              </TableBody>
            </Table>
          </div>
        </Card>
      </div>

      <Dialog open={clearOpen} onOpenChange={setClearOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Clear all trips</DialogTitle>
            <DialogDescription>
              This removes all {fleet.trips.length} trip{fleet.trips.length === 1 ? '' : 's'} — planned, active, and
              completed — and releases their vehicles, drivers, and participants back to available/registered.
              Centers, participants, vehicles, drivers, and events are not affected. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter showCloseButton>
            <Button variant="destructive" onClick={confirmClearAll} disabled={clearing}>
              {clearing ? 'Clearing…' : 'Clear all trips'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
