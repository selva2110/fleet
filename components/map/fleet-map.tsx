'use client'

import { Fragment, useEffect, useMemo, useRef, useState } from 'react'
import Map, { Layer, Marker, Source, type MapRef } from 'react-map-gl/mapbox'
import 'mapbox-gl/dist/mapbox-gl.css'
import { MAP_CENTER, MAP_ZOOM, bearingDegrees, pointAlongPath } from '@/lib/geo'
import { mealStatusMeta, tripStatusMeta, vehicleStatusMeta } from '@/lib/labels'
import { MapboxErrorBoundary } from '@/components/map/mapbox-error-boundary'
import { Vehicles3DLayer, type Vehicle3D } from '@/components/map/vehicles-3d-layer'
import type {
  Center,
  LatLng,
  MealDelivery,
  MealStop,
  Participant,
  Trip,
  TripStop,
  Vehicle,
} from '@/lib/types'

function mealVehicleIconMarkup(m: MealDelivery, highlighted: boolean) {
  const color = mealStatusMeta[m.status].map
  const pulse = m.status === 'en-route' || m.status === 'delivering'
  const size = highlighted ? 36 : 30
  return `
    <div class="map-marker ${pulse ? 'map-marker-pulse' : ''}" style="--pulse-color:${color}66;width:${size}px;height:${size}px;background:${color};${highlighted ? 'outline:3px solid rgba(217,119,6,.4);' : ''}">
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">
        <path d="M3 7h9v8H3zM12 10h4l3 3v2h-7z" fill="white" fill-opacity="0.18" />
        <circle cx="7" cy="16.5" r="1.6" fill="white" stroke="none" />
        <circle cx="16" cy="16.5" r="1.6" fill="white" stroke="none" />
        <path d="M6 4.5c1.6 0 1.6 1.4 3 1.4s1.4-1.4 3-1.4" />
      </svg>
    </div>`
}

function mealStopIconMarkup(delivered: boolean) {
  const color = delivered ? '#059669' : '#d97706'
  return `
    <div class="map-marker" style="width:16px;height:16px;background:${color};border-width:2px;border-radius:4px;">
      <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
        ${delivered ? '<path d="M5 13l4 4L19 7" />' : '<path d="M4 8h16v11H4zM4 8l2-3h12l2 3" />'}
      </svg>
    </div>`
}

function centerIconMarkup() {
  return `
    <div class="map-marker" style="width:30px;height:30px;background:#0f172a;border-radius:8px;">
      <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="white" stroke-width="1.8" stroke-linecap="round">
        <path d="M10 4v12M4 10h12" />
      </svg>
    </div>`
}

function participantIconMarkup(p: Participant, active: boolean) {
  const color = p.medicalPriority === 'critical' ? '#dc2626' : p.medicalPriority === 'elevated' ? '#d97706' : '#2563eb'
  const size = active ? 16 : 13
  return `<div class="map-marker" style="width:${size}px;height:${size}px;background:${color};border-width:2px;"></div>`
}

function isValidLatLng(value: LatLng | null | undefined): value is LatLng {
  if (!value) return false
  return Number.isFinite(value.lat) && Number.isFinite(value.lng) && value.lat >= -90 && value.lat <= 90 && value.lng >= -180 && value.lng <= 180
}

function toLngLat(value: LatLng | null | undefined): [number, number] | null {
  if (!isValidLatLng(value)) return null
  return [value.lng, value.lat]
}

function toLineCoordinates(points: Array<LatLng | null | undefined>): [number, number][] {
  return points.map(toLngLat).filter((point): point is [number, number] => point !== null)
}

type TrafficResult = {
  available: boolean
  routePath?: LatLng[]
  travelTimeMinutes?: number
  trafficDelayMinutes?: number
  updatedAt?: string
}

function LiveTraffic({
  routes,
  onResult,
}: {
  routes: {
    origin: LatLng;
    stops: TripStop[];
    destination: LatLng;
    fallbackMinutes: number;
  }[];
  onResult: (index: number, result: TrafficResult) => void;
}) {
  useEffect(() => {
    let cancelled = false
    async function loadTraffic() {
      await Promise.all(
        routes.map(async (route, index) => {
          const points = [route.origin, ...route.stops.map((stop) => stop.location), route.destination].filter(isValidLatLng)
          try {
            const response = await fetch('/api/traffic/route', {
              method: 'POST',
              headers: { 'content-type': 'application/json' },
              body: JSON.stringify({ points }),
            })
            const result = (await response.json()) as TrafficResult
            if (!cancelled) {
              onResult(index, result)
            }
          } catch {
            if (!cancelled) {
              onResult(index, { available: false })
            }
          }
        }),
      )
    }
    void loadTraffic()
    const refresh = window.setInterval(() => {
      void loadTraffic()
    }, 60_000)
    return () => {
      cancelled = true
      window.clearInterval(refresh)
    }
  }, [routes, onResult])
  return null
}

