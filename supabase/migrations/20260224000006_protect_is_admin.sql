-- L6 FIX: Prevent users from self-elevating to admin via the PostgREST API.
--
-- The profiles table has an is_admin column but no code checks it and
-- the UPDATE RLS policy doesn't exclude it. A user could call:
--   supabase.from('profiles').update({ is_admin: true }).eq('id', userId)
-- and it would succeed.
--
-- This trigger silently preserves the old is_admin value on any UPDATE
-- coming through PostgREST (authenticated role). Admin changes must go
-- through a SECURITY DEFINER function or direct DB access.

CREATE OR REPLACE FUNCTION public.protect_is_admin()
RETURNS trigger AS $$
BEGIN
  IF NEW.is_admin IS DISTINCT FROM OLD.is_admin THEN
    NEW.is_admin := OLD.is_admin;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS protect_is_admin_on_update ON public.profiles;
CREATE TRIGGER protect_is_admin_on_update
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.protect_is_admin();

NOTIFY pgrst, 'reload schema';
