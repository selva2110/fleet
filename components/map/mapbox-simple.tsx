'use client'

import { useEffect, useMemo, useState } from 'react'
import Map, { Marker, Popup } from 'react-map-gl/mapbox'
import 'mapbox-gl/dist/mapbox-gl.css'
import { MAP_CENTER, MAP_ZOOM } from '@/lib/geo'
import type { LatLng } from '@/lib/types'
import { MapboxErrorBoundary } from '@/components/map/mapbox-error-boundary'

function isValidLocation(value: LatLng | null | undefined): value is LatLng {
  if (!value) return false
  return Number.isFinite(value.lat) && Number.isFinite(value.lng) && value.lat >= -90 && value.lat <= 90 && value.lng >= -180 && value.lng <= 180
}

type MapboxSimpleMapProps = {
  location: LatLng | null | undefined
  label?: string
  onLocationChange?: (value: LatLng) => void
  draggable?: boolean
  className?: string
  emptyMessage?: string
  placeholder?: string
}

export function MapboxSimpleMap({
  location,
  label,
  onLocationChange,
  draggable = false,
  className = 'h-56 w-full',
  emptyMessage = 'Enter an address to preview it on the map.',
  placeholder = 'Loading map…',
}: MapboxSimpleMapProps) {
  const mapboxToken = "pk.eyJ1Ijoic2l2YS1kaGFybWFyYWoiLCJhIjoiY21zNXR1dmhlMDBoMjM1cTRmb25veHRtdCJ9.W_F1SaLw8-6t3tiYNZmzEw"
  const mapStyle = `https://api.mapbox.com/styles/v1/mapbox/streets-v12?access_token=${encodeURIComponent(mapboxToken)}`
  const initialViewState = useMemo(() => ({
    longitude: isValidLocation(location) ? location.lng : MAP_CENTER.lng,
    latitude: isValidLocation(location) ? location.lat : MAP_CENTER.lat,
    zoom: MAP_ZOOM,
  }), [location])
  const [viewState, setViewState] = useState(initialViewState)

  useEffect(() => {
    if (isValidLocation(location)) {
      setViewState({
        longitude: location.lng,
        latitude: location.lat,
        zoom: 13,
      })
    }
  }, [location])

  if (!isValidLocation(location)) {
    return (
      <div className={`flex items-center justify-center rounded-md border border-border bg-muted px-4 text-sm text-muted-foreground ${className}`}>
        {emptyMessage}
      </div>
    )
  }

  return (
    <div className={`overflow-hidden rounded-md border border-border ${className}`}>
      <MapboxErrorBoundary
        fallback={
          <div className="flex h-full min-h-56 items-center justify-center bg-muted/40 px-4 text-center text-sm text-muted-foreground">
            Map preview is unavailable right now, but the selected location is still saved.
          </div>
        }
      >
        <Map
          {...viewState}
          onMove={(event) => setViewState(event.viewState)}
          mapboxAccessToken={mapboxToken || undefined}
          mapStyle={mapStyle}
          style={{ width: '100%', height: '100%' }}
          scrollZoom
          attributionControl={false}
        >
          <Marker
            longitude={location.lng}
            latitude={location.lat}
            draggable={draggable}
            onDragEnd={(event) => {
              if (onLocationChange) {
                const { lat, lng } = event.lngLat
                onLocationChange({ lat, lng })
              }
            }}
          >
            <div className="flex -translate-x-1/2 -translate-y-1/2 flex-col items-center">
              <div className="h-4 w-4 rounded-full border-2 border-white bg-blue-600 shadow-lg" />
              {label ? <span className="mt-1 rounded bg-background/90 px-2 py-0.5 text-[10px] font-medium text-foreground shadow">{label}</span> : null}
            </div>
          </Marker>
          {label ? (
            <Popup longitude={location.lng} latitude={location.lat} closeButton={false} closeOnClick={false} anchor="top">
              <div className="text-sm font-medium">{label}</div>
            </Popup>
          ) : null}
        </Map>
      </MapboxErrorBoundary>
    </div>
  )
}
