'use client'

import dynamic from 'next/dynamic'
import { MapPin } from 'lucide-react'
import type { LatLng } from '@/lib/types'

const Inner = dynamic(() => import('./destination-map-inner'), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center bg-muted text-muted-foreground">
      <div className="flex flex-col items-center gap-2">
        <MapPin className="size-6 animate-pulse" />
        <span className="text-sm">Loading map…</span>
      </div>
    </div>
  ),
})

export function DestinationMap({ location, label }: { location: LatLng | null; label?: string }) {
  if (!location) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-muted px-4 text-center text-sm text-muted-foreground">
        <div className="flex flex-col items-center gap-2">
          <MapPin className="size-6" />
          <span>Select a destination center to preview it on the map.</span>
        </div>
      </div>
    )
  }
  return <Inner location={location} label={label} />
}
