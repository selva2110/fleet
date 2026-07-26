'use client'

import { useState } from 'react'
import {
  Accessibility,
  Bus,
  Fuel,
  HeartPulse,
  Plus,
  Stethoscope,
  TriangleAlert,
  Users,
  Wrench,
} from 'lucide-react'
import { PageHeader, StatCard, StatusBadge } from '@/components/common'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { RowActions } from '@/components/crud/row-actions'
import { VehicleDialog } from '@/components/crud/vehicle-dialog'
import { useFleet } from '@/lib/store'
import { vehicleStatusMeta } from '@/lib/labels'
import { cn } from '@/lib/utils'
import type { Vehicle } from '@/lib/types'

const maintMeta: Record<Vehicle['maintenanceStatus'], { label: string; cls: string }> = {
  good: { label: 'Good', cls: 'text-success' },
  'due-soon': { label: 'Service due soon', cls: 'text-warning-foreground' },
  'service-required': { label: 'Service required', cls: 'text-destructive' },
}

export default function VehiclesPage() {
  const fleet = useFleet()
  const available = fleet.vehicles.filter((v) => v.status === 'available').length
  const wheelchairCapable = fleet.vehicles.filter((v) => v.wheelchairCapacity > 0).length
  const needService = fleet.vehicles.filter((v) => v.maintenanceStatus === 'service-required').length
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Vehicle | null>(null)

  function openAdd() {
    setEditing(null)
    setDialogOpen(true)
  }
  function openEdit(v: Vehicle) {
    setEditing(v)
    setDialogOpen(true)
  }

  return (
    <div className="flex min-h-full flex-col">
      <PageHeader
        title="Vehicles"
        description="Fleet inventory, capabilities, and maintenance status."
        actions={
          <Button onClick={openAdd} size="sm">
            <Plus className="size-4" /> Add vehicle
          </Button>
        }
      />

      <div className="flex flex-col gap-6 p-6">
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard label="Total Fleet" value={fleet.vehicles.length} icon={Bus} />
          <StatCard label="Available Now" value={available} icon={Bus} tone="success" />
          <StatCard label="Wheelchair Capable" value={wheelchairCapable} icon={Accessibility} tone="primary" />
          <StatCard label="Need Service" value={needService} icon={Wrench} tone={needService ? 'warning' : 'default'} />
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {fleet.vehicles.map((v) => {
            const meta = vehicleStatusMeta[v.status]
            const maint = maintMeta[v.maintenanceStatus]
            return (
              <Card key={v.id} className="overflow-hidden">
                <div className="flex items-center justify-between border-b border-border px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <Bus className="size-4" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold">{v.name}</p>
                      <p className="text-xs text-muted-foreground">{v.type}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <StatusBadge label={meta.label} cls={meta.cls} />
                    <RowActions
                      onEdit={() => openEdit(v)}
                      onDelete={() => fleet.deleteVehicle(v.id, v.name)}
                      deleteTitle="Delete vehicle"
                      deleteMessage={`Remove ${v.name} from the fleet?`}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-px bg-border">
                  <Spec icon={Users} label="Capacity" value={`${v.capacity} seats`} />
                  <Spec icon={Accessibility} label="Wheelchair" value={`${v.wheelchairCapacity} spaces`} />
                  <Spec icon={Fuel} label="Fuel" value={v.fuelType} />
                  <Spec icon={Wrench} label="Maintenance" value={maint.label} valueCls={maint.cls} />
                </div>
                <div className="flex flex-wrap gap-1.5 px-4 py-3">
                  {v.liftAvailable ? <Cap icon={Accessibility} label="Lift" /> : null}
                  {v.oxygenEquipment ? <Cap icon={HeartPulse} label="Oxygen" /> : null}
                  {v.bariatricCapable ? <Cap icon={Users} label="Bariatric" /> : null}
                  {v.stretcherCapable ? <Cap icon={Stethoscope} label="Stretcher" /> : null}
                  {v.maintenanceStatus === 'service-required' ? (
                    <Badge className="gap-1 bg-destructive/15 px-1.5 py-0 text-[10px] text-destructive">
                      <TriangleAlert className="size-3" /> Out of service
                    </Badge>
                  ) : null}
                </div>
              </Card>
            )
          })}
        </div>
      </div>

      <VehicleDialog open={dialogOpen} onOpenChange={setDialogOpen} editing={editing} />
    </div>
  )
}

function Spec({
  icon: Icon,
  label,
  value,
  valueCls,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: string
  valueCls?: string
}) {
  return (
    <div className="bg-card px-4 py-2.5">
      <div className="flex items-center gap-1.5 text-muted-foreground">
        <Icon className="size-3.5" />
        <span className="text-[11px]">{label}</span>
      </div>
      <p className={cn('mt-0.5 text-sm font-medium', valueCls)}>{value}</p>
    </div>
  )
}

function Cap({ icon: Icon, label }: { icon: React.ComponentType<{ className?: string }>; label: string }) {
  return (
    <Badge variant="secondary" className="gap-1 px-1.5 py-0 text-[10px] font-medium">
      <Icon className="size-3" /> {label}
    </Badge>
  )
}
