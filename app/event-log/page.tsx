'use client'

import { useMemo, useState } from 'react'
import { Database, Filter, RotateCcw } from 'lucide-react'
import { PageHeader } from '@/components/common'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import { useFleet } from '@/lib/store'
import { EVENT_META, type AggregateType } from '@/lib/events'

const FILTERS: { value: 'all' | AggregateType; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'trip', label: 'Trips' },
  { value: 'participant', label: 'Participants' },
  { value: 'vehicle', label: 'Vehicles' },
  { value: 'driver', label: 'Drivers' },
  { value: 'event', label: 'Events' },
  { value: 'plan', label: 'Plans' },
  { value: 'system', label: 'System' },
]

const TONE_DOT: Record<string, string> = {
  info: 'bg-primary',
  success: 'bg-success',
  warning: 'bg-warning',
  danger: 'bg-destructive',
  muted: 'bg-muted-foreground/40',
}

export default function EventLogPage() {
  const fleet = useFleet()
  const [filter, setFilter] = useState<'all' | AggregateType>('all')
  const [expanded, setExpanded] = useState<number | null>(null)
  const [resetOpen, setResetOpen] = useState(false)
  const [resetting, setResetting] = useState(false)

  const filtered = useMemo(
    () => (filter === 'all' ? fleet.eventLog : fleet.eventLog.filter((e) => e.aggregateType === filter)),
    [fleet.eventLog, filter],
  )

  async function doReset() {
    setResetting(true)
    try {
      await fleet.reseed()
      setResetOpen(false)
    } finally {
      setResetting(false)
    }
  }

  return (
    <div className="flex min-h-full flex-col">
      <PageHeader
        title="Event Log"
        description="Every state change is persisted to Postgres as a domain event for debugging and audit."
        actions={
          <Button variant="outline" size="sm" onClick={() => setResetOpen(true)}>
            <RotateCcw className="size-4" /> Reset database
          </Button>
        }
      />

      <div className="flex flex-col gap-4 p-6">
        <div className="flex flex-wrap items-center gap-2">
          <span className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <Filter className="size-3.5" /> Filter
          </span>
          {FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              className={cn(
                'rounded-full border px-3 py-1 text-xs font-medium transition-colors',
                filter === f.value
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'border-border bg-card text-muted-foreground hover:bg-muted',
              )}
            >
              {f.label}
            </button>
          ))}
          <span className="ml-auto flex items-center gap-1.5 text-xs text-muted-foreground">
            <Database className="size-3.5" /> {fleet.eventLog.length} events persisted
          </span>
        </div>

        <Card className="overflow-hidden py-0">
          <ScrollArea className="h-[calc(100vh-260px)]">
            <div className="divide-y divide-border font-mono text-xs">
              {filtered.map((e) => {
                const meta = EVENT_META[e.eventType] ?? { label: e.eventType, tone: 'muted' as const }
                const isOpen = expanded === e.id
                return (
                  <div key={e.id}>
                    <button
                      onClick={() => setExpanded(isOpen ? null : e.id)}
                      className="flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-muted/50"
                    >
                      <span className="w-16 shrink-0 tabular-nums text-muted-foreground">
                        #{e.id}
                      </span>
                      <span className={cn('size-2 shrink-0 rounded-full', TONE_DOT[meta.tone])} />
                      <span className="w-40 shrink-0 truncate text-foreground">{e.eventType}</span>
                      <Badge variant="secondary" className="shrink-0 px-1.5 py-0 text-[10px]">
                        {e.aggregateType}
                      </Badge>
                      <span className="flex-1 truncate text-muted-foreground">{e.summary}</span>
                      <span className="shrink-0 text-[10px] text-muted-foreground">
                        {new Date(e.createdAt).toLocaleTimeString()}
                      </span>
                    </button>
                    {isOpen ? (
                      <div className="border-t border-border bg-muted/40 px-4 py-3">
                        <div className="grid grid-cols-[100px_1fr] gap-x-3 gap-y-1 text-[11px]">
                          <span className="text-muted-foreground">actor</span>
                          <span>{e.actorRole}</span>
                          <span className="text-muted-foreground">aggregateId</span>
                          <span>{e.aggregateId || '—'}</span>
                          <span className="text-muted-foreground">timestamp</span>
                          <span>{new Date(e.createdAt).toISOString()}</span>
                          <span className="text-muted-foreground">payload</span>
                          <pre className="overflow-x-auto whitespace-pre-wrap break-all rounded bg-card p-2 text-[10px]">
                            {JSON.stringify(e.payload, null, 2)}
                          </pre>
                        </div>
                      </div>
                    ) : null}
                  </div>
                )
              })}
              {filtered.length === 0 ? (
                <p className="px-4 py-10 text-center text-muted-foreground">No events for this filter.</p>
              ) : null}
            </div>
          </ScrollArea>
        </Card>
      </div>

      <Dialog open={resetOpen} onOpenChange={setResetOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Reset database</DialogTitle>
            <DialogDescription>
              This wipes all tables and re-seeds fresh demo data, including a new event log. This cannot
              be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter showCloseButton>
            <Button variant="destructive" onClick={doReset} disabled={resetting}>
              {resetting ? 'Resetting…' : 'Reset & reseed'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
