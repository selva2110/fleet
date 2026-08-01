'use client'

import { useMemo, useState } from 'react'
import { MapPin, Phone, Plus, Clock } from 'lucide-react'
import {
  PageHeader,
  ConstraintChips,
  PriorityBadge,
  StatusBadge,
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
  compareValues,
  useDataView,
  type SortOption,
} from '@/components/data-view/data-view'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useFleet } from '@/lib/store'
import { participantStatusMeta, constraintLabels } from '@/lib/labels'
import type { MobilityLevel, Participant, TransportConstraints } from '@/lib/types'

const mobilityLabels: Record<MobilityLevel, string> = {
  independent: 'Independent',
  assisted: 'Assisted',
  wheelchair: 'Wheelchair',
  stretcher: 'Stretcher',
}

const MOBILITY_OPTIONS = Object.entries(mobilityLabels).map(([value, label]) => ({ value, label }))
const PRIORITY_OPTIONS = [
  { value: 'routine', label: 'Routine' },
  { value: 'elevated', label: 'Elevated' },
  { value: 'critical', label: 'Critical' },
]
const STATUS_OPTIONS = Object.entries(participantStatusMeta).map(([value, m]) => ({
  value,
  label: m.label,
}))
const ELIGIBILITY_OPTIONS = [
  { value: 'eligible', label: 'Eligible' },
  { value: 'ineligible', label: 'Not eligible' },
]
const NEEDS_OPTIONS = constraintLabels.map((c) => ({ value: c.key, label: c.label }))

const PRIORITY_RANK: Record<string, number> = { routine: 0, elevated: 1, critical: 2 }
const MOBILITY_RANK: Record<string, number> = {
  independent: 0,
  assisted: 1,
  wheelchair: 2,
  stretcher: 3,
}

const SORT_OPTIONS: SortOption[] = [
  { key: 'name', label: 'Name' },
  { key: 'medicalPriority', label: 'Priority' },
  { key: 'mobilityLevel', label: 'Mobility' },
  { key: 'status', label: 'Status' },
  { key: 'maxTravelMinutes', label: 'Max travel' },
]

