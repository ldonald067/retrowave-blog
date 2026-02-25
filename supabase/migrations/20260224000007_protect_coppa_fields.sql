-- C2 FIX: Prevent users from self-setting age_verified, tos_accepted,
-- or birth_year via the PostgREST API.
--
-- The UPDATE RLS policy on profiles allows users to update their own row,
-- but doesn't restrict which columns they can change. Without this trigger,
-- any user could call:
--   supabase.from('profiles').update({ age_verified: true }).eq('id', userId)
-- and bypass the age verification flow entirely.
--
-- This is the same pattern as protect_is_admin (migration 006) — a BEFORE
-- UPDATE trigger that silently preserves the old values.
--
-- The legitimate update path (AgeVerification component → updateProfile())
-- also goes through PostgREST, so we need a SECURITY DEFINER function to
-- bypass this trigger when the update is legitimate. See
-- set_age_verification() below.

-- 1. Trigger function: silently preserve COPPA fields on direct API updates
CREATE OR REPLACE FUNCTION public.protect_coppa_fields()
RETURNS trigger AS $$
BEGIN
  -- Preserve age_verified, tos_accepted, and birth_year
  IF NEW.age_verified IS DISTINCT FROM OLD.age_verified THEN
    NEW.age_verified := OLD.age_verified;
  END IF;
  IF NEW.tos_accepted IS DISTINCT FROM OLD.tos_accepted THEN
    NEW.tos_accepted := OLD.tos_accepted;
  END IF;
  IF NEW.birth_year IS DISTINCT FROM OLD.birth_year THEN
    NEW.birth_year := OLD.birth_year;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql
SET search_path = public, pg_temp;

DROP TRIGGER IF EXISTS protect_coppa_fields_on_update ON public.profiles;
CREATE TRIGGER protect_coppa_fields_on_update
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.protect_coppa_fields();

-- 2. SECURITY DEFINER function: the only legitimate way to set COPPA fields.
--    Called by the frontend AgeVerification component via supabase.rpc().
--    Validates the birth year and sets all three fields atomically.
CREATE OR REPLACE FUNCTION public.set_age_verification(
  p_birth_year integer,
  p_tos_accepted boolean
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id uuid;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Enforce COPPA age check
  IF p_birth_year IS NULL OR (EXTRACT(YEAR FROM CURRENT_DATE) - p_birth_year) < 13 THEN
    RAISE EXCEPTION 'Must be at least 13 years old';
  END IF;

  -- Direct UPDATE bypasses the protect_coppa_fields trigger because
  -- SECURITY DEFINER runs as the function owner (superuser), not as
  -- the authenticated role. The trigger still fires but the function
  -- owner has elevated privileges that make the update stick.
  -- Actually, triggers DO fire for SECURITY DEFINER functions.
  -- We need to temporarily disable the trigger or use a different approach.
  -- Instead, we'll use a session variable to signal the trigger to allow it.

  -- Set a session variable that the trigger checks
  PERFORM set_config('app.coppa_bypass', 'true', true);

  UPDATE public.profiles
  SET
    age_verified = true,
    tos_accepted = p_tos_accepted,
    birth_year = p_birth_year
  WHERE id = v_user_id;

  -- Clear the bypass flag
  PERFORM set_config('app.coppa_bypass', '', true);
END;
$$;

GRANT EXECUTE ON FUNCTION public.set_age_verification(integer, boolean)
  TO authenticated;

-- 3. Update the trigger to check for the bypass flag
CREATE OR REPLACE FUNCTION public.protect_coppa_fields()
RETURNS trigger AS $$
BEGIN
  -- Allow bypass from set_age_verification() SECURITY DEFINER function
  IF current_setting('app.coppa_bypass', true) = 'true' THEN
    RETURN NEW;
  END IF;

  -- Preserve age_verified, tos_accepted, and birth_year
  IF NEW.age_verified IS DISTINCT FROM OLD.age_verified THEN
    NEW.age_verified := OLD.age_verified;
  END IF;
  IF NEW.tos_accepted IS DISTINCT FROM OLD.tos_accepted THEN
    NEW.tos_accepted := OLD.tos_accepted;
  END IF;
  IF NEW.birth_year IS DISTINCT FROM OLD.birth_year THEN
    NEW.birth_year := OLD.birth_year;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql
SET search_path = public, pg_temp;

NOTIFY pgrst, 'reload schema';
