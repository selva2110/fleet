'use client';

import { useQuery, useMutation, useQueryClient, type UseQueryResult } from '@tanstack/react-query';
import { supabase } from './supabase';
import type { Center, Driver, EventRow, Participant, Trip, TripStop, Vehicle } from './types';

export const queryKeys = {
  centers: ['centers'] as const,
  events: ['events'] as const,
  participants: ['participants'] as const,
  vehicles: ['vehicles'] as const,
  drivers: ['drivers'] as const,
  trips: ['trips'] as const,
  tripStops: (tripId: string) => ['trip-stops', tripId] as const,
  enrollments: (eventId: string) => ['enrollments', eventId] as const,
  systemEvents: ['system-events'] as const,
};

type EventWithCenter = EventRow & { center: Center };
type TripWithRelations = Trip & { event: EventRow & { center: Center }; vehicle: Vehicle; driver: Driver };
type DriverWithVehicle = Driver & { assigned_vehicle: Vehicle | null };
type StopWithParticipant = TripStop & { participant: Participant };

export interface SystemEventRow {
  id: string;
  event_type: string;
  payload: Record<string, unknown>;
  created_at: string;
}

type Enrollment = { id: string; participant: Participant; enrolled_at: string; pickup_confirmed: boolean };

function useTypedQuery<T>(
  options: Parameters<typeof useQuery>[0]
): UseQueryResult<T, Error> {
  return useQuery(options) as unknown as UseQueryResult<T, Error>;
}

// ─── Centers ──────────────────────────────────────────────
export function useCenters() {
  return useTypedQuery<Center[]>({
    queryKey: queryKeys.centers,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('centers')
        .select('id,name,center_type,address,phone,location::text,created_at')
        .order('name');
      if (error) throw error;
      return (data ?? []).map(parseCenter);
    },
  });
}

function parseCenter(r: Record<string, unknown>): Center {
  return {
    id: r.id as string,
    name: r.name as string,
    center_type: r.center_type as Center['center_type'],
    address: r.address as string,
    phone: r.phone as string | null,
    location: wkbToGeoPoint(r.location as string),
    created_at: r.created_at as string,
  };
}

// ─── Events ────────────────────────────────────────────────
export function useEvents() {
  return useTypedQuery<EventWithCenter[]>({
    queryKey: queryKeys.events,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('events')
        .select('id,center_id,name,description,start_time,duration_minutes,enrollment_threshold,status,created_at,center:centers(id,name,center_type,address,phone,location::text,created_at)')
        .order('start_time');
      if (error) throw error;
      return (data ?? []).map((r: Record<string, unknown>) => ({
        id: r.id as string,
        center_id: r.center_id as string,
        name: r.name as string,
        description: r.description as string | null,
        start_time: r.start_time as string,
        duration_minutes: r.duration_minutes as number,
        enrollment_threshold: r.enrollment_threshold as number,
        status: r.status as EventRow['status'],
        created_at: r.created_at as string,
        center: parseCenter(r.center as Record<string, unknown>),
      })) as EventWithCenter[];
    },
  });
}

// ─── Participants ──────────────────────────────────────────
export function useParticipants() {
  return useTypedQuery<Participant[]>({
    queryKey: queryKeys.participants,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('participants')
        .select('id,full_name,phone,home_location::text,home_address,needs_wheelchair,needs_power_wheelchair,needs_oxygen,needs_caregiver,needs_bariatric,needs_mobility_assistance,pickup_window_start,pickup_window_end,max_travel_minutes,medical_priority,created_at')
        .order('full_name');
      if (error) throw error;
      return (data ?? []).map((r: Record<string, unknown>) => ({
        id: r.id as string,
        full_name: r.full_name as string,
        phone: r.phone as string | null,
        home_location: wkbToGeoPoint(r.home_location as string),
        home_address: r.home_address as string,
        needs_wheelchair: r.needs_wheelchair as boolean,
        needs_power_wheelchair: r.needs_power_wheelchair as boolean,
        needs_oxygen: r.needs_oxygen as boolean,
        needs_caregiver: r.needs_caregiver as boolean,
        needs_bariatric: r.needs_bariatric as boolean,
        needs_mobility_assistance: r.needs_mobility_assistance as boolean,
        pickup_window_start: r.pickup_window_start as string | null,
        pickup_window_end: r.pickup_window_end as string | null,
        max_travel_minutes: r.max_travel_minutes as number | null,
        medical_priority: r.medical_priority as Participant['medical_priority'],
        created_at: r.created_at as string,
      })) as Participant[];
    },
  });
}

