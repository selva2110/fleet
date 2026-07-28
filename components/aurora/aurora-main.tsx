'use client'

import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  Activity,
  Bus,
  Maximize2,
  Minimize2,
  Navigation,
  Pause,
  Play,
  Radio,
  Sparkles,
  X,
} from 'lucide-react'
import { FleetMap } from '@/components/map/fleet-map-dynamic'
import { useFleet } from '@/lib/store'
import { tripStatusMeta } from '@/lib/labels'
import { cn } from '@/lib/utils'
import { GlassCard, PanelTitle, type AuroraAccent, accentClasses } from './aurora-ui'
import { useAuroraData } from './use-aurora-data'

export function AuroraMain() {
  const fleet = useFleet()
  const data = useAuroraData()
  const [selectedTripId, setSelectedTripId] = useState<string | null>(null)
  const [fullscreen, setFullscreen] = useState(false)

  const activeVehicleIds = new Set(data.liveTrips.map((t) => t.vehicleId))
  const mapVehicles = fleet.vehicles.filter((v) => activeVehicleIds.has(v.id))

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
          {data.liveTrips.length} vehicles tracking
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
        <div className="relative mx-4 mb-4 mt-3 h-[420px] overflow-hidden rounded-xl ring-1 ring-white/10">
          {!fullscreen ? mapInner : (
            <div className="flex h-full items-center justify-center bg-slate-900 text-sm text-slate-400">
              <span className="flex items-center gap-2"><Maximize2 className="size-4" /> Map opened in fullscreen</span>
            </div>
          )}
        </div>
      </GlassCard>

      {/* Live Trips table */}
      <GlassCard className="p-0">
        <PanelTitle icon={Activity} accent="blue">
          Live Trips
        </PanelTitle>
        <div className="mt-3 overflow-x-auto">
          {data.liveTrips.length === 0 ? (
            <p className="px-5 py-10 text-center text-sm text-slate-400">
              No active trips right now. Dispatch a plan from the Route Planner.
            </p>
          ) : (
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead>
                <tr className="border-y border-white/10 text-[11px] uppercase tracking-wide text-slate-400">
                  <th className="px-5 py-2 font-medium">Vehicle</th>
                  <th className="px-3 py-2 font-medium">Driver</th>
                  <th className="px-3 py-2 font-medium">Status</th>
                  <th className="px-3 py-2 font-medium">Progress</th>
                  <th className="px-5 py-2 font-medium text-right">ETA</th>
                </tr>
              </thead>
              <tbody>
                {data.liveTrips.map((t) => {
                  const vehicle = fleet.vehicleById(t.vehicleId)
                  const driver = t.driverId ? fleet.driverById(t.driverId) : undefined
                  const meta = tripStatusMeta[t.status]
                  return (
                    <tr key={t.id} className="border-b border-white/5 transition-colors hover:bg-white/5">
                      <td className="px-5 py-2.5">
                        <div className="flex items-center gap-2.5">
                          <span className="flex size-7 items-center justify-center rounded-lg bg-cyan-400/10 text-cyan-300">
                            <Bus className="size-3.5" />
                          </span>
                          <div>
                            <p className="font-medium text-white">{vehicle?.name ?? 'Vehicle'}</p>
                            <p className="font-mono text-[10px] text-slate-400">{t.tripNumber}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-2.5 text-slate-300">{driver?.name ?? 'Unassigned'}</td>
                      <td className="px-3 py-2.5">
                        <span className="inline-flex rounded-full bg-white/5 px-2 py-0.5 text-[11px] font-medium text-slate-200 ring-1 ring-white/10">
                          {meta.label}
                        </span>
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="flex items-center gap-2">
                          <span className="h-1.5 w-20 overflow-hidden rounded-full bg-white/10">
                            <span
                              className="block h-full rounded-full bg-gradient-to-r from-cyan-400 to-blue-500"
                              style={{ width: `${Math.round(t.progress * 100)}%` }}
                            />
                          </span>
                          <span className="text-[11px] tabular-nums text-slate-400">
                            {Math.round(t.progress * 100)}%
                          </span>
                        </div>
                      </td>
                      <td className="px-5 py-2.5 text-right font-mono text-xs text-slate-300">{t.etaCenter}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      </GlassCard>

      <div className="grid gap-4 lg:grid-cols-2">
        <OperationsTimeline />
        <AiInsights />
      </div>

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

function OperationsTimeline() {
  const data = useAuroraData()
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  const dotAccent: Record<string, AuroraAccent> = {
    trip: 'cyan',
    vehicle: 'blue',
    driver: 'emerald',
    participant: 'violet',
    event: 'amber',
    notification: 'rose',
  }

  return (
    <GlassCard className="p-0 pb-4">
      <PanelTitle icon={Activity} accent="violet">
        Operations Timeline
      </PanelTitle>
      <div className="mt-3 max-h-72 overflow-y-auto px-5">
        {data.recentEvents.length === 0 ? (
          <p className="py-8 text-center text-sm text-slate-400">Waiting for live activity…</p>
        ) : (
          <ol className="relative space-y-4 border-l border-white/10 pl-5">
            {data.recentEvents.map((e) => {
              const accent = dotAccent[e.aggregateType] ?? 'cyan'
              return (
                <li key={e.id} className="relative">
                  <span
                    className={cn(
                      'absolute -left-[27px] top-0.5 flex size-3 items-center justify-center rounded-full ring-4 ring-slate-950',
                      accentClasses[accent].text,
                    )}
                  >
                    <span className="size-2 rounded-full bg-current" />
                  </span>
                  <p className="text-sm text-slate-200">{e.summary}</p>
                  <p className="mt-0.5 text-[11px] text-slate-500">
                    {e.actorRole}
                    {mounted ? ` · ${new Date(e.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : ''}
                  </p>
                </li>
              )
            })}
          </ol>
        )}
      </div>
    </GlassCard>
  )
}

function AiInsights() {
  const data = useAuroraData()
  const accentByKind: Record<string, AuroraAccent> = {
    route: 'cyan',
    demand: 'violet',
    attendance: 'amber',
    fleet: 'emerald',
  }
  return (
    <GlassCard className="p-0 pb-4">
      <PanelTitle icon={Sparkles} accent="cyan">
        AI Insights
      </PanelTitle>
      <div className="mt-3 flex flex-col gap-2.5 px-4">
        {data.insights.map((ins) => {
          const accent = accentClasses[accentByKind[ins.kind] ?? 'cyan']
          return (
            <div key={ins.id} className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  <Navigation className={cn('size-3.5', accent.text)} />
                  <p className="text-[13px] font-semibold text-white">{ins.title}</p>
                </div>
                <span className={cn('shrink-0 text-[11px] font-medium tabular-nums', accent.text)}>
                  {ins.confidence}%
                </span>
              </div>
              <p className="mt-1 text-xs leading-relaxed text-slate-300/80">{ins.detail}</p>
              <span className="mt-2 block h-1 overflow-hidden rounded-full bg-white/10">
                <span
                  className={cn('block h-full rounded-full bg-current', accent.text)}
                  style={{ width: `${ins.confidence}%` }}
                />
              </span>
            </div>
          )
        })}
      </div>
    </GlassCard>
  )
}
