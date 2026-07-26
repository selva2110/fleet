// Automatic Transportation Planning Engine.
//
// Given a pool of participants for an event, the available fleet, and drivers,
// it groups participants, selects suitable vehicles, assigns drivers, sequences
// pickups, builds routes, and scores each recommendation while flagging any
// constraint violations. This is a deterministic heuristic optimizer (nearest
// neighbour + constraint-aware greedy bin packing) that mimics an AI planner.

import { buildRoutePath, estimateMinutes, formatMinutesToClock, haversineKm, parseClockTime, pathLengthKm } from './geo'
import type {
  Center,
  Driver,
  LatLng,
  Participant,
  PlanRecommendation,
  PlanResult,
  TripStop,
  UnassignedParticipant,
  Vehicle,
} from './types'

const COST_BASE = 12
const COST_PER_KM = 1.8
const COST_PER_MIN = 0.4
const TRAFFIC_FACTOR = 1.22
const BUFFER_MINUTES = 8
const LOADING_MINUTES = 3
const UNLOADING_MINUTES = 2
const VEHICLE_PICKUP_MINUTES = 5

// Riders at or below this tolerance are sequenced toward the end of their
// route so the leg they actually ride (pickup -> center) stays short.
const TIGHT_TRAVEL_THRESHOLD_MIN = 25

function seatsNeeded(p: Participant): number {
  return 1 + (p.constraints.caregiverRequired ? 1 : 0)
}

function priorityRank(p: Participant): number {
  return p.medicalPriority === 'critical' ? 0 : p.medicalPriority === 'elevated' ? 1 : 2
}

function requestReviewReason(p: Participant): string | null {
  if (!p.eligible) return `${p.name}: marked ineligible for transportation and requires scheduler review`

  const hasAddress = typeof p.address === 'string' && p.address.trim().length > 0
  const hasFiniteLocation =
    typeof p.location?.lat === 'number' &&
    Number.isFinite(p.location.lat) &&
    typeof p.location?.lng === 'number' &&
    Number.isFinite(p.location.lng)

  if (!hasAddress) return `${p.name}: invalid address; please provide a pickup address`
  if (!hasFiniteLocation) return `${p.name}: invalid pickup location; please verify the address`
  if (p.maxTravelMinutes <= 0) return `${p.name}: invalid travel-time limit; please review the request`

  return null
}

// Can this vehicle physically serve this participant's hard requirements?
function vehicleCanServe(v: Vehicle, p: Participant): boolean {
  if ((p.constraints.wheelchair || p.constraints.poweredWheelchair) && (!v.liftAvailable || v.wheelchairCapacity < 1)) {
    return false
  }
  if (p.constraints.oxygen && !v.oxygenEquipment) return false
  if (p.constraints.bariatric && !v.bariatricCapable) return false
  if (p.mobilityLevel === 'stretcher' && !v.stretcherCapable) return false
  return true
}

function timeToMinutes(t?: string): number {
  const [h, m] = (t ?? '00:00').split(':').map(Number)
  return (h || 0) * 60 + (m || 0)
}

// Day-of-week (0=Sun..6=Sat) for a "YYYY-MM-DD" date string, parsed as local
// calendar date rather than UTC so it lines up with Date#getDay() everywhere
// else shift days are compared.
function dayOfWeekFromDate(dateStr: string): number {
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(y, (m || 1) - 1, d || 1).getDay()
}

// Is this time-of-day (minutes since midnight) within a driver's shift?
// shiftEnd < shiftStart means an overnight shift that wraps past midnight.
// Deliberately checks only the event's start time, not the estimated
// pre-pickup travel time leading up to it — that travel time is a rounded
// heuristic estimate, and requiring it to also fall inside the shift makes
// the check fail on essentially-coincidental one-minute boundary rounding
// (e.g. a route needing to start at 07:59 excluding a driver on shift from
// 08:00) even though the driver is clearly on duty for the event itself.
function timeWithinShift(shiftStartMin: number, shiftEndMin: number, t: number): boolean {
  if (shiftStartMin <= shiftEndMin) return t >= shiftStartMin && t <= shiftEndMin
  return t >= shiftStartMin || t <= shiftEndMin
}

