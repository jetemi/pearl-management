-- Optional contact phone on residents (used for facility_manager WhatsApp; falls back to unit phone)

ALTER TABLE residents ADD COLUMN IF NOT EXISTS phone text;

CREATE OR REPLACE FUNCTION get_facility_manager_phones()
RETURNS SETOF text
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT DISTINCT digits
  FROM (
    SELECT regexp_replace(
      COALESCE(
        NULLIF(trim(r.phone), ''),
        NULLIF(trim(u.phone), '')
      ),
      '[^0-9]',
      '',
      'g'
    ) AS digits
    FROM residents r
    LEFT JOIN units u ON u.id = r.unit_id
    WHERE r.role = 'facility_manager'
  ) sub
  WHERE length(digits) >= 8;
$$;

REVOKE ALL ON FUNCTION get_facility_manager_phones() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION get_facility_manager_phones() TO authenticated;
