'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { cn } from '@/lib/utils'
import { VehiclesConfig } from '@/lib/vehicles/config';
import { VehicleType } from '@/lib/vehicles/types';

type Rot = { x: number; y: number }

const START: Rot = { x: -8, y: -22 }
const CLAMP_X = 24

/**
 * Interactive "3D" vehicle stage. Uses the realistic rendered image on a
 * CSS 3D plane that the user can drag to rotate, with a floor reflection and
 * a soft contact shadow for a premium showroom feel. No WebGL required.
 */
export function VehicleStage({ type }: { type: VehicleType }) {
  const [rot, setRot] = useState<Rot>(START)
  const [dragging, setDragging] = useState(false)
  const drag = useRef<{ px: number; py: number; rx: number; ry: number } | null>(null)
  const img = VehiclesConfig.vehicleTypeImages[type] || '/placeholder.svg'

  // Reset orientation whenever the vehicle type changes.
  useEffect(() => setRot(START), [type])

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      ;(e.target as HTMLElement).setPointerCapture?.(e.pointerId)
      drag.current = { px: e.clientX, py: e.clientY, rx: rot.x, ry: rot.y }
      setDragging(true)
    },
    [rot],
  )

  return (
    <div className="relative flex size-full items-center justify-center overflow-hidden">
      <div
        className="relative flex size-full cursor-grab touch-none select-none items-center justify-center px-8 active:cursor-grabbing"
        style={{ perspective: '1200px' }}
        role="img"
        aria-label={`${type} — drag to rotate`}
      >
        <div
          className={cn('relative w-full max-w-md', !dragging && 'transition-transform duration-500 ease-out')}
          style={{
            transformStyle: 'preserve-3d',
            transform: `rotateX(${rot.x}deg) rotateY(${rot.y}deg)`,
          }}
        >
          {/* Vehicle */}
          <img
            src={img || '/placeholder.svg'}
            alt={type}
            draggable={false}
            className="relative z-10 mx-auto w-full object-contain drop-shadow-2xl"
            style={{ transform: 'translateZ(40px)' }}
          />

          {/* Floor reflection */}
          <img
            src={img || '/placeholder.svg'}
            alt=""
            aria-hidden
            draggable={false}
            className="absolute inset-x-0 top-full mx-auto w-full -scale-y-100 object-contain opacity-20 blur-[1px]"
            style={{
              maskImage: 'linear-gradient(to bottom, rgba(0,0,0,0.6), transparent 55%)',
              WebkitMaskImage: 'linear-gradient(to bottom, rgba(0,0,0,0.6), transparent 55%)',
            }}
          />
        </div>

        {/* Contact shadow */}
        <div
          className="pointer-events-none absolute bottom-[18%] left-1/2 h-6 w-[62%] -translate-x-1/2 rounded-[50%] bg-black/45 blur-xl"
          style={{ transform: `translateX(-50%) scaleX(${1 - Math.abs(rot.y % 180) / 900})` }}
        />
      </div>

      {/* Reset view */}
      {/* <button
        type="button"
        onClick={() => setRot(START)}
        className="absolute bottom-3 right-3 z-20 flex items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-1 text-[11px] font-medium text-white backdrop-blur transition-colors hover:bg-white/20"
      >
        <RotateCcw className="size-3" /> Reset
      </button> */}
    </div>
  )
}
