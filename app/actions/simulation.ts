'use server'

// The live-tracking tick loop now runs continuously inside trip-service
// (a server-side goroutine ticking every 2s) instead of being driven by the
// browser — see lib/store.tsx, which just polls the snapshot on the same
// interval instead of calling a per-tick action. These two just toggle
// trip-service's own running flag.

import * as tripsApi from '@/lib/api/trips'
import { emit } from '@/lib/api/events'

export async function startSimulation(actorRole = 'dispatcher') {
  await tripsApi.startSimulation()
  await emit({
    eventType: 'simulation.started',
    aggregateType: 'system',
    actorRole,
    summary: 'Live tracking started',
  })
}

export async function stopSimulation(actorRole = 'dispatcher') {
  await tripsApi.stopSimulation()
  await emit({
    eventType: 'simulation.stopped',
    aggregateType: 'system',
    actorRole,
    summary: 'Live tracking paused',
  })
}
