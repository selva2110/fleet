'use client'

import { useMemo, useState } from 'react'
import {
  Accessibility,
  Bus,
  Fuel,
  HeartPulse,
  Images,
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { RowActions } from '@/components/crud/row-actions'
import { VehicleDialog } from '@/components/crud/vehicle-dialog'
import {
  CheckboxGroupFilter,
  DataToolbar,
  EmptyState,
  FilterSection,
  FilterSheet,
  compareValues,
  useDataView,
  type SortOption,
} from '@/components/data-view/data-view'
import { useFleet } from '@/lib/store'
import { vehicleStatusMeta } from '@/lib/labels'
import { cn } from '@/lib/utils'
import {
  vehicleImage,
  vehicleTypeDescriptions,
  vehicleTypeImages,
} from '@/lib/vehicle-images'
import type { Vehicle, VehicleType } from '@/lib/types'

const maintMeta: Record<Vehicle['maintenanceStatus'], { label: string; cls: string }> = {
  good: { label: 'Good', cls: 'text-success' },
  'due-soon': { label: 'Service due soon', cls: 'text-warning-foreground' },
  'service-required': { label: 'Service required', cls: 'text-destructive' },
}

const TYPE_OPTIONS = (Object.keys(vehicleTypeImages) as VehicleType[]).map((t) => ({
  value: t,
  label: t,
}))
const STATUS_OPTIONS = Object.entries(vehicleStatusMeta).map(([value, m]) => ({
  value,
  label: m.label,
}))
const FUEL_OPTIONS = ['Gas', 'Diesel', 'Hybrid', 'Electric'].map((v) => ({ value: v, label: v }))
const MAINT_OPTIONS = [
  { value: 'good', label: 'Good' },
  { value: 'due-soon', label: 'Service due soon' },
  { value: 'service-required', label: 'Service required' },
]
const CAPABILITY_OPTIONS = [
  { value: 'liftAvailable', label: 'Wheelchair lift' },
  { value: 'wheelchair', label: 'Wheelchair spaces' },
  { value: 'oxygenEquipment', label: 'Oxygen equipment' },
  { value: 'bariatricCapable', label: 'Bariatric capable' },
  { value: 'stretcherCapable', label: 'Stretcher capable' },
]

const SORT_OPTIONS: SortOption[] = [
  { key: 'name', label: 'Name' },
  { key: 'type', label: 'Type' },
  { key: 'capacity', label: 'Capacity' },
  { key: 'wheelchairCapacity', label: 'Wheelchair spots' },
  { key: 'status', label: 'Status' },
  { key: 'maintenanceStatus', label: 'Maintenance' },
  { key: 'fuelType', label: 'Fuel' },
]

export default function VehiclesPage() {
  const fleet = useFleet()
  const dv = useDataView('name')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Vehicle | null>(null)
  const [guideOpen, setGuideOpen] = useState(false)

  const [types, setTypes] = useState<string[]>([])
  const [statuses, setStatuses] = useState<string[]>([])
  const [fuels, setFuels] = useState<string[]>([])
  const [maints, setMaints] = useState<string[]>([])
  const [caps, setCaps] = useState<string[]>([])

  const available = fleet.vehicles.filter((v) => v.status === 'available').length
  const wheelchairCapable = fleet.vehicles.filter((v) => v.wheelchairCapacity > 0).length
  const needService = fleet.vehicles.filter((v) => v.maintenanceStatus === 'service-required').length

  const activeFilterCount =
    (types.length ? 1 : 0) +
    (statuses.length ? 1 : 0) +
    (fuels.length ? 1 : 0) +
    (maints.length ? 1 : 0) +
    (caps.length ? 1 : 0)

  function resetFilters() {
    setTypes([])
    setStatuses([])
    setFuels([])
    setMaints([])
    setCaps([])
  }

  function hasCapability(v: Vehicle, cap: string): boolean {
    if (cap === 'wheelchair') return v.wheelchairCapacity > 0
    return Boolean(v[cap as keyof Vehicle])
  }

  const filtered = useMemo(() => {
    const q = dv.query.trim().toLowerCase()
    const list = fleet.vehicles.filter((v) => {
      const matchQuery =
        !q ||
        v.name.toLowerCase().includes(q) ||
        v.type.toLowerCase().includes(q) ||
        v.address.toLowerCase().includes(q)
      const matchType = types.length === 0 || types.includes(v.type)
      const matchStatus = statuses.length === 0 || statuses.includes(v.status)
      const matchFuel = fuels.length === 0 || fuels.includes(v.fuelType)
      const matchMaint = maints.length === 0 || maints.includes(v.maintenanceStatus)
      const matchCaps = caps.length === 0 || caps.every((c) => hasCapability(v, c))
      return matchQuery && matchType && matchStatus && matchFuel && matchMaint && matchCaps
    })
    return list.sort((a, b) =>
      compareValues(a[dv.sortKey as keyof Vehicle], b[dv.sortKey as keyof Vehicle], dv.sortDir),
    )
  }, [fleet.vehicles, dv.query, dv.sortKey, dv.sortDir, types, statuses, fuels, maints, caps])

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
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setGuideOpen(true)}>
              <Images className="size-4" /> Vehicle type guide
            </Button>
            <Button onClick={openAdd} size="sm">
              <Plus className="size-4" /> Add vehicle
            </Button>
          </div>
        }
      />

      <div className="flex flex-col gap-6 p-6">
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard label="Total Fleet" value={fleet.vehicles.length} icon={Bus} />
          <StatCard label="Available Now" value={available} icon={Bus} tone="success" />
          <StatCard label="Wheelchair Capable" value={wheelchairCapable} icon={Accessibility} tone="primary" />
          <StatCard label="Need Service" value={needService} icon={Wrench} tone={needService ? 'warning' : 'default'} />
        </div>

        <DataToolbar
          query={dv.query}
          onQueryChange={dv.setQuery}
          searchPlaceholder="Search name, type, or location"
          sortOptions={SORT_OPTIONS}
          sortKey={dv.sortKey}
          onSortKeyChange={dv.setSortKey}
          sortDir={dv.sortDir}
          onToggleSortDir={dv.toggleSortDir}
          view={dv.view}
          onViewChange={dv.setView}
          activeFilterCount={activeFilterCount}
          onOpenFilters={() => dv.setFiltersOpen(true)}
          resultCount={filtered.length}
        />

        {filtered.length === 0 ? (
          <EmptyState message="No vehicles match your search and filters." />
        ) : dv.view === 'grid' ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {filtered.map((v) => (
              <VehicleCard
                key={v.id}
                vehicle={v}
                onEdit={() => openEdit(v)}
                onDelete={() => fleet.deleteVehicle(v.id, v.name)}
              />
            ))}
          </div>
        ) : (
          <Card className="overflow-hidden py-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Vehicle</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Capacity</TableHead>
                    <TableHead>Fuel</TableHead>
                    <TableHead>Maintenance</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-10" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((v) => {
                    const meta = vehicleStatusMeta[v.status]
                    const maint = maintMeta[v.maintenanceStatus]
                    return (
                      <TableRow key={v.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <img
                              src={vehicleImage(v.type, v.imageUrl) || '/placeholder.svg'}
                              alt={v.type}
                              className="size-11 shrink-0 rounded-md bg-muted object-contain"
                            />
                            <div>
                              <p className="text-sm font-medium">{v.name}</p>
                              <p className="text-xs text-muted-foreground">
                                {v.wheelchairCapacity} WC · {v.address || 'No base address'}
                              </p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm">{v.type}</TableCell>
                        <TableCell className="text-sm tabular-nums">{v.capacity} seats</TableCell>
                        <TableCell className="text-sm">{v.fuelType}</TableCell>
                        <TableCell className={cn('text-sm', maint.cls)}>{maint.label}</TableCell>
                        <TableCell>
                          <StatusBadge label={meta.label} cls={meta.cls} />
                        </TableCell>
                        <TableCell>
                          <RowActions
                            onEdit={() => openEdit(v)}
                            onDelete={() => fleet.deleteVehicle(v.id, v.name)}
                            deleteTitle="Delete vehicle"
                            deleteMessage={`Remove ${v.name} from the fleet?`}
                          />
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          </Card>
        )}
      </div>

      <FilterSheet
        open={dv.filtersOpen}
        onOpenChange={dv.setFiltersOpen}
        activeCount={activeFilterCount}
        onReset={resetFilters}
      >
        <FilterSection title="Vehicle type">
          <CheckboxGroupFilter options={TYPE_OPTIONS} selected={types} onChange={setTypes} />
        </FilterSection>
        <FilterSection title="Status">
          <CheckboxGroupFilter options={STATUS_OPTIONS} selected={statuses} onChange={setStatuses} />
        </FilterSection>
        <FilterSection title="Fuel type">
          <CheckboxGroupFilter options={FUEL_OPTIONS} selected={fuels} onChange={setFuels} />
        </FilterSection>
        <FilterSection title="Maintenance">
          <CheckboxGroupFilter options={MAINT_OPTIONS} selected={maints} onChange={setMaints} />
        </FilterSection>
        <FilterSection title="Capabilities">
          <CheckboxGroupFilter options={CAPABILITY_OPTIONS} selected={caps} onChange={setCaps} />
        </FilterSection>
      </FilterSheet>

      <VehicleDialog open={dialogOpen} onOpenChange={setDialogOpen} editing={editing} />
      <TypeGuideDialog open={guideOpen} onOpenChange={setGuideOpen} />
    </div>
  )
}

