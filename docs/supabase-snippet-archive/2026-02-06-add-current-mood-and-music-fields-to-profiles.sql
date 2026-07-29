-- ARCHIVED Supabase dashboard SQL snippet
-- Name:    Add current mood and music fields to profiles
-- Saved:   2026-02-06
-- Snippet: a8ef60a0-c809-4be3-8a3f-7ac55d383a03
--
-- Archived from the Supabase SQL Editor on 2026-07-29. For months this project
-- applied schema changes by pasting into the dashboard (CLI db push is blocked),
-- so these snippets are the primary record of some production state. Kept here
-- so that record survives independently of the dashboard.
--
-- NOT a migration. Nothing here runs automatically. Do not add to
-- supabase/migrations/ without reviewing against current prod state.

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS current_mood TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS current_music TEXT DEFAULT NULL;
