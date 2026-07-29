-- ARCHIVED Supabase dashboard SQL snippet
-- Name:    Ensure User Profiles Exist
-- Saved:   2026-02-06
-- Snippet: 1a918e9f-30ad-4736-9aa6-3b1dbcda292c
--
-- Archived from the Supabase SQL Editor on 2026-07-29. For months this project
-- applied schema changes by pasting into the dashboard (CLI db push is blocked),
-- so these snippets are the primary record of some production state. Kept here
-- so that record survives independently of the dashboard.
--
-- NOT a migration. Nothing here runs automatically. Do not add to
-- supabase/migrations/ without reviewing against current prod state.

-- Fix missing profiles for existing users
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

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

INSERT INTO public.profiles (id, username, display_name, age_verified, tos_accepted)
SELECT
  u.id,
  COALESCE(u.raw_user_meta_data->>'username', split_part(u.email, '@', 1)) AS username,
  COALESCE(u.raw_user_meta_data->>'display_name', split_part(u.email, '@', 1)) AS display_name,
  COALESCE((u.raw_user_meta_data->>'age_verified')::boolean, true) AS age_verified,
  COALESCE((u.raw_user_meta_data->>'tos_accepted')::boolean, true) AS tos_accepted
FROM auth.users u
LEFT JOIN public.profiles p ON u.id = p.id
WHERE p.id IS NULL;

NOTIFY pgrst, 'reload schema';
