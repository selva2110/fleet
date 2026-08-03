'use client'

import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { MapboxSimpleMap } from '@/components/map/mapbox-simple'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import type { LatLng } from '@/lib/types'

export function Field({
  label,
  htmlFor,
  children,
  className,
  required,
  error,
}: {
  label: string
  htmlFor?: string
  children: ReactNode
  className?: string
  required?: boolean
  error?: string
}) {
  return (
    <div className={className}>
      <Label htmlFor={htmlFor} className="mb-1.5 block text-xs font-medium text-muted-foreground">
        {label}
        {required ? <span className="ml-0.5 text-destructive">*</span> : null}
      </Label>
      {children}
      {error ? <p className="mt-1 text-xs font-medium text-destructive">{error}</p> : null}
    </div>
  )
}

const DEFAULT_MAP_CENTER = { lat: 20.5937, lng: 78.9629 }

type GeocodeSuggestion = {
  displayName: string
  lat: number
  lng: number
}

export function AddressField({
  label = 'Address',
  value,
  onChange,
  location,
  onLocationChange,
  placeholder = 'Enter an address',
  required,
  error,
}: {
  label?: string
  value: string
  onChange: (v: string) => void
  location: LatLng | null
  onLocationChange: (v: LatLng | null) => void
  placeholder?: string
  required?: boolean
  error?: string
}) {
  const [markerPosition, setMarkerPosition] = useState<[number, number] | null>(null)
  const [isGeocoding, setIsGeocoding] = useState(false)
  const [suggestions, setSuggestions] = useState<GeocodeSuggestion[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const lastQuery = useMemo(() => ({ value: '' }), []) as { value: string }

  useEffect(() => {
    if (location) {
      setMarkerPosition([location.lat, location.lng])
      return
    }

    if (!value.trim()) {
      setMarkerPosition(null)
    }
  }, [location, value])

  useEffect(() => {
    const address = value.trim()
    if (!address) {
      setSuggestions([])
      setShowSuggestions(false)
      setMarkerPosition(null)
      onLocationChange(null)
      return
    }

    let cancelled = false
    const timeoutId = typeof window !== 'undefined' ? window.setTimeout(() => {
      // avoid refetching the same query repeatedly
      if (address === lastQuery.value) return
      lastQuery.value = address

      const controller = new AbortController()
      const geocodeAddress = async () => {
        setIsGeocoding(true)
        try {
          const response = await fetch(
            `https://photon.komoot.io/api/?q=${encodeURIComponent(address)}&limit=5&lang=en`,
            {
              signal: controller.signal,
              headers: {
                Accept: 'application/json',
              },
            },
          )
          const data = (await response.json()) as {
            features?: Array<{
              properties?: { name?: string; city?: string; country?: string; street?: string; housenumber?: string }
              geometry?: { coordinates?: [number, number] }
            }>
          }

          if (cancelled) return

          const nextSuggestions = (data.features ?? [])
            .map((feature) => {
              const coordinates = feature.geometry?.coordinates
              if (!coordinates) return null
              const [lng, lat] = coordinates
              const parts = [feature.properties?.name, feature.properties?.street, feature.properties?.housenumber, feature.properties?.city, feature.properties?.country]
                .filter(Boolean)
                .join(', ')
              return {
                displayName: parts || address,
                lat,
                lng,
              }
            })
            .filter((item): item is GeocodeSuggestion => Boolean(item))

          setSuggestions(nextSuggestions)
          setShowSuggestions(nextSuggestions.length > 0)

          const coordinates = data.features?.[0]?.geometry?.coordinates
          if (!coordinates) {
            setMarkerPosition(null)
            onLocationChange(null)
            return
          }

          const [lng, lat] = coordinates
          const nextLocation = { lat, lng }
          setMarkerPosition([lat, lng])
          onLocationChange(nextLocation)
        } catch (err) {
          if (err instanceof DOMException && err.name === 'AbortError') return
          if (!cancelled) {
            setSuggestions([])
            setShowSuggestions(false)
            setMarkerPosition(null)
            onLocationChange(null)
          }
        } finally {
          if (!cancelled) {
            setIsGeocoding(false)
          }
        }
      }

      void geocodeAddress()

      // cleanup also aborts the fetch
      const cleanup = () => controller.abort()
      if (typeof window !== 'undefined') (window as any).__lastGeocodeCleanup = cleanup
    }, 700) : 0

    return () => {
      cancelled = true
      if (typeof window !== 'undefined') {
        window.clearTimeout(timeoutId)
        try {
          const cb = (window as any).__lastGeocodeCleanup
          if (typeof cb === 'function') cb()
        } catch {}
      }
    }
  }, [onLocationChange, value])

  function selectSuggestion(suggestion: GeocodeSuggestion) {
    onChange(suggestion.displayName)
    // prevent immediate refetch for the same display name
    try {
      ;(lastQuery as any).value = suggestion.displayName
    } catch {}
    setMarkerPosition([suggestion.lat, suggestion.lng])
    onLocationChange({ lat: suggestion.lat, lng: suggestion.lng })
    setSuggestions([])
    setShowSuggestions(false)
  }

  function updateAddressFromLocation(lat: number, lng: number) {
    const nextLocation = { lat, lng }
    setMarkerPosition([lat, lng])
    onLocationChange(nextLocation)
    setIsGeocoding(true)
    void fetch(
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`,
      {
        headers: {
          'Accept-Language': 'en',
          Accept: 'application/json',
        },
      },
    )
      .then((response) => response.json() as Promise<{ display_name?: string }>)
      .then((result) => {
        if (result.display_name) {
          onChange(result.display_name)
        }
      })
      .catch(() => undefined)
      .finally(() => setIsGeocoding(false))
  }

  return (
    <Field label={label} required={required} error={error}>
      <div className="flex flex-col gap-2">
        <div className="relative">
          <Input
            value={value}
            placeholder={placeholder}
            aria-invalid={error ? true : undefined}
            className={error ? 'border-destructive focus-visible:ring-destructive/40' : undefined}
            onChange={(e) => {
              onChange(e.target.value)
              setShowSuggestions(Boolean(e.target.value.trim()))
            }}
            onFocus={() => setShowSuggestions(Boolean(value.trim()) && suggestions.length > 0)}
            onBlur={() => window.setTimeout(() => setShowSuggestions(false), 150)}
          />
          {showSuggestions && suggestions.length > 0 ? (
            <ul
              role="listbox"
              style={{ zIndex: 10000 }}
              className="absolute mt-1 w-full max-h-60 overflow-auto rounded-md border border-border bg-background shadow-lg"
            >
              {suggestions.map((suggestion, idx) => (
                <li key={`${idx}`}>
                  <button
                    type="button"
                    role="option"
                    className="w-full truncate px-3 py-2 text-left text-sm hover:bg-muted"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => selectSuggestion(suggestion)}
                  >
                    {suggestion.displayName}
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
        <div className="overflow-hidden rounded-md border border-border bg-muted">
          {value.trim() ? (
            <div className="h-56 w-full">
              <MapboxSimpleMap
                location={markerPosition ? { lat: markerPosition[0], lng: markerPosition[1] } : DEFAULT_MAP_CENTER}
                label="Drag the pin to adjust the location"
                draggable
                onLocationChange={(nextLocation) => updateAddressFromLocation(nextLocation.lat, nextLocation.lng)}
                className="h-56 w-full"
                emptyMessage="Enter an address to preview it on the map. You can drag the pin to adjust the location."
              />
            </div>
          ) : (
            <div className="flex h-56 items-center justify-center px-4 text-sm text-muted-foreground">
              Enter an address to preview it on the map. You can drag the pin to adjust the location.
            </div>
          )}
        </div>
        {isGeocoding ? <p className="text-xs text-muted-foreground">Looking up the location…</p> : null}
      </div>
    </Field>
  );
}

export function TextField({
  label,
  value,
  onChange,
  placeholder,
  type = 'text',
  min,
  required,
  error,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  type?: string
  min?: string
  required?: boolean
  error?: string
}) {
  return (
    <Field label={label} required={required} error={error}>
      <Input
        type={type}
        value={value}
        placeholder={placeholder}
        min={min}
        aria-invalid={error ? true : undefined}
        className={error ? 'border-destructive focus-visible:ring-destructive/40' : undefined}
        onChange={(e) => onChange(e.target.value)}
      />
    </Field>
  )
}

export function NumberField({
  label,
  value,
  onChange,
  min = 0,
  required,
  error,
}: {
  label: string
  value: number
  onChange: (v: number) => void
  min?: number
  required?: boolean
  error?: string
}) {
  return (
    <Field label={label} required={required} error={error}>
      <Input
        type="number"
        min={min}
        value={Number.isFinite(value) ? value : 0}
        aria-invalid={error ? true : undefined}
        className={error ? 'border-destructive focus-visible:ring-destructive/40' : undefined}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </Field>
  )
}

export function SelectField<T extends string>({
  label,
  value,
  options,
  onChange,
  required,
  error,
}: {
  label: string
  value: T
  options: { value: T; label: string }[]
  onChange: (v: T) => void
  required?: boolean
  error?: string
}) {
  return (
    <Field label={label} required={required} error={error}>
      <Select value={value} onValueChange={(v) => v && onChange(v as T)}>
        <SelectTrigger className={error ? 'w-full border-destructive' : 'w-full'}>
          <SelectValue>
            {(v) => options.find((o) => o.value === v)?.label ?? label}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {options.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </Field>
  )
}

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

// Toggle-chip picker for a set of weekday indices (0 = Sunday .. 6 = Saturday).
export function DaysOfWeekField({
  label,
  value,
  onChange,
}: {
  label: string
  value: number[]
  onChange: (v: number[]) => void
}) {
  function toggle(day: number) {
    onChange(value.includes(day) ? value.filter((d) => d !== day) : [...value, day].sort())
  }

  return (
    <Field label={label}>
      <div className="flex gap-1">
        {DAY_LABELS.map((label, day) => {
          const active = value.includes(day)
          return (
            <button
              key={day}
              type="button"
              onClick={() => toggle(day)}
              className={`flex-1 rounded-md border px-1 py-1.5 text-[11px] font-medium transition-colors ${
                active
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'border-border text-muted-foreground hover:bg-muted'
              }`}
            >
              {label}
            </button>
          )
        })}
      </div>
    </Field>
  )
}

export function SwitchField({
  label,
  checked,
  onChange,
}: {
  label: string
  checked: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <div className="flex items-center justify-between rounded-md border border-border px-3 py-2">
      <Label className="text-xs font-medium">{label}</Label>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  )
}
