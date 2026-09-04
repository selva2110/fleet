"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { MapboxSimpleMap } from "@/components/map/mapbox-simple";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import type { LatLng } from "@/lib/types";
import { useTranslation } from "../context/language-provider";

interface FielProps {
  label?: string;
  htmlFor?: string;
  children: ReactNode;
  className?: string;
  required?: boolean;
  error?: string;
}

type GeocodeSuggestion = {
  displayName: string;
  lat: number;
  lng: number;
};

interface AddressFieldProps {
  label?: string;
  value: string;
  onChange: (v: string) => void;
  location: LatLng | null;
  onLocationChange: (v: LatLng | null) => void;
  placeholder?: string;
  required?: boolean;
  error?: string;
}

interface TextFielprops {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  min?: string;
  required?: boolean;
  error?: string;
  className?: string;
  disabled?: boolean;
}

interface NumberFieldProps {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min?: number;
  required?: boolean;
  error?: string;
}

interface DaysOfWeekFieldProps {
  label: string;
  value: number[];
  onChange: (v: number[]) => void;
  error?: string;
}

interface SwitchFieldProps {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}

export function Field({
  label,
  htmlFor,
  children,
  className,
  required,
  error,
}: FielProps) {
  return (
    <div className={className}>
      {label && (
        <Label
          htmlFor={htmlFor}
          className="mb-1.5 block text-xs font-medium text-muted-foreground"
        >
          {label}
          {required && <span className="ml-0.5 text-destructive">*</span>}
        </Label>
      )}
      {children}
      {error && (
        <p className="mt-1 text-xs font-medium text-destructive">{error}</p>
      )}
    </div>
  );
}

const DEFAULT_MAP_CENTER = { lat: 20.5937, lng: 78.9629 };

// Same public Mapbox token used by MapboxSimpleMap / the traffic route API.
const MAPBOX_TOKEN =
  "pk.eyJ1Ijoic2l2YS1kaGFybWFyYWoiLCJhIjoiY21zNXR1dmhlMDBoMjM1cTRmb25veHRtdCJ9.W_F1SaLw8-6t3tiYNZmzEw";

type MapboxGeocodeFeature = {
  properties?: {
    full_address?: string;
    name?: string;
    place_formatted?: string;
  };
  geometry?: { coordinates?: [number, number] };
};

function mapboxFeatureDisplayName(
  feature: MapboxGeocodeFeature,
  fallback: string,
): string {
  const props = feature.properties;
  if (props?.full_address) return props.full_address;
  const parts = [props?.name, props?.place_formatted].filter(Boolean);
  return parts.length ? parts.join(", ") : fallback;
}

