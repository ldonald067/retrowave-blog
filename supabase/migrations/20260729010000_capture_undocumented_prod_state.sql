-- Capture production state that exists in the hosted database but was never
-- recorded in this migration history.
--
-- WHY THIS EXISTS
-- `supabase db push` has been blocked on this project (the hosted Postgres
-- refuses the CLI's login-role creation), so for months schema changes were
-- applied by pasting SQL into the dashboard SQL Editor. A 2026-07-29 audit of
-- those 21 saved snippets against all 38 migrations found live objects with no
-- migration behind them. Verified directly against prod via the Management API.
--
-- This migration is written to be a NO-OP against the current hosted database
-- (everything is IF NOT EXISTS / OR REPLACE / DROP-then-CREATE). Its purpose is
-- to make a fresh `db reset` or a clean environment match production, so the
-- pre-launch migration reconciliation does not silently drop these.
--
-- The originating snippets are archived at docs/supabase-snippet-archive/.

-- ── 1. profiles.birthdate ─────────────────────────────────────────────
--
-- Verified live: information_schema reports profiles.birthdate as `date`,
-- nullable, no default. It appears NOWHERE else in this repo — not in any
-- migration, not in src/types/database.ts, not in any doc.
--
-- Origin: 2026-02-06 snippet "Allow Nullable Profile Birthdate & Seed Missing
-- Profiles", which ran `ALTER TABLE profiles ALTER COLUMN birthdate DROP NOT
-- NULL` immediately after a backfill INSERT failed — i.e. the column was
-- already there and NOT NULL, from a schema predating the reconstructed
-- 002_create_profiles_and_likes.sql (whose own header notes it was
-- "reconstructed from TypeScript types").
--
-- The app does not read or write this column; age verification uses birth_year
-- (see 20260125000000_add_age_validation.sql). It is retained rather than
-- dropped because it may hold real data for early accounts, and dropping a
-- column with user data is not a decision a migration should make silently.
-- If it is confirmed empty and unwanted, drop it in a separate, deliberate
-- migration.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS birthdate date;

ALTER TABLE public.profiles
  ALTER COLUMN birthdate DROP NOT NULL;

COMMENT ON COLUMN public.profiles.birthdate IS
  'Legacy, unused by the app. Age verification uses birth_year. Predates the '
  'reconstructed migration history; captured 2026-07-29. Safe to drop only '
  'after confirming it holds no data worth keeping.';

-- ── 2. public.is_admin() ──────────────────────────────────────────────
--
-- Verified live in prod. Defined only in the 2026-01-24 snippet "Admin Role and
-- RLS Policies" — no migration ever creates it. (Do not confuse it with
-- public.protect_is_admin(), the trigger from 20260224000006/20260224000008
-- that freezes the is_admin column; that one IS in the repo.)
--
-- The live definition already carries SET search_path, so it is not the
-- unqualified-search-path hazard the original snippet created. This restates
-- the hardened form.

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
      AND is_admin = true
  );
END;
$$;

-- ── 3. Admin bypass on post UPDATE / DELETE ───────────────────────────
--
-- Verified live: pg_policies shows both carrying
--   ((SELECT auth.uid()) = user_id) OR is_admin()
--
-- Currently DORMANT — `SELECT count(*) FROM profiles WHERE is_admin` returns 0,
-- so no account can use the bypass. Captured because a reconciliation that
-- replayed only the repo would recreate these WITHOUT the admin clause
-- (001_create_posts.sql has the plain auth.uid() = user_id versions), silently
-- changing the security posture in one direction or the other.
--
-- Note there is deliberately NO admin bypass on SELECT: an is_admin() SELECT
-- policy caused infinite recursion and was removed — see the comment at
-- 20260315000000_personal_diary_feed.sql:144. Do not reintroduce one.

DROP POLICY IF EXISTS "Users can update own posts" ON public.posts;
CREATE POLICY "Users can update own posts"
  ON public.posts FOR UPDATE
  USING ((SELECT auth.uid()) = user_id OR public.is_admin());

DROP POLICY IF EXISTS "Users can delete own posts" ON public.posts;
CREATE POLICY "Users can delete own posts"
  ON public.posts FOR DELETE
  USING ((SELECT auth.uid()) = user_id OR public.is_admin());

-- ── Confirmed ABSENT from prod, deliberately not recreated ────────────
--
-- The 2026-01-24 snippet "Fix view security and enforce RLS for posts and
-- stats" created two views, public.posts_with_details and public.user_stats,
-- granting anon SELECT on the former. Both are GONE: pg_views is empty and
-- post_likes (which they depended on) was dropped by
-- 20260224000009_retire_likes_excerpt_feed.sql via CASCADE. Recording this so
-- the archived snippet is not mistaken for live state later.

NOTIFY pgrst, 'reload schema';
