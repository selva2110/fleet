/*
# Smart Fleet Event Transportation Platform — Core Schema

## Purpose
Transport participants from their home locations to events held at medical and
community centers. The system automatically assigns vehicles + drivers, creates
trips, optimizes pickup routes, calculates ETAs, and tracks vehicles live.

Single-tenant demo (no sign-in yet) -> all policies scoped TO anon, authenticated.

## Tables
1. centers, 2. events, 3. participants, 4. event_enrollments,
5. vehicles, 6. drivers, 7. trips, 8. trip_stops, 9. vehicle_locations,
10. system_events
*/
CREATE EXTENSION IF NOT EXISTS postgis;

-- 1. Centers
CREATE TABLE IF NOT EXISTS centers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  center_type text NOT NULL CHECK (center_type IN ('hospital','clinic','rehabilitation','dialysis','community_hall','senior_center')),
  address text NOT NULL,
  phone text,
  location geography(Point,4326) NOT NULL,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE centers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_centers" ON centers;
CREATE POLICY "anon_select_centers" ON centers FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_centers" ON centers;
CREATE POLICY "anon_insert_centers" ON centers FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_centers" ON centers;
CREATE POLICY "anon_update_centers" ON centers FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_centers" ON centers;
CREATE POLICY "anon_delete_centers" ON centers FOR DELETE TO anon, authenticated USING (true);
CREATE INDEX IF NOT EXISTS centers_location_idx ON centers USING GIST (location);

-- 2. Events
CREATE TABLE IF NOT EXISTS events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  center_id uuid NOT NULL REFERENCES centers(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  start_time timestamptz NOT NULL,
  duration_minutes int NOT NULL DEFAULT 120,
  enrollment_threshold int NOT NULL DEFAULT 5,
  status text NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled','enrolling','route_planning','dispatched','in_progress','completed','cancelled')),
  created_at timestamptz DEFAULT now()
);
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_events" ON events;
CREATE POLICY "anon_select_events" ON events FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_events" ON events;
CREATE POLICY "anon_insert_events" ON events FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_events" ON events;
CREATE POLICY "anon_update_events" ON events FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_events" ON events;
CREATE POLICY "anon_delete_events" ON events FOR DELETE TO anon, authenticated USING (true);
CREATE INDEX IF NOT EXISTS events_center_idx ON events(center_id);
CREATE INDEX IF NOT EXISTS events_status_idx ON events(status);

-- 3. Participants
CREATE TABLE IF NOT EXISTS participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name text NOT NULL,
  phone text,
  home_location geography(Point,4326) NOT NULL,
  home_address text NOT NULL,
  needs_wheelchair boolean NOT NULL DEFAULT false,
  needs_power_wheelchair boolean NOT NULL DEFAULT false,
  needs_oxygen boolean NOT NULL DEFAULT false,
  needs_caregiver boolean NOT NULL DEFAULT false,
  needs_bariatric boolean NOT NULL DEFAULT false,
  needs_mobility_assistance boolean NOT NULL DEFAULT false,
  pickup_window_start time,
  pickup_window_end time,
  max_travel_minutes int,
  medical_priority text NOT NULL DEFAULT 'normal' CHECK (medical_priority IN ('low','normal','high','critical')),
  created_at timestamptz DEFAULT now()
);
ALTER TABLE participants ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_participants" ON participants;
CREATE POLICY "anon_select_participants" ON participants FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_participants" ON participants;
CREATE POLICY "anon_insert_participants" ON participants FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_participants" ON participants;
CREATE POLICY "anon_update_participants" ON participants FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_participants" ON participants;
CREATE POLICY "anon_delete_participants" ON participants FOR DELETE TO anon, authenticated USING (true);
CREATE INDEX IF NOT EXISTS participants_location_idx ON participants USING GIST (home_location);

-- 4. Event enrollments
CREATE TABLE IF NOT EXISTS event_enrollments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  participant_id uuid NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
  enrolled_at timestamptz DEFAULT now(),
  pickup_confirmed boolean NOT NULL DEFAULT false,
  UNIQUE (event_id, participant_id)
);
ALTER TABLE event_enrollments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_enrollments" ON event_enrollments;
CREATE POLICY "anon_select_enrollments" ON event_enrollments FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_enrollments" ON event_enrollments;
CREATE POLICY "anon_insert_enrollments" ON event_enrollments FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_enrollments" ON event_enrollments;
CREATE POLICY "anon_update_enrollments" ON event_enrollments FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_enrollments" ON event_enrollments;
CREATE POLICY "anon_delete_enrollments" ON event_enrollments FOR DELETE TO anon, authenticated USING (true);
CREATE INDEX IF NOT EXISTS enrollments_event_idx ON event_enrollments(event_id);
CREATE INDEX IF NOT EXISTS enrollments_participant_idx ON event_enrollments(participant_id);

