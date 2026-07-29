-- ARCHIVED Supabase dashboard SQL snippet
-- Name:    Insert Missing User Profiles
-- Saved:   2026-02-06
-- Snippet: c05375b9-2191-41f5-9470-9f7fb214d3cc
--
-- Archived from the Supabase SQL Editor on 2026-07-29. For months this project
-- applied schema changes by pasting into the dashboard (CLI db push is blocked),
-- so these snippets are the primary record of some production state. Kept here
-- so that record survives independently of the dashboard.
--
-- NOT a migration. Nothing here runs automatically. Do not add to
-- supabase/migrations/ without reviewing against current prod state.

-- Just create the missing profile for your existing user
INSERT INTO public.profiles (id, username, display_name, age_verified, tos_accepted)
SELECT
  u.id,
  COALESCE(u.raw_user_meta_data->>'username', split_part(u.email, '@', 1)) AS username,
  COALESCE(u.raw_user_meta_data->>'display_name', split_part(u.email, '@', 1)) AS display_name,
  true AS age_verified,
  true AS tos_accepted
FROM auth.users u
LEFT JOIN public.profiles p ON u.id = p.id
WHERE p.id IS NULL;
