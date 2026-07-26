'use client'

import L from 'leaflet'
import { useEffect, useMemo, useState } from 'react'
import {
  MapContainer,
  Marker,
  Polyline,
  Popup,
  TileLayer,
  Tooltip,
  useMap,
} from 'react-leaflet'
import { MAP_CENTER, MAP_ZOOM } from '@/lib/geo'
import { tripStatusMeta, vehicleStatusMeta } from '@/lib/labels'
import type { Center, LatLng, Participant, Trip, TripStop, Vehicle } from '@/lib/types'

const vehicleGlyph: Record<string, string> = {
  Sedan: 'M3 13l1-4h12l1 4M5 13v3M15 13v3M3 13h14',
  SUV: 'M3 13l1-4h12l1 4M5 13v3M15 13v3M3 13h14',
  Van: 'M3 6h11v7H3zM14 8h3l2 3v2h-5z',
  'Wheelchair Accessible Van': 'M3 6h11v7H3zM14 8h3l2 3v2h-5z',
  'Medical Transport Vehicle': 'M3 6h11v7H3zM14 8h3l2 3v2h-5z',
  'Mini Bus': 'M4 5h13v9H4zM4 9h13',
  'Shuttle Bus': 'M4 5h13v9H4zM4 9h13',
  Ambulance: 'M3 6h9v7H3zM12 8h4l3 3v2h-7z',
}

function vehicleIcon(v: Vehicle, highlighted: boolean) {
  const color = vehicleStatusMeta[v.status].map
  const pulse = ['heading-to-pickup', 'onboard'].includes(v.status)
  const size = highlighted ? 34 : 28
  const html = `
    <div class="map-marker ${pulse ? 'map-marker-pulse' : ''}" style="--pulse-color:${color}66;width:${size}px;height:${size}px;background:${color};${highlighted ? 'outline:3px solid rgba(37,99,235,.35);' : ''}">
      <svg width="16" height="16" viewBox="0 0 22 20" fill="none" stroke="white" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
        <path d="${vehicleGlyph[v.type] ?? vehicleGlyph.Van}" />
      </svg>
    </div>`
  return L.divIcon({ html, className: 'map-pin', iconSize: [size, size], iconAnchor: [size / 2, size / 2] })
}

function centerIcon(c: Center) {
  const html = `
    <div class="map-marker" style="width:30px;height:30px;background:#0f172a;border-radius:8px;">
      <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="white" stroke-width="1.8" stroke-linecap="round">
        <path d="M10 4v12M4 10h12" />
      </svg>
    </div>`
  void c
  return L.divIcon({ html, className: 'map-pin', iconSize: [30, 30], iconAnchor: [15, 15] })
}

function participantIcon(p: Participant, active: boolean) {
  const color = p.medicalPriority === 'critical' ? '#dc2626' : p.medicalPriority === 'elevated' ? '#d97706' : '#2563eb'
  const size = active ? 16 : 13
  const html = `<div class="map-marker" style="width:${size}px;height:${size}px;background:${color};border-width:2px;"></div>`
  return L.divIcon({ html, className: 'map-pin', iconSize: [size, size], iconAnchor: [size / 2, size / 2] })
}

function ll(p: LatLng): [number, number] {
  return [p.lat, p.lng]
}

function FitBounds({ points }: { points: LatLng[] }) {
  const map = useMap()
  useEffect(() => {
    if (points.length < 2) return
    const bounds = L.latLngBounds(points.map(ll))
    map.fitBounds(bounds, { padding: [48, 48], maxZoom: 15 })
  }, [map, points])
  return null
}

type TrafficResult = {
  available: boolean
  routePath?: LatLng[]
  travelTimeMinutes?: number
  trafficDelayMinutes?: number
  updatedAt?: string
}

function LiveTraffic({
  route,
  onResult,
}: {
  route: { origin: LatLng; stops: TripStop[]; destination: LatLng; fallbackMinutes: number }
  onResult: (result: TrafficResult) => void
}) {
  useEffect(() => {
    let cancelled = false
    const points = [route.origin, ...route.stops.map((stop) => stop.location), route.destination]

    async function loadTraffic() {
      try {
        const response = await fetch('/api/traffic/route', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ points }),
        })
        const result = (await response.json()) as TrafficResult
        if (!cancelled) onResult(result)
      } catch {
        if (!cancelled) onResult({ available: false })
      }
    }

    void loadTraffic()
    const refresh = window.setInterval(() => void loadTraffic(), 60_000)
    return () => {
      cancelled = true
      window.clearInterval(refresh)
    }
  }, [onResult, route])

  return null
}

export interface FleetMapProps {
  centers: Center[]
  vehicles: Vehicle[]
  trips: Trip[]
  participants?: Participant[]
  highlightTripId?: string | null
  highlightVehicleId?: string | null
  onSelectTrip?: (tripId: string) => void
  fitTo?: LatLng[]
  recommendedRoute?: {
    routePath: LatLng[]
    stops: TripStop[]
    origin?: LatLng
    destination?: LatLng
    fallbackMinutes?: number
  } | null
  className?: string
}

