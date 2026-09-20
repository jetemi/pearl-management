-- Generator eligibility, diesel purchases (expenditures), contribution guard

ALTER TABLE units
  ADD COLUMN IF NOT EXISTS diesel_participates boolean NOT NULL DEFAULT true;

COMMENT ON COLUMN units.diesel_participates IS 'If false, unit is not on the generator — no diesel obligation; payments blocked by RLS.';

CREATE TABLE diesel_expenditures (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cycle_id        uuid NOT NULL REFERENCES diesel_cycles(id) ON DELETE CASCADE,
  amount          numeric NOT NULL,
  expense_date    date NOT NULL,
  notes           text,
  recorded_by     uuid REFERENCES residents(id) ON DELETE SET NULL,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_diesel_expenditures_cycle_id ON diesel_expenditures(cycle_id);
CREATE INDEX idx_diesel_expenditures_expense_date ON diesel_expenditures(expense_date DESC);

ALTER TABLE diesel_expenditures ENABLE ROW LEVEL SECURITY;

CREATE POLICY "committee_full_diesel_expenditures"
  ON diesel_expenditures FOR ALL
  USING (is_committee())
  WITH CHECK (is_committee());

CREATE POLICY "resident_read_diesel_expenditures"
  ON diesel_expenditures FOR SELECT
  USING (true);

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
      SELECT 1 FROM units u
      WHERE u.id = unit_id AND u.diesel_participates = true
    )
  );
