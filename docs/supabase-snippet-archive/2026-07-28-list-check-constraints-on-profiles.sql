-- ARCHIVED Supabase dashboard SQL snippet
-- Name:    List Check Constraints on Profiles
-- Saved:   2026-07-28
-- Snippet: 15e7069e-c4d5-4b41-ac0f-d3f06ede4770
--
-- Archived from the Supabase SQL Editor on 2026-07-29. For months this project
-- applied schema changes by pasting into the dashboard (CLI db push is blocked),
-- so these snippets are the primary record of some production state. Kept here
-- so that record survives independently of the dashboard.
--
-- NOT a migration. Nothing here runs automatically. Do not add to
-- supabase/migrations/ without reviewing against current prod state.

SELECT conname, pg_get_constraintdef(oid) FROM pg_constraint WHERE conrelid='public.profiles'::regclass AND contype='c';
