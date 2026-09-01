'use client'

import { useEffect, useMemo, useState } from 'react'
import Map, { Marker, Popup } from 'react-map-gl/mapbox'
import 'mapbox-gl/dist/mapbox-gl.css'
import { COIMBATORE_MAP_CENTER, MAP_ZOOM } from '@/lib/geo'
import { MapboxErrorBoundary } from '@/components/map/mapbox-error-boundary'
import { MapboxSimpleMapProps } from '@/lib/fleetMap/types';
import { FleetmapUtils } from '@/lib/fleetMap/utils';
import { useTranslation } from '@/components/context/language-provider';

export function MapboxSimpleMap({
  location,
  label,
  onLocationChange,
  draggable = false,
  className = 'h-56 w-full',
  emptyMessage,
  placeholder,
}: MapboxSimpleMapProps) {
  const {t} = useTranslation()
  const resolvedEmptyMessage = emptyMessage ?? t('map.emptydefault')
  const mapboxToken = "pk.eyJ1Ijoic2l2YS1kaGFybWFyYWoiLCJhIjoiY21zNXR1dmhlMDBoMjM1cTRmb25veHRtdCJ9.W_F1SaLw8-6t3tiYNZmzEw";
  if(!mapboxToken){
    console.error("NEXT_PUBLIC_MAPBOX_TOKEN is not configured");
    return null;
  }
  const mapStyle = `https://api.mapbox.com/styles/v1/mapbox/streets-v12?access_token=${encodeURIComponent(mapboxToken)}`
  const initialViewState = useMemo(() => ({
    longitude: FleetmapUtils.isValidLocation(location) ? location.lng : COIMBATORE_MAP_CENTER.lng,
    latitude: FleetmapUtils.isValidLocation(location) ? location.lat : COIMBATORE_MAP_CENTER.lat,
    zoom: MAP_ZOOM,
  }), [location])
  const [viewState, setViewState] = useState(initialViewState)

  useEffect(() => {
    if (FleetmapUtils.isValidLocation(location)) {
      setViewState({
        longitude: location.lng,
        latitude: location.lat,
        zoom: 13,
      })
    }
  }, [location])

  if (!FleetmapUtils.isValidLocation(location)) {
    return (
      <div className={`flex items-center justify-center rounded-md border border-border bg-muted px-4 text-sm text-muted-foreground ${className}`}>
        {resolvedEmptyMessage}
      </div>
    )
  }

  return (
    <div className={`overflow-hidden rounded-md border border-border ${className}`}>
      <MapboxErrorBoundary
        fallback={
          <div className="flex h-full min-h-56 items-center justify-center bg-muted/40 px-4 text-center text-sm text-muted-foreground">
            {t('map.previewunavailable')}
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
