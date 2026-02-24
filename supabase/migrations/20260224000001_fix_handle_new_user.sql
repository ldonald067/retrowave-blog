-- Fix C1: handle_new_user() trigger regression
--
-- Migration 20260125000000 overwrote the version from 005 and dropped the
-- 'username' column from the INSERT, causing NOT NULL violations on every
-- new user signup.  This migration restores the correct column list by
-- combining both versions:
--   - username      (from 005, required by NOT NULL constraint)
--   - display_name  (from both)
--   - birth_year    (from 20260125000000)
--   - age_verified  (from 20260125000000)
--   - tos_accepted  (from 20260125000000)

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
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)),
    COALESCE((NEW.raw_user_meta_data->>'birth_year')::integer, NULL),
    COALESCE((NEW.raw_user_meta_data->>'age_verified')::boolean, false),
    COALESCE((NEW.raw_user_meta_data->>'tos_accepted')::boolean, false)
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp;

-- Recreate the trigger to bind the updated function
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

NOTIFY pgrst, 'reload schema';
