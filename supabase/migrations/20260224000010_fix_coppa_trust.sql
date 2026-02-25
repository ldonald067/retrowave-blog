-- Fix COPPA bypass: handle_new_user must not trust age_verified from metadata.
--
-- Previous versions read (NEW.raw_user_meta_data->>'age_verified')::boolean,
-- which allowed any client-supplied signup data to bypass the age gate by
-- simply setting age_verified=true in the metadata payload.
--
-- Fix: derive age_verified from birth_year arithmetic (same logic as
-- set_age_verification RPC). Users who supply no birth_year get false.
-- The set_age_verification RPC remains the only legitimate path to set
-- age_verified=true after signup.

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
    COALESCE((NEW.raw_user_meta_data->>'tos_accepted')::boolean, false)
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
