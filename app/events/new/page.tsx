'use client'

import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { EventForm } from '@/components/events/event-form'
import { useFleet } from '@/lib/store'

function NewEventInner() {
  const params = useSearchParams()
  const fleet = useFleet()
  const editId = params.get('id')
  const editing = editId ? fleet.eventById(editId) ?? null : null
  return <EventForm editing={editing} />
}

export default function NewEventPage() {
  return (
    <Suspense fallback={null}>
      <NewEventInner />
    </Suspense>
  )
}
