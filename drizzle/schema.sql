-- FleetCare database schema (PostgreSQL 14+).
-- This is the exact DDL used in production; run it once against a fresh
-- database to create all tables. It is idempotent (safe to re-run).
--
-- Quick start (local):
--   1. createdb fleetcare
--   2. export DATABASE_URL="postgres://postgres:postgres@localhost:5432/fleetcare"
--   3. pnpm db:setup      (or: psql "$DATABASE_URL" -f drizzle/schema.sql)
--   4. pnpm dev           (the app auto-seeds demo data on first load)

CREATE TABLE IF NOT EXISTS centers (
  id text PRIMARY KEY,
  name text NOT NULL,
  type text NOT NULL,
  address text NOT NULL,
  location jsonb NOT NULL,
  operating_hours text NOT NULL,
  capacity integer NOT NULL
);

CREATE TABLE IF NOT EXISTS participants (
  id text PRIMARY KEY,
  name text NOT NULL,
  phone text NOT NULL DEFAULT '',
  emergency_contact text NOT NULL DEFAULT '',
  address text NOT NULL DEFAULT '',
  location jsonb NOT NULL,
  medical_notes text NOT NULL DEFAULT '',
  constraints jsonb NOT NULL DEFAULT '{}',
  max_travel_minutes integer NOT NULL DEFAULT 40,
  pickup_window text NOT NULL DEFAULT '',
  mobility_level text NOT NULL,
  medical_priority text NOT NULL,
  eligible boolean NOT NULL DEFAULT true,
  status text NOT NULL,
  event_id text
);

CREATE TABLE IF NOT EXISTS vehicles (
  id text PRIMARY KEY,
  name text NOT NULL,
  address text NOT NULL DEFAULT '',
  type text NOT NULL,
  capacity integer NOT NULL,
  wheelchair_capacity integer NOT NULL DEFAULT 0,
  oxygen_equipment boolean NOT NULL DEFAULT false,
  lift_available boolean NOT NULL DEFAULT false,
  bariatric_capable boolean NOT NULL DEFAULT false,
  stretcher_capable boolean NOT NULL DEFAULT false,
  fuel_type text NOT NULL,
  maintenance_status text NOT NULL,
  status text NOT NULL,
  location jsonb NOT NULL,
  image_url text
);

-- Idempotent for databases created before stretcher_capable existed.
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS stretcher_capable boolean NOT NULL DEFAULT false;
-- Idempotent for databases created before per-vehicle imagery existed.
-- Left NULL by default; the UI falls back to a rendered image chosen by vehicle type.
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS image_url text;

CREATE TABLE IF NOT EXISTS drivers (
  id text PRIMARY KEY,
  name text NOT NULL,
  phone text NOT NULL DEFAULT '',
  address text NOT NULL DEFAULT '',
  location jsonb NOT NULL,
  license text NOT NULL DEFAULT '',
  certifications jsonb NOT NULL,
  assigned_vehicle_id text,
  status text NOT NULL,
  rating real NOT NULL DEFAULT 4.5,
  shift_start text NOT NULL DEFAULT '00:00',
  shift_end text NOT NULL DEFAULT '23:59',
  shift_days jsonb NOT NULL DEFAULT '[0,1,2,3,4,5,6]',
  image_url text
);

-- Idempotent for databases created before shift timing existed.
ALTER TABLE drivers ADD COLUMN IF NOT EXISTS shift_start text NOT NULL DEFAULT '00:00';
ALTER TABLE drivers ADD COLUMN IF NOT EXISTS shift_end text NOT NULL DEFAULT '23:59';
ALTER TABLE drivers ADD COLUMN IF NOT EXISTS shift_days jsonb NOT NULL DEFAULT '[0,1,2,3,4,5,6]';
ALTER TABLE drivers ADD COLUMN IF NOT EXISTS image_url text;

CREATE TABLE IF NOT EXISTS events (
  id text PRIMARY KEY,
  name text NOT NULL,
  type text NOT NULL,
  center_id text NOT NULL,
  date text NOT NULL,
  start_time text NOT NULL,
  end_time text NOT NULL,
  expected_attendance integer NOT NULL DEFAULT 0,
  participant_ids jsonb NOT NULL DEFAULT '[]',
  reminders jsonb NOT NULL DEFAULT '[]',
  status text NOT NULL
);

CREATE TABLE IF NOT EXISTS trips (
  id text PRIMARY KEY,
  trip_number text NOT NULL,
  event_id text NOT NULL,
  vehicle_id text,
  driver_id text,
  stops jsonb NOT NULL DEFAULT '[]',
  destination_center_id text NOT NULL,
  status text NOT NULL,
  distance_km real NOT NULL DEFAULT 0,
  duration_minutes real NOT NULL DEFAULT 0,
  eta_center text NOT NULL DEFAULT '',
  progress real NOT NULL DEFAULT 0,
  current_location jsonb NOT NULL,
  route_path jsonb NOT NULL DEFAULT '[]',
  started_at timestamptz,
  last_tick_at timestamptz
);

CREATE TABLE IF NOT EXISTS event_log (
  id serial PRIMARY KEY,
  event_type text NOT NULL,
  aggregate_type text NOT NULL,
  aggregate_id text NOT NULL DEFAULT '',
  actor_role text NOT NULL DEFAULT 'system',
  summary text NOT NULL DEFAULT '',
  payload jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS event_log_created_at_idx ON event_log (created_at DESC);
