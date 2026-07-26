'use client'

import { useMemo, useState } from 'react'
import { Phone, Plus, Search } from 'lucide-react'
import { PageHeader, ConstraintChips, PriorityBadge, StatusBadge } from '@/components/common'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { RowActions } from '@/components/crud/row-actions'
import { ParticipantDialog } from '@/components/crud/participant-dialog'
import type { Participant } from '@/lib/types'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useFleet } from '@/lib/store'
import { participantStatusMeta } from '@/lib/labels'
import type { MobilityLevel } from '@/lib/types'

const mobilityLabels: Record<MobilityLevel, string> = {
  independent: 'Independent',
  assisted: 'Assisted',
  wheelchair: 'Wheelchair',
  stretcher: 'Stretcher',
}

export default function ParticipantsPage() {
  const fleet = useFleet()
  const [query, setQuery] = useState('')
  const [mobility, setMobility] = useState<string>('all')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Participant | null>(null)

  function openAdd() {
    setEditing(null)
    setDialogOpen(true)
  }
  function openEdit(p: Participant) {
    setEditing(p)
    setDialogOpen(true)
  }

  const filtered = useMemo(() => {
    return fleet.participants.filter((p) => {
      const matchQuery =
        p.name.toLowerCase().includes(query.toLowerCase()) ||
        p.address.toLowerCase().includes(query.toLowerCase())
      const matchMobility = mobility === 'all' || p.mobilityLevel === mobility
      return matchQuery && matchMobility
    })
  }, [fleet.participants, query, mobility])

  return (
    <div className="flex min-h-full flex-col">
      <PageHeader
        title="Participants"
        description={`${fleet.participants.length} registered · manage eligibility and transport needs.`}
        actions={
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search name or address"
                className="w-56 pl-8"
              />
            </div>
            <Select value={mobility} onValueChange={(v) => setMobility(v ?? 'all')}>
              <SelectTrigger className="w-40">
                <SelectValue>
                  {(v) =>
                    v && v !== 'all'
                      ? (mobilityLabels[v as MobilityLevel] ?? 'All mobility')
                      : 'All mobility'
                  }
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All mobility</SelectItem>
                <SelectItem value="independent">Independent</SelectItem>
                <SelectItem value="assisted">Assisted</SelectItem>
                <SelectItem value="wheelchair">Wheelchair</SelectItem>
                <SelectItem value="stretcher">Stretcher</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={openAdd} size="sm">
              <Plus className="size-4" /> Add participant
            </Button>
          </div>
        }
      />

      <div className="p-6">
        <Card className="overflow-hidden py-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Participant</TableHead>
                  <TableHead>Mobility</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Special Needs</TableHead>
                  <TableHead>Pickup Window</TableHead>
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
                      <TableCell className="text-sm tabular-nums text-muted-foreground">
                        {p.pickupWindow}
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
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="py-10 text-center text-sm text-muted-foreground">
                      No participants match your filters.
                    </TableCell>
                  </TableRow>
                ) : null}
              </TableBody>
            </Table>
          </div>
        </Card>
      </div>

      <ParticipantDialog open={dialogOpen} onOpenChange={setDialogOpen} editing={editing} />
    </div>
  )
}