// ─── Vehicles ─────────────────────────────────────────────
export function useVehicles() {
  return useTypedQuery<Vehicle[]>({
    queryKey: queryKeys.vehicles,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vehicles')
        .select('id,name,plate,vehicle_type,capacity,wheelchair_capacity,has_oxygen,has_lift,current_location::text,status,created_at')
        .order('name');
      if (error) throw error;
      return (data ?? []).map((r: Record<string, unknown>) => ({
        id: r.id as string,
        name: r.name as string,
        plate: r.plate as string,
        vehicle_type: r.vehicle_type as Vehicle['vehicle_type'],
        capacity: r.capacity as number,
        wheelchair_capacity: r.wheelchair_capacity as number,
        has_oxygen: r.has_oxygen as boolean,
        has_lift: r.has_lift as boolean,
        current_location: r.current_location ? wkbToGeoPoint(r.current_location as string) : null,
        status: r.status as Vehicle['status'],
        created_at: r.created_at as string,
      })) as Vehicle[];
    },
  });
}

// ─── Drivers ───────────────────────────────────────────────
export function useDrivers() {
  return useTypedQuery<DriverWithVehicle[]>({
    queryKey: queryKeys.drivers,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('drivers')
        .select('id,full_name,phone,license_class,status,assigned_vehicle_id,rating,created_at,assigned_vehicle:vehicles(id,name,plate,vehicle_type,capacity,wheelchair_capacity,has_oxygen,has_lift,current_location::text,status,created_at)')
        .order('full_name');
      if (error) throw error;
      return (data ?? []).map((r: Record<string, unknown>) => ({
        id: r.id as string,
        full_name: r.full_name as string,
        phone: r.phone as string | null,
        license_class: r.license_class as string,
        status: r.status as Driver['status'],
        assigned_vehicle_id: r.assigned_vehicle_id as string | null,
        rating: Number(r.rating),
        created_at: r.created_at as string,
        assigned_vehicle: r.assigned_vehicle
          ? {
              id: (r.assigned_vehicle as Record<string, unknown>).id as string,
              name: (r.assigned_vehicle as Record<string, unknown>).name as string,
              plate: (r.assigned_vehicle as Record<string, unknown>).plate as string,
              vehicle_type: (r.assigned_vehicle as Record<string, unknown>).vehicle_type as Vehicle['vehicle_type'],
              capacity: (r.assigned_vehicle as Record<string, unknown>).capacity as number,
              wheelchair_capacity: (r.assigned_vehicle as Record<string, unknown>).wheelchair_capacity as number,
              has_oxygen: (r.assigned_vehicle as Record<string, unknown>).has_oxygen as boolean,
              has_lift: (r.assigned_vehicle as Record<string, unknown>).has_lift as boolean,
              current_location: (r.assigned_vehicle as Record<string, unknown>).current_location
                ? wkbToGeoPoint((r.assigned_vehicle as Record<string, unknown>).current_location as string)
                : null,
              status: (r.assigned_vehicle as Record<string, unknown>).status as Vehicle['status'],
              created_at: (r.assigned_vehicle as Record<string, unknown>).created_at as string,
            }
          : null,
      })) as DriverWithVehicle[];
    },
  });
}

