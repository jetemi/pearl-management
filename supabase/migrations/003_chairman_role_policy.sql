-- Restrict residents UPDATE to chairman only (role changes, unit reassignment)
-- Treasurer/secretary can still INSERT (link new residents)

DROP POLICY IF EXISTS "committee_update_residents" ON residents;

CREATE POLICY "chairman_update_residents"
  ON residents FOR UPDATE
  USING (
    (SELECT role FROM residents WHERE id = auth.uid()) = 'chairman'
  )
  WITH CHECK (
    (SELECT role FROM residents WHERE id = auth.uid()) = 'chairman'
  );
