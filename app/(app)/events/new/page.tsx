'use client'

import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { EventForm } from '@/components/events/event-form'
import { useEvents } from '@/lib/events/hooks'
import { findById } from '@/lib/utils'

function NewEventInner() {
  const params = useSearchParams()
  const { events } = useEvents()
  const editId = params.get('id')
  const editing = editId ? findById(events, editId) ?? null : null
  return <EventForm editing={editing} />
}

export default function NewEventPage() {
  return (
    <Suspense fallback={null}>
      <NewEventInner />
    </Suspense>
  )
}