function VehicleCard({
  vehicle: v,
  onEdit,
  onDelete,
}: {
  vehicle: Vehicle
  onEdit: () => void
  onDelete: () => void
}) {
  const meta = vehicleStatusMeta[v.status]
  const maint = maintMeta[v.maintenanceStatus]
  return (
    <Card className="overflow-hidden pt-0">
      <div className="relative aspect-[16/10] w-full overflow-hidden bg-gradient-to-b from-muted/40 to-muted">
        <img
          src={vehicleImage(v.type, v.imageUrl) || '/placeholder.svg'}
          alt={`${v.type} — ${v.name}`}
          className="size-full object-contain p-4"
        />
        <div className="absolute left-3 top-3">
          <StatusBadge label={meta.label} cls={cn(meta.cls, 'shadow-sm')} />
        </div>
        {v.maintenanceStatus === 'service-required' ? (
          <div className="absolute right-3 top-3">
            <Badge className="gap-1 bg-destructive/90 px-1.5 py-0 text-[10px] text-white shadow-sm">
              <TriangleAlert className="size-3" /> Out of service
            </Badge>
          </div>
        ) : null}
      </div>
      <div className="flex items-start justify-between gap-2 px-4">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">{v.name}</p>
          <p className="text-xs text-muted-foreground">{v.type}</p>
        </div>
        <RowActions
          onEdit={onEdit}
          onDelete={onDelete}
          deleteTitle="Delete vehicle"
          deleteMessage={`Remove ${v.name} from the fleet?`}
        />
      </div>
      <div className="grid grid-cols-2 gap-px bg-border">
        <Spec icon={Users} label="Capacity" value={`${v.capacity} seats`} />
        <Spec icon={Accessibility} label="Wheelchair" value={`${v.wheelchairCapacity} spaces`} />
        <Spec icon={Fuel} label="Fuel" value={v.fuelType} />
        <Spec icon={Wrench} label="Maintenance" value={maint.label} valueCls={maint.cls} />
      </div>
      <div className="flex flex-wrap gap-1.5 px-4 pb-1">
        {v.liftAvailable ? <Cap icon={Accessibility} label="Lift" /> : null}
        {v.oxygenEquipment ? <Cap icon={HeartPulse} label="Oxygen" /> : null}
        {v.bariatricCapable ? <Cap icon={Users} label="Bariatric" /> : null}
        {v.stretcherCapable ? <Cap icon={Stethoscope} label="Stretcher" /> : null}
      </div>
    </Card>
  )
}

function TypeGuideDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
}) {
  const types = Object.keys(vehicleTypeImages) as VehicleType[]
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Vehicle type guide</DialogTitle>
          <DialogDescription>
            A visual reference for every vehicle class in the fleet.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 sm:grid-cols-2">
          {types.map((t) => (
            <div key={t} className="flex flex-col overflow-hidden rounded-lg border border-border">
              <div className="aspect-[16/10] bg-gradient-to-b from-muted/40 to-muted">
                <img
                  src={vehicleTypeImages[t] || '/placeholder.svg'}
                  alt={t}
                  className="size-full object-contain p-3"
                />
              </div>
              <div className="flex flex-col gap-1 border-t border-border p-3">
                <p className="text-sm font-semibold">{t}</p>
                <p className="text-xs leading-relaxed text-muted-foreground text-pretty">
                  {vehicleTypeDescriptions[t]}
                </p>
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
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