// ─── Trips ─────────────────────────────────────────────────
export function useTrips() {
  return useTypedQuery<TripWithRelations[]>({
    queryKey: queryKeys.trips,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('trips')
        .select('id,event_id,vehicle_id,driver_id,status,route_geojson,total_distance_km,estimated_duration_minutes,started_at,completed_at,created_at,event:events(id,center_id,name,description,start_time,duration_minutes,enrollment_threshold,status,created_at,center:centers(id,name,center_type,address,phone,location::text,created_at)),vehicle:vehicles(id,name,plate,vehicle_type,capacity,wheelchair_capacity,has_oxygen,has_lift,current_location::text,status,created_at),driver:drivers(id,full_name,phone,license_class,status,assigned_vehicle_id,rating,created_at)')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []).map((r: Record<string, unknown>) => ({
        id: r.id as string,
        event_id: r.event_id as string,
        vehicle_id: r.vehicle_id as string,
        driver_id: r.driver_id as string,
        status: r.status as Trip['status'],
        route_geojson: r.route_geojson as Trip['route_geojson'],
        total_distance_km: Number(r.total_distance_km),
        estimated_duration_minutes: r.estimated_duration_minutes as number,
        started_at: r.started_at as string | null,
        completed_at: r.completed_at as string | null,
        created_at: r.created_at as string,
        event: {
          id: (r.event as Record<string, unknown>).id as string,
          center_id: (r.event as Record<string, unknown>).center_id as string,
          name: (r.event as Record<string, unknown>).name as string,
          description: (r.event as Record<string, unknown>).description as string | null,
          start_time: (r.event as Record<string, unknown>).start_time as string,
          duration_minutes: (r.event as Record<string, unknown>).duration_minutes as number,
          enrollment_threshold: (r.event as Record<string, unknown>).enrollment_threshold as number,
          status: (r.event as Record<string, unknown>).status as EventRow['status'],
          created_at: (r.event as Record<string, unknown>).created_at as string,
          center: parseCenter((r.event as Record<string, unknown>).center as Record<string, unknown>),
        },
        vehicle: {
          id: (r.vehicle as Record<string, unknown>).id as string,
          name: (r.vehicle as Record<string, unknown>).name as string,
          plate: (r.vehicle as Record<string, unknown>).plate as string,
          vehicle_type: (r.vehicle as Record<string, unknown>).vehicle_type as Vehicle['vehicle_type'],
          capacity: (r.vehicle as Record<string, unknown>).capacity as number,
          wheelchair_capacity: (r.vehicle as Record<string, unknown>).wheelchair_capacity as number,
          has_oxygen: (r.vehicle as Record<string, unknown>).has_oxygen as boolean,
          has_lift: (r.vehicle as Record<string, unknown>).has_lift as boolean,
          current_location: (r.vehicle as Record<string, unknown>).current_location
            ? wkbToGeoPoint((r.vehicle as Record<string, unknown>).current_location as string)
            : null,
          status: (r.vehicle as Record<string, unknown>).status as Vehicle['status'],
          created_at: (r.vehicle as Record<string, unknown>).created_at as string,
        },
        driver: {
          id: (r.driver as Record<string, unknown>).id as string,
          full_name: (r.driver as Record<string, unknown>).full_name as string,
          phone: (r.driver as Record<string, unknown>).phone as string | null,
          license_class: (r.driver as Record<string, unknown>).license_class as string,
          status: (r.driver as Record<string, unknown>).status as Driver['status'],
          assigned_vehicle_id: (r.driver as Record<string, unknown>).assigned_vehicle_id as string | null,
          rating: Number((r.driver as Record<string, unknown>).rating),
          created_at: (r.driver as Record<string, unknown>).created_at as string,
        },
      })) as TripWithRelations[];
    },
  });
}

// ─── Trip Stops ─────────────────────────────────────────────
export function useTripStops(tripId: string | null) {
  return useTypedQuery<StopWithParticipant[]>({
    queryKey: tripId ? queryKeys.tripStops(tripId) : ['trip-stops', 'none'],
    enabled: !!tripId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('trip_stops')
        .select('id,trip_id,participant_id,sequence_index,stop_type,location::text,address,planned_eta,actual_time,status,created_at,participant:participants(id,full_name,phone,home_location::text,home_address,needs_wheelchair,needs_power_wheelchair,needs_oxygen,needs_caregiver,needs_bariatric,needs_mobility_assistance,pickup_window_start,pickup_window_end,max_travel_minutes,medical_priority,created_at)')
        .eq('trip_id', tripId)
        .order('sequence_index');
      if (error) throw error;
      return (data ?? []).map((r: Record<string, unknown>) => ({
        id: r.id as string,
        trip_id: r.trip_id as string,
        participant_id: r.participant_id as string,
        sequence_index: r.sequence_index as number,
        stop_type: r.stop_type as TripStop['stop_type'],
        location: wkbToGeoPoint(r.location as string),
        address: r.address as string | null,
        planned_eta: r.planned_eta as string | null,
        actual_time: r.actual_time as string | null,
        status: r.status as TripStop['status'],
        created_at: r.created_at as string,
        participant: {
          id: (r.participant as Record<string, unknown>).id as string,
          full_name: (r.participant as Record<string, unknown>).full_name as string,
          phone: (r.participant as Record<string, unknown>).phone as string | null,
          home_location: wkbToGeoPoint((r.participant as Record<string, unknown>).home_location as string),
          home_address: (r.participant as Record<string, unknown>).home_address as string,
          needs_wheelchair: (r.participant as Record<string, unknown>).needs_wheelchair as boolean,
          needs_power_wheelchair: (r.participant as Record<string, unknown>).needs_power_wheelchair as boolean,
          needs_oxygen: (r.participant as Record<string, unknown>).needs_oxygen as boolean,
          needs_caregiver: (r.participant as Record<string, unknown>).needs_caregiver as boolean,
          needs_bariatric: (r.participant as Record<string, unknown>).needs_bariatric as boolean,
          needs_mobility_assistance: (r.participant as Record<string, unknown>).needs_mobility_assistance as boolean,
          pickup_window_start: (r.participant as Record<string, unknown>).pickup_window_start as string | null,
          pickup_window_end: (r.participant as Record<string, unknown>).pickup_window_end as string | null,
          max_travel_minutes: (r.participant as Record<string, unknown>).max_travel_minutes as number | null,
          medical_priority: (r.participant as Record<string, unknown>).medical_priority as Participant['medical_priority'],
          created_at: (r.participant as Record<string, unknown>).created_at as string,
        },
      })) as StopWithParticipant[];
    },
  });
}

