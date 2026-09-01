'use client'

import { useMemo, useState } from 'react'
import { MapPin, Phone, Plus, Clock } from 'lucide-react'
import {
  PageHeader,
  ConstraintChips,
} from '@/components/common'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { RowActions } from '@/components/crud/row-actions'
import { ParticipantDialog } from '@/components/crud/participant-dialog'
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useParticipants, useParticipantMutations } from '@/lib/participant/hooks'
import { tableHeaderRow } from '@/components/aurora/aurora-ui';
import { ParticipantConfig } from '@/lib/participant/config';
import { Participant, TransportConstraints } from '@/lib/participant/types';
import { ParticipantUtils } from '@/lib/participant/utils';
import { useTranslation } from '@/components/context/language-provider';

export default function ParticipantsPage() {
  const { participants } = useParticipants()
  const { deleteParticipant } = useParticipantMutations()
  const {t} = useTranslation();
  const dv = useDataView('name', 'list')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Participant | null>(null)

  const [mobility, setMobility] = useState<string[]>([])
  const [priority, setPriority] = useState<string[]>([])
  const [eligibility, setEligibility] = useState<string[]>([])
  const [needs, setNeeds] = useState<string[]>([])

  const activeFilterCount =
    (mobility.length ? 1 : 0) +
    (priority.length ? 1 : 0) +
    (eligibility.length ? 1 : 0) +
    (needs.length ? 1 : 0)

  function resetFilters() {
    setMobility([])
    setPriority([])
    setEligibility([])
    setNeeds([])
  }

  const filtered = useMemo(() => {
    const q = dv.query.trim().toLowerCase()
    const list = participants.filter((p) => {
      const matchQuery =
        !q ||
        p.name.toLowerCase().includes(q) ||
        p.address.toLowerCase().includes(q) ||
        p.phone.toLowerCase().includes(q)
      const matchNeeds =
        needs.length === 0 ||
        needs.every((n) => p.constraints[n as keyof TransportConstraints])
      return matchQuery && matchNeeds
    })
    return list
  }, [
    participants,
    dv.query,
    dv.sortKey,
    dv.sortDir,
    mobility,
    priority,
    eligibility,
    needs,
  ])

  const pg = usePagination(filtered, 20)

  function openAdd() {
    setEditing(null)
    setDialogOpen(true)
  }
  function openEdit(p: Participant) {
    setEditing(p)
    setDialogOpen(true)
  }

  return (
    <div className="flex min-h-full flex-col">
      <PageHeader
        title={t('common.participants')}
        description={`${participants.length} ${t('part.needsTransport')}`}
        actions={
          <Button onClick={openAdd} size="sm">
            <Plus className="size-4" /> {t('e.addpart')}
          </Button>
        }
      />

      <div className="p-6">
        <ListLayout
          filters={
            <FilterRail activeCount={activeFilterCount} onReset={resetFilters}>
              <FilterSection title={t('part.specialneeds')}>
                <CheckboxGroupFilter options={ParticipantConfig.NEEDS_OPTIONS} selected={needs} onChange={setNeeds} />
              </FilterSection>
            </FilterRail>
          }
        >
          <div className="flex flex-col gap-6">
        <DataToolbar
          query={dv.query}
          onQueryChange={dv.setQuery}
          searchPlaceholder={t('part.searchplaceholder')}
          sortOptions={ParticipantConfig.SORT_OPTIONS}
          sortKey={dv.sortKey}
          onSortKeyChange={dv.setSortKey}
          sortDir={dv.sortDir}
          onToggleSortDir={dv.toggleSortDir}
          view={dv.view}
          onViewChange={dv.setView}
          resultCount={filtered.length}
        />

        {filtered.length === 0 ? (
          <EmptyState message={t('part.none')} />
        ) : dv.view === 'grid' ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {pg.pageItems.map((p) => {
              return (
                <Card key={p.id} className="flex flex-col justify-between p-4">
                  <div className="flex flex-col gap-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold">{p.name}</p>
                        <p className="flex items-center gap-1 text-xs text-muted-foreground">
                          <MapPin className="size-3 shrink-0" /> {p.address}
                        </p>
                        <p className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Phone className="size-3 shrink-0" /> {p.phone}
                        </p>
                      </div>
                      <RowActions
                        onEdit={() => openEdit(p)}
                        onDelete={() => deleteParticipant(p.id, p.name)}
                        deleteTitle={t('part.delete')}
                        deleteMessage={t('part.deleteConfirm').replace("{{name}}",p.name)}
                      />
                    </div>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="size-3" /> ≤ {p.maxTravelMinutes} {t('common.min')}
                    </div>
                  </div>
                  <div className="border-t border-border pt-2">
                    <ConstraintChips constraints={p.constraints} max={6} />
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
                    {tableHeaderRow([
                      t('common.sno'),
                      t('common.participant'),
                      t('part.bloodgroup'),
                      t('common.maxTravel'),
                      t('part.companionneeded'),
                      t('part.specialneeds'),
                    ])}
                    <TableHead className="w-10" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pg.pageItems.map((p) => {
                    return (
                      <TableRow key={p.id}>
                        <TableCell>
                          <p className="font-medium text-center">{p.idx}</p>
                        </TableCell>
                        <TableCell>
                          <p className="font-medium">{p.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {p.address
                              ? p.address.length > 50
                                ? `${p.address.slice(0, 50)}...`
                                : p.address
                              : t('common.noaddressavail')}
                          </p>
                          <p className="mt-0.5 flex items-center gap-1 text-[11px] text-muted-foreground">
                            <Phone className="size-3" /> {p.phone}
                          </p>
                        </TableCell>
                        <TableCell>
                          <p className="text-sm">{p.bloodGroup || '—'}</p>
                        </TableCell>
                        <TableCell>
                          <p className="flex items-center gap-1 text-sm text-muted-foreground">
                            <Clock className="size-3" /> ≤ {p.maxTravelMinutes} {t('common.min')}
                          </p>
                        </TableCell>
                        <TableCell>
                          {p.companionNeeded ? (
                            <div>
                              <p className="text-sm">{t('common.yes')}</p>
                              {p.companionDetails?.name ? (
                                <p className="text-xs text-muted-foreground">
                                  {p.companionDetails.name}
                                </p>
                              ) : null}
                            </div>
                          ) : (
                            <p className="text-sm text-muted-foreground">{t('common.no')}</p>
                          )}
                        </TableCell>
                        <TableCell>
                          <ConstraintChips
                            constraints={p.constraints}
                            max={4}
                          />
                        </TableCell>
                        <TableCell>
                          <RowActions
                            onEdit={() => openEdit(p)}
                            onDelete={() =>
                              deleteParticipant(p.id, p.name)
                            }
                            deleteTitle={t('part.delete')}
                            deleteMessage={t('part.deleteConfirm').replace("{{name}}",p.name)}
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
            itemLabel={t('common.participants')}
          />
        ) : null}
          </div>
        </ListLayout>
      </div>

      <ParticipantDialog open={dialogOpen} onOpenChange={setDialogOpen} editing={editing} />
    </div>
  )
}
