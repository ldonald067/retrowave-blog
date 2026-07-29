-- ARCHIVED Supabase dashboard SQL snippet
-- Name:    Profile lookup by UUID
-- Saved:   2026-02-06
-- Snippet: e07a0701-a3d5-4d5f-9f62-8027d1b55397
--
-- Archived from the Supabase SQL Editor on 2026-07-29. For months this project
-- applied schema changes by pasting into the dashboard (CLI db push is blocked),
-- so these snippets are the primary record of some production state. Kept here
-- so that record survives independently of the dashboard.
--
-- NOT a migration. Nothing here runs automatically. Do not add to
-- supabase/migrations/ without reviewing against current prod state.

-- Check if there are any issues with the profiles table
SELECT * FROM profiles WHERE id = '9e7cba8d-bb9e-401c-969f-b2a7dc51dca6';
