'use client'

import { useMemo } from 'react'
import { useFleet } from '@/lib/store'
import { seededSeries } from './aurora-ui'
import type { TripStatus } from '@/lib/types'

export const LIVE_TRIP_STATUSES: TripStatus[] = [
  'en-route',
  'pickup-in-progress',
  'onboard',
  'driver-assigned',
  'arrived',
]

export type AlertSeverity = 'critical' | 'warning' | 'info'

export interface AuroraAlert {
  id: string
  severity: AlertSeverity
  title: string
  detail: string
  href: string
}

export interface AuroraInsight {
  id: string
  kind: 'route' | 'demand' | 'attendance' | 'fleet'
  title: string
  detail: string
  confidence: number
}

export function useAuroraData() {
  const fleet = useFleet()

  return useMemo(() => {
    const { trips, vehicles, drivers, events, participants, mealDeliveries, smsNotifications, eventLog } = fleet

    // ---- Trips ----
    const liveTrips = trips.filter((t) => LIVE_TRIP_STATUSES.includes(t.status))
    const completedTrips = trips.filter((t) => t.status === 'completed')
    const onboard = trips.filter((t) => t.status === 'onboard').length

    // ---- Meal delivery ----
    const activeMeals = mealDeliveries.filter((m) => m.status !== 'cancelled' && m.status !== 'completed')
    const mealsOut = mealDeliveries
      .filter((m) => m.status !== 'cancelled')
      .reduce((s, m) => s + m.totalMeals, 0)
    const mealStopsTotal = mealDeliveries
      .filter((m) => m.status !== 'cancelled')
      .reduce((s, m) => s + m.stops.length, 0)
    const mealStopsDelivered = mealDeliveries
      .filter((m) => m.status !== 'cancelled')
      .reduce((s, m) => s + m.stops.filter((x) => x.status === 'delivered').length, 0)

    const tripStatusCounts = {
      live: liveTrips.length,
      completed: completedTrips.length,
      planned: trips.filter((t) => t.status === 'planned' || t.status === 'vehicle-assigned').length,
      cancelled: trips.filter((t) => t.status === 'cancelled').length,
    }

    // ---- Events ----
    const activeEvents = events.filter((e) =>
      ['scheduled', 'planning', 'active'].includes(e.status),
    )

    // ---- Vehicles ----
    const vehiclesInUse = vehicles.filter(
      (v) => v.status !== 'available' && v.status !== 'offline',
    ).length
    const vehiclesAvailable = vehicles.filter((v) => v.status === 'available').length
    const fleetUtilization =
      vehicles.length > 0 ? Math.round((vehiclesInUse / vehicles.length) * 100) : 0

    // ---- Drivers ----
    const driverStatusCounts = {
      available: drivers.filter((d) => d.status === 'available').length,
      onTrip: drivers.filter((d) => d.status === 'on-trip').length,
      break: drivers.filter((d) => d.status === 'break').length,
      offline: drivers.filter((d) => d.status === 'offline').length,
    }

    // ---- SMS / attendance ----
    const responded = smsNotifications.filter((n) => n.response)
    const attendingTransport = smsNotifications.filter((n) => n.response === 'attending_transport').length
    const attendingSelf = smsNotifications.filter((n) => n.response === 'attending_self').length
    const notAttending = smsNotifications.filter((n) => n.response === 'not_attending').length
    const attending = attendingTransport + attendingSelf
    const attendanceRate = responded.length > 0 ? Math.round((attending / responded.length) * 100) : 0
    const failedSms = smsNotifications.filter(
      (n) => n.deliveryStatus === 'failed' || n.deliveryStatus === 'undelivered',
    ).length
    const noResponse = smsNotifications.length - responded.length

    // ---- Participants ----
    const unassigned = participants.filter(
      (p) => p.status === 'registered' || p.status === 'scheduled',
    ).length
    const scheduled = participants.filter((p) =>
      ['scheduled', 'driver-assigned', 'vehicle-assigned'].includes(p.status),
    ).length

    // ---- KPI definitions ----
    const kpis = [
      {
        id: 'trips',
        label: 'Total Trips',
        value: trips.length,
        accent: 'cyan' as const,
        icon: 'route' as const,
        trendUp: true,
        trend: `${liveTrips.length} live`,
        series: seededSeries(trips.length * 7 + 11, 18, 55, 30),
      },
      {
        id: 'events',
        label: 'Active Events',
        value: activeEvents.length,
        accent: 'violet' as const,
        icon: 'calendar' as const,
        trendUp: true,
        trend: `${events.length} total`,
        series: seededSeries(activeEvents.length * 13 + 5, 18, 45, 26),
      },
      {
        id: 'vehicles',
        label: 'Vehicles in Fleet',
        value: vehicles.length,
        accent: 'blue' as const,
        icon: 'bus' as const,
        trendUp: vehiclesAvailable > 0,
        trend: `${vehiclesAvailable} available`,
        series: seededSeries(vehicles.length * 9 + 3, 18, 60, 18),
      },
      {
        id: 'drivers',
        label: 'Drivers Available',
        value: driverStatusCounts.available,
        accent: 'emerald' as const,
        icon: 'user' as const,
        trendUp: driverStatusCounts.available >= driverStatusCounts.onTrip,
        trend: `${drivers.length} on roster`,
        series: seededSeries(driverStatusCounts.available * 17 + 7, 18, 50, 24),
      },
      {
        id: 'attendance',
        label: 'Attendance Rate',
        value: `${attendanceRate}%`,
        accent: 'amber' as const,
        icon: 'trend' as const,
        trendUp: attendanceRate >= 60,
        trend: `${responded.length} replies`,
        series: seededSeries(attendanceRate * 3 + 19, 18, attendanceRate || 40, 16),
      },
      {
        id: 'requests',
        label: 'Transportation Requests',
        value: attendingTransport,
        accent: 'rose' as const,
        icon: 'sms' as const,
        trendUp: true,
        trend: `${unassigned} to assign`,
        series: seededSeries(attendingTransport * 23 + 2, 18, 48, 28),
      },
      {
        id: 'meals',
        label: 'Meals Out for Delivery',
        value: mealsOut,
        accent: 'emerald' as const,
        icon: 'meal' as const,
        trendUp: true,
        trend: `${activeMeals.length} active run${activeMeals.length === 1 ? '' : 's'}`,
        series: seededSeries(mealsOut * 5 + 9, 18, 44, 22),
      },
    ]

    // ---- Real analytics series (for axis charts) --------------------------
    // Trips + riders per care center — real counts from current trips.
    const activeTrips = trips.filter((t) => t.status !== 'cancelled')
    const centerLoad = events
      .reduce<Record<string, { name: string; trips: number; riders: number; meals: number }>>((acc, ev) => {
        acc[ev.centerId] ??= {
          name: (fleet.centerById(ev.centerId)?.name ?? 'Center').replace(/ (Center|Hospital|Hall|Kitchen)$/, ''),
          trips: 0,
          riders: 0,
          meals: 0,
        }
        return acc
      }, {})
    for (const c of fleet.centers) {
      centerLoad[c.id] ??= {
        name: c.name.replace(/ (Center|Hospital|Hall|Kitchen)$/, ''),
        trips: 0,
        riders: 0,
        meals: 0,
      }
    }
    for (const t of activeTrips) {
      const bucket = centerLoad[t.destinationCenterId]
      if (bucket) {
        bucket.trips += 1
        bucket.riders += t.stops.length
      }
    }
    for (const m of mealDeliveries.filter((x) => x.status !== 'cancelled')) {
      const bucket = centerLoad[m.centerId]
      if (bucket) bucket.meals += m.totalMeals
    }
    const centerSeries = Object.values(centerLoad).filter((c) => c.trips + c.riders + c.meals > 0)

    // Vehicle status distribution — real.
    const vehicleStatusSeries = [
      { key: 'in-use', name: 'In Service', value: vehiclesInUse },
      { key: 'available', name: 'Available', value: vehiclesAvailable },
      {
        key: 'offline',
        name: 'Offline / Service',
        value: vehicles.filter((v) => v.status === 'offline').length,
      },
    ].filter((d) => d.value > 0)

    // Participant mobility mix — real.
    const mobilitySeries = (['independent', 'assisted', 'wheelchair', 'stretcher'] as const)
      .map((m) => ({
        name: m.charAt(0).toUpperCase() + m.slice(1),
        value: participants.filter((p) => p.mobilityLevel === m).length,
      }))
      .filter((d) => d.value > 0)

    // Weekly demand — bucket real events + meal runs by weekday from their date.
    const weekdayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
    const weekBuckets = weekdayLabels.map((label) => ({ day: label, events: 0, riders: 0, meals: 0 }))
    const dow = (dateStr: string) => {
      const [y, mo, d] = dateStr.split('-').map(Number)
      if (!y) return 1
      return new Date(y, (mo || 1) - 1, d || 1).getDay()
    }
    for (const ev of events) {
      const i = dow(ev.date)
      weekBuckets[i].events += 1
      weekBuckets[i].riders += ev.participantIds.length
    }
    for (const m of mealDeliveries.filter((x) => x.status !== 'cancelled')) {
      weekBuckets[dow(m.date)].meals += m.totalMeals
    }
    // Reorder Mon-first for a conventional work-week reading.
    const weeklySeries = [1, 2, 3, 4, 5, 6, 0].map((i) => weekBuckets[i])

    // ---- Calendar data: events / drivers / vehicles by day ----------------
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
    // Events scheduled per weekday (real).
    const eventCalendar = dayNames.map((_, i) => ({
      dow: i,
      count: events.filter((e) => dow(e.date) === i).length,
    }))
    // Driver coverage per weekday: how many drivers work that day (shiftDays).
    const driverCalendar = dayNames.map((_, i) => ({
      dow: i,
      count: drivers.filter((d) => d.shiftDays.includes(i)).length,
    }))
    // Vehicle availability per weekday: fleet minus vehicles needing service
    // (service days approximated from maintenance status spread across week).
    const serviceDue = vehicles.filter((v) => v.maintenanceStatus !== 'good')
    const vehicleCalendar = dayNames.map((_, i) => {
      const inService = serviceDue.filter((_, idx) => idx % 7 === i).length
      return {
        dow: i,
        available: Math.max(0, vehicles.length - inService),
        service: inService,
      }
    })

    // ---- Alerts ----
    const alerts: AuroraAlert[] = []
    if (unassigned > 0) {
      alerts.push({
        id: 'unassigned',
        severity: unassigned > 6 ? 'critical' : 'warning',
        title: `${unassigned} participants awaiting transport`,
        detail: 'Open the Route Planner to assign vehicles and drivers.',
        href: '/planner',
      })
    }
    if (failedSms > 0) {
      alerts.push({
        id: 'sms',
        severity: 'critical',
        title: `${failedSms} SMS notifications failed`,
        detail: 'Some participants may not have received their reminders.',
        href: '/responses',
      })
    }
    const serviceVehicles = vehicles.filter((v) => v.maintenanceStatus === 'service-required').length
    if (serviceVehicles > 0) {
      alerts.push({
        id: 'maint',
        severity: 'warning',
        title: `${serviceVehicles} vehicles need service`,
        detail: 'Schedule maintenance to keep fleet availability high.',
        href: '/vehicles',
      })
    }
    if (driverStatusCounts.available === 0 && drivers.length > 0) {
      alerts.push({
        id: 'drivers',
        severity: 'warning',
        title: 'No drivers currently available',
        detail: 'All drivers are on trips, on break, or offline.',
        href: '/drivers',
      })
    }
    if (noResponse > 0) {
      alerts.push({
        id: 'noresp',
        severity: 'info',
        title: `${noResponse} participants have not replied`,
        detail: 'Consider resending program notifications.',
        href: '/responses',
      })
    }
    if (alerts.length === 0) {
      alerts.push({
        id: 'clear',
        severity: 'info',
        title: 'All systems nominal',
        detail: 'No operational alerts across your care centers.',
        href: '/',
      })
    }

    // ---- AI insights (heuristic) ----
    const insights: AuroraInsight[] = [
      {
        id: 'route',
        kind: 'route',
        title: 'Route optimization opportunity',
        detail:
          liveTrips.length > 1
            ? `Consolidating pickups across ${liveTrips.length} live trips could cut an estimated ${Math.max(6, liveTrips.length * 4)} minutes of drive time.`
            : 'Traffic is light — current routes are near-optimal with minimal detours.',
        confidence: Math.min(95, 62 + liveTrips.length * 5),
      },
      {
        id: 'demand',
        kind: 'demand',
        title: 'Transportation demand forecast',
        detail: `${attendingTransport} confirmed transport requests trending toward ~${Math.round(attendingTransport * 1.18) + 2} for upcoming events. Pre-stage ${Math.max(1, Math.ceil(attendingTransport / 6))} extra vehicles.`,
        confidence: 78,
      },
      {
        id: 'attendance',
        kind: 'attendance',
        title: 'Attendance prediction',
        detail: `Based on ${responded.length} replies, expect ~${attendanceRate}% attendance. ${noResponse} non-responders may lift or lower this — a reminder could recover up to ${Math.round(noResponse * 0.3)}.`,
        confidence: Math.max(55, Math.min(92, attendanceRate + 12)),
      },
      {
        id: 'fleet',
        kind: 'fleet',
        title: 'Fleet utilization alert',
        detail:
          fleetUtilization > 80
            ? `Fleet is at ${fleetUtilization}% utilization — near capacity. Consider activating reserve vehicles.`
            : `Fleet utilization is ${fleetUtilization}%. ${vehiclesAvailable} vehicles idle and available for surge demand.`,
        confidence: 84,
      },
    ]

    return {
      liveTrips,
      onboard,
      tripStatusCounts,
      activeEvents,
      vehiclesInUse,
      vehiclesAvailable,
      fleetUtilization,
      driverStatusCounts,
      attendanceRate,
      attendingTransport,
      attendingSelf,
      notAttending,
      noResponse,
      failedSms,
      responded: responded.length,
      unassigned,
      scheduled,
      kpis,
      alerts,
      insights,
      recentEvents: eventLog.slice(0, 12),
      // meal delivery
      activeMeals,
      mealsOut,
      mealStopsTotal,
      mealStopsDelivered,
      allMeals: mealDeliveries.filter((m) => m.status !== 'cancelled'),
      // real analytics series (axis charts)
      centerSeries,
      vehicleStatusSeries,
      mobilitySeries,
      weeklySeries,
      // calendars
      eventCalendar,
      driverCalendar,
      vehicleCalendar,
      totals: {
        trips: trips.length,
        vehicles: vehicles.length,
        drivers: drivers.length,
        events: events.length,
        participants: participants.length,
        meals: mealDeliveries.filter((m) => m.status !== 'cancelled').length,
      },
    }
  }, [fleet])
}