// ─── Enrollments ───────────────────────────────────────────
export function useEnrollments(eventId: string | null) {
  return useTypedQuery<Enrollment[]>({
    queryKey: eventId ? queryKeys.enrollments(eventId) : ['enrollments', 'none'],
    enabled: !!eventId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('event_enrollments')
        .select('id,participant:participants(*),enrolled_at,pickup_confirmed')
        .eq('event_id', eventId)
        .order('enrolled_at');
      if (error) throw error;
      return (data ?? []) as unknown as Enrollment[];
    },
  });
}

// ─── System Events ─────────────────────────────────────────
export function useSystemEvents() {
  return useTypedQuery<SystemEventRow[]>({
    queryKey: queryKeys.systemEvents,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('system_events')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data ?? []) as unknown as SystemEventRow[];
    },
  });
}

export function useAllTripStops(tripIds: string[]) {
  const qc = useQueryClient();
  return useQuery({
    queryKey: ['all-trip-stops', tripIds.join(',')],
    enabled: tripIds.length > 0,
    queryFn: async () => {
      const results: Record<string, { location: { coordinates: [number, number] }; stop_type: string; sequence_index: number; participant?: { full_name: string } }[]> = {};
      for (const tripId of tripIds) {
        const { data, error } = await supabase
          .from('trip_stops')
          .select('id,trip_id,sequence_index,stop_type,location::text,participant:participants(full_name)')
          .eq('trip_id', tripId)
          .order('sequence_index');
        if (error) continue;
        const stops = (data ?? []).map((r: Record<string, unknown>) => ({
          location: wkbToGeoPoint(r.location as string),
          stop_type: r.stop_type as string,
          sequence_index: r.sequence_index as number,
          participant: { full_name: (r.participant as Record<string, unknown>)?.full_name as string ?? 'Stop' },
        }));
        results[tripId] = stops;
      }
      return results;
    },
    staleTime: 30000,
  }) as unknown as ReturnType<typeof useQuery<Record<string, { location: { coordinates: [number, number] }; stop_type: string; sequence_index: number; participant?: { full_name: string } }[]>, Error>>;
}
// Supabase returns geography columns as WKB hex strings when selected as text.
// We parse the hex to extract lng/lat coordinates.
function wkbToGeoPoint(wkb: string): { type: 'Point'; coordinates: [number, number] } {
  // ─── WKB hex → GeoJSON Point ────────────────────────────────
// Supabase returns geography columns as EWKB hex strings when selected as text.
  // EWKB format: 1 byte order + 4 bytes type + 4 bytes SRID + 8 bytes lng + 8 bytes lat
  const hexToByte = (h: string, i: number) => parseInt(h.substr(i * 2, 2), 16);
  const readDoubleBE = (h: string, offset: number) => {
    const buf = new Uint8Array(8);
    for (let i = 0; i < 8; i++) buf[i] = hexToByte(h, offset + i);
    return new DataView(buf.buffer).getFloat64(0, false);
  };
  // offset 9 = byte order(1) + type(4) + SRID(4) = 9 bytes = 18 hex chars
  const lng = readDoubleBE(wkb, 9);
  const lat = readDoubleBE(wkb, 17);
  return { type: 'Point', coordinates: [lng, lat] };
}

// ═══════════════════════════════════════════════════════════
// MUTATIONS
// ═══════════════════════════════════════════════════════════

function geoPointToWKT(lng: number, lat: number): string {
  return `SRID=4326;POINT(${lng} ${lat})`;
}