// Human-readable reason a participant couldn't be matched to any vehicle at all.
function unservedReason(p: Participant): string {
  if (p.mobilityLevel === 'stretcher') return `${p.name}: no stretcher/gurney-capable vehicle available`
  if (p.constraints.wheelchair || p.constraints.poweredWheelchair)
    return `${p.name}: no wheelchair-accessible vehicle available`
  if (p.constraints.oxygen) return `${p.name}: no vehicle with oxygen equipment available`
  if (p.constraints.bariatric) return `${p.name}: no bariatric-capable vehicle available`
  return `${p.name}: no vehicle with remaining capacity available`
}

interface Group {
  vehicle: Vehicle
  participants: Participant[]
  seatsUsed: number
  wheelchairsUsed: number
}

// Physical room only: seats and wheelchair securement slots. Deliberately
// excludes the equipment-capability check (oxygen/bariatric/stretcher/lift) so
// it can also be used for the "attach anyway to surface a violation" fallback
// — a rider should never be packed in past the vehicle's physical seat or
// wheelchair-slot limits, even when we're intentionally ignoring a capability
// mismatch to avoid dropping them outright.
function groupHasPhysicalRoom(g: Group, p: Participant): boolean {
  const needsChair = p.constraints.wheelchair || p.constraints.poweredWheelchair
  if (g.seatsUsed + seatsNeeded(p) > g.vehicle.capacity) return false
  if (needsChair && g.wheelchairsUsed + 1 > g.vehicle.wheelchairCapacity) return false
  return true
}

function groupHasRoom(g: Group, p: Participant): boolean {
  return groupHasPhysicalRoom(g, p) && vehicleCanServe(g.vehicle, p)
}

function addToGroup(g: Group, p: Participant) {
  g.participants.push(p)
  g.seatsUsed += seatsNeeded(p)
  if (p.constraints.wheelchair || p.constraints.poweredWheelchair) g.wheelchairsUsed += 1
}

function groupCentroid(g: Group): LatLng {
  const n = g.participants.length || 1
  return {
    lat: g.participants.reduce((s, p) => s + p.location.lat, 0) / n,
    lng: g.participants.reduce((s, p) => s + p.location.lng, 0) / n,
  }
}

// Nearest-neighbour ordering of a set of pickups starting from a given point.
function nearestNeighbourOrder(start: LatLng, participants: Participant[]): Participant[] {
  const remaining = [...participants]
  const ordered: Participant[] = []
  let cursor = start
  while (remaining.length) {
    let bestIdx = 0
    let bestDist = Infinity
    remaining.forEach((p, i) => {
      const d = haversineKm(cursor, p.location)
      if (d < bestDist) {
        bestDist = d
        bestIdx = i
      }
    })
    const [next] = remaining.splice(bestIdx, 1)
    ordered.push(next)
    cursor = next.location
  }
  return ordered
}

// Orders pickups for a route. Riders with a tight travel-time tolerance are
// sequenced after everyone else so their onboard leg (pickup -> center) stays
// as short as possible, instead of being placed wherever nearest-neighbour
// geography happens to put them and then merely flagged as a violation.
function sequenceStops(start: LatLng, participants: Participant[]): Participant[] {
  const relaxed = participants.filter((p) => p.maxTravelMinutes > TIGHT_TRAVEL_THRESHOLD_MIN)
  const tight = participants.filter((p) => p.maxTravelMinutes <= TIGHT_TRAVEL_THRESHOLD_MIN)

  const orderedRelaxed = nearestNeighbourOrder(start, relaxed)
  const cursor = orderedRelaxed.length ? orderedRelaxed[orderedRelaxed.length - 1].location : start
  const orderedTight = nearestNeighbourOrder(cursor, tight)

  return [...orderedRelaxed, ...orderedTight]
}

interface RouteTiming {
  ordered: Participant[]
  routePath: LatLng[]
  distanceKm: number
  durationMinutes: number
  stops: TripStop[]
}

// Builds the same route/timing shape used for the final recommendation, so
// the "would this merge violate anyone's travel-time tolerance?" look-ahead
// check (below) and the actual committed route are always computed the same
// way — no drift between what was tested and what gets produced.
async function buildRouteTiming(vehicleLocation: LatLng, participants: Participant[], centerLocation: LatLng): Promise<RouteTiming> {
  const ordered = sequenceStops(vehicleLocation, participants)
  const waypoints: LatLng[] = [vehicleLocation, ...ordered.map((p) => p.location), centerLocation]
  const routePath = await buildRoutePath(waypoints)
  const distanceKm = pathLengthKm(routePath)
  const durationMinutes = estimateMinutes(distanceKm, ordered.length)

  let acc = vehicleLocation
  let cumMin = 0
  const stops: TripStop[] = ordered.map((p, i) => {
    const legKm = haversineKm(acc, p.location)
    cumMin += estimateMinutes(legKm, 1)
    acc = p.location
    return {
      participantId: p.id,
      location: p.location,
      order: i + 1,
      etaMinutes: cumMin,
      status: 'pending',
    }
  })

  return { ordered, routePath, distanceKm, durationMinutes, stops }
}

