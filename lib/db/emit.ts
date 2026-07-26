import { db } from './index'
import { eventLog } from './schema'
import type { EmitInput } from '@/lib/events'

// Appends a domain event to the persistent event_log table.
// This is the write side of the event-driven architecture: no mutation should
// happen without a corresponding event being recorded here for debugging/audit.
export async function emit(input: EmitInput) {
  await db.insert(eventLog).values({
    eventType: input.eventType,
    aggregateType: input.aggregateType,
    aggregateId: input.aggregateId ?? '',
    actorRole: input.actorRole ?? 'system',
    summary: input.summary,
    payload: input.payload ?? {},
  })
}
