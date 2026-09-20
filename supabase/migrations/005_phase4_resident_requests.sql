-- Phase 4: Resident requests + facility_manager role

-- Extend resident roles
ALTER TABLE residents DROP CONSTRAINT IF EXISTS residents_role_check;
ALTER TABLE residents ADD CONSTRAINT residents_role_check
  CHECK (role IN ('resident', 'treasurer', 'secretary', 'chairman', 'facility_manager'));

CREATE TABLE resident_requests (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by      uuid NOT NULL REFERENCES residents(id) ON DELETE CASCADE,
  unit_id         uuid NOT NULL REFERENCES units(id) ON DELETE CASCADE,
  title           text NOT NULL,
  body            text NOT NULL,
  status          text NOT NULL DEFAULT 'open'
    CHECK (status IN ('open', 'in_progress', 'closed')),
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_resident_requests_created_by ON resident_requests(created_by);
CREATE INDEX idx_resident_requests_unit_id ON resident_requests(unit_id);
CREATE INDEX idx_resident_requests_status ON resident_requests(status);
CREATE INDEX idx_resident_requests_created_at ON resident_requests(created_at DESC);

ALTER TABLE resident_requests ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION is_facility_manager()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM residents
    WHERE id = auth.uid()
    AND role = 'facility_manager'
  );
$$;

CREATE OR REPLACE FUNCTION get_facility_manager_emails()
RETURNS SETOF text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT u.email::text
  FROM residents r
  JOIN auth.users u ON u.id = r.id
  WHERE r.role = 'facility_manager'
    AND u.email IS NOT NULL
    AND length(trim(u.email)) > 0;
END;
$$;

REVOKE ALL ON FUNCTION get_facility_manager_emails() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION get_facility_manager_emails() TO authenticated;

-- INSERT: committee + residents with a unit (not facility_manager filing)
CREATE POLICY "residents_insert_requests"
  ON resident_requests FOR INSERT
  WITH CHECK (
    created_by = auth.uid()
    AND unit_id = (SELECT unit_id FROM residents WHERE id = auth.uid())
    AND EXISTS (
      SELECT 1 FROM residents r
      WHERE r.id = auth.uid()
        AND r.role IN ('resident', 'treasurer', 'secretary', 'chairman')
        AND r.unit_id IS NOT NULL
    )
  );

-- SELECT: author, committee, or facility manager
CREATE POLICY "read_own_or_staff_requests"
  ON resident_requests FOR SELECT
  USING (
    created_by = auth.uid()
    OR is_committee()
    OR is_facility_manager()
  );

-- UPDATE: committee or FM only
CREATE POLICY "committee_fm_update_requests"
  ON resident_requests FOR UPDATE
  USING (is_committee() OR is_facility_manager())
  WITH CHECK (is_committee() OR is_facility_manager());
