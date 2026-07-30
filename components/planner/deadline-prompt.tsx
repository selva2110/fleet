'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { CalendarClock, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useFleet } from '@/lib/store'
import { getPlanStatus } from '@/lib/planning-status'

/**
 * When a participant-notification event's response deadline has passed but no
 * route plan has been generated yet, surface a prominent prompt that lets the
 * dispatcher jump straight to the Route Planner and auto-generate the plan.
 *
 * This deliberately does NOT auto-navigate — it appears above the page content
 * so the dispatcher stays in control of their current screen.
 */
export function DeadlinePrompt() {
  const fleet = useFleet()
  const router = useRouter()
  const [dismissed, setDismissed] = useState<Record<string, boolean>>({})

  const dueEvents = useMemo(() => {
    return fleet.events
      .map((e) => ({ event: e, status: getPlanStatus(e, fleet.trips) }))
      .filter(
        ({ status }) =>
          status.notificationsEnabled &&
          status.deadlinePassed &&
          !status.hasPlan &&
          status.canGenerate,
      )
      .map(({ event }) => event)
  }, [fleet.events, fleet.trips])

  const pending = dueEvents.filter((e) => !dismissed[e.id])
  if (pending.length === 0) return null

  const first = pending[0]

  return (
    <div className="border-b border-warning/40 bg-warning/10 px-4 py-2.5">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-3">
        <CalendarClock className="size-5 shrink-0 text-warning-foreground" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-warning-foreground">
            Response deadline reached for {first.name}
          </p>
          <p className="text-xs text-warning-foreground/80">
            Participant responses are closed. Generate the route plan now.
            {pending.length > 1 ? ` (+${pending.length - 1} more event${pending.length > 2 ? 's' : ''})` : ''}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            onClick={() => router.push(`/planner?id=${first.id}&autoplan=1`)}
          >
            Open Route Planner
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="size-8"
            aria-label="Dismiss"
            onClick={() => setDismissed((d) => ({ ...d, [first.id]: true }))}
          >
            <X className="size-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}