export function AddressField({
  label,
  value,
  onChange,
  location,
  onLocationChange,
  placeholder,
  required,
  error,
}: AddressFieldProps) {
  const {t} = useTranslation();
  const resolvedLabel = label ?? t('common.address');
  const resolvedPlaceholder = placeholder ?? t('dv.enteraddr');
  const [markerPosition, setMarkerPosition] = useState<[number, number] | null>(
    null,
  );
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [suggestions, setSuggestions] = useState<GeocodeSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const lastQuery = useMemo(() => ({ value: "" }), []) as { value: string };
  const inputClickedRef = useRef(false);
  const onLocationChangeRef = useRef(onLocationChange);
  
  useEffect(() => {
    onLocationChangeRef.current = onLocationChange;
  }, [onLocationChange]);

  useEffect(() => {
    if (location) {
      setMarkerPosition([location.lat, location.lng]);
      return;
    }

    if (!value.trim()) {
      setMarkerPosition(null);
    }
  }, [location, value]);

  useEffect(() => {
    const address = value.trim();
    if (!address) {
      setSuggestions([]);
      setShowSuggestions(false);
      setMarkerPosition(null);
      onLocationChangeRef.current(null);
      return;
    }

    let cancelled = false;
    const timeoutId =
      typeof window !== "undefined"
        ? window.setTimeout(() => {
            // avoid refetching the same query repeatedly
            if (address === lastQuery.value) return;
            lastQuery.value = address;

            const controller = new AbortController();
            const geocodeAddress = async () => {
              setIsGeocoding(true);
              try {
                const response = await fetch(
                  `https://api.mapbox.com/search/geocode/v6/forward?q=${encodeURIComponent(address)}&limit=5&access_token=${MAPBOX_TOKEN}`,
                  {
                    signal: controller.signal,
                    headers: {
                      Accept: "application/json",
                    },
                  },
                );
                const data = (await response.json()) as {
                  features?: MapboxGeocodeFeature[];
                };

                if (cancelled) return;

                const nextSuggestions = (data.features ?? [])
                  .map((feature) => {
                    const coordinates = feature.geometry?.coordinates;
                    if (!coordinates) return null;
                    const [lng, lat] = coordinates;
                    return {
                      displayName: mapboxFeatureDisplayName(feature, address),
                      lat,
                      lng,
                    };
                  })
                  .filter((item): item is GeocodeSuggestion => Boolean(item));

                setSuggestions(nextSuggestions);
                setShowSuggestions(nextSuggestions.length > 0);

                const coordinates = data.features?.[0]?.geometry?.coordinates;
                if (!coordinates) {
                  setMarkerPosition(null);
                  onLocationChangeRef.current(null);
                  return;
                }

                const [lng, lat] = coordinates;
                const nextLocation = { lat, lng };
                setMarkerPosition([lat, lng]);
                onLocationChangeRef.current(nextLocation);
              } catch (err) {
                if (err instanceof DOMException && err.name === "AbortError")
                  return;
                if (!cancelled) {
                  setSuggestions([]);
                  setShowSuggestions(false);
                  setMarkerPosition(null);
                  onLocationChangeRef.current(null);
                }
              } finally {
                if (!cancelled) {
                  setIsGeocoding(false);
                }
              }
            };

            void geocodeAddress();

            // cleanup also aborts the fetch
            const cleanup = () => controller.abort();
            if (typeof window !== "undefined")
              (window as any).__lastGeocodeCleanup = cleanup;
          }, 700)
        : 0;

    return () => {
      cancelled = true;
      if (typeof window !== "undefined") {
        window.clearTimeout(timeoutId);
        try {
          const cb = (window as any).__lastGeocodeCleanup;
          if (typeof cb === "function") cb();
        } catch {}
      }
    };
  }, [value]);

  function selectSuggestion(suggestion: GeocodeSuggestion) {
    onChange(suggestion.displayName);
    // prevent immediate refetch for the same display name
    try {
      (lastQuery as any).value = suggestion.displayName;
    } catch {}
    setMarkerPosition([suggestion.lat, suggestion.lng]);
    onLocationChange({ lat: suggestion.lat, lng: suggestion.lng });
    setSuggestions([]);
    setShowSuggestions(false);
  }

  function updateAddressFromLocation(lat: number, lng: number) {
    const nextLocation = { lat, lng };
    setMarkerPosition([lat, lng]);
    onLocationChange(nextLocation);
    setIsGeocoding(true);
    void fetch(
      `https://api.mapbox.com/search/geocode/v6/reverse?longitude=${lng}&latitude=${lat}&access_token=${MAPBOX_TOKEN}`,
      {
        headers: {
          Accept: "application/json",
        },
      },
    )
      .then(
        (response) =>
          response.json() as Promise<{ features?: MapboxGeocodeFeature[] }>,
      )
      .then((result) => {
        const feature = result.features?.[0];
        if (feature) {
          onChange(mapboxFeatureDisplayName(feature, value));
        }
      })
      .catch(() => undefined)
      .finally(() => setIsGeocoding(false));
  }
  return (
    <Field label={resolvedLabel} required={required} error={error}>
      <div className="flex flex-col gap-2">
        <div className="relative">
          <Input
            value={value}
            placeholder={resolvedPlaceholder}
            aria-invalid={error ? true : undefined}
            className={
              error
                ? "border-destructive focus-visible:ring-destructive/40"
                : undefined
            }
            onChange={(e) => {
              onChange(e.target.value);
              setShowSuggestions(Boolean(e.target.value.trim()));
            }}
            onMouseDown={() => {
              inputClickedRef.current = true;
            }}
            onFocus={() => {
              if (inputClickedRef.current && suggestions.length > 0) {
                setShowSuggestions(true);
              }
            }}
            onBlur={() => {
              inputClickedRef.current = false;
              window.setTimeout(() => setShowSuggestions(false), 150);
            }}
          />
          {inputClickedRef.current && showSuggestions ? (
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
                location={
                  markerPosition
                    ? { lat: markerPosition[0], lng: markerPosition[1] }
                    : DEFAULT_MAP_CENTER
                }
                label={t('common.dragpin')}
                draggable
                onLocationChange={(nextLocation) =>
                  updateAddressFromLocation(nextLocation.lat, nextLocation.lng)
                }
                className="h-56 w-full"
                emptyMessage={t('dv.addrplaceholder')}
              />
            </div>
          ) : (
            <div className="flex h-56 items-center justify-center px-4 text-sm text-muted-foreground">
              {t('dv.address')}
            </div>
          )}
        </div>
        {isGeocoding ? (
          <p className="text-xs text-muted-foreground">
            {t('dv.loadaddr')}
          </p>
        ) : null}
      </div>
    </Field>
  );
}

