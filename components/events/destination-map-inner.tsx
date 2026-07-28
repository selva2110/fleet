'use client'

import L from 'leaflet'
import { MapContainer, Marker, TileLayer, Tooltip } from 'react-leaflet'
import type { LatLng } from '@/lib/types'

function pinIcon() {
  const html = `
    <div style="width:22px;height:22px;border-radius:9999px;background:oklch(0.54 0.16 248);border:3px solid white;box-shadow:0 0 0 5px oklch(0.54 0.16 248 / 0.22);"></div>`
  return L.divIcon({ html, className: 'map-pin', iconSize: [22, 22], iconAnchor: [11, 11] })
}

export default function DestinationMapInner({
  location,
  label,
}: {
  location: LatLng
  label?: string
}) {
  const center: [number, number] = [location.lat, location.lng]
  return (
    <MapContainer
      key={`${location.lat}-${location.lng}`}
      center={center}
      zoom={14}
      scrollWheelZoom={false}
      className="h-full w-full"
      attributionControl={false}
    >
      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      <Marker position={center} icon={pinIcon()}>
        {label ? <Tooltip permanent direction="top" offset={[0, -12]}>{label}</Tooltip> : null}
      </Marker>
    </MapContainer>
  )
}
