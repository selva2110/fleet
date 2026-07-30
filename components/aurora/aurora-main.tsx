'use client'

import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Maximize2, Minimize2, Pause, Play, Radio, X } from 'lucide-react'
import { FleetMap } from '@/components/map/fleet-map-dynamic'
import { useFleet } from '@/lib/store'
import { cn } from '@/lib/utils'
import { GlassCard, PanelTitle } from './aurora-ui'
import { useAuroraData } from './use-aurora-data'

export function AuroraMain() {
  const fleet = useFleet()
  const data = useAuroraData()
  const [selectedTripId, setSelectedTripId] = useState<string | null>(null)
  const [fullscreen, setFullscreen] = useState(false)

  const activeVehicleIds = new Set(data.liveTrips.map((t) => t.vehicleId))
  const mealVehicleIds = new Set(data.activeMeals.map((m) => m.vehicleId).filter(Boolean) as string[])
  const mapVehicles = fleet.vehicles.filter(
    (v) => activeVehicleIds.has(v.id) && !mealVehicleIds.has(v.id),
  )

  useEffect(() => {
    if (!fullscreen) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setFullscreen(false)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [fullscreen])

  const mapInner = (
    <>
      <FleetMap
        centers={fleet.centers}
        vehicles={mapVehicles}
        trips={data.liveTrips}
        mealDeliveries={data.activeMeals}
        highlightTripId={selectedTripId}
        highlightVehicleId={null}
        onSelectTrip={(id) => setSelectedTripId(id)}
      />
      {/* top overlay controls */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-[500] flex items-start justify-between p-3">
        <div className="pointer-events-auto flex items-center gap-2 rounded-xl border border-white/10 bg-slate-950/70 px-3 py-1.5 text-xs font-medium text-white backdrop-blur-xl">
          <span className="relative flex size-2">
            {fleet.simRunning ? (
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-70" />
            ) : null}
            <span className={cn('relative inline-flex size-2 rounded-full', fleet.simRunning ? 'bg-emerald-400' : 'bg-slate-400')} />
          </span>
          {data.liveTrips.length + data.activeMeals.length} vehicles tracking
        </div>
        <div className="pointer-events-auto flex items-center gap-1.5">
          <MapControl onClick={fleet.toggleSim} label={fleet.simRunning ? 'Pause' : 'Resume'}>
            {fleet.simRunning ? <Pause className="size-4" /> : <Play className="size-4" />}
          </MapControl>
          <MapControl onClick={() => setFullscreen((v) => !v)} label={fullscreen ? 'Exit fullscreen' : 'Fullscreen'}>
            {fullscreen ? <Minimize2 className="size-4" /> : <Maximize2 className="size-4" />}
          </MapControl>
          {fullscreen ? (
            <MapControl onClick={() => setFullscreen(false)} label="Close">
              <X className="size-4" />
            </MapControl>
          ) : null}
        </div>
      </div>
      {/* legend */}
      <div className="pointer-events-none absolute bottom-3 left-3 z-[500] rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2 text-[11px] text-white backdrop-blur-xl">
        <p className="mb-1 font-semibold">Live legend</p>
        <div className="flex flex-col gap-1 text-slate-300">
          <Legend color="#22d3ee" label="En route / onboard" />
          <Legend color="#fbbf24" label="Pickup in progress" />
          <Legend color="#34d399" label="Arrived" />
          <Legend color="#d97706" label="Meal delivery" />
        </div>
      </div>
    </>
  )

  return (
    <div className="flex flex-col gap-4">
      {/* Live Operations Map */}
      <GlassCard className="p-0">
        <PanelTitle icon={Radio} accent="cyan">
          Live Operations Map
        </PanelTitle>
        <div className="relative mx-4 mb-4 mt-3 h-[560px] overflow-hidden rounded-xl ring-1 ring-white/10">
          {!fullscreen ? mapInner : (
            <div className="flex h-full items-center justify-center bg-slate-900 text-sm text-slate-400">
              <span className="flex items-center gap-2"><Maximize2 className="size-4" /> Map opened in fullscreen</span>
            </div>
          )}
        </div>
      </GlassCard>

      {/* Fullscreen map overlay */}
      <AnimatePresence>
        {fullscreen ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[999] bg-slate-950/95 p-3 backdrop-blur-sm sm:p-6"
          >
            <div className="relative h-full w-full overflow-hidden rounded-2xl ring-1 ring-white/15">
              {mapInner}
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  )
}

function MapControl({
  children,
  onClick,
  label,
}: {
  children: React.ReactNode
  onClick: () => void
  label: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className="flex size-8 items-center justify-center rounded-lg border border-white/10 bg-slate-950/70 text-white backdrop-blur-xl transition-colors hover:bg-slate-800/80"
    >
      {children}
    </button>
  )
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className="size-2.5 rounded-full" style={{ background: color }} />
      {label}
    </span>
  )
}
