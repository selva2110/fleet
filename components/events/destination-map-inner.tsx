'use client'

import { MapboxSimpleMap } from '@/components/map/mapbox-simple'
import type { LatLng } from '@/lib/types'

export default function DestinationMapInner({
  location,
  label,
}: {
  location: LatLng
  label?: string
}) {
  return <MapboxSimpleMap location={location} label={label} className="h-full w-full" emptyMessage="The selected destination will appear here." />
}