export default function ParticipantsPage() {
  const fleet = useFleet()
  const dv = useDataView('name', 'list')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Participant | null>(null)

  const [mobility, setMobility] = useState<string[]>([])
  const [priority, setPriority] = useState<string[]>([])
  const [statuses, setStatuses] = useState<string[]>([])
  const [eligibility, setEligibility] = useState<string[]>([])
  const [needs, setNeeds] = useState<string[]>([])

  const activeFilterCount =
    (mobility.length ? 1 : 0) +
    (priority.length ? 1 : 0) +
    (statuses.length ? 1 : 0) +
    (eligibility.length ? 1 : 0) +
    (needs.length ? 1 : 0)

  function resetFilters() {
    setMobility([])
    setPriority([])
    setStatuses([])
    setEligibility([])
    setNeeds([])
  }

  function sortValue(p: Participant, key: string): unknown {
    if (key === 'medicalPriority') return PRIORITY_RANK[p.medicalPriority]
    if (key === 'mobilityLevel') return MOBILITY_RANK[p.mobilityLevel]
    return p[key as keyof Participant]
  }

  const filtered = useMemo(() => {
    const q = dv.query.trim().toLowerCase()
    const list = fleet.participants.filter((p) => {
      const matchQuery =
        !q ||
        p.name.toLowerCase().includes(q) ||
        p.address.toLowerCase().includes(q) ||
        p.phone.toLowerCase().includes(q)
      const matchMobility = mobility.length === 0 || mobility.includes(p.mobilityLevel)
      const matchPriority = priority.length === 0 || priority.includes(p.medicalPriority)
      const matchStatus = statuses.length === 0 || statuses.includes(p.status)
      const matchEligible =
        eligibility.length === 0 ||
        (eligibility.includes('eligible') && p.eligible) ||
        (eligibility.includes('ineligible') && !p.eligible)
      const matchNeeds =
        needs.length === 0 ||
        needs.every((n) => p.constraints[n as keyof TransportConstraints])
      return (
        matchQuery && matchMobility && matchPriority && matchStatus && matchEligible && matchNeeds
      )
    })
    return list.sort((a, b) =>
      compareValues(sortValue(a, dv.sortKey), sortValue(b, dv.sortKey), dv.sortDir),
    )
  }, [
    fleet.participants,
    dv.query,
    dv.sortKey,
    dv.sortDir,
    mobility,
    priority,
    statuses,
    eligibility,
    needs,
  ])

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
        title="Members"
        description={`${fleet.participants.length} registered · manage eligibility and transport needs.`}
        actions={
          <Button onClick={openAdd} size="sm">
            <Plus className="size-4" /> Add member
          </Button>
        }
      />

      <div className="p-6">
        <ListLayout
          filters={
            <FilterRail activeCount={activeFilterCount} onReset={resetFilters}>
              <FilterSection title="Mobility level">
                <CheckboxGroupFilter options={MOBILITY_OPTIONS} selected={mobility} onChange={setMobility} />
              </FilterSection>
              <FilterSection title="Medical priority">
                <CheckboxGroupFilter options={PRIORITY_OPTIONS} selected={priority} onChange={setPriority} />
              </FilterSection>
              <FilterSection title="Status">
                <CheckboxGroupFilter options={STATUS_OPTIONS} selected={statuses} onChange={setStatuses} />
              </FilterSection>
              <FilterSection title="Eligibility">
                <CheckboxGroupFilter options={ELIGIBILITY_OPTIONS} selected={eligibility} onChange={setEligibility} />
              </FilterSection>
              <FilterSection title="Special needs">
                <CheckboxGroupFilter options={NEEDS_OPTIONS} selected={needs} onChange={setNeeds} />
              </FilterSection>
            </FilterRail>
          }
        >
          <div className="flex flex-col gap-6">
        <DataToolbar
          query={dv.query}
          onQueryChange={dv.setQuery}
          searchPlaceholder="Search name, address, or phone"
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
          <EmptyState message="No members match your search and filters." />
        ) : dv.view === 'grid' ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {filtered.map((p) => {
              const meta = participantStatusMeta[p.status]
              return (
                <Card key={p.id} className="flex flex-col gap-3 p-4">
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
                      onDelete={() => fleet.deleteParticipant(p.id, p.name)}
                      deleteTitle="Delete participant"
                      deleteMessage={`Remove ${p.name}? This also clears their event assignment.`}
                    />
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <StatusBadge label={meta.label} cls={meta.cls} />
                    <PriorityBadge priority={p.medicalPriority} />
                    <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                      {mobilityLabels[p.mobilityLevel]}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="size-3" /> ≤ {p.maxTravelMinutes} min
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
                    <TableHead>Participant</TableHead>
                    <TableHead>Mobility</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Special Needs</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-10" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((p) => {
                    const meta = participantStatusMeta[p.status]
                    return (
                      <TableRow key={p.id}>
                        <TableCell>
                          <p className="font-medium">{p.name}</p>
                          <p className="text-xs text-muted-foreground">{p.address}</p>
                          <p className="mt-0.5 flex items-center gap-1 text-[11px] text-muted-foreground">
                            <Phone className="size-3" /> {p.phone}
                          </p>
                        </TableCell>
                        <TableCell className="text-sm">{mobilityLabels[p.mobilityLevel]}</TableCell>
                        <TableCell>
                          <PriorityBadge priority={p.medicalPriority} />
                        </TableCell>
                        <TableCell>
                          <ConstraintChips constraints={p.constraints} max={4} />
                        </TableCell>
                        <TableCell>
                          <StatusBadge label={meta.label} cls={meta.cls} />
                        </TableCell>
                        <TableCell>
                          <RowActions
                            onEdit={() => openEdit(p)}
                            onDelete={() => fleet.deleteParticipant(p.id, p.name)}
                            deleteTitle="Delete participant"
                            deleteMessage={`Remove ${p.name}? This also clears their event assignment.`}
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

      <ParticipantDialog open={dialogOpen} onOpenChange={setDialogOpen} editing={editing} />
    </div>
  )
}
