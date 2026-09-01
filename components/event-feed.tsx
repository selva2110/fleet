'use client'

import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'
import { actorDisplayName } from '@/lib/labels'
import { EventsConfig } from '@/lib/events/config';
import { DomainEvent } from '@/lib/events/types';
import { useTranslation } from './context/language-provider';

function useRelativeTime(iso: string) {
  const {t} = useTranslation()
  const [, force] = useState(0)
  useEffect(() => {
    const id = setInterval(() => force((n) => n + 1), 5000)
    return () => clearInterval(id)
  }, [])
  const diff = Date.now() - new Date(iso).getTime()
  const s = Math.max(0, Math.round(diff / 1000))
  if (s < 5) return t('time.justnow')
  if (s < 60) return t('time.secondsago').replace('{{s}}', String(s))
  const m = Math.round(s / 60)
  if (m < 60) return t('time.minutesago').replace('{{m}}', String(m))
  const h = Math.round(m / 60)
  return t('time.hoursago').replace('{{h}}', String(h))
}

function EventRow({ event, dense }: { event: DomainEvent; dense?: boolean }) {
  const {t} = useTranslation()
  const meta = EventsConfig.EVENT_META[event.eventType] ?? { label: event.eventType, tone: 'muted' as const }
  const rel = useRelativeTime(event.createdAt)
  return (
    <div className={cn('flex items-start gap-3', dense ? 'px-4 py-2' : 'px-4 py-2.5')}>
      <span className={cn('mt-1.5 size-2 shrink-0 rounded-full', EventsConfig.TONE_DOT[meta.tone])} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <span className={cn('text-xs font-semibold', EventsConfig.TONE_TEXT[meta.tone])}>{t(meta.label)}</span>
          <span className="shrink-0 text-[10px] tabular-nums text-muted-foreground">{rel}</span>
        </div>
        <p className="truncate text-xs text-muted-foreground">{event.summary}</p>
        <p className="mt-0.5 truncate text-[10px] text-muted-foreground/70">
          {t('common.by')} {t(actorDisplayName(event.actorRole))}
        </p>
      </div>
    </div>
  )
}

export function EventFeed({
  events,
  dense,
  emptyLabel,
}: {
  events: DomainEvent[]
  dense?: boolean
  emptyLabel?: string
}) {
  const {t} = useTranslation()
  if (events.length === 0) {
    return <p className="px-4 py-6 text-center text-xs text-muted-foreground">{emptyLabel ?? t('common.noactivityyet')}</p>
  }
  return (
    <div className="divide-y divide-border">
      {events.map((e) => (
        <EventRow key={e.id} event={e} dense={dense} />
      ))}
    </div>
  )
}