-- 5. Vehicles
CREATE TABLE IF NOT EXISTS vehicles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  plate text NOT NULL,
  vehicle_type text NOT NULL CHECK (vehicle_type IN ('minivan','wheelchair_van','bus','ambulance','sedan')),
  capacity int NOT NULL DEFAULT 8,
  wheelchair_capacity int NOT NULL DEFAULT 0,
  has_oxygen boolean NOT NULL DEFAULT false,
  has_lift boolean NOT NULL DEFAULT false,
  current_location geography(Point,4326),
  status text NOT NULL DEFAULT 'available' CHECK (status IN ('available','assigned','in_service','maintenance','offline')),
  created_at timestamptz DEFAULT now()
);
ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_vehicles" ON vehicles;
CREATE POLICY "anon_select_vehicles" ON vehicles FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_vehicles" ON vehicles;
CREATE POLICY "anon_insert_vehicles" ON vehicles FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_vehicles" ON vehicles;
CREATE POLICY "anon_update_vehicles" ON vehicles FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_vehicles" ON vehicles;
CREATE POLICY "anon_delete_vehicles" ON vehicles FOR DELETE TO anon, authenticated USING (true);
CREATE INDEX IF NOT EXISTS vehicles_location_idx ON vehicles USING GIST (current_location);
CREATE INDEX IF NOT EXISTS vehicles_status_idx ON vehicles(status);

-- 6. Drivers
CREATE TABLE IF NOT EXISTS drivers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name text NOT NULL,
  phone text,
  license_class text NOT NULL DEFAULT 'B',
  status text NOT NULL DEFAULT 'available' CHECK (status IN ('available','assigned','on_break','off_duty')),
  assigned_vehicle_id uuid REFERENCES vehicles(id) ON DELETE SET NULL,
  rating numeric(3,2) DEFAULT 5.0,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE drivers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_drivers" ON drivers;
CREATE POLICY "anon_select_drivers" ON drivers FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_drivers" ON drivers;
CREATE POLICY "anon_insert_drivers" ON drivers FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_drivers" ON drivers;
CREATE POLICY "anon_update_drivers" ON drivers FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_drivers" ON drivers;
CREATE POLICY "anon_delete_drivers" ON drivers FOR DELETE TO anon, authenticated USING (true);
CREATE INDEX IF NOT EXISTS drivers_status_idx ON drivers(status);

-- 7. Trips
CREATE TABLE IF NOT EXISTS trips (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  vehicle_id uuid NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  driver_id uuid NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'planned' CHECK (status IN ('planned','assigned','started','completed','cancelled')),
  route_geojson jsonb,
  total_distance_km numeric(8,2) DEFAULT 0,
  estimated_duration_minutes int DEFAULT 0,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE trips ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_trips" ON trips;
CREATE POLICY "anon_select_trips" ON trips FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_trips" ON trips;
CREATE POLICY "anon_insert_trips" ON trips FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_trips" ON trips;
CREATE POLICY "anon_update_trips" ON trips FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_trips" ON trips;
CREATE POLICY "anon_delete_trips" ON trips FOR DELETE TO anon, authenticated USING (true);
CREATE INDEX IF NOT EXISTS trips_event_idx ON trips(event_id);
CREATE INDEX IF NOT EXISTS trips_vehicle_idx ON trips(vehicle_id);
CREATE INDEX IF NOT EXISTS trips_status_idx ON trips(status);

-- 8. Trip stops
CREATE TABLE IF NOT EXISTS trip_stops (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id uuid NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  participant_id uuid NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
  sequence_index int NOT NULL,
  stop_type text NOT NULL CHECK (stop_type IN ('pickup','dropoff')),
  location geography(Point,4326) NOT NULL,
  address text,
  planned_eta timestamptz,
  actual_time timestamptz,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','arrived','completed','skipped')),
  created_at timestamptz DEFAULT now()
);
ALTER TABLE trip_stops ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_trip_stops" ON trip_stops;
CREATE POLICY "anon_select_trip_stops" ON trip_stops FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_trip_stops" ON trip_stops;
CREATE POLICY "anon_insert_trip_stops" ON trip_stops FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_trip_stops" ON trip_stops;
CREATE POLICY "anon_update_trip_stops" ON trip_stops FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_trip_stops" ON trip_stops;
CREATE POLICY "anon_delete_trip_stops" ON trip_stops FOR DELETE TO anon, authenticated USING (true);
CREATE INDEX IF NOT EXISTS trip_stops_trip_idx ON trip_stops(trip_id);
CREATE INDEX IF NOT EXISTS trip_stops_seq_idx ON trip_stops(trip_id, sequence_index);

-- 9. Vehicle GPS time-series
CREATE TABLE IF NOT EXISTS vehicle_locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id uuid NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  location geography(Point,4326) NOT NULL,
  heading numeric(5,2),
  speed_kmh numeric(5,2),
  recorded_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE vehicle_locations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_vehicle_locations" ON vehicle_locations;
CREATE POLICY "anon_select_vehicle_locations" ON vehicle_locations FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_vehicle_locations" ON vehicle_locations;
CREATE POLICY "anon_insert_vehicle_locations" ON vehicle_locations FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_vehicle_locations" ON vehicle_locations;
CREATE POLICY "anon_delete_vehicle_locations" ON vehicle_locations FOR DELETE TO anon, authenticated USING (true);
CREATE INDEX IF NOT EXISTS vehicle_locations_vehicle_time_idx ON vehicle_locations(vehicle_id, recorded_at DESC);

-- 10. System events (audit / event-bus mirror)
CREATE TABLE IF NOT EXISTS system_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE system_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_system_events" ON system_events;
CREATE POLICY "anon_select_system_events" ON system_events FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_system_events" ON system_events;
CREATE POLICY "anon_insert_system_events" ON system_events FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_system_events" ON system_events;
CREATE POLICY "anon_delete_system_events" ON system_events FOR DELETE TO anon, authenticated USING (true);
CREATE INDEX IF NOT EXISTS system_events_type_idx ON system_events(event_type);
CREATE INDEX IF NOT EXISTS system_events_time_idx ON system_events(created_at DESC);
