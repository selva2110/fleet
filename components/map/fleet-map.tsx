'use client'

import L from 'leaflet'
import { Fragment, useEffect, useMemo, useState } from 'react'
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
import { mealStatusMeta, tripStatusMeta, vehicleStatusMeta } from '@/lib/labels'
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

// Filled vehicle silhouettes (viewBox 0 0 24 24) — recognizable side-profile
// shapes rather than abstract strokes, so each vehicle class reads at a glance.
const vehicleGlyph: Record<string, string> = {
  // car body with cabin + two wheels
  Sedan: 'M2 13l2-4.5A2 2 0 0 1 5.8 7h9.4a2 2 0 0 1 1.7 1l2 3 2 .6a1 1 0 0 1 .8 1v1.4h-3a2.2 2.2 0 0 0-4.4 0H8.4a2.2 2.2 0 0 0-4.4 0H2z',
  SUV: 'M2 13l1.6-5A2 2 0 0 1 5.5 6.5h10A2 2 0 0 1 17.4 8l2 3.2 1.8.6a1 1 0 0 1 .8 1v2h-3a2.2 2.2 0 0 0-4.4 0H8.4a2.2 2.2 0 0 0-4.4 0H2z',
  // tall boxy vans
  Van: 'M2 6.5A1.5 1.5 0 0 1 3.5 5h10.2a2 2 0 0 1 1.6.8l3 4 1.9.6a1 1 0 0 1 .8 1V15h-2.6a2.2 2.2 0 0 0-4.4 0H8.6a2.2 2.2 0 0 0-4.4 0H2z',
  'Wheelchair Accessible Van': 'M2 6.5A1.5 1.5 0 0 1 3.5 5h10.2a2 2 0 0 1 1.6.8l3 4 1.9.6a1 1 0 0 1 .8 1V15h-2.6a2.2 2.2 0 0 0-4.4 0H8.6a2.2 2.2 0 0 0-4.4 0H2z',
  'Medical Transport Vehicle': 'M2 6.5A1.5 1.5 0 0 1 3.5 5h10.2a2 2 0 0 1 1.6.8l3 4 1.9.6a1 1 0 0 1 .8 1V15h-2.6a2.2 2.2 0 0 0-4.4 0H8.6a2.2 2.2 0 0 0-4.4 0H2z',
  // long bus body
  'Mini Bus': 'M3 5.5A1.5 1.5 0 0 1 4.5 4h14A1.5 1.5 0 0 1 20 5.5V15h-2.2a2.2 2.2 0 0 0-4.4 0H9.6a2.2 2.2 0 0 0-4.4 0H3zM3 8h17',
  'Shuttle Bus': 'M3 5.5A1.5 1.5 0 0 1 4.5 4h14A1.5 1.5 0 0 1 20 5.5V15h-2.2a2.2 2.2 0 0 0-4.4 0H9.6a2.2 2.2 0 0 0-4.4 0H3zM3 8h17',
  Ambulance: 'M2 6.5A1.5 1.5 0 0 1 3.5 5h9.2a2 2 0 0 1 1.6.8l3.2 4.2 2 .6a1 1 0 0 1 .8 1V15h-2.6a2.2 2.2 0 0 0-4.4 0H8.6a2.2 2.2 0 0 0-4.4 0H2z',
}

function vehicleIcon(v: Vehicle, highlighted: boolean) {
  const color = vehicleStatusMeta[v.status].map
  const pulse = ['heading-to-pickup', 'onboard'].includes(v.status)
  const size = highlighted ? 36 : 30
  const html = `
    <div class="map-marker ${pulse ? 'map-marker-pulse' : ''}" style="--pulse-color:${color}66;width:${size}px;height:${size}px;background:${color};${highlighted ? 'outline:3px solid rgba(37,99,235,.35);' : ''}">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="white" stroke="white" stroke-width="0.5" stroke-linejoin="round">
        <path d="${vehicleGlyph[v.type] ?? vehicleGlyph.Van}" />
        <circle cx="7" cy="16" r="1.9" fill="${color}" stroke="white" stroke-width="1.1" />
        <circle cx="16" cy="16" r="1.9" fill="${color}" stroke="white" stroke-width="1.1" />
      </svg>
    </div>`
  return L.divIcon({ html, className: 'map-pin', iconSize: [size, size], iconAnchor: [size / 2, size / 2] })
}

