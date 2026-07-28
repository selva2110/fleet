'use client'

import { useMemo, useState } from 'react'
import {
  Accessibility,
  Clock,
  HeartPulse,
  IdCard,
  Phone,
  Plus,
  Star,
} from 'lucide-react'
import { PageHeader, StatCard, StatusBadge } from '@/components/common'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { RowActions } from '@/components/crud/row-actions'
import { DriverDialog } from '@/components/crud/driver-dialog'
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
import { driverStatusMeta, formatShiftDays } from '@/lib/labels'
import type { Driver } from '@/lib/types'

function initials(name: string) {
  return name
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
}

const STATUS_OPTIONS = Object.entries(driverStatusMeta).map(([value, m]) => ({
  value,
  label: m.label,
}))
const CERT_OPTIONS = [
  { value: 'wheelchairAssist', label: 'Wheelchair assist' },
  { value: 'medicalTransport', label: 'Medical transport' },
]
const ASSIGNMENT_OPTIONS = [
  { value: 'assigned', label: 'Has assigned vehicle' },
  { value: 'unassigned', label: 'No assigned vehicle' },
]

const SORT_OPTIONS: SortOption[] = [
  { key: 'name', label: 'Name' },
  { key: 'rating', label: 'Rating' },
  { key: 'status', label: 'Status' },
  { key: 'license', label: 'License' },
  { key: 'shiftStart', label: 'Shift start' },
]

export default function DriversPage() {
  const fleet = useFleet()
  const dv = useDataView('name')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Driver | null>(null)

  const [statuses, setStatuses] = useState<string[]>([])
  const [certs, setCerts] = useState<string[]>([])
  const [assignment, setAssignment] = useState<string[]>([])

  const available = fleet.drivers.filter((d) => d.status === 'available').length
  const onTrip = fleet.drivers.filter((d) => d.status === 'on-trip').length
  const certified = fleet.drivers.filter(
    (d) => d.certifications.wheelchairAssist || d.certifications.medicalTransport,
  ).length

  const activeFilterCount =
    (statuses.length ? 1 : 0) + (certs.length ? 1 : 0) + (assignment.length ? 1 : 0)

  function resetFilters() {
    setStatuses([])
    setCerts([])
    setAssignment([])
  }

  const filtered = useMemo(() => {
    const q = dv.query.trim().toLowerCase()
    const list = fleet.drivers.filter((d) => {
      const matchQuery =
        !q ||
        d.name.toLowerCase().includes(q) ||
        d.phone.toLowerCase().includes(q) ||
        d.license.toLowerCase().includes(q) ||
        d.address.toLowerCase().includes(q)
      const matchStatus = statuses.length === 0 || statuses.includes(d.status)
      const matchCerts =
        certs.length === 0 ||
        certs.every((c) => d.certifications[c as keyof Driver['certifications']])
      const isAssigned = Boolean(d.assignedVehicleId)
      const matchAssign =
        assignment.length === 0 ||
        (assignment.includes('assigned') && isAssigned) ||
        (assignment.includes('unassigned') && !isAssigned)
      return matchQuery && matchStatus && matchCerts && matchAssign
    })
    return list.sort((a, b) =>
      compareValues(a[dv.sortKey as keyof Driver], b[dv.sortKey as keyof Driver], dv.sortDir),
    )
  }, [fleet.drivers, dv.query, dv.sortKey, dv.sortDir, statuses, certs, assignment])

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

        <ListLayout
          filters={
            <FilterRail activeCount={activeFilterCount} onReset={resetFilters}>
              <FilterSection title="Status">
                <CheckboxGroupFilter options={STATUS_OPTIONS} selected={statuses} onChange={setStatuses} />
              </FilterSection>
              <FilterSection title="Certifications">
                <CheckboxGroupFilter options={CERT_OPTIONS} selected={certs} onChange={setCerts} />
              </FilterSection>
              <FilterSection title="Vehicle assignment">
                <CheckboxGroupFilter options={ASSIGNMENT_OPTIONS} selected={assignment} onChange={setAssignment} />
              </FilterSection>
            </FilterRail>
          }
        >
          <div className="flex flex-col gap-6">
        <DataToolbar
          query={dv.query}
          onQueryChange={dv.setQuery}
          searchPlaceholder="Search name, phone, or license"
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
          <EmptyState message="No drivers match your search and filters." />
        ) : dv.view === 'grid' ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {filtered.map((d) => {
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
        ) : (
          <Card className="overflow-hidden py-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Driver</TableHead>
                    <TableHead>License</TableHead>
                    <TableHead>Shift</TableHead>
                    <TableHead>Certifications</TableHead>
                    <TableHead>Vehicle</TableHead>
                    <TableHead>Rating</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-10" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((d) => {
                    const meta = driverStatusMeta[d.status]
                    const vehicle = d.assignedVehicleId ? fleet.vehicleById(d.assignedVehicleId) : undefined
                    return (
                      <TableRow key={d.id}>
                        <TableCell>
                          <div className="flex items-center gap-2.5">
                            <Avatar className="size-8">
                              <AvatarFallback className="bg-primary/10 text-xs font-medium text-primary">
                                {initials(d.name)}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="text-sm font-medium">{d.name}</p>
                              <p className="text-xs text-muted-foreground">{d.phone}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="font-mono text-xs">{d.license}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {d.shiftStart}–{d.shiftEnd}
                          <br />
                          {formatShiftDays(d.shiftDays)}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {d.certifications.wheelchairAssist ? (
                              <Badge variant="secondary" className="px-1.5 py-0 text-[10px]">WC</Badge>
                            ) : null}
                            {d.certifications.medicalTransport ? (
                              <Badge variant="secondary" className="px-1.5 py-0 text-[10px]">Medical</Badge>
                            ) : null}
                            {!d.certifications.wheelchairAssist && !d.certifications.medicalTransport ? (
                              <span className="text-[11px] text-muted-foreground">Standard</span>
                            ) : null}
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {vehicle?.name ?? '—'}
                        </TableCell>
                        <TableCell>
                          <span className="flex items-center gap-1 text-sm">
                            <Star className="size-3.5 fill-warning text-warning" />
                            <span className="tabular-nums">{d.rating.toFixed(1)}</span>
                          </span>
                        </TableCell>
                        <TableCell>
                          <StatusBadge label={meta.label} cls={meta.cls} />
                        </TableCell>
                        <TableCell>
                          <RowActions
                            onEdit={() => openEdit(d)}
                            onDelete={() => fleet.deleteDriver(d.id, d.name)}
                            deleteTitle="Delete driver"
                            deleteMessage={`Remove ${d.name} from the roster?`}
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
        </ListLayout>
      </div>

      <DriverDialog open={dialogOpen} onOpenChange={setDialogOpen} editing={editing} />
    </div>
  )
}
