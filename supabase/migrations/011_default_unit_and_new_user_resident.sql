-- Placeholder unit for new signups; trigger links new auth users to residents on Unit0.
-- Backfill for existing auth users without a residents row (optional):
--   INSERT INTO residents (id, unit_id, role)
--   SELECT u.id, (SELECT id FROM units WHERE flat_number = 'Unit0' LIMIT 1), 'resident'
--   FROM auth.users u
--   WHERE NOT EXISTS (SELECT 1 FROM residents r WHERE r.id = u.id);

INSERT INTO public.units (flat_number, owner_name, phone, email, diesel_participates)
SELECT 'Unit0', 'Unassigned', NULL, NULL, false
WHERE NOT EXISTS (SELECT 1 FROM public.units WHERE flat_number = 'Unit0');

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  default_unit uuid;
BEGIN
  SELECT id INTO default_unit FROM public.units WHERE flat_number = 'Unit0' LIMIT 1;
  IF default_unit IS NULL THEN
    RAISE WARNING 'Unit0 not found; skipping residents row for user %', NEW.id;
    RETURN NEW;
  END IF;

  INSERT INTO public.residents (id, unit_id, role)
  VALUES (NEW.id, default_unit, 'resident')
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE PROCEDURE public.handle_new_user();

-- Chairman-only directory: joins auth.users for signup email (not exposed via PostgREST otherwise).
CREATE OR REPLACE FUNCTION public.get_residents_directory_for_chairman()
RETURNS TABLE (
  id uuid,
  unit_id uuid,
  role text,
  phone text,
  flat_number text,
  owner_name text,
  unit_phone text,
  auth_email text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.residents WHERE public.residents.id = auth.uid() AND public.residents.role = 'chairman'
  ) THEN
    RAISE EXCEPTION 'Only the chairman can list the resident directory'
      USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  SELECT
    r.id,
    r.unit_id,
    r.role::text,
    r.phone,
    u.flat_number::text,
    u.owner_name::text,
    u.phone::text AS unit_phone,
    au.email::text AS auth_email
  FROM public.residents r
  LEFT JOIN public.units u ON u.id = r.unit_id
  JOIN auth.users au ON au.id = r.id;
END;
$$;

REVOKE ALL ON FUNCTION public.get_residents_directory_for_chairman() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_residents_directory_for_chairman() TO authenticated;
