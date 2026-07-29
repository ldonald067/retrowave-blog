-- ARCHIVED Supabase dashboard SQL snippet
-- Name:    Retrieve Function Definition
-- Saved:   2026-07-28
-- Snippet: cfc547b1-e318-4946-9825-c42f2c543176
--
-- Archived from the Supabase SQL Editor on 2026-07-29. For months this project
-- applied schema changes by pasting into the dashboard (CLI db push is blocked),
-- so these snippets are the primary record of some production state. Kept here
-- so that record survives independently of the dashboard.
--
-- NOT a migration. Nothing here runs automatically. Do not add to
-- supabase/migrations/ without reviewing against current prod state.

SELECT pg_get_functiondef('public.handle_new_user'::regproc);