export interface FleetMapProps {
  centers: Center[];
  vehicles: Vehicle[];
  trips: Trip[];
  mealDeliveries?: MealDelivery[];
  participants?: Participant[];
  highlightTripId?: string | null;
  highlightVehicleId?: string | null;
  highlightMealId?: string | null;
  onSelectTrip?: (tripId: string) => void;
  onSelectMeal?: (mealId: string) => void;
  fitTo?: LatLng[];
  recommendedRoute?: {
    routePath: LatLng[];
    stops: TripStop[];
    routeId: string;
    origin?: LatLng;
    destination?: LatLng;
    fallbackMinutes?: number;
  }[];
  className?: string;
  recommendedRouteId?: string;
  setRecommendedRoute?: (routeId: string | null) => void;
}

export default function FleetMap({
  centers,
  vehicles,
  trips,
  mealDeliveries = [],
  participants = [],
  highlightTripId,
  highlightVehicleId,
  highlightMealId,
  onSelectTrip,
  onSelectMeal,
  fitTo,
  recommendedRoute,
  setRecommendedRoute,
  recommendedRouteId,
}: FleetMapProps) {
  const activeMeals = mealDeliveries.filter((m) => m.status !== 'cancelled')
  const activeTrips = trips.filter((t) => !['cancelled'].includes(t.status))
  const [traffic, setTraffic] = useState<TrafficResult | null>(null)
  const [viewState, setViewState] = useState({
    longitude: Number.isFinite(MAP_CENTER.lng) ? MAP_CENTER.lng : -73.9911,
    latitude: Number.isFinite(MAP_CENTER.lat) ? MAP_CENTER.lat : 40.7359,
    zoom: Number.isFinite(MAP_ZOOM) ? MAP_ZOOM : 13,
  })
  const mapRef = useRef<MapRef | null>(null)
  const mapStyle = 'mapbox://styles/mapbox/streets-v12'
  const mapboxToken = (process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? process.env.MAPBOX_TOKEN ?? '').trim()

  const selectedRoute = recommendedRoute?.find((route) => route.routeId === recommendedRouteId)
  const liveRoute = useMemo(() => {
    if (!selectedRoute?.origin || !selectedRoute.destination) return []

    return [
      {
        origin: selectedRoute.origin,
        stops: selectedRoute.stops,
        destination: selectedRoute.destination,
        fallbackMinutes: selectedRoute.fallbackMinutes ?? 0,
      },
    ]
  }, [selectedRoute])

  const displayedRoutePath = traffic?.routePath?.length ? traffic.routePath : selectedRoute?.routePath

  // Build the 3D vehicle set, deriving each vehicle's heading from the
  // direction of travel along its active trip's route path.
  const vehicles3D = useMemo<Vehicle3D[]>(() => {
    return vehicles
      .filter((v) => isValidLatLng(v.location))
      .map((v) => {
        const trip = activeTrips.find(
          (t) =>
            t.vehicleId === v.id &&
            ['assigned', 'heading-to-pickup', 'onboard', 'at-destination'].includes(t.status),
        )
        let heading = 0
        if (trip?.routePath && trip.routePath.length >= 2) {
          const p = trip.progress ?? 0
          const cur = pointAlongPath(trip.routePath, Math.min(0.98, p))
          const ahead = pointAlongPath(trip.routePath, Math.min(1, p + 0.04))
          heading = bearingDegrees(cur, ahead)
        }
        return {
          id: v.id,
          lng: v.location.lng,
          lat: v.location.lat,
          heading,
          color: vehicleStatusMeta[v.status].map,
          highlighted: v.id === highlightVehicleId,
        }
      })
  }, [vehicles, activeTrips, highlightVehicleId])

  useEffect(() => {
    if (!fitTo || fitTo.length < 2 || !mapRef.current) return
    const validFitPoints = fitTo.filter(isValidLatLng)
    if (validFitPoints.length < 2) return
    const bounds = validFitPoints.reduce(
      (acc, point) => {
        acc[0] = Math.min(acc[0], point.lng)
        acc[1] = Math.min(acc[1], point.lat)
        acc[2] = Math.max(acc[2], point.lng)
        acc[3] = Math.max(acc[3], point.lat)
        return acc
      },
      [Infinity, Infinity, -Infinity, -Infinity] as [number, number, number, number],
    )
    mapRef.current.fitBounds([
      [bounds[0], bounds[1]],
      [bounds[2], bounds[3]],
    ], { padding: 48, maxZoom: 15 })
  }, [fitTo])

  const fallbackContent = (
    <div className="absolute inset-0 z-10 flex items-center justify-center px-6 text-center text-sm text-muted-foreground">
      <div className="max-w-sm rounded-lg border border-border/70 bg-background/90 px-4 py-3 shadow-sm">
        <p className="font-medium text-foreground">Map preview unavailable</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Route recommendations are still available, but the live map view is temporarily unavailable.
        </p>
      </div>
    </div>
  )

  return (
    <div className="relative h-full w-full overflow-hidden rounded-xl border border-border bg-muted/30">
      {!mapboxToken ? fallbackContent : null}

      <MapboxErrorBoundary fallback={fallbackContent}>
        <Map
          ref={mapRef}
          {...viewState}
          onMove={(evt) => setViewState(evt.viewState)}
          mapboxAccessToken={mapboxToken}
          mapStyle={mapStyle}
          style={{ width: '100%', height: '100%' }}
        >
        {fitTo && fitTo.length > 1 ? null : null}
        <Vehicles3DLayer vehicles={vehicles3D} />
        {liveRoute.length > 0 ? (
          <LiveTraffic
            routes={liveRoute}
            onResult={(_, result) => {
              setTraffic(result)
            }}
          />
        ) : null}

        {activeTrips.map((t) => {
          const highlighted = t.id === highlightTripId
          const color = tripStatusMeta[t.status].map
          const coordinates = toLineCoordinates(t.routePath)
          if (coordinates.length < 2) return null
          return (
            <Fragment key={`route-${t.id}`}>
              <Source
                id={`trip-route-${t.id}`}
                type="geojson"
                data={{
                  type: 'FeatureCollection',
                  features: [
                    {
                      type: 'Feature',
                      geometry: {
                        type: 'LineString',
                        coordinates,
                      },
                      properties: {},
                    },
                  ],
                }}
              />
              <Layer
                id={`trip-route-layer-${t.id}`}
                type="line"
                source={`trip-route-${t.id}`}
                paint={{
                  'line-color': color,
                  'line-width': highlighted ? 5 : 3,
                  'line-opacity': highlightTripId && !highlighted ? 0.25 : 0.8,
                }}
                layout={{ 'line-cap': 'round', 'line-join': 'round' }}
              />
            </Fragment>
          )
        })}

        {recommendedRoute?.map((route) => {
          const path = route.routeId === recommendedRouteId ? (displayedRoutePath ?? route.routePath) : route.routePath
          const coordinates = toLineCoordinates(path)
          const color = recommendedRouteId === route.routeId ? '#2563eb' : '#000000'
          return (
            <Fragment key={route.routeId}>
              {coordinates.length >= 2 ? (
                <>
                  <Source
                    id={`recommended-route-${route.routeId}`}
                    type="geojson"
                    data={{
                      type: 'FeatureCollection',
                      features: [
                        {
                          type: 'Feature',
                          geometry: {
                            type: 'LineString',
                            coordinates,
                          },
                          properties: {},
                        },
                      ],
                    }}
                  />
                  <Layer
                    id={`recommended-route-layer-${route.routeId}`}
                    type="line"
                    source={`recommended-route-${route.routeId}`}
                    paint={{
                      'line-color': color,
                      'line-width': recommendedRouteId === route.routeId ? 6 : 4,
                      'line-opacity': recommendedRouteId === route.routeId ? 1 : 0.5,
                    }}
                    layout={{ 'line-cap': 'round', 'line-join': 'round' }}
                  />
                </>
              ) : null}
              {route.stops.filter((s) => isValidLatLng(s.location)).map((s) => {
                const point = toLngLat(s.location)
                if (!point) return null
                return (
                  <Marker
                    key={`${route.routeId}-${s.participantId}`}
                    longitude={point[0]}
                    latitude={point[1]}
                    anchor="center"
                    onClick={() => {
                      setRecommendedRoute?.(recommendedRouteId === route.routeId ? null : route.routeId)
                    }}
                  >
                    <div className="pointer-events-auto" dangerouslySetInnerHTML={{ __html: participantIconMarkup({ medicalPriority: 'routine' } as Participant, true) }} />
                  </Marker>
                )
              })}
            </Fragment>
          )
        })}

        {recommendedRouteId && selectedRoute ? (
          <div className="pointer-events-none absolute bottom-3 left-3 z-10 rounded-lg border border-border bg-card/95 px-3 py-2 text-xs shadow-sm backdrop-blur">
            <p className="font-semibold text-foreground">{traffic?.available ? 'Live traffic' : 'Estimated traffic'}</p>
            <p className="text-muted-foreground">
              {traffic?.available
                ? `${traffic.travelTimeMinutes} min travel time${traffic.trafficDelayMinutes ? ` · +${traffic.trafficDelayMinutes} min delay` : ' · no delay'}`
                : `${selectedRoute.fallbackMinutes ?? '--'} min estimated travel time`}
            </p>
            {traffic?.available && traffic.updatedAt ? (
              <p className="mt-0.5 text-[10px] text-muted-foreground">Updated {new Date(traffic.updatedAt).toLocaleTimeString()}</p>
            ) : null}
          </div>
        ) : null}

        {highlightTripId
          ? activeTrips
              .filter((t) => t.id === highlightTripId)
              .flatMap((t) =>
                t.stops.filter((s) => isValidLatLng(s.location)).map((s) => {
                  const point = toLngLat(s.location)
                  if (!point) return null
                  return (
                    <Marker key={`stop-${t.id}-${s.participantId}`} longitude={point[0]} latitude={point[1]} anchor="center">
                      <div className="pointer-events-auto" dangerouslySetInnerHTML={{ __html: participantIconMarkup({ medicalPriority: 'routine' } as Participant, true) }} />
                    </Marker>
                  )
                }),
              )
          : null}

        {participants.filter((p) => isValidLatLng(p.location)).map((p) => {
          const point = toLngLat(p.location)
          if (!point) return null
          return (
            <Marker key={`p-${p.id}`} longitude={point[0]} latitude={point[1]} anchor="center">
              <div className="pointer-events-auto" dangerouslySetInnerHTML={{ __html: participantIconMarkup(p, false) }} />
            </Marker>
          )
        })}

        {activeMeals.map((m) => {
          const highlighted = m.id === highlightMealId
          const color = mealStatusMeta[m.status].map
          const coordinates = toLineCoordinates(m.routePath)
          return (
            <Fragment key={`meal-${m.id}`}>
              {coordinates.length >= 2 ? (
                <>
                  <Source
                    id={`meal-route-${m.id}`}
                    type="geojson"
                    data={{
                      type: 'FeatureCollection',
                      features: [
                        {
                          type: 'Feature',
                          geometry: {
                            type: 'LineString',
                            coordinates,
                          },
                          properties: {},
                        },
                      ],
                    }}
                  />
                  <Layer
                    id={`meal-route-layer-${m.id}`}
                    type="line"
                    source={`meal-route-${m.id}`}
                    paint={{
                      'line-color': color,
                      'line-width': highlighted ? 5 : 3,
                      'line-opacity': highlightMealId && !highlighted ? 0.2 : 0.75,
                    }}
                    layout={{ 'line-cap': 'round', 'line-join': 'round' }}
                  />
                </>
              ) : null}
              {m.stops.filter((s) => isValidLatLng(s.location)).map((s: MealStop) => {
                const point = toLngLat(s.location)
                if (!point) return null
                return (
                  <Marker key={`meal-stop-${m.id}-${s.participantId}`} longitude={point[0]} latitude={point[1]} anchor="center">
                    <div className="pointer-events-auto" dangerouslySetInnerHTML={{ __html: mealStopIconMarkup(s.status === 'delivered') }} />
                  </Marker>
                )
              })}
              {(() => {
                const point = toLngLat(m.currentLocation)
                if (!point) return null
                return (
                  <Marker longitude={point[0]} latitude={point[1]} anchor="center" onClick={() => onSelectMeal?.(m.id)}>
                    <div className="pointer-events-auto" dangerouslySetInnerHTML={{ __html: mealVehicleIconMarkup(m, highlighted) }} />
                  </Marker>
                )
              })()}
            </Fragment>
          )
        })}

        {centers.filter((c) => isValidLatLng(c.location)).map((c) => {
          const point = toLngLat(c.location)
          if (!point) return null
          return (
            <Marker key={`c-${c.id}`} longitude={point[0]} latitude={point[1]} anchor="center">
              <div className="pointer-events-auto" dangerouslySetInnerHTML={{ __html: centerIconMarkup() }} />
            </Marker>
          )
        })}

        {/* Small ground anchor beneath each 3D vehicle: provides a click/hit
            target for trip selection without competing with the 3D model. */}
        {vehicles.filter((v) => isValidLatLng(v.location)).map((v) => {
          const point = toLngLat(v.location)
          if (!point) return null
          const color = vehicleStatusMeta[v.status].map
          const highlighted = v.id === highlightVehicleId
          return (
            <Marker
              key={`v-${v.id}`}
              longitude={point[0]}
              latitude={point[1]}
              anchor="center"
              onClick={() => {
                const t = trips.find((tt) => tt.vehicleId === v.id && !['completed', 'cancelled'].includes(tt.status))
                if (t) onSelectTrip?.(t.id)
              }}
            >
              <div
                className="pointer-events-auto flex size-6 cursor-pointer items-center justify-center rounded-full"
                style={{ background: `${color}22`, outline: highlighted ? `2px solid ${color}` : 'none' }}
                aria-label={`Vehicle ${v.name}`}
              >
                <span className="block size-2 rounded-full" style={{ background: color }} />
              </div>
            </Marker>
          )
        })}
        </Map>
      </MapboxErrorBoundary>
    </div>
  )
}