// Moving meal-delivery van — box-truck silhouette with a food/box glyph.
function mealVehicleIcon(m: MealDelivery, highlighted: boolean) {
  const color = mealStatusMeta[m.status].map
  const pulse = m.status === 'en-route' || m.status === 'delivering'
  const size = highlighted ? 36 : 30
  const html = `
    <div class="map-marker ${pulse ? 'map-marker-pulse' : ''}" style="--pulse-color:${color}66;width:${size}px;height:${size}px;background:${color};${highlighted ? 'outline:3px solid rgba(217,119,6,.4);' : ''}">
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">
        <path d="M3 7h9v8H3zM12 10h4l3 3v2h-7z" fill="white" fill-opacity="0.18" />
        <circle cx="7" cy="16.5" r="1.6" fill="white" stroke="none" />
        <circle cx="16" cy="16.5" r="1.6" fill="white" stroke="none" />
        <path d="M6 4.5c1.6 0 1.6 1.4 3 1.4s1.4-1.4 3-1.4" />
      </svg>
    </div>`
  return L.divIcon({ html, className: 'map-pin', iconSize: [size, size], iconAnchor: [size / 2, size / 2] })
}

// Meal drop-off point at a participant's home.
function mealStopIcon(delivered: boolean) {
  const color = delivered ? '#059669' : '#d97706'
  const html = `
    <div class="map-marker" style="width:16px;height:16px;background:${color};border-width:2px;border-radius:4px;">
      <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
        ${delivered ? '<path d="M5 13l4 4L19 7" />' : '<path d="M4 8h16v11H4zM4 8l2-3h12l2 3" />'}
      </svg>
    </div>`
  return L.divIcon({ html, className: 'map-pin', iconSize: [16, 16], iconAnchor: [8, 8] })
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
    let cancelled = false;
    async function loadTraffic() {
      await Promise.all(
        routes.map(async (route, index) => {
          const points = [
            route.origin,
            ...route.stops.map((stop) => stop.location),
            route.destination,
          ];
          try {
            const response = await fetch("/api/traffic/route", {
              method: "POST",
              headers: { "content-type": "application/json" },
              body: JSON.stringify({ points }),
            });
            const result = (await response.json()) as TrafficResult;
            if (!cancelled) {
              onResult(index, result);
            }
          } catch {
            if (!cancelled) {
              onResult(index, { available: false });
            }
          }
        })
      );
    }
    void loadTraffic();
    const refresh = window.setInterval(() => { void loadTraffic(); }, 60_000);
    return () => {
      cancelled = true;
      window.clearInterval(refresh);
    };
  }, [routes, onResult]);
  return null;
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
    routeId:string;
    origin?: LatLng;
    destination?: LatLng;
    fallbackMinutes?: number;
  }[];
  className?: string;
  recommendedRouteId?:string;
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
  recommendedRouteId
}: FleetMapProps) {
  const activeMeals = mealDeliveries.filter((m) => m.status !== 'cancelled')
  const activeTrips = trips.filter((t) => !['cancelled'].includes(t.status))
  const [traffic, setTraffic] = useState<TrafficResult | null>(null)
 const selectedRoute = recommendedRoute?.find(
   (route) => route.routeId === recommendedRouteId,
 );
 const liveRoute = useMemo(() => {
   if (!selectedRoute?.origin || !selectedRoute.destination) return [];

   return [
     {
       origin: selectedRoute.origin,
       stops: selectedRoute.stops,
       destination: selectedRoute.destination,
       fallbackMinutes: selectedRoute.fallbackMinutes ?? 0,
     },
   ];
 }, [selectedRoute]);
 
  const displayedRoutePath = traffic?.routePath?.length
    ? traffic.routePath
    : selectedRoute?.routePath;

  return (
    <MapContainer
      center={ll(MAP_CENTER)}
      zoom={MAP_ZOOM}
      zoomControl={false}
      className="h-full w-full"
      style={{ height: "100%", width: "100%" }}
    >
      <TileLayer
        url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
        attribution="&copy; OpenStreetMap &copy; CARTO"
      />

      {fitTo && fitTo.length > 1 ? <FitBounds points={fitTo} /> : null}
      {liveRoute ? (
        <LiveTraffic
          routes={liveRoute}
          onResult={(_, result) => {
            setTraffic(result);
          }}
        />
      ) : null}

      {/* Route polylines */}
      {activeTrips.map((t) => {
        const highlighted = t.id === highlightTripId;
        const color = tripStatusMeta[t.status].map;
        return (
          <Polyline
            key={`route-${t.id}`}
            positions={t.routePath.map(ll)}
            pathOptions={{
              color,
              weight: highlighted ? 5 : 3,
              opacity: highlightTripId && !highlighted ? 0.25 : 0.8,
              dashArray: t.status === "planned" ? "6 8" : undefined,
            }}
            eventHandlers={{ click: () => onSelectTrip?.(t.id) }}
          />
        );
      })}

      {recommendedRoute?.map((route, index) => {
        const path =
          route.routeId === recommendedRouteId
            ? (displayedRoutePath ?? route.routePath)
            : route.routePath;
        return (
          <Fragment key={route.routeId}>
            <Polyline
              key={route.routeId}
              positions={path.map(ll)}
              pathOptions={{
                color:
                  recommendedRouteId === route.routeId ? "#2563eb" : "#000000",
                weight: recommendedRouteId === route.routeId ? 6 : 4,
                opacity: recommendedRouteId === route.routeId ? 1 : 0.5,
              }}
              eventHandlers={{
                click: () => {
                  setRecommendedRoute?.(
                    recommendedRouteId === route.routeId ? null : route.routeId,
                  );
                },
              }}
            />
            {route.stops.map((s) => (
              <Marker
                key={`${route.routeId}-${s.participantId}`}
                position={ll(s.location)}
                icon={participantIcon(
                  { medicalPriority: "routine" } as Participant,
                  true,
                )}
              >
                <Tooltip>
                  Route {index + 1} · Stop {s.order} · ETA {s.etaMinutes}m
                </Tooltip>
              </Marker>
            ))}
          </Fragment>
        );
      })}

      {recommendedRouteId && selectedRoute ? (
        <div className="pointer-events-none absolute bottom-3 left-3 z-500 rounded-lg border border-border bg-card/95 px-3 py-2 text-xs shadow-sm backdrop-blur">
          <p className="font-semibold text-foreground">
            {traffic?.available ? "Live traffic" : "Estimated traffic"}
          </p>

          <p className="text-muted-foreground">
            {traffic?.available
              ? `${traffic.travelTimeMinutes} min travel time${
                  traffic.trafficDelayMinutes
                    ? ` · +${traffic.trafficDelayMinutes} min delay`
                    : " · no delay"
                }`
              : `${selectedRoute.fallbackMinutes ?? "--"} min estimated travel time`}
          </p>

          {traffic?.available && traffic.updatedAt && (
            <p className="mt-0.5 text-[10px] text-muted-foreground">
              Updated {new Date(traffic.updatedAt).toLocaleTimeString()}
            </p>
          )}
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

      {/* Meal-delivery routes + drop-off markers */}
      {activeMeals.map((m) => {
        const highlighted = m.id === highlightMealId
        const color = mealStatusMeta[m.status].map
        return (
          <Fragment key={`meal-${m.id}`}>
            <Polyline
              positions={m.routePath.map(ll)}
              pathOptions={{
                color,
                weight: highlighted ? 5 : 3,
                opacity: highlightMealId && !highlighted ? 0.2 : 0.75,
                dashArray: '2 7',
              }}
              eventHandlers={{ click: () => onSelectMeal?.(m.id) }}
            />
            {m.stops.map((s: MealStop) => (
              <Marker
                key={`meal-stop-${m.id}-${s.participantId}`}
                position={ll(s.location)}
                icon={mealStopIcon(s.status === 'delivered')}
              >
                <Tooltip>
                  Drop {s.order + 1} · {s.mealCount} meal{s.mealCount === 1 ? '' : 's'} ·{' '}
                  {s.status === 'delivered' ? 'delivered' : `ETA ${s.etaMinutes}m`}
                </Tooltip>
              </Marker>
            ))}
            <Marker
              position={ll(m.currentLocation)}
              icon={mealVehicleIcon(m, highlighted)}
              eventHandlers={{ click: () => onSelectMeal?.(m.id) }}
            >
              <Popup>
                <div className="text-xs">
                  <p className="font-semibold">
                    {m.runNumber} · {m.mealType}
                  </p>
                  <p>{mealStatusMeta[m.status].label}</p>
                  <p className="text-muted-foreground">
                    {m.totalMeals} meals · {m.stops.length} stops
                  </p>
                </div>
              </Popup>
            </Marker>
          </Fragment>
        )
      })}

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
  );
}
