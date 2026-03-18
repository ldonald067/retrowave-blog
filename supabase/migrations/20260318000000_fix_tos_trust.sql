-- Fix COPPA bypass: handle_new_user must not trust tos_accepted from metadata.
--
-- Same pattern as the age_verified fix in 20260224000010: a client could set
-- tos_accepted=true in the signup metadata to skip the ToS acceptance flow.
-- The set_age_verification() RPC is the only legitimate path to set both
-- age_verified and tos_accepted after signup.
--
-- Fix: always default tos_accepted to false. The age verification flow
-- (set_age_verification RPC) sets it atomically with age_verified.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (
    id,
    username,
    display_name,
    birth_year,
    age_verified,
    tos_accepted
  )
  VALUES (
    NEW.id,
    COALESCE(
      NEW.raw_user_meta_data->>'username',
      NULLIF(split_part(COALESCE(NEW.email, ''), '@', 1), ''),
      'user_' || substring(NEW.id::text, 1, 8)
    ),
    COALESCE(
      NEW.raw_user_meta_data->>'display_name',
      NULLIF(split_part(COALESCE(NEW.email, ''), '@', 1), ''),
      'user_' || substring(NEW.id::text, 1, 8)
    ),
    COALESCE((NEW.raw_user_meta_data->>'birth_year')::integer, NULL),
    -- SECURITY: Do NOT trust age_verified from metadata. Derive from birth_year.
    CASE
      WHEN (NEW.raw_user_meta_data->>'birth_year') IS NOT NULL
        AND (EXTRACT(YEAR FROM CURRENT_DATE) - (NEW.raw_user_meta_data->>'birth_year')::integer) >= 13
      THEN true
      ELSE false
    END,
    -- SECURITY: Do NOT trust tos_accepted from metadata. Always default false.
    -- The set_age_verification() RPC is the only legitimate path to set this.
    false
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

NOTIFY pgrst, 'reload schema';
