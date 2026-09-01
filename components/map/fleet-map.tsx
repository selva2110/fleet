"use client";

import {
  Fragment,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import Map, {
  Layer,
  Marker,
  Popup,
  Source,
  type MapRef,
} from "react-map-gl/mapbox";
import "mapbox-gl/dist/mapbox-gl.css";
import { COIMBATORE_MAP_CENTER, MAP_ZOOM } from "@/lib/geo";
import { MapboxErrorBoundary } from "@/components/map/mapbox-error-boundary";
import type { LatLng } from "@/lib/types";
import { VehiclesConfig } from "@/lib/vehicles/config";
import { TripsConfig } from "@/lib/trips/config";
import { EventsConfig } from "@/lib/events/config";
import { Trip } from "@/lib/trips/types";
import { Vehicle3D } from "@/lib/vehicles/types";
import { FleetmapUtils } from "@/lib/fleetMap/utils";
import {
  FleetMapProps,
  LiveTrafficProps,
  TooltipInfo,
  TrafficResult,
} from "@/lib/fleetMap/types";
import { EventUtils } from "@/lib/events/utils";
import { useTranslation } from "@/components/context/language-provider";
import { useTripSockets } from "../context/tripsocket-provider";
import { useDrivers } from "@/lib/driver/hooks";
import { findById } from "@/lib/utils";
import { MealsConfig } from "@/lib/meals/config";
import { MealDelivery, MealStop } from "@/lib/meals/types";
import { MealsUtils } from "@/lib/meals/utils";
function LiveTraffic({ routes, onResult }: LiveTrafficProps) {
  useEffect(() => {
    let cancelled = false;
    async function loadTraffic() {
      await Promise.all(
        routes.map(async (route, index) => {
          const points = [
            route.origin,
            ...route.stops.map((stop) => stop.location),
            route.destination,
          ].filter(FleetmapUtils.isValidLatLng);
          try {
            const result = await FleetmapUtils.fetchTrafficRoutes(points);
            if (!cancelled) {
              onResult(index, result);
            }
          } catch {
            if (!cancelled) {
              onResult(index, { available: false });
            }
          }
        }),
      );
    }
    void loadTraffic();
    const refresh = window.setInterval(() => {
      void loadTraffic();
    }, 60_000);
    return () => {
      cancelled = true;
      window.clearInterval(refresh);
    };
  }, [routes, onResult]);
  return null;
}

function RouteSnapper({
  trips,
  onResult,
}: {
  trips: Trip[];
  onResult: (tripId: string, path: LatLng[]) => void;
}) {
  const signaturesRef = useRef<Record<string, string>>({});
  useEffect(() => {
    let cancelled = false;
    async function run() {
      await Promise.all(
        trips.map(async (t) => {
          const path = t.routePath ?? [];
          const waypoints = [
            path[0],
            ...t.stops.map((s) => s.location),
            path[path.length - 1],
          ].filter(FleetmapUtils.isValidLatLng);
          if (waypoints.length < 2) return;
          const signature = waypoints
            .map((p) => `${p.lat.toFixed(4)},${p.lng.toFixed(4)}`)
            .join("|");
          if (signaturesRef.current[t.id] === signature) return;
          signaturesRef.current[t.id] = signature;
          const result = await FleetmapUtils.fetchTrafficRoutes(waypoints);
          if (!cancelled && result.routePath && result.routePath.length >= 2) {
            onResult(t.id, result.routePath);
          }
        }),
      );
    }
    void run();
    return () => {
      cancelled = true;
    };
  }, [trips, onResult]);
  return null;
}

export default function FleetMap({
  centers,
  vehicles,
  trips,
  mealDeliveries = [],
  participants = [],
  highlightTripId,
  highlightTripIds = [],
  highlightVehicleId,
  highlightMealId,
  onSelectTrip,
  onSelectMeal,
  fitTo,
  recommendedRoute,
  setRecommendedRoute,
  recommendedRouteId,
}: FleetMapProps) {
  const { t } = useTranslation();
  const { vehicleLocations } = useTripSockets();
  const { drivers } = useDrivers();
  const activeMeals = mealDeliveries.filter((m) => m.status !== "cancelled");
  const activeTrips = trips.filter((m) => m.status !== "CANCELLED");
  const [traffic, setTraffic] = useState<TrafficResult | null>(null);
  const [tooltip, setTooltip] = useState<TooltipInfo | null>(null);
  const [viewState, setViewState] = useState({
    longitude: Number.isFinite(COIMBATORE_MAP_CENTER.lng)
      ? COIMBATORE_MAP_CENTER.lng
      : -73.9911,
    latitude: Number.isFinite(COIMBATORE_MAP_CENTER.lat)
      ? COIMBATORE_MAP_CENTER.lat
      : 40.7359,
    zoom: Number.isFinite(MAP_ZOOM) ? MAP_ZOOM : 13,
  });
  const mapRef = useRef<MapRef | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [snappedRoutes, setSnappedRoutes] = useState<Record<string, LatLng[]>>(
    {},
  );
  const handleSnappedRoute = useCallback((tripId: string, path: LatLng[]) => {
    setSnappedRoutes((prev) => ({ ...prev, [tripId]: path }));
  }, []);

  useEffect(() => {
    if (!highlightTripId) return;
    const trip = trips.find((item) => item.id === highlightTripId);
    if (!FleetmapUtils.isValidLatLng(trip?.currentLocation)) return;
    mapRef.current?.flyTo({
      center: [trip.currentLocation.lng, trip.currentLocation.lat],
      zoom: 13,
      duration: 0,
      essential: true,
    });
  }, [highlightTripId]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(() => {
      mapRef.current?.resize();
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const mapboxToken =
    "pk.eyJ1Ijoic2l2YS1kaGFybWFyYWoiLCJhIjoiY21zNXR1dmhlMDBoMjM1cTRmb25veHRtdCJ9.W_F1SaLw8-6t3tiYNZmzEw";
  const mapStyle = `https://api.mapbox.com/styles/v1/mapbox/streets-v12?access_token=${encodeURIComponent(mapboxToken)}`;

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
  const interactiveLayerIds = useMemo(() => {
    const ids = [
      ...activeTrips.map((trip) => `trip-route-layer-${trip.id}`),
      ...activeMeals.map((meal) => `meal-route-layer-${meal.id}`),
    ];
    if (recommendedRoute) {
      ids.push(
        ...recommendedRoute.map(
          (route) => `recommended-route-layer-${route.routeId}`,
        ),
      );
    }
    return ids;
  }, [activeMeals, activeTrips, recommendedRoute]);

  const handleMapClick = useCallback(
    (evt: { features?: Array<{ layer?: { id?: string } }> }) => {
      const layerId = evt.features?.[0]?.layer?.id;
      if (!layerId) return;
      if (layerId.startsWith("trip-route-layer-")) {
        const tripId = layerId.replace("trip-route-layer-", "");
        onSelectTrip?.(tripId);
        return;
      }
      if (layerId.startsWith("meal-route-layer-")) {
        const mealId = layerId.replace("meal-route-layer-", "");
        onSelectMeal?.(mealId);
        return;
      }
      if (layerId.startsWith("recommended-route-layer-")) {
        const routeId = layerId.replace("recommended-route-layer-", "");
        setRecommendedRoute?.(recommendedRouteId === routeId ? null : routeId);
      }
    },
    [onSelectMeal, onSelectTrip, recommendedRouteId, setRecommendedRoute],
  );

  const vehicles3D = useMemo<Vehicle3D[]>(() => {
    return Object.values(vehicleLocations)
      .filter((v) =>
        FleetmapUtils.isValidLatLng({ lat: v.latitude, lng: v.longitude }),
      )
      .map((v) => {
        const trip = activeTrips.find((t) => t.id === v.tripId);
        const tripStatus = trip?.status ?? "EN_ROUTE";
        const driverName = findById(drivers, trip?.driverId)?.name;
        const mapColor =
          TripsConfig.tripStatusMeta[tripStatus].map ?? "#2563eb";
        return {
          id: driverName ?? "",
          lng: v.longitude,
          lat: v.latitude,
          heading: 0,
          color: mapColor,
          highlighted: v.tripId === highlightTripId,
        };
      });
  }, [vehicleLocations, activeTrips, highlightTripId]);

  useEffect(() => {
    if (!fitTo || fitTo.length < 2 || !mapRef.current) return;
    const validFitPoints = fitTo.filter(FleetmapUtils.isValidLatLng);
    if (validFitPoints.length < 2) return;
    const bounds = validFitPoints.reduce(
      (acc, point) => {
        acc[0] = Math.min(acc[0], point.lng);
        acc[1] = Math.min(acc[1], point.lat);
        acc[2] = Math.max(acc[2], point.lng);
        acc[3] = Math.max(acc[3], point.lat);
        return acc;
      },
      [Infinity, Infinity, -Infinity, -Infinity] as [
        number,
        number,
        number,
        number,
      ],
    );
    mapRef.current.fitBounds(
      [
        [bounds[0], bounds[1]],
        [bounds[2], bounds[3]],
      ],
      { padding: 48, maxZoom: 15 },
    );
  }, [fitTo]);

  const fallbackContent = (
    <div className="absolute inset-0 z-10 flex items-center justify-center px-6 text-center text-sm text-muted-foreground">
      <div className="max-w-sm rounded-lg border border-border/70 bg-background/90 px-4 py-3 shadow-sm">
        <p className="font-medium text-foreground">
          {t("map.previewunavailabletitle")}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          {t("map.previewunavailablebody")}
        </p>
      </div>
    </div>
  );

  return (
    <div
      ref={containerRef}
      className="relative h-full w-full overflow-hidden rounded-xl border border-border bg-muted/30"
    >
      <MapboxErrorBoundary fallback={fallbackContent}>
        <Map
          ref={mapRef}
          {...viewState}
          onMove={(evt) => setViewState(evt.viewState)}
          onClick={handleMapClick}
          interactiveLayerIds={interactiveLayerIds}
          mapboxAccessToken={mapboxToken || undefined}
          mapStyle={mapStyle}
          style={{ width: "100%", height: "100%" }}
        >
          {fitTo && fitTo.length > 1 ? null : null}
          {vehicles3D.map((v) => (
            <Marker
              key={v.id}
              longitude={v.lng}
              latitude={v.lat}
              anchor="center"
            >
              <div
                className="pointer-events-auto"
                onMouseEnter={() =>
                  setTooltip({
                    longitude: v.lng,
                    latitude: v.lat,
                    title: v.id,
                    subtitle: t("map.vehiclearialabel"),
                  })
                }
                onMouseLeave={() => setTooltip(null)}
                onClick={() => onSelectTrip?.(v.id)}
                dangerouslySetInnerHTML={{
                  __html: vehicleIconMarkup(v, v.highlighted),
                }}
              />
            </Marker>
          ))}
          {liveRoute.length > 0 ? (
            <LiveTraffic
              routes={liveRoute}
              onResult={(_, result) => {
                setTraffic(result);
              }}
            />
          ) : null}

          <RouteSnapper trips={activeTrips} onResult={handleSnappedRoute} />

          {activeTrips.map((t) => {
            const highlighted =
              t.id === highlightTripId || highlightTripIds.includes(t.id);

            const color = t.status
              ? (TripsConfig.tripStatusMeta[t.status]?.map ?? "#3b82f6")
              : "#3b82f6";

            const coordinates = FleetmapUtils.toLineCoordinates(
              snappedRoutes[t.id] ?? t.routePath,
            );

            if (coordinates.length < 2) return null;

            return (
              <Fragment key={`route-${t.id}`}>
                <Source
                  id={`trip-route-${t.id}`}
                  type="geojson"
                  data={{
                    type: "FeatureCollection",
                    features: [
                      {
                        type: "Feature",
                        geometry: {
                          type: "LineString",
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
                    "line-color": color,
                    "line-width": highlighted ? 5 : 3,
                    "line-opacity":
                      (highlightTripId || highlightTripIds.length > 0) &&
                      !highlighted
                        ? 0.25
                        : 0.8,
                  }}
                  layout={{
                    "line-cap": "round",
                    "line-join": "round",
                  }}
                />
              </Fragment>
            );
          })}
          {recommendedRoute?.map((route) => {
            const path =
              route.routeId === recommendedRouteId
                ? (displayedRoutePath ?? route.routePath)
                : route.routePath;
            const coordinates = FleetmapUtils.toLineCoordinates(path);
            const color =
              recommendedRouteId === route.routeId ? "#2563eb" : "#000000";
            return (
              <Fragment key={route.routeId}>
                {coordinates.length >= 2 ? (
                  <>
                    <Source
                      id={`recommended-route-${route.routeId}`}
                      type="geojson"
                      data={{
                        type: "FeatureCollection",
                        features: [
                          {
                            type: "Feature",
                            geometry: {
                              type: "LineString",
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
                        "line-color": color,
                        "line-width":
                          recommendedRouteId === route.routeId ? 6 : 4,
                        "line-opacity":
                          recommendedRouteId === route.routeId ? 1 : 0.5,
                      }}
                      layout={{ "line-cap": "round", "line-join": "round" }}
                    />
                  </>
                ) : null}
                {route.stops
                  .filter((s) => FleetmapUtils.isValidLatLng(s.location))
                  .map((s) => {
                    const point = FleetmapUtils.toLngLat(s.location);
                    if (!point) return null;
                    return (
                      <Marker
                        key={`${route.routeId}-${s.participantId}`}
                        longitude={point[0]}
                        latitude={point[1]}
                        anchor="center"
                      >
                        <div
                          className="pointer-events-auto"
                          onMouseEnter={() => {
                            const participant = participants.find(
                              (p) => p.id === s.participantId,
                            );
                            setTooltip({
                              longitude: point[0],
                              latitude: point[1],
                              title: participant?.name ?? t("map.pickuppoint"),
                              subtitle:
                                participant?.address ?? t("map.pickuplocation"),
                            });
                          }}
                          onMouseLeave={() => setTooltip(null)}
                          onClick={() => {
                            setRecommendedRoute?.(
                              recommendedRouteId === route.routeId
                                ? null
                                : route.routeId,
                            );
                          }}
                        />
                      </Marker>
                    );
                  })}
              </Fragment>
            );
          })}

          {recommendedRouteId && selectedRoute ? (
            <div className="pointer-events-none absolute bottom-3 left-3 z-10 rounded-lg border border-border bg-card/95 px-3 py-2 text-xs shadow-sm backdrop-blur">
              <p className="font-semibold text-foreground">
                {traffic?.available
                  ? t("map.livetraffic")
                  : t("map.estimatedtraffic")}
              </p>
              <p className="text-muted-foreground">
                {traffic?.available
                  ? `${traffic.travelTimeMinutes} ${t("map.mintraveltime")}${traffic.trafficDelayMinutes ? ` · +${traffic.trafficDelayMinutes} ${t("map.mindelay")}` : ` · ${t("map.nodelay")}`}`
                  : `${selectedRoute.fallbackMinutes ?? "--"} ${t("map.minestimatedtraveltime")}`}
              </p>
              {traffic?.available && traffic.updatedAt ? (
                <p className="mt-0.5 text-[10px] text-muted-foreground">
                  {t("map.updated")}{" "}
                  {new Date(traffic.updatedAt).toLocaleTimeString()}
                </p>
              ) : null}
            </div>
          ) : null}

          {highlightTripId
            ? activeTrips
                .filter((trip) => trip.id === highlightTripId)
                .flatMap((trip) =>
                  trip.stops
                    .filter((s) => FleetmapUtils.isValidLatLng(s.location))
                    .map((s) => {
                      const point = FleetmapUtils.toLngLat(s.location);
                      if (!point) return null;
                      return (
                        <Marker
                          key={`stop-${trip.id}-${s.participantId}`}
                          longitude={point[0]}
                          latitude={point[1]}
                          anchor="center"
                        >
                          <div
                            className="pointer-events-auto flex h-6 w-6 cursor-pointer items-center justify-center rounded-full bg-primary text-white shadow-md hover:scale-110"
                            onMouseEnter={() => {
                              const participant = participants.find(
                                (p) => p.id === s.participantId,
                              );
                              setTooltip({
                                longitude: point[0],
                                latitude: point[1],
                                title:
                                  participant?.name ?? t("map.pickuppoint"),
                                subtitle:
                                  participant?.address ??
                                  t("map.pickuplocation"),
                              });
                            }}
                            onMouseLeave={() => setTooltip(null)}
                            onClick={() => onSelectTrip?.(trip.id)}
                          >
                            <span className="text-xs font-bold">{s.order}</span>
                          </div>
                        </Marker>
                      );
                    }),
                )
            : null}

          {participants
            .filter((p) => FleetmapUtils.isValidLatLng(p.location))
            .map((p) => {
              const point = FleetmapUtils.toLngLat(p.location);
              if (!point) return null;
              return (
                <Marker
                  key={`p-${p.id}`}
                  longitude={point[0]}
                  latitude={point[1]}
                  anchor="center"
                >
                  <div
                    className="pointer-events-auto"
                    onMouseEnter={() =>
                      setTooltip({
                        longitude: point[0],
                        latitude: point[1],
                        title: p.name,
                        subtitle: p.address,
                      })
                    }
                    onMouseLeave={() => setTooltip(null)}
                  />
                </Marker>
              );
            })}

          {activeMeals.map((m: MealDelivery) => {
            const highlighted = m.id === highlightMealId;
            const color = MealsConfig.mealStatusMeta[m.status].map;
            const coordinates = FleetmapUtils.toLineCoordinates(m.routePath);
            return (
              <Fragment key={`meal-${m.id}`}>
                {coordinates.length >= 2 ? (
                  <>
                    <Source
                      id={`meal-route-${m.id}`}
                      type="geojson"
                      data={{
                        type: "FeatureCollection",
                        features: [
                          {
                            type: "Feature",
                            geometry: {
                              type: "LineString",
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
                        "line-color": color,
                        "line-width": highlighted ? 5 : 3,
                        "line-opacity":
                          highlightMealId && !highlighted ? 0.2 : 0.75,
                      }}
                      layout={{ "line-cap": "round", "line-join": "round" }}
                    />
                  </>
                ) : null}
                {m.stops
                  .filter((s) => FleetmapUtils.isValidLatLng(s.location))
                  .map((s: MealStop) => {
                    const point = FleetmapUtils.toLngLat(s.location);
                    if (!point) return null;
                    return (
                      <Marker
                        key={`meal-stop-${m.id}-${s.participantId}`}
                        longitude={point[0]}
                        latitude={point[1]}
                        anchor="center"
                      >
                        <div
                          className="pointer-events-auto"
                          onMouseEnter={() => {
                            const participant = participants.find(
                              (p) => p.id === s.participantId,
                            );
                            setTooltip({
                              longitude: point[0],
                              latitude: point[1],
                              title: participant?.name ?? t("map.deliverystop"),
                              subtitle: `${s.mealCount} ${t("board.mealword")}${s.mealCount === 1 ? "" : "s"} · ${participant?.address ?? t("map.deliverylocation")}`,
                            });
                          }}
                          onMouseLeave={() => setTooltip(null)}
                          onClick={() => onSelectMeal?.(m.id)}
                          dangerouslySetInnerHTML={{
                            __html: MealsUtils.mealStopIconMarkup(
                              s.status === "delivered",
                            ),
                          }}
                        />
                      </Marker>
                    );
                  })}
                {(() => {
                  const point = FleetmapUtils.toLngLat(m.currentLocation);
                  if (!point) return null;
                  return (
                    <Marker
                      longitude={point[0]}
                      latitude={point[1]}
                      anchor="center"
                    >
                      <div
                        className="pointer-events-auto"
                        onMouseEnter={() =>
                          setTooltip({
                            longitude: point[0],
                            latitude: point[1],
                            title: m.runNumber,
                            subtitle: t("map.mealdeliveryvehicle"),
                          })
                        }
                        onMouseLeave={() => setTooltip(null)}
                        onClick={() => onSelectMeal?.(m.id)}
                        dangerouslySetInnerHTML={{
                          __html: MealsUtils.mealVehicleIconMarkup(
                            m,
                            highlighted,
                          ),
                        }}
                      />
                    </Marker>
                  );
                })()}
              </Fragment>
            );
          })}

          {centers
            .filter((c) => FleetmapUtils.isValidLatLng(c.location))
            .map((c) => {
              const point = FleetmapUtils.toLngLat(c.location);
              if (!point) return null;
              return (
                <Marker
                  key={`c-${c.id}`}
                  longitude={point[0]}
                  latitude={point[1]}
                  anchor="center"
                >
                  <div
                    className="pointer-events-auto"
                    onMouseEnter={() =>
                      setTooltip({
                        longitude: point[0],
                        latitude: point[1],
                        title: c.name,
                        subtitle: c.address,
                      })
                    }
                    onMouseLeave={() => setTooltip(null)}
                    dangerouslySetInnerHTML={{
                      __html: EventUtils.centerIconMarkup(),
                    }}
                  />
                </Marker>
              );
            })}

          {/* Small ground anchor beneath each 3D vehicle: provides a click/hit
            target for trip selection without competing with the 3D model. */}
          {vehicles
            .filter((v) => FleetmapUtils.isValidLatLng(v.location))
            .map((v) => {
              const point = FleetmapUtils.toLngLat(v.location);
              if (!point) return null;
              const color = VehiclesConfig.vehicleStatusMeta[v.status].map;
              const highlighted = v.id === highlightVehicleId;
              return (
                <Marker
                  key={`v-${v.id}`}
                  longitude={point[0]}
                  latitude={point[1]}
                  anchor="center"
                  onClick={() => {
                    const t = trips.find(
                      (tt) =>
                        tt.vehicleId === v.id &&
                        !["completed", "cancelled"].includes(tt.status),
                    );
                    if (t) onSelectTrip?.(t.id);
                  }}
                >
                  <div
                    className="pointer-events-auto flex size-6 cursor-pointer items-center justify-center rounded-full"
                    style={{
                      background: `${color}22`,
                      outline: highlighted ? `2px solid ${color}` : "none",
                    }}
                    aria-label={`${t("map.vehiclearialabel")} ${v.name}`}
                  >
                    <span
                      className="block size-2 rounded-full"
                      style={{ background: color }}
                    />
                  </div>
                </Marker>
              );
            })}
          {tooltip ? (
            <Popup
              longitude={tooltip.longitude}
              latitude={tooltip.latitude}
              anchor="top"
              closeButton={false}
              closeOnClick={false}
              offset={5}
              onClose={() => setTooltip(null)}
            >
              <div className="max-w-55 rounded-md bg-card px-2.5 py-2 text-xs shadow-sm">
                <p className="font-medium text-foreground">{tooltip.title}</p>
                {tooltip.subtitle ? (
                  <p className="mt-0.5 text-muted-foreground">
                    {tooltip.subtitle}
                  </p>
                ) : null}
              </div>
            </Popup>
          ) : null}
        </Map>
      </MapboxErrorBoundary>
    </div>
  );
}

function vehicleIconMarkup(vehicle: Vehicle3D, highlighted: boolean) {
  const size = highlighted ? 44 : 36;

  return `
    <div
      style="
        width:${size}px;
        height:${size}px;
        transform:rotate(${vehicle.heading}deg);
        transform-origin:center;
      "
    >
      <svg
        width="${size}"
        height="${size}"
        viewBox="0 0 40 40"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <circle
          cx="20"
          cy="20"
          r="18"
          fill="${vehicle.color}"
          stroke="${highlighted ? "#fff" : "none"}"
          stroke-width="3"
        />

        <path
          d="M12 25V16C12 14.8954 12.8954 14 14 14H26C27.1046 14 28 14.8954 28 16V25"
          stroke="white"
          stroke-width="2.5"
          stroke-linecap="round"
        />

        <circle cx="15" cy="26" r="2.5" fill="white" />
        <circle cx="25" cy="26" r="2.5" fill="white" />
      </svg>
    </div>
  `;
}
