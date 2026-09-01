'use client'

import dynamic from 'next/dynamic'
import { MapPin } from 'lucide-react'
import type { LatLng } from '@/lib/types'
import { useTranslation } from '@/components/context/language-provider'

function LoadingMap() {
  const {t} = useTranslation()
  return (
    <div className="flex h-full w-full items-center justify-center bg-muted text-muted-foreground">
      <div className="flex flex-col items-center gap-2">
        <MapPin className="size-6 animate-pulse" />
        <span className="text-sm">{t('map.loadingmap')}</span>
      </div>
    </div>
  )
}

const Inner = dynamic(() => import('./destination-map-inner'), {
  ssr: false,
  loading: LoadingMap,
})

export function DestinationMap({ location, label }: { location: LatLng | null; label?: string }) {
  const {t} = useTranslation()
  if (!location) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-muted px-4 text-center text-sm text-muted-foreground">
        <div className="flex flex-col items-center gap-2">
          <MapPin className="size-6" />
          <span>{t('map.selectdestinationpreview')}</span>
        </div>
      </div>
    )
  }
  return <Inner location={location} label={label} />
}