export function TextField({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  min,
  required,
  error,
  className,
  disabled,
}: TextFielprops) {
  return (
    <Field label={label} required={required} error={error}>
      <Input
        type={type}
        // Chromium's native time picker shows a 12h AM/PM control only when
        // the input's locale calls for it; the document/OS locale can be
        // 24h, so this is pinned per-input regardless of that.
        lang={type === "time" || type === "datetime-local" ? "en-US" : undefined}
        value={value}
        placeholder={placeholder}
        min={min}
        disabled={disabled}
        aria-invalid={error ? true : undefined}
        className={`${className || ""} ${error ? "border-destructive focus-visible:ring-destructive/40" : undefined}`}
        onChange={(e) => onChange(e.target.value)}
      />
    </Field>
  );
}

export function NumberField({
  label,
  value,
  onChange,
  min = 0,
  required,
  error,
}: NumberFieldProps) {
  return (
    <Field label={label} required={required} error={error}>
      <Input
        type="number"
        min={min}
        value={Number.isFinite(value) ? value : 0}
        aria-invalid={error ? true : undefined}
        className={
          error
            ? "border-destructive focus-visible:ring-destructive/40"
            : undefined
        }
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </Field>
  );
}

export function SelectField<T extends string>({
  label,
  value,
  options,
  onChange,
  required,
  error,
  placeholder,
  disabled,
}: {
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
  required?: boolean;
  error?: string;
  placeholder?: string;
  disabled?: boolean;
}) {
  const {t} = useTranslation()
  const selectedOption = options.find((o) => o.value === value);
  return (
    <Field label={label} required={required} error={error}>
      <Select
        value={value}
        onValueChange={(v) => {
          if (v !== null) {
            onChange(v as T);
          }
        }}
        disabled={disabled}
      >
        <SelectTrigger
          className={error ? "w-full border-destructive" : "w-full"}
        >
          <SelectValue placeholder={placeholder}>
            {t(selectedOption?.label ?? '')}
          </SelectValue>
        </SelectTrigger>

        <SelectContent>
          {options.length === 0 ? (
            <SelectItem value="none" disabled>
              {t('common.nooptions')}
            </SelectItem>
          ) : (
            options.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {t(option.label)}
              </SelectItem>
            ))
          )}
        </SelectContent>
      </Select>
    </Field>
  );
}

export const DAY_LABEL_KEYS = ["day.sun", "day.mon", "day.tue", "day.wed", "day.thu", "day.fri", "day.sat"];

// Toggle-chip picker for a set of weekday indices (0 = Sunday .. 6 = Saturday).
export function DaysOfWeekField({
  label,
  value,
  onChange,
  error,
}: DaysOfWeekFieldProps) {
  const {t} = useTranslation();
  function toggle(day: number) {
    onChange(
      value.includes(day)
        ? value.filter((d) => d !== day)
        : [...value, day].sort(),
    );
  }

  return (
    <Field label={label} error={error}>
      <div className="flex gap-1">
        {DAY_LABEL_KEYS.map((key, day) => {
          const active = value.includes(day);
          return (
            <button
              key={day}
              type="button"
              onClick={() => toggle(day)}
              className={`flex-1 rounded-md border px-1 py-1.5 text-[11px] font-medium transition-colors ${
                active
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border text-muted-foreground hover:bg-muted"
              }`}
            >
              {t(key)}
            </button>
          );
        })}
      </div>
    </Field>
  );
}

export function SwitchField({ label, checked, onChange }: SwitchFieldProps) {
  return (
    <div className="flex items-center justify-between rounded-md border border-border px-3 py-2">
      <Label className="text-xs font-medium">{label}</Label>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}
