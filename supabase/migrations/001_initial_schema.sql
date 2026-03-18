-- Estate Management App - Phase 1 Schema
-- Run this in Supabase SQL Editor or via: supabase db push

-- Units: flat registry
CREATE TABLE units (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  flat_number   text NOT NULL UNIQUE,
  owner_name    text NOT NULL,
  phone         text,
  email         text,
  is_active     boolean DEFAULT true,
  created_at    timestamptz DEFAULT now()
);

-- Residents: links auth.users to units and roles
CREATE TABLE residents (
  id          uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  unit_id     uuid REFERENCES units(id) ON DELETE SET NULL,
  role        text NOT NULL CHECK (role IN ('resident', 'treasurer', 'secretary', 'chairman')),
  created_at  timestamptz DEFAULT now()
);

-- Diesel cycles
CREATE TABLE diesel_cycles (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cycle_number    integer NOT NULL,
  amount_per_unit numeric NOT NULL,
  started_at      date NOT NULL,
  closed_at       date,
  notes           text,
  created_by      uuid REFERENCES residents(id) ON DELETE SET NULL,
  created_at      timestamptz DEFAULT now()
);

-- Diesel contributions
CREATE TABLE diesel_contributions (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cycle_id        uuid NOT NULL REFERENCES diesel_cycles(id) ON DELETE CASCADE,
  unit_id         uuid NOT NULL REFERENCES units(id) ON DELETE CASCADE,
  amount_paid     numeric NOT NULL,
  payment_date    date NOT NULL,
  payment_ref     text,
  recorded_by     uuid REFERENCES residents(id) ON DELETE SET NULL,
  created_at      timestamptz DEFAULT now()
);

-- Indexes for common queries
CREATE INDEX idx_residents_unit_id ON residents(unit_id);
CREATE INDEX idx_diesel_contributions_unit_id ON diesel_contributions(unit_id);
CREATE INDEX idx_diesel_contributions_cycle_id ON diesel_contributions(cycle_id);
CREATE INDEX idx_diesel_cycles_closed_at ON diesel_cycles(closed_at);

-- Enable RLS on all tables
ALTER TABLE units ENABLE ROW LEVEL SECURITY;
ALTER TABLE residents ENABLE ROW LEVEL SECURITY;
ALTER TABLE diesel_cycles ENABLE ROW LEVEL SECURITY;
ALTER TABLE diesel_contributions ENABLE ROW LEVEL SECURITY;

-- Helper: check if current user is committee
CREATE OR REPLACE FUNCTION is_committee()
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM residents
    WHERE id = auth.uid()
    AND role IN ('treasurer', 'secretary', 'chairman')
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Helper: get current user's unit_id
CREATE OR REPLACE FUNCTION my_unit_id()
RETURNS uuid AS $$
  SELECT unit_id FROM residents WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- UNITS policies
CREATE POLICY "committee_full_units"
  ON units FOR ALL
  USING (is_committee())
  WITH CHECK (is_committee());

CREATE POLICY "resident_read_own_unit"
  ON units FOR SELECT
  USING (id = my_unit_id());

-- RESIDENTS policies (committee reads all; residents read own)
CREATE POLICY "committee_read_residents"
  ON residents FOR SELECT
  USING (is_committee());

CREATE POLICY "resident_read_self"
  ON residents FOR SELECT
  USING (id = auth.uid());

CREATE POLICY "committee_insert_residents"
  ON residents FOR INSERT
  WITH CHECK (is_committee());

CREATE POLICY "committee_update_residents"
  ON residents FOR UPDATE
  USING (is_committee())
  WITH CHECK (is_committee());

-- DIESEL_CYCLES policies
CREATE POLICY "committee_full_diesel_cycles"
  ON diesel_cycles FOR ALL
  USING (is_committee())
  WITH CHECK (is_committee());

CREATE POLICY "resident_read_diesel_cycles"
  ON diesel_cycles FOR SELECT
  USING (true);  -- residents need to see cycles for balance calc (filtered by contributions)

-- DIESEL_CONTRIBUTIONS policies
CREATE POLICY "committee_read_contributions"
  ON diesel_contributions FOR SELECT
  USING (is_committee());

CREATE POLICY "resident_read_own_contributions"
  ON diesel_contributions FOR SELECT
  USING (unit_id = my_unit_id());

CREATE POLICY "treasurer_secretary_insert_contributions"
  ON diesel_contributions FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM residents
      WHERE id = auth.uid()
      AND role IN ('treasurer', 'secretary')
    )
  );
