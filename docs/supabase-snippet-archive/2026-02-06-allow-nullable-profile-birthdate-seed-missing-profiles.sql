-- ARCHIVED Supabase dashboard SQL snippet
-- Name:    Allow Nullable Profile Birthdate & Seed Missing Profiles
-- Saved:   2026-02-06
-- Snippet: 3c9ef827-5f3a-4dea-9cac-46e63ea67ae5
--
-- Archived from the Supabase SQL Editor on 2026-07-29. For months this project
-- applied schema changes by pasting into the dashboard (CLI db push is blocked),
-- so these snippets are the primary record of some production state. Kept here
-- so that record survives independently of the dashboard.
--
-- NOT a migration. Nothing here runs automatically. Do not add to
-- supabase/migrations/ without reviewing against current prod state.

-- Make birthdate nullable
ALTER TABLE public.profiles ALTER COLUMN birthdate DROP NOT NULL;

-- Create missing profile
INSERT INTO public.profiles (id, username, display_name, age_verified, tos_accepted)
SELECT
  u.id,
  COALESCE(u.raw_user_meta_data->>'username', split_part(u.email, '@', 1)),
  COALESCE(u.raw_user_meta_data->>'display_name', split_part(u.email, '@', 1)),
  true,
  true
FROM auth.users u
LEFT JOIN public.profiles p ON u.id = p.id
WHERE p.id IS NULL;
