-- Phase 2: Service Charge, Facility Tracker, Notices

-- Service charge periods
CREATE TABLE service_charge_periods (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  period_label    text NOT NULL,
  amount_per_unit numeric NOT NULL,
  due_date        date,
  created_at      timestamptz DEFAULT now()
);

-- Service charge payments
CREATE TABLE service_charge_payments (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  period_id       uuid NOT NULL REFERENCES service_charge_periods(id) ON DELETE CASCADE,
  unit_id         uuid NOT NULL REFERENCES units(id) ON DELETE CASCADE,
  amount_paid     numeric NOT NULL,
  payment_date    date NOT NULL,
  payment_ref     text,
  recorded_by     uuid REFERENCES residents(id) ON DELETE SET NULL,
  created_at      timestamptz DEFAULT now()
);

-- Facility services (master list)
CREATE TABLE facility_services (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name          text NOT NULL,
  frequency     text,
  description   text,
  is_active     boolean DEFAULT true,
  created_at    timestamptz DEFAULT now()
);

-- Facility logs (monthly checklist)
CREATE TABLE facility_logs (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id      uuid NOT NULL REFERENCES facility_services(id) ON DELETE CASCADE,
  period_month    date NOT NULL,
  status          text NOT NULL CHECK (status IN ('done', 'partial', 'missed')),
  notes           text,
  logged_by       uuid REFERENCES residents(id) ON DELETE SET NULL,
  created_at      timestamptz DEFAULT now(),
  UNIQUE(service_id, period_month)
);

-- Notices
CREATE TABLE notices (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title         text NOT NULL,
  body          text NOT NULL,
  posted_by     uuid REFERENCES residents(id) ON DELETE SET NULL,
  created_at    timestamptz DEFAULT now()
);

-- Indexes
CREATE INDEX idx_service_charge_payments_period_id ON service_charge_payments(period_id);
CREATE INDEX idx_service_charge_payments_unit_id ON service_charge_payments(unit_id);
CREATE INDEX idx_facility_logs_service_id ON facility_logs(service_id);
CREATE INDEX idx_facility_logs_period_month ON facility_logs(period_month);
CREATE INDEX idx_notices_created_at ON notices(created_at DESC);

-- Enable RLS
ALTER TABLE service_charge_periods ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_charge_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE facility_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE facility_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE notices ENABLE ROW LEVEL SECURITY;

-- SERVICE_CHARGE_PERIODS: committee full access; residents read all (for display)
CREATE POLICY "committee_full_service_charge_periods"
  ON service_charge_periods FOR ALL
  USING (is_committee())
  WITH CHECK (is_committee());

CREATE POLICY "resident_read_service_charge_periods"
  ON service_charge_periods FOR SELECT
  USING (true);

-- SERVICE_CHARGE_PAYMENTS: committee read all; residents read own; treasurer/secretary insert
CREATE POLICY "committee_read_service_charge_payments"
  ON service_charge_payments FOR SELECT
  USING (is_committee());

CREATE POLICY "resident_read_own_service_charge_payments"
  ON service_charge_payments FOR SELECT
  USING (unit_id = my_unit_id());

CREATE POLICY "treasurer_secretary_insert_service_charge_payments"
  ON service_charge_payments FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM residents
      WHERE id = auth.uid()
      AND role IN ('treasurer', 'secretary')
    )
  );

-- FACILITY_SERVICES: committee full access; residents read all
CREATE POLICY "committee_full_facility_services"
  ON facility_services FOR ALL
  USING (is_committee())
  WITH CHECK (is_committee());

CREATE POLICY "resident_read_facility_services"
  ON facility_services FOR SELECT
  USING (true);

-- FACILITY_LOGS: committee full access; residents read all
CREATE POLICY "committee_full_facility_logs"
  ON facility_logs FOR ALL
  USING (is_committee())
  WITH CHECK (is_committee());

CREATE POLICY "resident_read_facility_logs"
  ON facility_logs FOR SELECT
  USING (true);

-- NOTICES: committee full access; residents read all
CREATE POLICY "committee_full_notices"
  ON notices FOR ALL
  USING (is_committee())
  WITH CHECK (is_committee());

CREATE POLICY "resident_read_notices"
  ON notices FOR SELECT
  USING (true);
