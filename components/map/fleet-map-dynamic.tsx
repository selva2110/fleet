'use client'

import dynamic from 'next/dynamic'
import { MapPin } from 'lucide-react'

const FleetMap = dynamic(() => import('./fleet-map'), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center bg-muted">
      <div className="flex flex-col items-center gap-2 text-muted-foreground">
        <MapPin className="h-6 w-6 animate-pulse" />
        <span className="text-sm">Loading map…</span>
      </div>
    </div>
  ),
})

export { FleetMap }
