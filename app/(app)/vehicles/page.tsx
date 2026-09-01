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
import { VehicleShowroom } from '@/components/vehicles/vehicle-showroom'
import {
  CheckboxGroupFilter,
  DataToolbar,
  EmptyState,
  FilterRail,
  FilterSection,
  ListLayout,
  Pagination,
  compareValues,
  useDataView,
  usePagination,
} from '@/components/data-view/data-view'
import { useVehicles, useVehicleMutations } from '@/lib/vehicles/hooks'
import { cn } from '@/lib/utils'
import { tableHeaderRow } from '@/components/aurora/aurora-ui';
import { VehiclesConfig } from '@/lib/vehicles/config';
import { Vehicle, VehicleType } from '@/lib/vehicles/types';
import { VehicleUtils } from '@/lib/vehicles/utils';
import { useTranslation } from '@/components/context/language-provider';

export default function VehiclesPage() {
  const { vehicles } = useVehicles()
  const { deleteVehicle } = useVehicleMutations()
  const {t} = useTranslation();
  const dv = useDataView('name')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Vehicle | null>(null)
  const [guideOpen, setGuideOpen] = useState(false)

  const [types, setTypes] = useState<string[]>([])
  const [statuses, setStatuses] = useState<string[]>([])
  const [fuels, setFuels] = useState<string[]>([])
  const [maints, setMaints] = useState<string[]>([])
  const [caps, setCaps] = useState<string[]>([])

  const available = vehicles.filter((v) => v.status === 'available').length
  const wheelchairCapable = vehicles.filter((v) => v.wheelchairCapacity > 0).length
  const needService = vehicles.filter((v) => v.maintenanceStatus === 'service-required').length

  const typeCounts = useMemo(() => {
    const counts: Partial<Record<VehicleType, number>> = {}
    for (const v of vehicles) counts[v.type] = (counts[v.type] ?? 0) + 1
    return counts
  }, [vehicles])

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

  const filtered = useMemo(() => {
    const q = dv.query.trim().toLowerCase()
    const list = vehicles.filter((v) => {
      const matchQuery =
        !q ||
        v.name.toLowerCase().includes(q) ||
        v.type.toLowerCase().includes(q) ||
        v.address.toLowerCase().includes(q)
      const matchType = types.length === 0 || types.includes(v.type)
      const matchStatus = statuses.length === 0 || statuses.includes(v.status)
      const matchFuel = fuels.length === 0 || fuels.includes(v.fuelType)
      const matchMaint = maints.length === 0 || maints.includes(v.maintenanceStatus)
      const matchCaps = caps.length === 0 || caps.every((c) => VehicleUtils.hasCapability(v, c))
      return matchQuery && matchType && matchStatus && matchFuel && matchMaint && matchCaps
    })
    return list.sort((a, b) =>
      compareValues(a[dv.sortKey as keyof Vehicle], b[dv.sortKey as keyof Vehicle], dv.sortDir),
    )
  }, [vehicles, dv.query, dv.sortKey, dv.sortDir, types, statuses, fuels, maints, caps])

  const pg = usePagination(filtered, 20)
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
        title={t('common.vehicles')}
        description={t('vehicle.desc')}
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setGuideOpen(true)}
            >
              <Images className="size-4" /> {t('vehicle.typeguide')}
            </Button>
            <Button onClick={openAdd} size="sm">
              <Plus className="size-4" /> {t('vehicle.add')}
            </Button>
          </div>
        }
      />

      <div className="flex flex-col gap-6 p-6">
        <VehicleShowroom count={typeCounts} />

        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard
            label={t('vehicle.totveh')}
            value={vehicles.length}
            icon={Bus}
          />
          <StatCard
            label={t('vehicle.availnow')}
            value={available}
            icon={Bus}
            tone="success"
          />
          <StatCard
            label={t('vehicle.wheelchaircap')}
            value={wheelchairCapable}
            icon={Accessibility}
            tone="primary"
          />
          <StatCard
            label={t('vehicle.needservice')}
            value={needService}
            icon={Wrench}
            tone={needService ? "warning" : "default"}
          />
        </div>

        <ListLayout
          filters={
            <FilterRail activeCount={activeFilterCount} onReset={resetFilters}>
              <FilterSection title={t('vehicle.type')}>
                <CheckboxGroupFilter
                  options={VehiclesConfig.TYPE_OPTIONS}
                  selected={types}
                  onChange={setTypes}
                />
              </FilterSection>
              <FilterSection title={t('common.status')}>
                <CheckboxGroupFilter
                  options={VehiclesConfig.STATUS_OPTIONS}
                  selected={statuses}
                  onChange={setStatuses}
                />
              </FilterSection>
              <FilterSection title={t('vehicle.fueltype')}>
                <CheckboxGroupFilter
                  options={VehiclesConfig.FUEL_OPTIONS}
                  selected={fuels}
                  onChange={setFuels}
                />
              </FilterSection>
              <FilterSection title={t('vehicle.maintenance')}>
                <CheckboxGroupFilter
                  options={VehiclesConfig.MAINT_OPTIONS}
                  selected={maints}
                  onChange={setMaints}
                />
              </FilterSection>
              <FilterSection title={t('vehicle.capabilities')}>
                <CheckboxGroupFilter
                  options={VehiclesConfig.CAPABILITY_OPTIONS}
                  selected={caps}
                  onChange={setCaps}
                />
              </FilterSection>
            </FilterRail>
          }
        >
          <div className="flex flex-col gap-6">
            <DataToolbar
              query={dv.query}
              onQueryChange={dv.setQuery}
              searchPlaceholder={t('vehicle.searchplaceholder')}
              sortOptions={VehiclesConfig.SORT_OPTIONS}
              sortKey={dv.sortKey}
              onSortKeyChange={dv.setSortKey}
              sortDir={dv.sortDir}
              onToggleSortDir={dv.toggleSortDir}
              view={dv.view}
              onViewChange={dv.setView}
              resultCount={filtered.length}
            />

            {filtered.length === 0 ? (
              <EmptyState message={t('vehicle.none')} />
            ) : dv.view === "grid" ? (
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {pg.pageItems.map((v) => (
                  <VehicleCard
                    key={v.id}
                    vehicle={v}
                    onEdit={() => openEdit(v)}
                    onDelete={() => deleteVehicle(v.id, v.name)}
                  />
                ))}
              </div>
            ) : (
              <Card className="overflow-hidden py-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        {tableHeaderRow([
                          t('common.sno'),
                          t('common.sno'),
                          t('common.vehicle'),
                          t('common.type'),
                          t('common.capacity'),
                          t('vehicle.fuel'),
                          t('vehicle.maintenance'),
                          t('common.status'),
                        ])}
                        <TableHead className="w-10" />
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pg.pageItems.map((v) => {
                        const meta = VehiclesConfig.vehicleStatusMeta[v.status];
                        const maint =
                          VehiclesConfig.maintMeta[v.maintenanceStatus];
                          const fuelType = VehiclesConfig.FUEL_OPTIONS_LABEL[v.fuelType]
                          const vehicleType = VehiclesConfig.TYPE_OPTIONS_LABEL[v.type]
                        return (
                          <TableRow key={v.id}>
                            <TableCell>
                              <p className="font-medium text-center">{v.idx}</p>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-3">
                                <img
                                  src={
                                    VehicleUtils.vehicleImage(
                                      v.type,
                                      v.imageUrl,
                                    ) || "/placeholder.svg"
                                  }
                                  alt={v.type}
                                  className="size-11 shrink-0 rounded-md bg-muted object-contain"
                                />
                                <div>
                                  <p className="text-sm font-medium">
                                    {v.name}
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    {v.wheelchairCapacity} {t('common.wcAbbrev')} ·{" "}
                                    {v.address || t('vehicle.nobaseaddr')}
                                  </p>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className="text-sm">{t(vehicleType)}</TableCell>
                            <TableCell className="text-sm tabular-nums">
                              {v.capacity} {t('vehicle.seats')}
                            </TableCell>
                            <TableCell className="text-sm">
                              {t(fuelType)}
                            </TableCell>
                            <TableCell className={cn("text-sm", maint.cls)}>
                              {t(maint.label)}
                            </TableCell>
                            <TableCell>
                              <StatusBadge label={t(meta.label)} cls={meta.cls} />
                            </TableCell>
                            <TableCell>
                              <RowActions
                                onEdit={() => openEdit(v)}
                                onDelete={() =>
                                  deleteVehicle(v.id, v.name)
                                }
                                deleteTitle={t('vehicle.delete')}
                                deleteMessage={t('vehicle.deletecnfrm').replace("{{name}}", v.name)}
                              />
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </Card>
            )}

            {filtered.length > 0 ? (
              <Pagination
                page={pg.page}
                pageCount={pg.pageCount}
                pageSize={pg.pageSize}
                onPageChange={pg.setPage}
                onPageSizeChange={pg.setPageSize}
                rangeStart={pg.rangeStart}
                rangeEnd={pg.rangeEnd}
                total={pg.total}
                itemLabel={t('common.vehicles').toLowerCase()}
              />
            ) : null}
          </div>
        </ListLayout>
      </div>

      <VehicleDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        editing={editing}
      />
      <TypeGuideDialog open={guideOpen} onOpenChange={setGuideOpen} />
    </div>
  );
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
  const {t} = useTranslation();
  const meta = VehiclesConfig.vehicleStatusMeta[v.status]
  const maint = VehiclesConfig.maintMeta[v.maintenanceStatus]
  const fuelType = VehiclesConfig.FUEL_OPTIONS_LABEL[v.fuelType]
  const vehicleType = VehiclesConfig.TYPE_OPTIONS_LABEL[v.type]
  return (
    <Card className="overflow-hidden pt-0">
      <div className="relative aspect-16/10 w-full overflow-hidden bg-linear-to-b from-muted/40 to-muted">
        <img
          src={VehicleUtils.vehicleImage(v.type, v.imageUrl) || '/placeholder.svg'}
          alt={`${v.type} — ${v.name}`}
          className="size-full object-contain p-4"
        />
        <div className="absolute left-3 top-3">
          <StatusBadge label={t(meta.label)} cls={cn(meta.cls, 'shadow-sm')} />
        </div>
        {v.maintenanceStatus === 'service-required' ? (
          <div className="absolute right-3 top-3">
            <Badge className="gap-1 bg-destructive/90 px-1.5 py-0 text-[10px] text-white shadow-sm">
              <TriangleAlert className="size-3" /> {t('vehicle.outofservice')}
            </Badge>
          </div>
        ) : null}
      </div>
      <div className="flex items-start justify-between gap-2 px-4">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">{v.name}</p>
          <p className="text-xs text-muted-foreground">{t(vehicleType)}</p>
        </div>
        <RowActions
          onEdit={onEdit}
          onDelete={onDelete}
          deleteTitle={t('vehicle.delete')}
          deleteMessage={t('vehicle.deletecnfrm').replace("{{name}}", v.name)}
        />
      </div>
      <div className="grid grid-cols-2 gap-px bg-border">
        <Spec icon={Users} label={t('common.capacity')} value={`${v.capacity} ${t('vehicle.seats')}`} />
        <Spec icon={Accessibility} label={t('part.wheelchair')} value={`${v.wheelchairCapacity} ${t('vehicle.spaces')}`} />
        <Spec icon={Fuel} label={t('vehicle.fuel')} value={t(fuelType)} />
        <Spec icon={Wrench} label={t('vehicle.maintenance')} value={t(maint.label)} valueCls={maint.cls} />
      </div>
      <div className="flex flex-wrap gap-1.5 px-4 pb-1">
        {v.liftAvailable ? <Cap icon={Accessibility} label={t('vehicle.lift')} /> : null}
        {v.oxygenEquipment ? <Cap icon={HeartPulse} label={t('part.oxygen')} /> : null}
        {v.bariatricCapable ? <Cap icon={Users} label={t('part.bariatric')} /> : null}
        {v.stretcherCapable ? <Cap icon={Stethoscope} label={t('part.stretcher')} /> : null}
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
  const {t} = useTranslation();
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{t('vehicle.typeguide')}</DialogTitle>
          <DialogDescription>
            {t('vehicle.typeguidedesc')}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 sm:grid-cols-2">
          {VehiclesConfig.VehicleTypes.map((type) => (
            <div key={type} className="flex flex-col overflow-hidden rounded-lg border border-border">
              <div className="aspect-16/10 bg-linear-to-b from-muted/40 to-muted">
                <img
                  src={VehiclesConfig.vehicleTypeImages[type] || '/placeholder.svg'}
                  alt={type}
                  className="size-full object-contain p-3"
                />
              </div>
              <div className="flex flex-col gap-1 border-t border-border p-3">
                <p className="text-sm font-semibold">{t(VehiclesConfig.TYPE_OPTIONS_LABEL[type])}</p>
                <p className="text-xs leading-relaxed text-muted-foreground text-pretty">
                  {t(VehiclesConfig.vehicleTypeDescriptions[type])}
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
