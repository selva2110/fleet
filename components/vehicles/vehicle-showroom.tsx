'use client'

import { useState } from 'react'
import dynamic from 'next/dynamic'
import { Loader2, Rotate3d } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { vehicleTypeDescriptions, vehicleTypeImages } from '@/lib/vehicle-images'
import type { VehicleType } from '@/lib/types'

const Vehicle3D = dynamic(() => import('@/components/vehicles/vehicle-3d'), {
  ssr: false,
  loading: () => (
    <div className="flex size-full items-center justify-center">
      <Loader2 className="size-6 animate-spin text-white/40" />
    </div>
  ),
})

const TYPES = Object.keys(vehicleTypeImages) as VehicleType[]

const TYPE_SPECS: Record<VehicleType, { seats: string; tags: string[] }> = {
  Sedan: { seats: '1–3 seats', tags: ['Ambulatory', 'Fuel-efficient'] },
  SUV: { seats: '4–6 seats', tags: ['High clearance', 'Extra legroom'] },
  Van: { seats: 'Up to 8 seats', tags: ['Group transport'] },
  'Wheelchair Accessible Van': { seats: '4–6 + WC', tags: ['Ramp / lift', 'Securement'] },
  'Medical Transport Vehicle': { seats: '2–4 + clinical', tags: ['Oxygen', 'Non-emergency'] },
  'Mini Bus': { seats: '12–16 seats', tags: ['Mid-size groups'] },
  'Shuttle Bus': { seats: '20+ seats', tags: ['High capacity', 'Events'] },
  Ambulance: { seats: 'Stretcher + crew', tags: ['Emergency', 'Critical care'] },
}

export function VehicleShowroom({ count }: { count?: Partial<Record<VehicleType, number>> }) {
  const [active, setActive] = useState<VehicleType>('Wheelchair Accessible Van')
  const spec = TYPE_SPECS[active]

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      <div className="grid lg:grid-cols-[1.35fr_1fr]">
        {/* 3D stage */}
        <div className="relative min-h-[340px] bg-[radial-gradient(circle_at_50%_35%,oklch(0.32_0.03_258),oklch(0.16_0.02_258))] lg:min-h-[440px]">
          <Vehicle3D type={active} />
          <div className="pointer-events-none absolute left-4 top-4 flex items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-1 text-[11px] font-medium text-white backdrop-blur">
            <Rotate3d className="size-3.5" /> Drag to rotate
          </div>
        </div>

        {/* Details */}
        <div className="flex flex-col justify-center gap-4 p-6">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-primary">Fleet showroom</p>
            <h2 className="mt-1 text-2xl font-bold text-balance">{active}</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground text-pretty">
              {vehicleTypeDescriptions[active]}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary" className="font-medium">
              {spec.seats}
            </Badge>
            {spec.tags.map((t) => (
              <Badge key={t} variant="outline" className="font-medium">
                {t}
              </Badge>
            ))}
            {count?.[active] ? (
              <Badge className="font-medium">{count[active]} in fleet</Badge>
            ) : null}
          </div>

          {/* Type selector */}
          <div className="mt-1">
            <p className="mb-2 text-xs font-medium text-muted-foreground">Explore vehicle types</p>
            <div className="flex flex-wrap gap-2">
              {TYPES.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setActive(t)}
                  className={cn(
                    'flex items-center gap-2 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors',
                    active === t
                      ? 'border-primary bg-primary/10 text-foreground'
                      : 'border-border text-muted-foreground hover:bg-accent',
                  )}
                >
                  <img
                    src={vehicleTypeImages[t] || '/placeholder.svg'}
                    alt=""
                    className="size-6 shrink-0 object-contain"
                  />
                  <span className="max-w-[9rem] truncate">{t}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
