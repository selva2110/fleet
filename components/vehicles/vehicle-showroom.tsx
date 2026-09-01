'use client'

import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { VehicleStage } from '@/components/vehicles/vehicle-stage'
import { VehiclesConfig } from '@/lib/vehicles/config';
import { VehicleType } from '@/lib/vehicles/types';
import { useTranslation } from '@/components/context/language-provider';

export function VehicleShowroom({ count }: { count?: Partial<Record<VehicleType, number>> }) {
  const {t} = useTranslation()
  const [active, setActive] = useState<VehicleType>('Wheelchair Accessible Van')
  const spec = VehiclesConfig.TYPE_SPECS[active]

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      <div className="grid lg:grid-cols-[1.35fr_1fr]">
        {/* 3D stage */}
        <div className="relative min-h-85 bg-[radial-gradient(circle_at_50%_35%,oklch(0.32_0.03_258),oklch(0.16_0.02_258))] lg:min-h-110">
          <VehicleStage type={active} />
          {/* <div className="pointer-events-none absolute left-4 top-4 flex items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-1 text-[11px] font-medium text-white backdrop-blur">
            <Rotate3d className="size-3.5" /> Drag to rotate
          </div> */}
        </div>

        {/* Details */}
        <div className="flex flex-col justify-center gap-4 p-6">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-primary">{t('vehicle.showroom')}</p>
            <h2 className="mt-1 text-2xl font-bold text-balance">{t(VehiclesConfig.TYPE_OPTIONS_LABEL[active])}</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground text-pretty">
              {t(VehiclesConfig.vehicleTypeDescriptions[active])}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary" className="font-medium">
              {t(spec.seats)}
            </Badge>
            {spec.tags.map((item) => (
              <Badge key={item} variant="outline" className="font-medium">
                {t(item)}
              </Badge>
            ))}
            {count?.[active] ? (
              <Badge className="font-medium">{count[active]} {t('vehicle.infleet')}</Badge>
            ) : null}
          </div>

          {/* Type selector */}
          <div className="mt-1">
            <p className="mb-2 text-xs font-medium text-muted-foreground">{t('vehicle.exploretypes')}</p>
            <div className="flex flex-wrap gap-2">
              {VehiclesConfig.VehicleTypes.map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setActive(item)}
                  className={cn(
                    'flex items-center gap-2 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors',
                    active === item
                      ? 'border-primary bg-primary/10 text-foreground'
                      : 'border-border text-muted-foreground hover:bg-accent',
                  )}
                >
                  <img
                    src={VehiclesConfig.vehicleTypeImages[item] || '/placeholder.svg'}
                    alt=""
                    className="size-6 shrink-0 object-contain"
                  />
                  <span className="max-w-36 truncate">{t(VehiclesConfig.TYPE_OPTIONS_LABEL[item])}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
