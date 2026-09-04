'use client'

import { useMemo } from 'react'
import { useTrips } from '@/lib/trips/hooks'
import { useVehicles } from '@/lib/vehicles/hooks'
import { useDrivers } from '@/lib/driver/hooks'
import { useCenters, useEvents, useEventLog, useSmsNotifications } from '@/lib/events/hooks'
import { useParticipants } from '@/lib/participant/hooks'
import { useMealDeliveries } from '@/lib/meals/hooks'
import { TripsConfig } from '@/lib/trips/config';
import { AuroraUtils } from '@/lib/aurora/utils';
import { AuroraAlert, AuroraInsight } from '@/lib/aurora/types';
import { findById } from '@/lib/utils';
import { useTranslation } from '../context/language-provider';

export function useAuroraData() {
  const { trips } = useTrips()
  const { vehicles } = useVehicles()
  const { drivers } = useDrivers()
  const { centers } = useCenters()
  const { events } = useEvents()
  const { participants } = useParticipants()
  const { mealDeliveries } = useMealDeliveries()
  const { smsNotifications } = useSmsNotifications(events)
  const { eventLog } = useEventLog()
  const {t} = useTranslation()

  return useMemo(() => {

    // ---- Trips ----
    const liveTrips = trips.filter((t) => TripsConfig.LIVE_TRIP_STATUSES.includes(t.status))
    const completedTrips = trips.filter((t) => t.status === 'COMPLETED')
    const onboard = trips.filter((t) => t.status === 'ONBOARD').length

    // ---- Meal delivery ----
    const activeMeals = mealDeliveries.filter((m) => m.status === 'ACTIVE')
    const mealsOut = activeMeals.reduce((s, m) => s + m.participants.length, 0)

    const tripStatusCounts = {
      live: liveTrips.length,
      completed: completedTrips.length,
      planned: trips.filter((t) => t.status === 'PLANNED').length,
      cancelled: trips.filter((t) => t.status === 'CANCELLED').length,
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
        label: 'aurora.totalTrips',
        value: trips.length,
        accent: 'cyan' as const,
        icon: 'route' as const,
        trendUp: true,
        trend: `${liveTrips.length}`,
        trendSublabel:'aurora.live-sm',
        series: AuroraUtils.seededSeries(trips.length * 7 + 11, 18, 55, 30),
      },
      {
        id: 'events',
        label: 'aurora.activeEvent',
        value: activeEvents.length,
        accent: 'violet' as const,
        icon: 'calendar' as const,
        trendUp: true,
        trend: `${events.length}`,
        trendSublabel:'cc.total-sm',
        series: AuroraUtils.seededSeries(activeEvents.length * 13 + 5, 18, 45, 26),
      },
      {
        id: 'requests',
        label: 'aurora.smsresponse',
        value: attendingTransport,
        accent: 'blue' as const,
        icon: 'sms' as const,
        trendUp: true,
        trend: `${unassigned}`,
        trendSublabel: 'aurora.toassign-sm',
        series: AuroraUtils.seededSeries(attendingTransport * 23 + 2, 18, 48, 28),
      },
      {
        id: 'meals',
        label: 'aurora.mealsout',
        value: mealsOut,
        accent: 'emerald' as const,
        icon: 'meal' as const,
        trendUp: true,
        trend: `${activeMeals.length}`,
        trendSublabel: 'aurora.activeruns-sm',
        series: AuroraUtils.seededSeries(mealsOut * 5 + 9, 18, 44, 22),
      },
    ]

    // ---- Real analytics series (for axis charts) --------------------------
    // Trips + riders per care center — real counts from current trips.
    const activeTrips = trips.filter((t) => t.status !== 'CANCELLED')
    const centerLoad = events
      .reduce<Record<string, { name: string; trips: number; riders: number; meals: number }>>((acc, ev) => {
        acc[ev.centerId] ??= {
          name: (findById(centers, ev.centerId)?.name ?? 'Center').replace(/ (Center|Hospital|Hall|Kitchen)$/, ''),
          trips: 0,
          riders: 0,
          meals: 0,
        }
        return acc
      }, {})
    for (const c of centers) {
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
        bucket.riders += Array.isArray(t.stops) ? t.stops.length : 0
      }
    }
    for (const m of mealDeliveries.filter((x) => x.status === 'ACTIVE')) {
      const bucket = centerLoad[m.centerId]
      if (bucket) bucket.meals += m.participants.length
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
      weekBuckets[i].riders += Array.isArray(ev.participantIds) ? ev.participantIds.length : 0
    }
    for (const m of mealDeliveries.filter((x) => x.status === 'ACTIVE')) {
      weekBuckets[dow(m.fromDate)].meals += m.participants.length
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
      count: drivers.filter((d) => d.shiftDays?.includes(i)).length,
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
        title: t('aurora.alertunassigned').replace('{{count}}', String(unassigned)),
        detail: t('aurora.alertunassigneddetail'),
        href: '/planner',
      })
    }
    if (failedSms > 0) {
      alerts.push({
        id: 'sms',
        severity: 'critical',
        title: t('aurora.alertsmsfailed').replace('{{count}}', String(failedSms)),
        detail: t('aurora.alertsmsfaileddetail'),
        href: '/responses',
      })
    }
    const serviceVehicles = vehicles.filter((v) => v.maintenanceStatus === 'service-required').length
    if (serviceVehicles > 0) {
      alerts.push({
        id: 'maint',
        severity: 'warning',
        title: t('aurora.alertservice').replace('{{count}}', String(serviceVehicles)),
        detail: t('aurora.alertservicedetail'),
        href: '/vehicles',
      })
    }
    if (driverStatusCounts.available === 0 && drivers.length > 0) {
      alerts.push({
        id: 'drivers',
        severity: 'warning',
        title: t('aurora.alertnodrivers'),
        detail: t('aurora.alertnodriversdetail'),
        href: '/drivers',
      })
    }
    if (noResponse > 0) {
      alerts.push({
        id: 'noresp',
        severity: 'info',
        title: t('aurora.alertnoresponse').replace('{{count}}', String(noResponse)),
        detail: t('aurora.alertnoresponsedetail'),
        href: '/responses',
      })
    }
    if (alerts.length === 0) {
      alerts.push({
        id: 'clear',
        severity: 'info',
        title: t('aurora.alertallclear'),
        detail: t('aurora.alertallcleardetail'),
        href: '/',
      })
    }

    // ---- AI insights (heuristic) ----
    const insights: AuroraInsight[] = [
      {
        id: 'route',
        kind: 'route',
        title: t('aurora.insightroutetitle'),
        detail:
          liveTrips.length > 1
            ? t('aurora.insightroutebusy')
                .replace('{{trips}}', String(liveTrips.length))
                .replace('{{minutes}}', String(Math.max(6, liveTrips.length * 4)))
            : t('aurora.insightroutequiet'),
        confidence: Math.min(95, 62 + liveTrips.length * 5),
      },
      {
        id: 'demand',
        kind: 'demand',
        title: t('aurora.insightdemandtitle'),
        detail: t('aurora.insightdemanddetail')
          .replace('{{count}}', String(attendingTransport))
          .replace('{{trend}}', String(Math.round(attendingTransport * 1.18) + 2))
          .replace('{{extra}}', String(Math.max(1, Math.ceil(attendingTransport / 6)))),
        confidence: 78,
      },
      {
        id: 'attendance',
        kind: 'attendance',
        title: t('aurora.insightattendancetitle'),
        detail: t('aurora.insightattendancedetail')
          .replace('{{replies}}', String(responded.length))
          .replace('{{rate}}', String(attendanceRate))
          .replace('{{nonresponders}}', String(noResponse))
          .replace('{{recoverable}}', String(Math.round(noResponse * 0.3))),
        confidence: Math.max(55, Math.min(92, attendanceRate + 12)),
      },
      {
        id: 'fleet',
        kind: 'fleet',
        title: t('aurora.insightfleettitle'),
        detail:
          fleetUtilization > 80
            ? t('aurora.insightfleethigh').replace('{{pct}}', String(fleetUtilization))
            : t('aurora.insightfleetnormal')
                .replace('{{pct}}', String(fleetUtilization))
                .replace('{{available}}', String(vehiclesAvailable)),
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
      allMeals: activeMeals,
      // real analytics series (axis charts)
      centerSeries,
      vehicleStatusSeries,
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
        meals: activeMeals.length,
      },
    }
  }, [trips, vehicles, drivers, centers, events, participants, mealDeliveries, smsNotifications, eventLog, t])
}
