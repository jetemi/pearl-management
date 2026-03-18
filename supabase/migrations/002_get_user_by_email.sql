-- RPC to get auth user id by email (for linking residents when adding units)
-- Only committee can use this; returns NULL for non-committee callers

CREATE OR REPLACE FUNCTION get_auth_user_id_by_email(user_email text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_id uuid;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM residents
    WHERE id = auth.uid()
    AND role IN ('treasurer', 'secretary', 'chairman')
  ) THEN
    RETURN NULL;
  END IF;
  SELECT id FROM auth.users WHERE email = lower(trim(user_email)) LIMIT 1 INTO user_id;
  RETURN user_id;
END;
$$;