function travelTimeOk(timing: RouteTiming, participants: Participant[]): boolean {
  return timing.stops.every((s) => {
    const p = participants.find((pp) => pp.id === s.participantId)
    if (!p) return true
    return timing.durationMinutes - s.etaMinutes <= p.maxTravelMinutes
  })
}

export interface PlanInput {
  participants: Participant[]
  vehicles: Vehicle[]
  drivers: Driver[]
  center: Center
  // The event's date ("YYYY-MM-DD") and start time ("HH:MM") — the point by
  // which riders need to arrive, used to check driver shift timing.
  eventDate: string
  eventStartTime?: string
}

export async function planTransportation({
  participants,
  vehicles,
  drivers,
  center,
  eventDate,
  eventStartTime,
}: PlanInput): Promise<PlanResult> {
  const eventDow = dayOfWeekFromDate(eventDate)
  const eventStartMin = eventStartTime ? timeToMinutes(eventStartTime) : 0
  // Same for every group in this plan — a driver is on shift for this event
  // if they work this day of week and are clocked in at the event's start time.
  const onShift = (d: Driver) =>
    eventStartTime
      ? d.shiftDays.includes(eventDow) && timeWithinShift(timeToMinutes(d.shiftStart), timeToMinutes(d.shiftEnd), eventStartMin)
      : true

  // Candidate fleet: not offline / in maintenance.
  const availableFleet = vehicles
    .filter(
      (vehicle) =>
        vehicle.status !== 'offline' &&
        vehicle.maintenanceStatus !== 'service-required',
    )
    .sort(
      (firstVehicle, secondVehicle) =>
        secondVehicle.wheelchairCapacity -
          firstVehicle.wheelchairCapacity ||
        secondVehicle.capacity - firstVehicle.capacity,
    )

  // AC11: every invalid request is explicitly flagged for scheduler review.
  const requestsNeedingReview = participants
    .map((participant) => ({
      participant,
      reason: requestReviewReason(participant),
    }))
    .filter(
      (
        entry,
      ): entry is { participant: Participant; reason: string } =>
        entry.reason !== null,
    )

  const reviewParticipantIds = new Set(
    requestsNeedingReview.map(({ participant }) => participant.id),
  )

  const participantsToSchedule = [...participants]
    .filter(
      (participant) => !reviewParticipantIds.has(participant.id),
    )
    .sort(
      (firstParticipant, secondParticipant) =>
        priorityRank(firstParticipant) -
          priorityRank(secondParticipant) ||
        haversineKm(
          secondParticipant.location,
          center.location,
        ) -
          haversineKm(
            firstParticipant.location,
            center.location,
          ),
    )

  const tripGroups: Group[] = []
  const allocatedVehicleIds = new Set<string>()

  // Requests that could not be scheduled are explicitly surfaced here.
  const schedulerReviewParticipants: UnassignedParticipant[] =
    requestsNeedingReview.map(({ participant, reason }) => ({
      participantId: participant.id,
      reason,
    }))

  for (const participant of participantsToSchedule) {
    const requiresWheelchairAccess =
      participant.constraints.wheelchair ||
      participant.constraints.poweredWheelchair

    // Tier 1: Best compatible group.
    let bestCompatibleGroup: Group | null = null
    let bestCompatibleDistance = Infinity

    // Tier 2 fallback group.
    let bestFallbackGroup: Group | null = null
    let bestFallbackDistance = Infinity

    for (const tripGroup of tripGroups) {
      if (!groupHasRoom(tripGroup, participant)) continue

      const distanceToGroup = haversineKm(
        groupCentroid(tripGroup),
        participant.location,
      )

      if (distanceToGroup >= 6) continue

      const candidateParticipants = [
        ...tripGroup.participants,
        participant,
      ]

      const candidateRouteTiming = await buildRouteTiming(
        tripGroup.vehicle.location,
        candidateParticipants,
        center.location,
      )

      if (
        travelTimeOk(
          candidateRouteTiming,
          candidateParticipants,
        )
      ) {
        if (distanceToGroup < bestCompatibleDistance) {
          bestCompatibleDistance = distanceToGroup
          bestCompatibleGroup = tripGroup
        }
      } else if (
        distanceToGroup < bestFallbackDistance
      ) {
        bestFallbackDistance = distanceToGroup
        bestFallbackGroup = tripGroup
      }
    }

    if (bestCompatibleGroup) {
      addToGroup(bestCompatibleGroup, participant)
      continue
    }

    // Tier 2: Open a fresh compatible vehicle.
    const availableCompatibleVehicle = availableFleet
      .filter(
        (vehicle) =>
          !allocatedVehicleIds.has(vehicle.id) &&
          vehicleCanServe(vehicle, participant),
      )
      .sort(
        (firstVehicle, secondVehicle) =>
          haversineKm(
            firstVehicle.location,
            participant.location,
          ) -
          haversineKm(
            secondVehicle.location,
            participant.location,
          ),
      )[0]

    if (availableCompatibleVehicle) {
      allocatedVehicleIds.add(
        availableCompatibleVehicle.id,
      )

      const newTripGroup: Group = {
        vehicle: availableCompatibleVehicle,
        participants: [],
        seatsUsed: 0,
        wheelchairsUsed: 0,
      }

      addToGroup(newTripGroup, participant)
      tripGroups.push(newTripGroup)
      continue
    }

    // Tier 3: Use the best fallback group.
    if (bestFallbackGroup) {
      addToGroup(bestFallbackGroup, participant)
      continue
    }

    // Tier 4: Any group with physical room.
    const physicalCapacityGroup = tripGroups.find(
      (tripGroup) =>
        groupHasPhysicalRoom(tripGroup, participant),
    )

    if (physicalCapacityGroup) {
      addToGroup(
        physicalCapacityGroup,
        participant,
      )
      continue
    }

    // Last attempt: create a best-effort trip.
    const bestAvailableVehicle = availableFleet.find(
      (vehicle) =>
        !allocatedVehicleIds.has(vehicle.id) &&
        seatsNeeded(participant) <= vehicle.capacity &&
        (!requiresWheelchairAccess ||
          vehicle.wheelchairCapacity >= 1),
    )

    if (bestAvailableVehicle) {
      allocatedVehicleIds.add(bestAvailableVehicle.id)

      const newTripGroup: Group = {
        vehicle: bestAvailableVehicle,
        participants: [],
        seatsUsed: 0,
        wheelchairsUsed: 0,
      }

      addToGroup(newTripGroup, participant)
      tripGroups.push(newTripGroup)
    } else {
      schedulerReviewParticipants.push({
        participantId: participant.id,
        reason: unservedReason(participant),
      })
    }
  }

  const availableDriverPool = drivers.filter(
    (driver) => driver.status === 'available',
  )

  const allocatedDriverIds = new Set<string>()
  const tripRecommendations: PlanRecommendation[] = []
  // Process groups sequentially so allocatedDriverIds is deterministic.
  for (const [tripIndex, tripGroup] of tripGroups.entries()) {
    let {
      ordered: orderedParticipants,
      routePath: plannedRoutePath,
      distanceKm: totalDistanceKm,
      durationMinutes: totalDurationMinutes,
      stops: plannedStops,
    } = await buildRouteTiming(
      tripGroup.vehicle.location,
      tripGroup.participants,
      center.location,
    )

    // Determine whether this trip requires a certified driver.
    const requiresCertifiedDriver = tripGroup.participants.some(
      (participant) =>
        participant.constraints.wheelchair ||
        participant.constraints.poweredWheelchair ||
        participant.constraints.oxygen ||
        participant.constraints.bariatric ||
        participant.mobilityLevel === 'stretcher',
    )

    const isDriverCertified = (driver: Driver) =>
      !requiresCertifiedDriver ||
      driver.certifications.wheelchairAssist ||
      driver.certifications.medicalTransport

    // Shift timing is a hard gate just like certification: a driver who
    // isn't on the clock for this event is never eligible, even as a last
    // resort — those participants go to scheduler review instead.
    const isDriverEligible = (driver: Driver) =>
      onShift(driver) && isDriverCertified(driver)

    // Prefer the driver assigned to this vehicle.
    const assignedVehicleDriver = drivers.find(
      (driver) =>
        driver.assignedVehicleId === tripGroup.vehicle.id &&
        driver.status === 'available' &&
        !allocatedDriverIds.has(driver.id) &&
        isDriverEligible(driver),
    )

    // Otherwise use any available eligible driver.
    const availableEligibleDriver = availableDriverPool.find(
      (driver) =>
        !allocatedDriverIds.has(driver.id) &&
        isDriverEligible(driver),
    )

    const selectedDriver =
      assignedVehicleDriver ?? availableEligibleDriver

    // No suitable driver → scheduler review.
    if (!selectedDriver) {
      const anyOnShift = availableDriverPool.some(
        (driver) => !allocatedDriverIds.has(driver.id) && onShift(driver),
      )
      const reviewReason = !anyOnShift
        ? `No on-shift driver available at ${eventStartTime} on this event's day`
        : requiresCertifiedDriver
          ? 'No available certified driver for this trip'
          : 'No available driver for this trip'

      tripGroup.participants.forEach((participant) => {
        schedulerReviewParticipants.push({
          participantId: participant.id,
          reason: `${participant.name}: ${reviewReason}`,
        })
      })

      continue
    }

    allocatedDriverIds.add(selectedDriver.id)

    // Participants requiring manual review.
    const participantsForReview: UnassignedParticipant[] = []
    const reviewParticipantIdsInGroup = new Set<string>()

    tripGroup.participants.forEach((participant) => {
      const reviewReasons: string[] = []

      if (
        (participant.constraints.wheelchair ||
          participant.constraints.poweredWheelchair) &&
        (!tripGroup.vehicle.liftAvailable ||
          tripGroup.vehicle.wheelchairCapacity < 1)
      ) {
        reviewReasons.push(
          'no wheelchair-accessible seating',
        )
      }

      if (
        participant.constraints.oxygen &&
        !tripGroup.vehicle.oxygenEquipment
      ) {
        reviewReasons.push(
          'vehicle lacks oxygen equipment',
        )
      }

      if (
        participant.constraints.bariatric &&
        !tripGroup.vehicle.bariatricCapable
      ) {
        reviewReasons.push(
          'vehicle not bariatric-capable',
        )
      }

      if (
        participant.mobilityLevel === 'stretcher' &&
        !tripGroup.vehicle.stretcherCapable
      ) {
        reviewReasons.push(
          'vehicle not stretcher/gurney-capable',
        )
      }

      const participantStop = plannedStops.find(
        (stop) => stop.participantId === participant.id,
      )

      const participantTravelMinutes =
        participantStop
          ? totalDurationMinutes -
            participantStop.etaMinutes
          : totalDurationMinutes

      if (
        participantTravelMinutes >
        participant.maxTravelMinutes
      ) {
        reviewReasons.push(
          `travel ${participantTravelMinutes}m exceeds ${participant.maxTravelMinutes}m limit`,
        )
      }

      if (reviewReasons.length) {
        reviewParticipantIdsInGroup.add(
          participant.id,
        )

        participantsForReview.push({
          participantId: participant.id,
          reason: `${participant.name}: ${reviewReasons.join(
            '; ',
          )}`,
        })
      }
    })

    if (participantsForReview.length) {
      schedulerReviewParticipants.push(
        ...participantsForReview,
      )
    }

    const assignedParticipants =
      tripGroup.participants.filter(
        (participant) =>
          !reviewParticipantIdsInGroup.has(
            participant.id,
          ),
      )

    // Everyone in this group requires review.
    if (assignedParticipants.length === 0) {
      continue
    }

    // Rebuild the route after removing reviewed participants.
    ;({
      ordered: orderedParticipants,
      routePath: plannedRoutePath,
      distanceKm: totalDistanceKm,
      durationMinutes: totalDurationMinutes,
      stops: plannedStops,
    } = await buildRouteTiming(
      tripGroup.vehicle.location,
      assignedParticipants,
      center.location,
    ))

    const occupiedSeats = assignedParticipants.reduce(
      (totalSeats, participant) =>
        totalSeats + seatsNeeded(participant),
      0,
    )

    const seatUtilization =
      occupiedSeats / tripGroup.vehicle.capacity

    const utilizationScore =
      Math.min(1, seatUtilization) * 45

    const durationScore = Math.max(
      0,
      30 - totalDurationMinutes * 0.35,
    )

    const routeScore = Math.round(
      Math.max(
        0,
        Math.min(
          100,
          utilizationScore + durationScore,
        ),
      ),
    )

    const efficiencyScore = Math.round(
      Math.max(
        0,
        Math.min(
          100,
          seatUtilization * 60 +
            Math.max(
              0,
              40 - totalDistanceKm * 2,
            ),
        ),
      ),
    )

    const estimatedCost = Math.round(
      COST_BASE +
        totalDistanceKm * COST_PER_KM +
        totalDurationMinutes * COST_PER_MIN,
    )

    const programStartMinutes = eventStartTime ? timeToMinutes(eventStartTime) : undefined
    const driverPickupMinutes = Math.max(
      VEHICLE_PICKUP_MINUTES,
      Math.round(
        estimateMinutes(
          haversineKm(selectedDriver.location, tripGroup.vehicle.location),
          0,
        ) * TRAFFIC_FACTOR,
      ),
    )
    const routeLeadMinutes = Math.round(
      totalDurationMinutes * TRAFFIC_FACTOR +
        BUFFER_MINUTES +
        plannedStops.length * LOADING_MINUTES +
        UNLOADING_MINUTES,
    )
    const scheduledDepartureMinutes =
      programStartMinutes !== undefined
        ? programStartMinutes - (driverPickupMinutes + routeLeadMinutes)
        : undefined

    const scheduledStops = plannedStops.map((stop, index) => {
      const pickupOffsetMinutes =
        driverPickupMinutes + stop.etaMinutes + index * LOADING_MINUTES
      return {
        ...stop,
        pickupOffsetMinutes,
        scheduledPickupTime:
          scheduledDepartureMinutes !== undefined
            ? formatMinutesToClock(scheduledDepartureMinutes + pickupOffsetMinutes)
            : undefined,
      }
    })

    const finalStop = scheduledStops[scheduledStops.length - 1]
    const centerLegMinutes = Math.max(
      1,
      Math.round(
        estimateMinutes(
          haversineKm(
            finalStop?.location ?? tripGroup.vehicle.location,
            center.location,
          ),
          0,
        ) * TRAFFIC_FACTOR,
      ),
    )
    const arrivalOffsetMinutes =
      (finalStop?.pickupOffsetMinutes ?? driverPickupMinutes) +
      centerLegMinutes +
      UNLOADING_MINUTES +
      BUFFER_MINUTES
    const scheduledArrivalTime =
      scheduledDepartureMinutes !== undefined
        ? formatMinutesToClock(scheduledDepartureMinutes + arrivalOffsetMinutes)
        : undefined

    tripRecommendations.push({
      id: `plan-${tripIndex + 1}`,
      vehicleId: tripGroup.vehicle.id,
      driverId: selectedDriver.id,
      participantIds: orderedParticipants.map(
        (participant) => participant.id,
      ),
      routePath: plannedRoutePath,
      stops: scheduledStops,
      distanceKm:
        Math.round(totalDistanceKm * 10) / 10,
      durationMinutes: totalDurationMinutes,
      estimatedCost,
      capacityUtilization: seatUtilization,
      routeScore,
      efficiencyScore,
      vehiclePickupTime:
        scheduledDepartureMinutes !== undefined
          ? formatMinutesToClock(scheduledDepartureMinutes + driverPickupMinutes)
          : undefined,
      vehiclePickupOffsetMinutes: driverPickupMinutes,
      scheduledArrivalTime,
      programStartTime: eventStartTime,
      violations: [],
    })
  }
  // AC11 safety net:
  // Every participant must end up in exactly one outcome:
  //   1. Assigned to a recommendation
  //   2. Sent for scheduler review
  const scheduledParticipantIds = new Set<string>()

  for (const recommendation of tripRecommendations) {
    for (const participantId of recommendation.participantIds) {
      scheduledParticipantIds.add(participantId)
    }
  }

  const schedulerReviewParticipantIds = new Set(
    schedulerReviewParticipants.map(
      (reviewParticipant) => reviewParticipant.participantId,
    ),
  )

  // If any participant somehow slipped through the planner,
  // explicitly send them for scheduler review.
  for (const participant of participants) {
    const participantScheduled =
      scheduledParticipantIds.has(participant.id)

    const participantUnderReview =
      schedulerReviewParticipantIds.has(participant.id)

    if (!participantScheduled && !participantUnderReview) {
      schedulerReviewParticipants.push({
        participantId: participant.id,
        reason: `${participant.name}: scheduler review required because no scheduling outcome was produced`,
      })
    }
  }

  return {
    recommendations: tripRecommendations,
    unassigned: schedulerReviewParticipants,
  }
}
