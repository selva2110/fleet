'use client'

// Client-side application store, now backed by the Neon database.
//
// It fetches a full snapshot via a server action (SWR), drives the server-side
// live-tracking simulation by calling `tickSimulation` on an interval, and
// delegates every mutation to an event-driven server action. Component code
// keeps using `useFleet()` exactly as before; the shape is preserved and
// extended with `eventLog` and CRUD helpers.

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import useSWR from 'swr'
import {
  getSnapshot,
  reseedDatabase,
  type FleetSnapshot,
} from '@/app/actions/data'
import {
  commitPlan as commitPlanAction,
  cancelTrip as cancelTripAction,
  clearAllTrips as clearAllTripsAction,
  generatePlan as generatePlanAction,
  startTrip as startTripAction,
  assignDriverToTrip as assignDriverAction,
} from '@/app/actions/dispatch'
import {
  startSimulation,
  stopSimulation,
  tickSimulation,
} from '@/app/actions/simulation'
import {
  deleteDriver as deleteDriverAction,
  deleteEvent as deleteEventAction,
  deleteParticipant as deleteParticipantAction,
  deleteVehicle as deleteVehicleAction,
  saveDriver as saveDriverAction,
  saveEvent as saveEventAction,
  saveParticipant as saveParticipantAction,
  saveVehicle as saveVehicleAction,
  type DriverInput,
  type EventInput,
  type ParticipantInput,
  type VehicleInput,
} from '@/app/actions/crud'
import type { DomainEvent } from '@/lib/events'
import type {
  Center,
  Driver,
  FleetEvent,
  Participant,
  PlanRecommendation,
  PlanResult,
  Role,
  Trip,
  Vehicle,
} from './types'

const EMPTY: FleetSnapshot = {
  centers: [],
  participants: [],
  vehicles: [],
  drivers: [],
  events: [],
  trips: [],
  eventLog: [],
  seeded: false,
}

interface FleetContextValue {
  role: Role
  loading: boolean
  centers: Center[]
  participants: Participant[]
  vehicles: Vehicle[]
  drivers: Driver[]
  events: FleetEvent[]
  trips: Trip[]
  eventLog: DomainEvent[]
  simRunning: boolean
  setRole: (r: Role) => void
  toggleSim: () => void
  refresh: () => Promise<void>
  reseed: () => Promise<void>
  // dispatch
  generatePlan: (eventId: string) => Promise<PlanResult>
  commitPlan: (eventId: string, recs: PlanRecommendation[]) => Promise<void>
  cancelTrip: (tripId: string) => Promise<void>
  clearAllTrips: () => Promise<void>
  startTrip: (tripId: string) => Promise<void>
  assignDriver: (tripId: string, driverId: string) => Promise<void>
  // crud
  saveParticipant: (input: ParticipantInput & { id?: string }) => Promise<void>
  deleteParticipant: (id: string, name: string) => Promise<void>
  saveVehicle: (input: VehicleInput & { id?: string }) => Promise<void>
  deleteVehicle: (id: string, name: string) => Promise<void>
  saveDriver: (input: DriverInput & { id?: string }) => Promise<void>
  deleteDriver: (id: string, name: string) => Promise<void>
  saveEvent: (input: EventInput & { id?: string }) => Promise<void>
  deleteEvent: (id: string, name: string) => Promise<void>
  // lookups
  centerById: (id: string | null | undefined) => Center | undefined
  vehicleById: (id: string | null | undefined) => Vehicle | undefined
  driverById: (id: string | null | undefined) => Driver | undefined
  participantById: (id: string | null | undefined) => Participant | undefined
  eventById: (id: string | null | undefined) => FleetEvent | undefined
}

const FleetContext = createContext<FleetContextValue | null>(null)

