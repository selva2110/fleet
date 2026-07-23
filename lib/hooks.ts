'use client';

import { useQuery, type UseQueryResult } from '@tanstack/react-query';
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

export function useCenters() {
  return useTypedQuery<Center[]>({
    queryKey: queryKeys.centers,
    queryFn: async () => {
      const { data, error } = await supabase.from('centers').select('*').order('name');
      if (error) throw error;
      return (data ?? []) as Center[];
    },
  });
}

export function useEvents() {
  return useTypedQuery<EventWithCenter[]>({
    queryKey: queryKeys.events,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('events')
        .select('*, center:centers(*)')
        .order('start_time');
      if (error) throw error;
      return (data ?? []) as EventWithCenter[];
    },
  });
}

export function useParticipants() {
  return useTypedQuery<Participant[]>({
    queryKey: queryKeys.participants,
    queryFn: async () => {
      const { data, error } = await supabase.from('participants').select('*').order('full_name');
      if (error) throw error;
      return (data ?? []) as Participant[];
    },
  });
}

export function useVehicles() {
  return useTypedQuery<Vehicle[]>({
    queryKey: queryKeys.vehicles,
    queryFn: async () => {
      const { data, error } = await supabase.from('vehicles').select('*').order('name');
      if (error) throw error;
      return (data ?? []) as Vehicle[];
    },
  });
}

export function useDrivers() {
  return useTypedQuery<DriverWithVehicle[]>({
    queryKey: queryKeys.drivers,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('drivers')
        .select('*, assigned_vehicle:vehicles(*)')
        .order('full_name');
      if (error) throw error;
      return (data ?? []) as DriverWithVehicle[];
    },
  });
}

export function useTrips() {
  return useTypedQuery<TripWithRelations[]>({
    queryKey: queryKeys.trips,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('trips')
        .select('*, event:events(*, center:centers(*)), vehicle:vehicles(*), driver:drivers(*)')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as TripWithRelations[];
    },
  });
}

export function useTripStops(tripId: string | null) {
  return useTypedQuery<StopWithParticipant[]>({
    queryKey: tripId ? queryKeys.tripStops(tripId) : ['trip-stops', 'none'],
    enabled: !!tripId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('trip_stops')
        .select('*, participant:participants(*)')
        .eq('trip_id', tripId)
        .order('sequence_index');
      if (error) throw error;
      return (data ?? []) as StopWithParticipant[];
    },
  });
}

export function useEnrollments(eventId: string | null) {
  return useTypedQuery<Enrollment[]>({
    queryKey: eventId ? queryKeys.enrollments(eventId) : ['enrollments', 'none'],
    enabled: !!eventId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('event_enrollments')
        .select('*, participant:participants(*)')
        .eq('event_id', eventId)
        .order('enrolled_at');
      if (error) throw error;
      return (data ?? []) as Enrollment[];
    },
  });
}

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
      return (data ?? []) as SystemEventRow[];
    },
  });
}
