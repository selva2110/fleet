'use client'

import { MapboxSimpleMap } from '@/components/map/mapbox-simple'
import type { LatLng } from '@/lib/types'
import { useTranslation } from '@/components/context/language-provider'

export default function DestinationMapInner({
  location,
  label,
}: {
  location: LatLng
  label?: string
}) {
  const {t} = useTranslation()
  return <MapboxSimpleMap location={location} label={label} className="h-full w-full" emptyMessage={t('map.destinationplaceholder')} />
}
