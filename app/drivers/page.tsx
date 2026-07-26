'use client'

import { useState } from 'react'
import { Accessibility, Clock, HeartPulse, IdCard, Phone, Plus, Star } from 'lucide-react'
import { PageHeader, StatCard, StatusBadge } from '@/components/common'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { RowActions } from '@/components/crud/row-actions'
import { DriverDialog } from '@/components/crud/driver-dialog'
import { useFleet } from '@/lib/store'
import { driverStatusMeta, formatShiftDays } from '@/lib/labels'
import type { Driver } from '@/lib/types'

function initials(name: string) {
  return name
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
}

export default function DriversPage() {
  const fleet = useFleet()
  const available = fleet.drivers.filter((d) => d.status === 'available').length
  const onTrip = fleet.drivers.filter((d) => d.status === 'on-trip').length
  const certified = fleet.drivers.filter(
    (d) => d.certifications.wheelchairAssist || d.certifications.medicalTransport,
  ).length
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Driver | null>(null)

  function openAdd() {
    setEditing(null)
    setDialogOpen(true)
  }
  function openEdit(d: Driver) {
    setEditing(d)
    setDialogOpen(true)
  }

  return (
    <div className="flex min-h-full flex-col">
      <PageHeader
        title="Drivers"
        description="Roster, certifications, and current availability."
        actions={
          <Button onClick={openAdd} size="sm">
            <Plus className="size-4" /> Add driver
          </Button>
        }
      />

      <div className="flex flex-col gap-6 p-6">
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard label="Total Drivers" value={fleet.drivers.length} icon={IdCard} />
          <StatCard label="Available" value={available} icon={IdCard} tone="success" />
          <StatCard label="On Trip" value={onTrip} icon={IdCard} tone="primary" />
          <StatCard label="Medically Certified" value={certified} icon={HeartPulse} tone="primary" />
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {fleet.drivers.map((d) => {
            const meta = driverStatusMeta[d.status]
            const vehicle = d.assignedVehicleId ? fleet.vehicleById(d.assignedVehicleId) : undefined
            return (
              <Card key={d.id} className="p-4">
                <div className="flex items-start gap-3">
                  <Avatar className="size-10">
                    <AvatarFallback className="bg-primary/10 text-sm font-medium text-primary">
                      {initials(d.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-sm font-semibold">{d.name}</p>
                      <div className="flex items-center gap-1">
                        <StatusBadge label={meta.label} cls={meta.cls} />
                        <RowActions
                          onEdit={() => openEdit(d)}
                          onDelete={() => fleet.deleteDriver(d.id, d.name)}
                          deleteTitle="Delete driver"
                          deleteMessage={`Remove ${d.name} from the roster?`}
                        />
                      </div>
                    </div>
                    <p className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Phone className="size-3" /> {d.phone}
                    </p>
                    <p className="flex items-center gap-1 text-xs text-muted-foreground">
                      <IdCard className="size-3" /> {d.license}
                    </p>
                    <p className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="size-3" /> {d.shiftStart}–{d.shiftEnd} · {formatShiftDays(d.shiftDays)}
                    </p>
                  </div>
                </div>

                <div className="mt-3 flex items-center justify-between border-t border-border pt-3">
                  <div className="flex items-center gap-1 text-sm">
                    <Star className="size-3.5 fill-warning text-warning" />
                    <span className="font-medium tabular-nums">{d.rating.toFixed(1)}</span>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {vehicle ? vehicle.name : 'No assigned vehicle'}
                  </span>
                </div>

                <div className="mt-2 flex flex-wrap gap-1.5">
                  {d.certifications.wheelchairAssist ? (
                    <Badge variant="secondary" className="gap-1 px-1.5 py-0 text-[10px]">
                      <Accessibility className="size-3" /> Wheelchair Assist
                    </Badge>
                  ) : null}
                  {d.certifications.medicalTransport ? (
                    <Badge variant="secondary" className="gap-1 px-1.5 py-0 text-[10px]">
                      <HeartPulse className="size-3" /> Medical Transport
                    </Badge>
                  ) : null}
                  {!d.certifications.wheelchairAssist && !d.certifications.medicalTransport ? (
                    <span className="text-[11px] text-muted-foreground">Standard certification</span>
                  ) : null}
                </div>
              </Card>
            )
          })}
        </div>
      </div>

      <DriverDialog open={dialogOpen} onOpenChange={setDialogOpen} editing={editing} />
    </div>
  )
}
