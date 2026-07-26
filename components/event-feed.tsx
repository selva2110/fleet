'use client'

import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'
import { EVENT_META, type DomainEvent } from '@/lib/events'

const TONE_DOT: Record<string, string> = {
  info: 'bg-primary',
  success: 'bg-success',
  warning: 'bg-warning',
  danger: 'bg-destructive',
  muted: 'bg-muted-foreground/40',
}

const TONE_TEXT: Record<string, string> = {
  info: 'text-primary',
  success: 'text-success',
  warning: 'text-warning-foreground',
  danger: 'text-destructive',
  muted: 'text-muted-foreground',
}

function useRelativeTime(iso: string) {
  const [, force] = useState(0)
  useEffect(() => {
    const id = setInterval(() => force((n) => n + 1), 5000)
    return () => clearInterval(id)
  }, [])
  const diff = Date.now() - new Date(iso).getTime()
  const s = Math.max(0, Math.round(diff / 1000))
  if (s < 5) return 'just now'
  if (s < 60) return `${s}s ago`
  const m = Math.round(s / 60)
  if (m < 60) return `${m}m ago`
  const h = Math.round(m / 60)
  return `${h}h ago`
}

function EventRow({ event, dense }: { event: DomainEvent; dense?: boolean }) {
  const meta = EVENT_META[event.eventType] ?? { label: event.eventType, tone: 'muted' as const }
  const rel = useRelativeTime(event.createdAt)
  return (
    <div className={cn('flex items-start gap-3', dense ? 'px-4 py-2' : 'px-4 py-2.5')}>
      <span className={cn('mt-1.5 size-2 shrink-0 rounded-full', TONE_DOT[meta.tone])} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <span className={cn('text-xs font-semibold', TONE_TEXT[meta.tone])}>{meta.label}</span>
          <span className="shrink-0 text-[10px] tabular-nums text-muted-foreground">{rel}</span>
        </div>
        <p className="truncate text-xs text-muted-foreground">{event.summary}</p>
      </div>
    </div>
  )
}

export function EventFeed({
  events,
  dense,
  emptyLabel = 'No activity yet.',
}: {
  events: DomainEvent[]
  dense?: boolean
  emptyLabel?: string
}) {
  if (events.length === 0) {
    return <p className="px-4 py-6 text-center text-xs text-muted-foreground">{emptyLabel}</p>
  }
  return (
    <div className="divide-y divide-border">
      {events.map((e) => (
        <EventRow key={e.id} event={e} dense={dense} />
      ))}
    </div>
  )
}