// ─── Center mutations ───────────────────────────────────────
export function useCreateCenter() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      name: string;
      center_type: string;
      address: string;
      phone?: string;
      lng: number;
      lat: number;
    }) => {
      const { data, error } = await supabase
        .from('centers')
        .insert({
          name: input.name,
          center_type: input.center_type,
          address: input.address,
          phone: input.phone || null,
          location: geoPointToWKT(input.lng, input.lat),
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.centers }),
  });
}

export function useUpdateCenter() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      id: string;
      name?: string;
      center_type?: string;
      address?: string;
      phone?: string;
      lng?: number;
      lat?: number;
    }) => {
      const update: Record<string, unknown> = {};
      if (input.name !== undefined) update.name = input.name;
      if (input.center_type !== undefined) update.center_type = input.center_type;
      if (input.address !== undefined) update.address = input.address;
      if (input.phone !== undefined) update.phone = input.phone || null;
      if (input.lng !== undefined && input.lat !== undefined)
        update.location = geoPointToWKT(input.lng, input.lat);
      const { data, error } = await supabase
        .from('centers')
        .update(update)
        .eq('id', input.id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.centers }),
  });
}

export function useDeleteCenter() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('centers').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.centers });
      qc.invalidateQueries({ queryKey: queryKeys.events });
    },
  });
}

// ─── Event mutations ────────────────────────────────────────
export function useCreateEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      center_id: string;
      name: string;
      description?: string;
      start_time: string;
      duration_minutes: number;
      enrollment_threshold: number;
    }) => {
      const { data, error } = await supabase
        .from('events')
        .insert({
          center_id: input.center_id,
          name: input.name,
          description: input.description || null,
          start_time: input.start_time,
          duration_minutes: input.duration_minutes,
          enrollment_threshold: input.enrollment_threshold,
          status: 'scheduled',
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.events }),
  });
}

export function useUpdateEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      id: string;
      name?: string;
      description?: string;
      start_time?: string;
      duration_minutes?: number;
      enrollment_threshold?: number;
      status?: string;
    }) => {
      const update: Record<string, unknown> = {};
      if (input.name !== undefined) update.name = input.name;
      if (input.description !== undefined) update.description = input.description || null;
      if (input.start_time !== undefined) update.start_time = input.start_time;
      if (input.duration_minutes !== undefined) update.duration_minutes = input.duration_minutes;
      if (input.enrollment_threshold !== undefined) update.enrollment_threshold = input.enrollment_threshold;
      if (input.status !== undefined) update.status = input.status;
      const { data, error } = await supabase
        .from('events')
        .update(update)
        .eq('id', input.id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.events }),
  });
}

export function useDeleteEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('events').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.events }),
  });
}

// ─── Participant mutations ─────────────────────────────────
export function useCreateParticipant() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      full_name: string;
      phone?: string;
      home_address: string;
      lng: number;
      lat: number;
      needs_wheelchair: boolean;
      needs_power_wheelchair: boolean;
      needs_oxygen: boolean;
      needs_caregiver: boolean;
      needs_bariatric: boolean;
      needs_mobility_assistance: boolean;
      medical_priority: string;
    }) => {
      const { data, error } = await supabase
        .from('participants')
        .insert({
          full_name: input.full_name,
          phone: input.phone || null,
          home_address: input.home_address,
          home_location: geoPointToWKT(input.lng, input.lat),
          needs_wheelchair: input.needs_wheelchair,
          needs_power_wheelchair: input.needs_power_wheelchair,
          needs_oxygen: input.needs_oxygen,
          needs_caregiver: input.needs_caregiver,
          needs_bariatric: input.needs_bariatric,
          needs_mobility_assistance: input.needs_mobility_assistance,
          medical_priority: input.medical_priority,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.participants }),
  });
}

