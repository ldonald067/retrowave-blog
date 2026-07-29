-- ARCHIVED Supabase dashboard SQL snippet
-- Name:    pgrst schema reload notification
-- Saved:   2026-02-06
-- Snippet: 23eab3d9-175a-4e13-8e06-a9e16cafedb4
--
-- Archived from the Supabase SQL Editor on 2026-07-29. For months this project
-- applied schema changes by pasting into the dashboard (CLI db push is blocked),
-- so these snippets are the primary record of some production state. Kept here
-- so that record survives independently of the dashboard.
--
-- NOT a migration. Nothing here runs automatically. Do not add to
-- supabase/migrations/ without reviewing against current prod state.

NOTIFY pgrst, 'reload schema';