export default function FleetMap({
  centers,
  vehicles,
  trips,
  participants = [],
  highlightTripId,
  highlightVehicleId,
  onSelectTrip,
  fitTo,
  recommendedRoute,
}: FleetMapProps) {
  const activeTrips = trips.filter((t) => !['cancelled'].includes(t.status))
  const [traffic, setTraffic] = useState<TrafficResult | null>(null)
  const liveRoute = useMemo(
    () => recommendedRoute?.origin && recommendedRoute.destination
      ? {
          origin: recommendedRoute.origin,
          stops: recommendedRoute.stops,
          destination: recommendedRoute.destination,
          fallbackMinutes: recommendedRoute.fallbackMinutes ?? 0,
        }
      : null,
    [recommendedRoute],
  )
  const displayedRoutePath = traffic?.routePath?.length ? traffic.routePath : recommendedRoute?.routePath

  return (
    <MapContainer
      center={ll(MAP_CENTER)}
      zoom={MAP_ZOOM}
      zoomControl={false}
      className="h-full w-full"
      style={{ height: '100%', width: '100%' }}
    >
      <TileLayer
        url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
        attribution='&copy; OpenStreetMap &copy; CARTO'
      />

      {fitTo && fitTo.length > 1 ? <FitBounds points={fitTo} /> : null}
      {liveRoute ? <LiveTraffic route={liveRoute} onResult={setTraffic} /> : null}

      {/* Route polylines */}
      {activeTrips.map((t) => {
        const highlighted = t.id === highlightTripId
        const color = tripStatusMeta[t.status].map
        return (
          <Polyline
            key={`route-${t.id}`}
            positions={t.routePath.map(ll)}
            pathOptions={{
              color,
              weight: highlighted ? 5 : 3,
              opacity: highlightTripId && !highlighted ? 0.25 : 0.8,
              dashArray: t.status === 'planned' ? '6 8' : undefined,
            }}
            eventHandlers={{ click: () => onSelectTrip?.(t.id) }}
          />
        )
      })}

      {recommendedRoute ? (
        <>
          <Polyline
            positions={(displayedRoutePath ?? []).map(ll)}
            pathOptions={{
              color: traffic?.available && (traffic.trafficDelayMinutes ?? 0) >= 10 ? '#dc2626' : traffic?.available && (traffic.trafficDelayMinutes ?? 0) > 0 ? '#d97706' : '#2563eb',
              weight: 6,
              opacity: 0.9,
            }}
          />
          {recommendedRoute.stops.map((s) => (
            <Marker
              key={`recommended-stop-${s.participantId}`}
              position={ll(s.location)}
              icon={participantIcon({ medicalPriority: 'routine' } as Participant, true)}
            >
              <Tooltip>Stop {s.order} · ETA {s.etaMinutes}m</Tooltip>
            </Marker>
          ))}
        </>
      ) : null}

      {recommendedRoute ? (
        <div className="pointer-events-none absolute bottom-3 left-3 z-[500] rounded-lg border border-border bg-card/95 px-3 py-2 text-xs shadow-sm backdrop-blur">
          <p className="font-semibold text-foreground">
            {traffic?.available ? 'Live traffic' : 'Estimated traffic'}
          </p>
          <p className="text-muted-foreground">
            {traffic?.available
              ? `${traffic.travelTimeMinutes} min travel time${traffic.trafficDelayMinutes ? ` · +${traffic.trafficDelayMinutes} min delay` : ' · no delay'}`
              : `${recommendedRoute.fallbackMinutes ?? '--'} min estimated travel time`}
          </p>
          {traffic?.available && traffic.updatedAt ? (
            <p className="mt-0.5 text-[10px] text-muted-foreground">Updated {new Date(traffic.updatedAt).toLocaleTimeString()}</p>
          ) : null}
        </div>
      ) : null}

      {/* Pickup stop markers for highlighted trip */}
      {highlightTripId
        ? activeTrips
            .filter((t) => t.id === highlightTripId)
            .flatMap((t) =>
              t.stops.map((s) => (
                <Marker key={`stop-${t.id}-${s.participantId}`} position={ll(s.location)} icon={participantIcon({ medicalPriority: 'routine' } as Participant, true)}>
                  <Tooltip>Stop {s.order} · ETA {s.etaMinutes}m</Tooltip>
                </Marker>
              )),
            )
        : null}

      {/* Participant markers */}
      {participants.map((p) => (
        <Marker key={`p-${p.id}`} position={ll(p.location)} icon={participantIcon(p, false)}>
          <Popup>
            <div className="text-xs">
              <p className="font-semibold">{p.name}</p>
              <p className="text-muted-foreground">{p.address}</p>
              <p className="capitalize">{p.mobilityLevel} · {p.medicalPriority}</p>
            </div>
          </Popup>
        </Marker>
      ))}

      {/* Center markers */}
      {centers.map((c) => (
        <Marker key={`c-${c.id}`} position={ll(c.location)} icon={centerIcon(c)}>
          <Tooltip direction="top" offset={[0, -14]}>
            <span className="font-medium">{c.name}</span>
          </Tooltip>
        </Marker>
      ))}

      {/* Vehicle markers */}
      {vehicles.map((v) => (
        <Marker
          key={`v-${v.id}`}
          position={ll(v.location)}
          icon={vehicleIcon(v, v.id === highlightVehicleId)}
          eventHandlers={{
            click: () => {
              const t = trips.find((tt) => tt.vehicleId === v.id && !['completed', 'cancelled'].includes(tt.status))
              if (t) onSelectTrip?.(t.id)
            },
          }}
        >
          <Popup>
            <div className="text-xs">
              <p className="font-semibold">{v.name} · {v.type}</p>
              <p>{vehicleStatusMeta[v.status].label}</p>
              <p className="text-muted-foreground">Capacity {v.capacity} · WC {v.wheelchairCapacity}</p>
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  )
}
