'use client';

import { useEffect, useRef, useState } from 'react';
import * as maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import type { Center, Participant, Trip, Vehicle } from '@/lib/types';
import { useFleetStore } from '@/lib/store';

interface DispatchMapProps {
  centers: Center[];
  participants: Participant[];
  vehicles: Vehicle[];
  trips: (Trip & { event: { name: string; center: Center } })[];
  stopsByTrip: Record<string, { location: { coordinates: [number, number] }; stop_type: string; sequence_index: number; participant?: { full_name: string } }[]>;
}

const VEHICLE_COLORS: Record<string, string> = {
  available: '#10b981',
  assigned: '#3b82f6',
  in_service: '#f59e0b',
  maintenance: '#f97316',
  offline: '#71717a',
};

export function DispatchMap({
  centers,
  participants,
  vehicles,
  trips,
  stopsByTrip,
}: DispatchMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<Record<string, maplibregl.Marker>>({});
  const [mapReady, setMapReady] = useState(false);
  const selectedVehicleId = useFleetStore((s) => s.selectedVehicleId);
  const selectVehicle = useFleetStore((s) => s.selectVehicle);
  const liveVehicles = useFleetStore((s) => s.liveVehicles);

  useEffect(() => {
    if (!mapContainer.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: mapContainer.current,
      style: {
        version: 8,
        sources: {
          'osm-tiles': {
            type: 'raster',
            tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
            tileSize: 256,
            attribution: '&copy; OpenStreetMap contributors',
          },
        },
        layers: [
          {
            id: 'osm-layer',
            type: 'raster',
            source: 'osm-tiles',
            minzoom: 0,
            maxzoom: 19,
          },
        ],
      },
      center: [-96.78, 32.78],
      zoom: 11.5,
    });

    mapRef.current = map;

    map.on('load', () => {
      map.addSource('routes', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
      });
      map.addLayer({
        id: 'routes-line',
        type: 'line',
        source: 'routes',
        paint: {
          'line-color': '#3b82f6',
          'line-width': 4,
          'line-opacity': 0.7,
          'line-dasharray': [2, 1],
        },
      });
      map.addLayer({
        id: 'routes-glow',
        type: 'line',
        source: 'routes',
        paint: {
          'line-color': '#3b82f6',
          'line-width': 10,
          'line-opacity': 0.15,
        },
        layout: { 'line-cap': 'round' },
      });

      map.addSource('stop-circles', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
      });
      map.addLayer({
        id: 'stop-circles-layer',
        type: 'circle',
        source: 'stop-circles',
        paint: {
          'circle-radius': 7,
          'circle-color': '#f59e0b',
          'circle-stroke-width': 2,
          'circle-stroke-color': '#ffffff',
        },
      });

      setMapReady(true);
    });

    return () => {
      map.remove();
      mapRef.current = null;
      setMapReady(false);
    };
  }, []);

  // Centers markers
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;

    for (const center of centers) {
      const id = `center-${center.id}`;
      if (markersRef.current[id]) continue;
      const el = document.createElement('div');
      el.innerHTML = `<div style="background:#ef4444;color:white;border-radius:50%;width:28px;height:28px;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:bold;border:2px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.3);">H</div>`;
      const popup = new maplibregl.Popup({ offset: 18 }).setHTML(
        `<div style="padding:10px 14px;"><div style="font-weight:600;font-size:13px;margin-bottom:2px;">${center.name}</div><div style="font-size:11px;color:#666;text-transform:capitalize;">${center.center_type.replace(/_/g, ' ')}</div><div style="font-size:11px;color:#666;">${center.address}</div></div>`
      );
      const marker = new maplibregl.Marker(el)
        .setLngLat(center.location.coordinates)
        .setPopup(popup)
        .addTo(map);
      markersRef.current[id] = marker;
    }
  }, [centers, mapReady]);

  // Participant markers
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;

    for (const p of participants) {
      const id = `participant-${p.id}`;
      if (markersRef.current[id]) continue;
      const el = document.createElement('div');
      const needsColor = p.needs_wheelchair || p.needs_power_wheelchair ? '#8b5cf6' : '#10b981';
      el.innerHTML = `<div style="background:${needsColor};border-radius:50%;width:14px;height:14px;border:2px solid white;box-shadow:0 1px 3px rgba(0,0,0,0.3);"></div>`;
      const popup = new maplibregl.Popup({ offset: 12 }).setHTML(
        `<div style="padding:8px 12px;"><div style="font-weight:600;font-size:12px;">${p.full_name}</div><div style="font-size:11px;color:#666;">${p.home_address}</div></div>`
      );
      const marker = new maplibregl.Marker(el)
        .setLngLat(p.home_location.coordinates)
        .setPopup(popup)
        .addTo(map);
      markersRef.current[id] = marker;
    }
  }, [participants, mapReady]);

  // Route lines + stop circles
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;

    const features: GeoJSON.Feature[] = [];
    const stopFeatures: GeoJSON.Feature[] = [];

    for (const trip of trips) {
      if (!trip.route_geojson?.coordinates?.length) continue;
      features.push({
        type: 'Feature',
        geometry: trip.route_geojson as unknown as GeoJSON.Geometry,
        properties: { tripId: trip.id, eventName: trip.event.name },
      });

      const stops = stopsByTrip[trip.id];
      if (stops) {
        for (const stop of stops) {
          stopFeatures.push({
            type: 'Feature',
            geometry: { type: 'Point', coordinates: stop.location.coordinates },
            properties: {
              stopType: stop.stop_type,
              seq: stop.sequence_index,
              name: stop.participant?.full_name ?? 'Stop',
            },
          });
        }
      }
    }

    const src = map.getSource('routes') as maplibregl.GeoJSONSource | undefined;
    src?.setData({ type: 'FeatureCollection', features } as GeoJSON.FeatureCollection);

    const stopSrc = map.getSource('stop-circles') as maplibregl.GeoJSONSource | undefined;
    stopSrc?.setData({ type: 'FeatureCollection', features: stopFeatures } as GeoJSON.FeatureCollection);
  }, [trips, stopsByTrip, mapReady]);

  // Vehicle markers — created once, updated by live positions
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;

    for (const v of vehicles) {
      const id = `vehicle-${v.id}`;
      const loc = v.current_location?.coordinates;
      if (!loc) continue;

      if (!markersRef.current[id]) {
        const el = document.createElement('div');
        el.style.cursor = 'pointer';
        el.innerHTML = `<div style="position:relative;"><div style="background:${VEHICLE_COLORS[v.status] ?? '#3b82f6'};color:white;border-radius:50%;width:22px;height:22px;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:bold;border:2px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.3);transition:transform 0.3s ease;">V</div></div>`;
        const popup = new maplibregl.Popup({ offset: 15 }).setHTML(
          `<div style="padding:8px 12px;"><div style="font-weight:600;font-size:12px;">${v.name}</div><div style="font-size:11px;color:#666;">${v.plate} · ${v.vehicle_type.replace(/_/g, ' ')}</div></div>`
        );
        const marker = new maplibregl.Marker(el)
          .setLngLat(loc)
          .setPopup(popup)
          .addTo(map);
        markersRef.current[id] = marker;
        el.addEventListener('click', () => selectVehicle(v.id));
      }
    }
  }, [vehicles, selectVehicle, mapReady]);

  // Live position updates
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    for (const vid of Object.keys(liveVehicles)) {
      const marker = markersRef.current[`vehicle-${vid}`];
      const live = liveVehicles[vid];
      if (marker && live) {
        marker.setLngLat(live.position);
        const el = marker.getElement();
        const inner = el?.querySelector('div > div') as HTMLElement | null;
        if (inner) {
          inner.style.transform = `rotate(${live.heading}deg)`;
          inner.style.background = VEHICLE_COLORS[live.status] ?? '#3b82f6';
        }
      }
    }
  }, [liveVehicles]);

  // Fly to selected vehicle
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !selectedVehicleId) return;
    const live = liveVehicles[selectedVehicleId];
    const marker = markersRef.current[`vehicle-${selectedVehicleId}`];
    if (live) {
      map.flyTo({ center: live.position, zoom: 14, duration: 800 });
    } else if (marker) {
      const lngLat = marker.getLngLat();
      map.flyTo({ center: [lngLat.lng, lngLat.lat], zoom: 14, duration: 800 });
    }
  }, [selectedVehicleId, liveVehicles]);

  return <div ref={mapContainer} className="h-full w-full" />;
}