export function FleetProvider({ children }: { children: React.ReactNode }) {
  const { data, mutate, isLoading } = useSWR<FleetSnapshot>(
    'fleet-snapshot',
    () => getSnapshot(),
    { refreshInterval: 0, revalidateOnFocus: false },
  )
  const snapshot = data ?? EMPTY

  const [role, setRole] = useState<Role>('dispatcher')
  const [simRunning, setSimRunning] = useState(true)
  const roleRef = useRef(role)
  roleRef.current = role
  const simRef = useRef(simRunning)
  simRef.current = simRunning
  const tickingRef = useRef(false)

  // Live-tracking driver: every 2s advance the server-side simulation, then
  // refresh the snapshot so the map/feed update. Guarded against overlap.
  useEffect(() => {
    const id = setInterval(async () => {
      if (!simRef.current || tickingRef.current) return
      tickingRef.current = true
      try {
        await tickSimulation(1)
        await mutate()
      } catch (err) {
        console.log('[v0] tick error', (err as Error).message)
      } finally {
        tickingRef.current = false
      }
    }, 2000)
    return () => clearInterval(id)
  }, [mutate])

  const refresh = useCallback(async () => {
    await mutate()
  }, [mutate])

  const toggleSim = useCallback(async () => {
    const next = !simRef.current
    setSimRunning(next)
    if (next) await startSimulation(roleRef.current)
    else await stopSimulation(roleRef.current)
    await mutate()
  }, [mutate])

  const reseed = useCallback(async () => {
    const fresh = await reseedDatabase()
    await mutate(fresh, { revalidate: false })
  }, [mutate])

  // Dispatch actions
  const generatePlan = useCallback(
    (eventId: string) => generatePlanAction(eventId, roleRef.current),
    [],
  )
  const commitPlan = useCallback(
    async (eventId: string, recs: PlanRecommendation[]) => {
      await commitPlanAction(eventId, recs, roleRef.current)
      await mutate()
    },
    [mutate],
  )
  const cancelTrip = useCallback(
    async (tripId: string) => {
      await cancelTripAction(tripId, roleRef.current)
      await mutate()
    },
    [mutate],
  )
  const clearAllTrips = useCallback(async () => {
    await clearAllTripsAction(roleRef.current)
    await mutate()
  }, [mutate])
  const startTrip = useCallback(
    async (tripId: string) => {
      await startTripAction(tripId, roleRef.current)
      await mutate()
    },
    [mutate],
  )
  const assignDriver = useCallback(
    async (tripId: string, driverId: string) => {
      await assignDriverAction(tripId, driverId, roleRef.current)
      await mutate()
    },
    [mutate],
  )

  // CRUD actions
  const saveParticipant = useCallback(
    async (input: ParticipantInput & { id?: string }) => {
      await saveParticipantAction(input, roleRef.current)
      await mutate()
    },
    [mutate],
  )
  const deleteParticipant = useCallback(
    async (id: string, name: string) => {
      await deleteParticipantAction(id, name, roleRef.current)
      await mutate()
    },
    [mutate],
  )
  const saveVehicle = useCallback(
    async (input: VehicleInput & { id?: string }) => {
      await saveVehicleAction(input, roleRef.current)
      await mutate()
    },
    [mutate],
  )
  const deleteVehicle = useCallback(
    async (id: string, name: string) => {
      await deleteVehicleAction(id, name, roleRef.current)
      await mutate()
    },
    [mutate],
  )
  const saveDriver = useCallback(
    async (input: DriverInput & { id?: string }) => {
      await saveDriverAction(input, roleRef.current)
      await mutate()
    },
    [mutate],
  )
  const deleteDriver = useCallback(
    async (id: string, name: string) => {
      await deleteDriverAction(id, name, roleRef.current)
      await mutate()
    },
    [mutate],
  )
  const saveEvent = useCallback(
    async (input: EventInput & { id?: string }) => {
      await saveEventAction(input, roleRef.current)
      await mutate()
    },
    [mutate],
  )
  const deleteEvent = useCallback(
    async (id: string, name: string) => {
      await deleteEventAction(id, name, roleRef.current)
      await mutate()
    },
    [mutate],
  )

  const byId = useCallback(
    <T extends { id: string }>(arr: T[], id: string | null | undefined) =>
      id == null ? undefined : arr.find((x) => x.id === id),
    [],
  )

  const value = useMemo<FleetContextValue>(
    () => ({
      role,
      loading: isLoading,
      centers: snapshot.centers,
      participants: snapshot.participants,
      vehicles: snapshot.vehicles,
      drivers: snapshot.drivers,
      events: snapshot.events,
      trips: snapshot.trips,
      eventLog: snapshot.eventLog,
      simRunning,
      setRole,
      toggleSim,
      refresh,
      reseed,
      generatePlan,
      commitPlan,
      cancelTrip,
      clearAllTrips,
      startTrip,
      assignDriver,
      saveParticipant,
      deleteParticipant,
      saveVehicle,
      deleteVehicle,
      saveDriver,
      deleteDriver,
      saveEvent,
      deleteEvent,
      centerById: (id) => byId(snapshot.centers, id),
      vehicleById: (id) => byId(snapshot.vehicles, id),
      driverById: (id) => byId(snapshot.drivers, id),
      participantById: (id) => byId(snapshot.participants, id),
      eventById: (id) => byId(snapshot.events, id),
    }),
    [
      role,
      isLoading,
      snapshot,
      simRunning,
      toggleSim,
      refresh,
      reseed,
      generatePlan,
      commitPlan,
      cancelTrip,
      clearAllTrips,
      startTrip,
      assignDriver,
      saveParticipant,
      deleteParticipant,
      saveVehicle,
      deleteVehicle,
      saveDriver,
      deleteDriver,
      saveEvent,
      deleteEvent,
      byId,
    ],
  )

  return <FleetContext.Provider value={value}>{children}</FleetContext.Provider>
}

export function useFleet(): FleetContextValue {
  const ctx = useContext(FleetContext)
  if (!ctx) throw new Error('useFleet must be used within FleetProvider')
  return ctx
}
