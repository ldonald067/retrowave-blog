-- Fix missing profiles for existing users
-- This creates profiles for any users in auth.users that don't have a profile yet

-- First, ensure the handle_new_user function is up to date
-- Now includes 'username' column which has NOT NULL constraint
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, username, display_name, age_verified, tos_accepted, birth_year)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)),
    COALESCE((NEW.raw_user_meta_data->>'age_verified')::boolean, false),
    COALESCE((NEW.raw_user_meta_data->>'tos_accepted')::boolean, false),
    COALESCE((NEW.raw_user_meta_data->>'birth_year')::integer, NULL)
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate the trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create missing profiles for existing users
-- Uses email local-part as username if not set in metadata
INSERT INTO public.profiles (id, username, display_name, age_verified, tos_accepted)
SELECT
  u.id,
  COALESCE(u.raw_user_meta_data->>'username', split_part(u.email, '@', 1)) AS username,
  COALESCE(u.raw_user_meta_data->>'display_name', split_part(u.email, '@', 1)) AS display_name,
  -- H2 FIX: Default to false, not true. Users without metadata have not
  -- completed verification and must go through the age gate on next login.
  COALESCE((u.raw_user_meta_data->>'age_verified')::boolean, false) AS age_verified,
  COALESCE((u.raw_user_meta_data->>'tos_accepted')::boolean, false) AS tos_accepted
FROM auth.users u
LEFT JOIN public.profiles p ON u.id = p.id
WHERE p.id IS NULL
-- L9 FIX: Prevent 23505 if the on_auth_user_created trigger fires
-- during migration execution and inserts the profile first.
ON CONFLICT (id) DO NOTHING;

-- Notify PostgREST to reload schema
NOTIFY pgrst, 'reload schema';
