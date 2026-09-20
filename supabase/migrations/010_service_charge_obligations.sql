-- Per-unit service charge obligations (amount + window). Payments reference obligations.

CREATE TABLE service_charge_obligations (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_id             uuid NOT NULL REFERENCES units(id) ON DELETE CASCADE,
  period_template_id  uuid REFERENCES service_charge_periods(id) ON DELETE SET NULL,
  label               text NOT NULL,
  amount              numeric NOT NULL,
  period_start        date NOT NULL,
  period_end          date NOT NULL,
  created_at          timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT service_charge_obligations_window_ok CHECK (period_end >= period_start)
);

CREATE INDEX idx_service_charge_obligations_unit ON service_charge_obligations(unit_id);
CREATE INDEX idx_service_charge_obligations_template ON service_charge_obligations(period_template_id);

COMMENT ON TABLE service_charge_obligations IS 'Per-flat levy: amount and billing window. Optional link to a template for default amounts.';
COMMENT ON COLUMN service_charge_obligations.period_template_id IS 'Optional link to service_charge_periods (estate default template).';

ALTER TABLE service_charge_obligations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "committee_full_service_charge_obligations"
  ON service_charge_obligations FOR ALL
  USING (is_committee())
  WITH CHECK (is_committee());

CREATE POLICY "resident_read_own_service_charge_obligations"
  ON service_charge_obligations FOR SELECT
  USING (unit_id = my_unit_id());

-- Link payments to obligations
ALTER TABLE service_charge_payments
  ADD COLUMN obligation_id uuid REFERENCES service_charge_obligations(id) ON DELETE CASCADE;

-- One obligation row per (unit, legacy period) that has payments
INSERT INTO service_charge_obligations (unit_id, period_template_id, label, amount, period_start, period_end)
SELECT DISTINCT ON (p.unit_id, p.period_id)
  p.unit_id,
  scp.id,
  scp.period_label,
  scp.amount_per_unit,
  (scp.created_at AT TIME ZONE 'UTC')::date,
  COALESCE(
    scp.due_date,
    ((scp.created_at AT TIME ZONE 'UTC')::date + interval '1 year')::date
  )
FROM service_charge_payments p
JOIN service_charge_periods scp ON scp.id = p.period_id
ORDER BY p.unit_id, p.period_id, scp.created_at;

UPDATE service_charge_payments py
SET obligation_id = o.id
FROM service_charge_obligations o
WHERE o.unit_id = py.unit_id
  AND o.period_template_id = py.period_id;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM service_charge_payments WHERE obligation_id IS NULL) THEN
    RAISE EXCEPTION 'service_charge migration: could not link all payments to obligations';
  END IF;
END $$;

ALTER TABLE service_charge_payments
  DROP CONSTRAINT service_charge_payments_period_id_fkey;

DROP INDEX IF EXISTS idx_service_charge_payments_period_id;

ALTER TABLE service_charge_payments
  DROP COLUMN period_id;

ALTER TABLE service_charge_payments
  ALTER COLUMN obligation_id SET NOT NULL;

CREATE INDEX idx_service_charge_payments_obligation_id ON service_charge_payments(obligation_id);

DROP POLICY IF EXISTS "treasurer_secretary_insert_service_charge_payments" ON service_charge_payments;

CREATE POLICY "treasurer_secretary_insert_service_charge_payments"
  ON service_charge_payments FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM residents
      WHERE id = auth.uid()
      AND role IN ('treasurer', 'secretary')
    )
    AND EXISTS (
      SELECT 1 FROM service_charge_obligations o
      WHERE o.id = obligation_id
        AND o.unit_id = service_charge_payments.unit_id
    )
  );
