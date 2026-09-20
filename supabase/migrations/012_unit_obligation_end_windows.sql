-- Per-unit obligation END windows: service charge (date) and diesel (cycle number).
-- Mirrors 009's FROM windows so a unit's participation can be gracefully ended
-- without retroactively deleting their historical contributions from pool totals.

ALTER TABLE units
  ADD COLUMN IF NOT EXISTS diesel_obligation_to_cycle_number integer;

COMMENT ON COLUMN units.diesel_obligation_to_cycle_number IS
  'If set, diesel obligation applies only through cycles with cycle_number <= this value (inclusive). NULL = no end (ongoing).';

ALTER TABLE units
  ADD COLUMN IF NOT EXISTS service_charge_obligation_end date;

COMMENT ON COLUMN units.service_charge_obligation_end IS
  'If set, unit is liable only for service charge periods whose period_end <= this date. NULL = no end (ongoing).';

-- Replace the contribution insert policy: instead of hard-blocking units where
-- diesel_participates=false, enforce the obligation window (from/to cycle numbers).
-- This still prevents billing units outside their participation range but lets
-- the committee clean up historical contributions for units that have left.
DROP POLICY IF EXISTS "treasurer_secretary_insert_contributions" ON diesel_contributions;

CREATE POLICY "treasurer_secretary_insert_contributions"
  ON diesel_contributions FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM residents
      WHERE id = auth.uid()
      AND role IN ('treasurer', 'secretary')
    )
    AND EXISTS (
      SELECT 1
      FROM units u
      JOIN diesel_cycles c ON c.id = diesel_contributions.cycle_id
      WHERE u.id = diesel_contributions.unit_id
        AND (
          u.diesel_obligation_from_cycle_number IS NULL
          OR c.cycle_number >= u.diesel_obligation_from_cycle_number
        )
        AND (
          u.diesel_obligation_to_cycle_number IS NULL
          OR c.cycle_number <= u.diesel_obligation_to_cycle_number
        )
    )
  );
