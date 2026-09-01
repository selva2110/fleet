'use client'

import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Maximize2, Minimize2, Pause, Play, Radio, X } from 'lucide-react'
import { FleetMap } from '@/components/map/fleet-map-dynamic'
import { useFleetSession } from '@/components/context/fleet-session-provider'
import { useVehicles } from '@/lib/vehicles/hooks'
import { useDrivers } from '@/lib/driver/hooks'
import { useCenters } from '@/lib/events/hooks'
import { useParticipants } from '@/lib/participant/hooks'
import { cn, findById } from '@/lib/utils'
import { GlassCard, PanelTitle } from './aurora-ui'
import { useAuroraData } from './use-aurora-data'
import { useTranslation } from '../context/language-provider';

export function AuroraMain() {
  const { simRunning, toggleSim } = useFleetSession()
  const { vehicles } = useVehicles()
  const { drivers } = useDrivers()
  const { centers } = useCenters()
  const { participants } = useParticipants()
  const data = useAuroraData()
  const {t} = useTranslation ();
  const [selectedTripId, setSelectedTripId] = useState<string | null>(null)
  const [selectedMealId, setSelectedMealId] = useState<string | null>(null)
  const [fullscreen, setFullscreen] = useState(false)

  const activeVehicleIds = new Set(data.liveTrips.map((t) => t.vehicleId))
  const mealVehicleIds = new Set(data.activeMeals.map((m) => m.vehicleId).filter(Boolean) as string[])
  const mapVehicles = vehicles.filter(
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
        centers={centers}
        vehicles={mapVehicles}
        trips={data.liveTrips}
        participants={participants}
        mealDeliveries={data.activeMeals}
        highlightTripId={selectedTripId}
        highlightMealId={selectedMealId}
        highlightVehicleId={null}
        onSelectTrip={(id) => {
          setSelectedTripId((current) => (current === id ? null : id))
          setSelectedMealId(null)
        }}
        onSelectMeal={(id) => {
          setSelectedMealId((current) => (current === id ? null : id))
          setSelectedTripId(null)
        }}
      />
      {/* top overlay controls */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-500 flex items-start justify-between p-3">
        <div className="pointer-events-auto flex items-center gap-2 rounded-xl border border-border bg-card/90 px-3 py-1.5 text-xs font-medium text-foreground backdrop-blur-xl">
          <span className="relative flex size-2">
            {simRunning ? (
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-success/70 opacity-70" />
            ) : null}
            <span className={cn('relative inline-flex size-2 rounded-full', simRunning ? 'bg-success' : 'bg-muted')} />
          </span>
          {data.liveTrips.length + data.activeMeals.length} {t('aurora.vehiclestracking')}
        </div>
        <div className="pointer-events-auto flex items-center gap-1.5">
          <MapControl onClick={toggleSim} label={simRunning ? t('cc.pause') : t('cc.resume')}>
            {simRunning ? <Pause className="size-4" /> : <Play className="size-4" />}
          </MapControl>
          <MapControl onClick={() => setFullscreen((v) => !v)} label={fullscreen ? t('aurora.exitfullscreen') : t('aurora.fullscreen')}>
            {fullscreen ? <Minimize2 className="size-4" /> : <Maximize2 className="size-4" />}
          </MapControl>
          {fullscreen ? (
            <MapControl onClick={() => setFullscreen(false)} label={t('common.close')}>
              <X className="size-4" />
            </MapControl>
          ) : null}
        </div>
      </div>
      {selectedTripId ? (
        <div className="pointer-events-none absolute left-3 top-16 z-500 max-w-70 rounded-xl border border-white/10 bg-slate-950/80 p-3 text-sm text-white shadow-lg backdrop-blur-xl">
          {(() => {
            const trip = data.liveTrips.find((item) => item.id === selectedTripId)
            if (!trip) return null
            const vehicle = findById(vehicles, trip.vehicleId)
            const driver = findById(drivers, trip.driverId)
            return (
              <div className="space-y-2">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-400">{t('aurora.selectedtrip')}</p>
                <p className="font-semibold">{vehicle?.name ?? t('common.vehicle')} · {trip.tripNumber}</p>
                <p className="text-xs text-slate-300">{t('board.driverlabel')} {driver?.name ?? t('common.unassigned')}</p>
                <p className="text-xs text-slate-300">{t('aurora.stopslabel')} {trip.stops.length} · {t('trip.eta')} {trip.etaCenter}</p>
              </div>
            )
          })()}
        </div>
      ) : null}
      {selectedMealId ? (
        <div className="pointer-events-none absolute left-3 top-16 z-500 max-w-70 rounded-xl border border-white/10 bg-slate-950/80 p-3 text-sm text-white shadow-lg backdrop-blur-xl">
          {(() => {
            const meal = data.activeMeals.find((item) => item.id === selectedMealId)
            if (!meal) return null
            const center = findById(centers, meal.centerId)
            const vehicle = findById(vehicles, meal.vehicleId)
            return (
              <div className="space-y-2">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-400">{t('aurora.selectedmealrun')}</p>
                <p className="font-semibold">{meal.runNumber}</p>
                <p className="text-xs text-slate-300">{t('aurora.centerlabel')} {center?.name ?? t('common.unknown')}</p>
                <p className="text-xs text-slate-300">{t('aurora.vehiclelabel')} {vehicle?.name ?? t('common.unassigned')} · {meal.totalMeals} {t('meal.meals').toLowerCase()}</p>
              </div>
            )
          })()}
        </div>
      ) : null}
      {/* legend */}
      <div className="pointer-events-none absolute bottom-3 left-3 z-500 rounded-xl border border-border bg-card/90 px-3 py-2 text-[11px] text-foreground backdrop-blur-xl">
        <p className="mb-1 font-semibold">{t('aurora.livelegend')}</p>
        <div className="flex flex-col gap-1 text-muted-foreground">
          <Legend color="#22d3ee" label={t('cc.enrouteonboard')} />
          <Legend color="#fbbf24" label={t('cc.pickupinprogress')} />
          <Legend color="#34d399" label={t('cc.arrived')} />
          <Legend color="#d97706" label={t('aurora.mealdeliveryword')} />
        </div>
      </div>
    </>
  )

  return (
    <div className="flex h-full flex-col gap-4">
      {/* Live Operations Map */}
      <GlassCard className="flex h-full flex-col p-0">
        <PanelTitle icon={Radio} accent="cyan" className="px-5 pt-4">
          {t('aurora.liveopsmap')}
        </PanelTitle>
        <div className="relative mx-4 mb-4 mt-3 min-h-87.5 flex-1 overflow-hidden rounded-xl ring-1 ring-white/10">
          {!fullscreen ? mapInner : (
            <div className="flex h-full items-center justify-center bg-card/90 text-sm text-muted-foreground">
              <span className="flex items-center gap-2"><Maximize2 className="size-4" /> {t('aurora.mapfullscreen')}</span>
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
            className="fixed inset-0 z-999 bg-card/95 p-3 backdrop-blur-sm sm:p-6"
          >
            <div className="relative h-full w-full overflow-hidden rounded-2xl ring-1 ring-border/15">
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
      className="flex size-8 items-center justify-center rounded-lg border border-border bg-card/80 text-foreground backdrop-blur-xl transition-colors hover:bg-card/90"
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
