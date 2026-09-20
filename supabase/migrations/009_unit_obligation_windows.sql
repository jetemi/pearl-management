-- Per-unit obligation windows: service charge (date) and diesel (cycle number).

ALTER TABLE units
  ADD COLUMN IF NOT EXISTS service_charge_obligation_start date;

COMMENT ON COLUMN units.service_charge_obligation_start IS
  'If set, unit is liable only for service charge periods on/after this date. NULL = all periods (legacy).';

ALTER TABLE units
  ADD COLUMN IF NOT EXISTS diesel_obligation_from_cycle_number integer;

COMMENT ON COLUMN units.diesel_obligation_from_cycle_number IS
  'If set, diesel obligation applies only to cycles with cycle_number >= this value. NULL = all cycles (legacy).';
