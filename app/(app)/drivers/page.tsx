'use client'

import { useMemo, useState } from 'react'
import {
  Accessibility,
  CircleCheck,
  Clock,
  HeartPulse,
  IdCard,
  Navigation,
  Phone,
  Plus,
  Star,
  Users,
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
  Pagination,
  compareValues,
  useDataView,
  usePagination,
} from '@/components/data-view/data-view'
import { useDrivers, useDriverMutations } from '@/lib/driver/hooks'
import { useVehicles } from '@/lib/vehicles/hooks'
import { formatShiftDays } from '@/lib/labels'
import { formatTimeOfDay } from '@/lib/date'
import { tableHeaderRow } from '@/components/aurora/aurora-ui';
import { DriversConfig } from '@/lib/driver/config';
import { Driver } from '@/lib/driver/types';
import { findById, initials } from '@/lib/utils';
import { useTranslation } from '@/components/context/language-provider';
import { useRouter } from 'next/navigation';

export default function DriversPage() {
  const { drivers } = useDrivers()
  const { deleteDriver } = useDriverMutations()
  const { vehicles } = useVehicles()
  const {t} = useTranslation();
  const router = useRouter()
  const dv = useDataView('name')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Driver | null>(null)

  const [statuses, setStatuses] = useState<string[]>([])
  const [certs, setCerts] = useState<string[]>([])
  const [assignment, setAssignment] = useState<string[]>([])

  const available = drivers.filter((d) => d.status === 'available').length
  const onTrip = drivers.filter((d) => d.status === 'on-trip').length
  const certified = drivers.filter(
    (d) => d.certifications.wheelchairAssist.enabled || d.certifications.medicalTransport.enabled,
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
    const list = drivers.filter((d) => {
      const matchQuery =
        !q ||
        d.name.toLowerCase().includes(q) ||
        d.mobile_number.toLowerCase().includes(q) ||
        d.license_number.toLowerCase().includes(q) ||
        d.address.toLowerCase().includes(q)
      const matchStatus = statuses.length === 0 || statuses.includes(d.status)
      const matchCerts =
        certs.length === 0 ||
        certs.every((c) => d.certifications[c as keyof Driver['certifications']].enabled)
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
  }, [drivers, dv.query, dv.sortKey, dv.sortDir, statuses, certs, assignment])

  const pg = usePagination(filtered, 20)

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
        title={t('common.drivers')}
        description={t('driver.desc')}
        actions={
          <Button onClick={openAdd} size="sm">
            <Plus className="size-4" /> {t('driver.add')}
          </Button>
        }
      />

      <div className="flex flex-col gap-6 p-6">
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard
            label={t('driver.totdr')}
            value={drivers.length}
            icon={Users}
          />
          <StatCard
            label={t('e.available')}
            value={available}
            icon={CircleCheck}
            tone="success"
          />
          <StatCard
            label={t('driver.onTrip')}
            value={onTrip}
            icon={Navigation}
            tone="primary"
          />
          <StatCard
            label={t('driver.medicalcert')}
            value={certified}
            icon={HeartPulse}
            tone="primary"
          />
        </div>

        <ListLayout
          filters={
            <FilterRail activeCount={activeFilterCount} onReset={resetFilters}>
              <FilterSection title={t('common.status')}>
                <CheckboxGroupFilter
                  options={DriversConfig.STATUS_OPTIONS}
                  selected={statuses}
                  onChange={setStatuses}
                />
              </FilterSection>
              <FilterSection title={t('common.cert')}>
                <CheckboxGroupFilter
                  options={DriversConfig.CERT_OPTIONS}
                  selected={certs}
                  onChange={setCerts}
                />
              </FilterSection>
            </FilterRail>
          }
        >
          <div className="flex flex-col gap-6">
            <DataToolbar
              query={dv.query}
              onQueryChange={dv.setQuery}
              searchPlaceholder={t('driver.searchplaceholder')}
              sortOptions={DriversConfig.SORT_OPTIONS}
              sortKey={dv.sortKey}
              onSortKeyChange={dv.setSortKey}
              sortDir={dv.sortDir}
              onToggleSortDir={dv.toggleSortDir}
              view={dv.view}
              onViewChange={dv.setView}
              resultCount={filtered.length}
            />

            {filtered.length === 0 ? (
              <EmptyState message={t('driver.none')} />
            ) : dv.view === "grid" ? (
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {pg.pageItems.map((d) => {
                  const meta = DriversConfig.driverStatusMeta[d.status];
                  const vehicle = d.assignedVehicleId
                    ? findById(vehicles, d.assignedVehicleId)
                    : undefined;
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
                            <p className="truncate text-sm font-semibold">
                              {d.name}
                            </p>
                            <div className="flex items-center gap-1">
                              <StatusBadge label={t(meta.label)} cls={meta.cls} />
                              <RowActions
                                onEdit={() => openEdit(d)}
                                onDelete={() =>
                                  deleteDriver(d.id, d.name)
                                }
                                onPto={() => router.push(`/drivers/pto?driverId=${d.id}`)}
                                deleteTitle={t('driver.delete')}
                                deleteMessage={t('driver.deletcnfrm').replace("{{name}}",d.name)}
                              />
                            </div>
                          </div>
                          <p className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Phone className="size-3" /> {d.mobile_number}
                          </p>
                          <p className="flex items-center gap-1 text-xs text-muted-foreground">
                            <IdCard className="size-3" /> {d.license_number}
                          </p>
                          <p className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Clock className="size-3" /> {formatTimeOfDay(d.shiftStart)}–
                            {formatTimeOfDay(d.shiftEnd)} · {t(formatShiftDays(d.shiftDays))}
                          </p>
                        </div>
                      </div>

                      <div className="mt-3 flex items-center justify-between border-t border-border pt-3">
                        <div className="flex items-center gap-1 text-sm">
                          <Star className="size-3.5 fill-warning text-warning" />
                          <span className="font-medium tabular-nums">
                            {d.rating.toFixed(1)}
                          </span>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {vehicle ? vehicle.name : t('driver.novhassign')}
                        </span>
                      </div>

                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {d.certifications.wheelchairAssist.enabled ? (
                          <Badge
                            variant="secondary"
                            className="gap-1 px-1.5 py-0 text-[10px]"
                          >
                            <Accessibility className="size-3" />{t('driver.whassist')}
                          </Badge>
                        ) : null}
                        {d.certifications.medicalTransport.enabled ? (
                          <Badge
                            variant="secondary"
                            className="gap-1 px-1.5 py-0 text-[10px]"
                          >
                            <HeartPulse className="size-3" /> {t('driver.medtrans')}
                          </Badge>
                        ) : null}
                        {!d.certifications.wheelchairAssist.enabled &&
                        !d.certifications.medicalTransport.enabled ? (
                          <span className="text-[11px] text-muted-foreground">
                            {t('driver.standarcert')}
                          </span>
                        ) : null}
                      </div>
                    </Card>
                  );
                })}
              </div>
            ) : (
              <Card className="overflow-hidden py-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        {tableHeaderRow([
                          t('common.driver'),
                          t('driver.license'),
                          t('common.shift'),
                          t('common.cert'),
                          t('driver.vh'),
                          t('driver.rating'),
                          t('common.status'),
                        ])}
                        <TableHead className="w-10" />
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pg.pageItems.map((d) => {
                        const meta = DriversConfig.driverStatusMeta[d.status];
                        const vehicle = d.assignedVehicleId
                          ? findById(vehicles, d.assignedVehicleId)
                          : undefined;
                        return (
                          <TableRow key={d.id}>
                            <TableCell>
                              <p className="font-medium text-center">{d.idx}</p>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2.5">
                                <Avatar className="size-8">
                                  <AvatarFallback className="bg-primary/10 text-xs font-medium text-primary">
                                    {initials(d.name)}
                                  </AvatarFallback>
                                </Avatar>
                                <div>
                                  <p className="text-sm font-medium">
                                    {d.name}
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    {d.mobile_number}
                                  </p>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className="font-mono text-xs">
                              {d.license_number}
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground">
                              {formatTimeOfDay(d.shiftStart)}–{formatTimeOfDay(d.shiftEnd)}
                              <br />
                              {t(formatShiftDays(d.shiftDays))}
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-wrap gap-1">
                                {d.certifications.wheelchairAssist.enabled ? (
                                  <Badge
                                    variant="secondary"
                                    className="px-1.5 py-0 text-[10px]"
                                  >
                                    {t('common.wcAbbrev')}
                                  </Badge>
                                ) : null}
                                {d.certifications.medicalTransport.enabled ? (
                                  <Badge
                                    variant="secondary"
                                    className="px-1.5 py-0 text-[10px]"
                                  >
                                    {t("driver.medical")}
                                  </Badge>
                                ) : null}
                                {!d.certifications.wheelchairAssist.enabled &&
                                !d.certifications.medicalTransport.enabled ? (
                                  <span className="text-[11px] text-muted-foreground">
                                    {t("driver.standard")}
                                  </span>
                                ) : null}
                              </div>
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {vehicle?.name ?? "—"}
                            </TableCell>
                            <TableCell>
                              <span className="flex items-center gap-1 text-sm">
                                <Star className="size-3.5 fill-warning text-warning" />
                                <span className="tabular-nums">
                                  {d.rating.toFixed(1)}
                                </span>
                              </span>
                            </TableCell>
                            <TableCell>
                              <StatusBadge label={t(meta.label)} cls={meta.cls} />
                            </TableCell>
                            <TableCell>
                              <RowActions
                                onEdit={() => openEdit(d)}
                                onDelete={() =>
                                  deleteDriver(d.id, d.name)
                                }
                                onPto={() => router.push(`/drivers/pto?driverId=${d.id}`)}
                                deleteTitle={t('driver.delete')}
                                deleteMessage={t('driver.deletcnfrm').replace('{{name}}', d.name)}
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
                itemLabel={t('common.drivers').toLowerCase()}
              />
            ) : null}
          </div>
        </ListLayout>
      </div>

      <DriverDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        editing={editing}
      />
    </div>
  );
}