export function useUpdateParticipant() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      id: string;
      full_name?: string;
      phone?: string;
      home_address?: string;
      lng?: number;
      lat?: number;
      needs_wheelchair?: boolean;
      needs_power_wheelchair?: boolean;
      needs_oxygen?: boolean;
      needs_caregiver?: boolean;
      needs_bariatric?: boolean;
      needs_mobility_assistance?: boolean;
      medical_priority?: string;
    }) => {
      const update: Record<string, unknown> = {};
      if (input.full_name !== undefined) update.full_name = input.full_name;
      if (input.phone !== undefined) update.phone = input.phone || null;
      if (input.home_address !== undefined) update.home_address = input.home_address;
      if (input.lng !== undefined && input.lat !== undefined)
        update.home_location = geoPointToWKT(input.lng, input.lat);
      if (input.needs_wheelchair !== undefined) update.needs_wheelchair = input.needs_wheelchair;
      if (input.needs_power_wheelchair !== undefined) update.needs_power_wheelchair = input.needs_power_wheelchair;
      if (input.needs_oxygen !== undefined) update.needs_oxygen = input.needs_oxygen;
      if (input.needs_caregiver !== undefined) update.needs_caregiver = input.needs_caregiver;
      if (input.needs_bariatric !== undefined) update.needs_bariatric = input.needs_bariatric;
      if (input.needs_mobility_assistance !== undefined) update.needs_mobility_assistance = input.needs_mobility_assistance;
      if (input.medical_priority !== undefined) update.medical_priority = input.medical_priority;
      const { data, error } = await supabase
        .from('participants')
        .update(update)
        .eq('id', input.id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.participants }),
  });
}

export function useDeleteParticipant() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('participants').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.participants }),
  });
}

// ─── Vehicle mutations ─────────────────────────────────────
export function useCreateVehicle() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      name: string;
      plate: string;
      vehicle_type: string;
      capacity: number;
      wheelchair_capacity: number;
      has_oxygen: boolean;
      has_lift: boolean;
      lng: number;
      lat: number;
      status: string;
    }) => {
      const { data, error } = await supabase
        .from('vehicles')
        .insert({
          name: input.name,
          plate: input.plate,
          vehicle_type: input.vehicle_type,
          capacity: input.capacity,
          wheelchair_capacity: input.wheelchair_capacity,
          has_oxygen: input.has_oxygen,
          has_lift: input.has_lift,
          current_location: geoPointToWKT(input.lng, input.lat),
          status: input.status,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.vehicles }),
  });
}

export function useUpdateVehicle() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      id: string;
      name?: string;
      plate?: string;
      vehicle_type?: string;
      capacity?: number;
      wheelchair_capacity?: number;
      has_oxygen?: boolean;
      has_lift?: boolean;
      status?: string;
      lng?: number;
      lat?: number;
    }) => {
      const update: Record<string, unknown> = {};
      if (input.name !== undefined) update.name = input.name;
      if (input.plate !== undefined) update.plate = input.plate;
      if (input.vehicle_type !== undefined) update.vehicle_type = input.vehicle_type;
      if (input.capacity !== undefined) update.capacity = input.capacity;
      if (input.wheelchair_capacity !== undefined) update.wheelchair_capacity = input.wheelchair_capacity;
      if (input.has_oxygen !== undefined) update.has_oxygen = input.has_oxygen;
      if (input.has_lift !== undefined) update.has_lift = input.has_lift;
      if (input.status !== undefined) update.status = input.status;
      if (input.lng !== undefined && input.lat !== undefined)
        update.current_location = geoPointToWKT(input.lng, input.lat);
      const { data, error } = await supabase
        .from('vehicles')
        .update(update)
        .eq('id', input.id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.vehicles }),
  });
}

export function useDeleteVehicle() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('vehicles').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.vehicles });
      qc.invalidateQueries({ queryKey: queryKeys.drivers });
    },
  });
}

// ─── Driver mutations ───────────────────────────────────────
export function useCreateDriver() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      full_name: string;
      phone?: string;
      license_class: string;
      status: string;
      assigned_vehicle_id?: string;
    }) => {
      const { data, error } = await supabase
        .from('drivers')
        .insert({
          full_name: input.full_name,
          phone: input.phone || null,
          license_class: input.license_class,
          status: input.status,
          assigned_vehicle_id: input.assigned_vehicle_id || null,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.drivers }),
  });
}

export function useUpdateDriver() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      id: string;
      full_name?: string;
      phone?: string;
      license_class?: string;
      status?: string;
      assigned_vehicle_id?: string | null;
    }) => {
      const update: Record<string, unknown> = {};
      if (input.full_name !== undefined) update.full_name = input.full_name;
      if (input.phone !== undefined) update.phone = input.phone || null;
      if (input.license_class !== undefined) update.license_class = input.license_class;
      if (input.status !== undefined) update.status = input.status;
      if (input.assigned_vehicle_id !== undefined) update.assigned_vehicle_id = input.assigned_vehicle_id;
      const { data, error } = await supabase
        .from('drivers')
        .update(update)
        .eq('id', input.id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.drivers }),
  });
}

export function useDeleteDriver() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('drivers').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.drivers }),
  });
}
