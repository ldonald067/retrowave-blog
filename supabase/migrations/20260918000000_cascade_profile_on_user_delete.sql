-- Account deletion failed for every user (Apple Guideline 5.1.1).
--
-- delete_user_account() deletes the auth.users row and relies on cascades to
-- clear everything else — 20260225000003 says "All foreign keys already use
-- ON DELETE CASCADE". In production that was untrue for the one that matters:
-- profiles_id_fkey (profiles.id -> auth.users.id) was NO ACTION, although
-- 002_create_profiles_and_likes.sql declares it ON DELETE CASCADE. Every user
-- has a profile, so every deletion raised 23503 and rolled back; the app
-- showed "This action references a record that does not exist." Found
-- 2026-09-18 by deleting a test account on the iPhone SE simulator. Deleting a
-- user from the Supabase dashboard hit the same wall.
--
-- Every other foreign key onto auth.users or profiles already cascades (posts,
-- post_reactions, user_blocks both ways, content_reports.reported_user_id) or
-- deliberately sets null (content_reports.reporter_id, so a report outlives
-- its reporter). profiles has no delete triggers.
--
-- Re-adding the constraint validates every existing row; with the NO ACTION
-- constraint in place there can be no orphaned profiles, so it cannot fail.
-- One ALTER TABLE with both actions is atomic, so the table is never left
-- without the constraint.
--
-- Applied to prod 2026-09-18 through the Management API, with approval.

ALTER TABLE public.profiles
  DROP CONSTRAINT profiles_id_fkey,
  ADD CONSTRAINT profiles_id_fkey
    FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;

NOTIFY pgrst, 'reload schema';

-- Verify:
-- select confdeltype from pg_constraint where conname = 'profiles_id_fkey';
--   -> 'c' (cascade)
