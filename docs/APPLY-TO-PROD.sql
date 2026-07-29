-- ============================================================================
-- APPLY TO PRODUCTION — paste this whole file into the Supabase SQL Editor.
--
-- Ordered deliberately. Everything is idempotent (IF NOT EXISTS / OR REPLACE),
-- so re-running is safe.
--
--  1. status_message  — URGENT. This column is missing in prod, and the app
--                       sends it on every profile save, so PostgREST returns
--                       PGRST204 and PROFILE EDITING IS CURRENTLY BROKEN for
--                       every user: display name, bio, avatar, theme, mood,
--                       music and the public-page toggle all ride that payload.
--  2. capture         — records prod-only objects (birthdate, is_admin(), the
--                       admin bypass policies). No-op against current prod.
--  3. handle_new_user — restores username sanitization, resolves the UNIQUE
--                       collision, adds the 50-char cap.
--  4. chapter privacy — case/whitespace-insensitive private-chapter matching.
--
-- Step 3 must land before any full reconciliation, or catching prod up would
-- deploy the format CHECK together with the unsanitized function and break
-- signup for every dotted/plus email address.
-- ============================================================================


-- ─────────────────────────────────────────────────────────────────────
-- 20260501141057_add_profile_status_message.sql
-- ─────────────────────────────────────────────────────────────────────
-- Add an account-backed AIM-style status line for signed-in and public profile surfaces.
-- This replaces the previous device-local status behavior stored only in browser storage.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS status_message text DEFAULT NULL;

COMMENT ON COLUMN public.profiles.status_message IS
  'Short status shown in the signed-in header/sidebar and on public profile pages.';

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_status_message_length;
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_status_message_length
  CHECK (status_message IS NULL OR char_length(status_message) <= 100);

CREATE OR REPLACE FUNCTION public.get_public_profile(
  p_username text
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_profile_id uuid;
  v_private_chapters text[];
  v_result jsonb;
BEGIN
  SELECT id, private_chapters INTO v_profile_id, v_private_chapters
  FROM public.profiles
  WHERE username = p_username
    AND is_public = true;

  IF v_profile_id IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT jsonb_build_object(
    'profile', jsonb_build_object(
      'username', pr.username,
      'display_name', pr.display_name,
      'bio', pr.bio,
      'avatar_url', pr.avatar_url,
      'theme', pr.theme,
      'current_mood', pr.current_mood,
      'current_music', pr.current_music,
      'status_message', pr.status_message,
      'created_at', pr.created_at
    ),
    'posts', COALESCE((
      SELECT jsonb_agg(post_row ORDER BY post_row->>'created_at' DESC)
      FROM (
        SELECT jsonb_build_object(
          'id', p.id,
          'title', p.title,
          'content', LEFT(p.content, 500),
          'author', p.author,
          'chapter', p.chapter,
          'mood', p.mood,
          'music', p.music,
          'is_private', p.is_private,
          'created_at', p.created_at,
          'content_truncated', (char_length(p.content) > 500)
        ) AS post_row
        FROM public.posts p
        WHERE p.user_id = v_profile_id
          AND p.is_private = false
          AND (p.chapter IS NULL OR NOT (p.chapter = ANY(v_private_chapters)))
        ORDER BY p.created_at DESC
        LIMIT 50
      ) sub
    ), '[]'::jsonb)
  ) INTO v_result
  FROM public.profiles pr
  WHERE pr.id = v_profile_id;

  RETURN v_result;
END;
$$;

NOTIFY pgrst, 'reload schema';


-- ─────────────────────────────────────────────────────────────────────
-- 20260729010000_capture_undocumented_prod_state.sql
-- ─────────────────────────────────────────────────────────────────────
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


-- ─────────────────────────────────────────────────────────────────────
-- 20260729020000_fix_handle_new_user_username.sql
-- ─────────────────────────────────────────────────────────────────────
-- Fix three latent signup-breaking defects in handle_new_user().
--
-- ⚠️ THIS MUST BE APPLIED BEFORE ANY MIGRATION RECONCILIATION / db push.
--
-- Today production is accidentally safe: the live function is the 20260224000010
-- version (unsanitized), and profiles_username_format was never deployed, so a
-- dotted username simply passes the length check. Catching prod up to the repo
-- WITHOUT this migration would deploy 20260315000002 (the format CHECK) together
-- with 20260318000000 (which silently reverted the sanitizer three days after it
-- was added) — and signup would immediately start failing in production.
--
-- Defect 1 — LOST SANITIZATION (critical)
--   20260315000003 added regexp_replace(..., '[^a-zA-Z0-9_-]', '_', 'g') so the
--   generated username satisfies profiles_username_format (20260315000002).
--   20260318000000 then did a blanket CREATE OR REPLACE to harden tos_accepted
--   and dropped the sanitizer along with it. src/lib/auth-actions.ts sends only
--   { birth_year, tos_accepted } and never a username, so EVERY signup falls
--   through to split_part(email,'@',1). `jane.doe@gmail.com` -> `jane.doe` ->
--   violates the CHECK -> 23514 inside the AFTER INSERT trigger -> the
--   auth.users insert rolls back -> GoTrue returns 500 and the user sees a
--   generic "Something went wrong."
--
-- Defect 2 — UNIQUE COLLISION (high)
--   profiles_username_unique (20260225000006) is still in force, but the insert
--   ends with ON CONFLICT (id) DO NOTHING. A specified conflict target arbitrates
--   ONLY that index, so a username collision raises 23505 instead of being
--   swallowed. `jane@gmail.com` signing up therefore permanently blocks
--   `jane@outlook.com` — with no username picker anywhere in the UI, the second
--   user has no way to recover.
--
-- Defect 3 — NO LENGTH CAP (medium)
--   profiles_username_length / profiles_display_name_length cap both at 50, but
--   nothing truncates. An email local part longer than 50 characters aborts
--   signup the same way.
--
-- Keeps the security hardening from the versions it supersedes: age_verified is
-- still DERIVED from birth_year (never trusted from metadata, 20260224000010),
-- and tos_accepted is still forced to false (20260318000000) so the
-- set_age_verification() RPC remains the only path that can set it.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_email_local  text;
  v_fallback     text;
  v_base         text;
  v_username     text;
  v_display      text;
  v_suffix       text;
BEGIN
  v_email_local := NULLIF(split_part(COALESCE(NEW.email, ''), '@', 1), '');
  v_fallback    := 'user_' || substring(NEW.id::text, 1, 8);

  -- Sanitize to the profiles_username_format charset, then cap at 41 so a
  -- 9-char uniqueness suffix ('_' + 8 hex) still fits inside the 50-char limit.
  v_base := left(
    regexp_replace(
      COALESCE(NEW.raw_user_meta_data->>'username', v_email_local, v_fallback),
      '[^a-zA-Z0-9_-]', '_', 'g'
    ),
    41
  );

  -- regexp_replace can yield an empty string (e.g. a local part of only dots),
  -- which would violate the >= 1 length CHECK.
  IF v_base IS NULL OR v_base = '' THEN
    v_base := v_fallback;
  END IF;

  -- Resolve collisions deterministically rather than raising 23505. The uuid
  -- suffix makes a second collision effectively impossible; the loop is a
  -- belt-and-braces guard rather than a real expectation.
  v_username := v_base;
  IF EXISTS (SELECT 1 FROM public.profiles WHERE username = v_username) THEN
    v_suffix   := '_' || substring(NEW.id::text, 1, 8);
    v_username := left(v_base, 41) || v_suffix;

    WHILE EXISTS (SELECT 1 FROM public.profiles WHERE username = v_username) LOOP
      v_suffix   := '_' || substring(md5(random()::text || clock_timestamp()::text), 1, 8);
      v_username := left(v_base, 41) || v_suffix;
    END LOOP;
  END IF;

  -- Display name is free-form (no charset CHECK) but still length-capped.
  v_display := left(
    COALESCE(NEW.raw_user_meta_data->>'display_name', v_email_local, v_fallback),
    50
  );

  INSERT INTO public.profiles (
    id, username, display_name, birth_year, age_verified, tos_accepted
  )
  VALUES (
    NEW.id,
    v_username,
    v_display,
    COALESCE((NEW.raw_user_meta_data->>'birth_year')::integer, NULL),
    -- SECURITY: never trust age_verified from metadata; derive it.
    CASE
      WHEN (NEW.raw_user_meta_data->>'birth_year') IS NOT NULL
        AND (EXTRACT(YEAR FROM CURRENT_DATE) - (NEW.raw_user_meta_data->>'birth_year')::integer) >= 13
      THEN true
      ELSE false
    END,
    -- SECURITY: never trust tos_accepted from metadata. set_age_verification()
    -- is the only legitimate path that may set it.
    false
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

NOTIFY pgrst, 'reload schema';


-- ─────────────────────────────────────────────────────────────────────
-- 20260729030000_chapter_privacy_normalized_match.sql
-- ─────────────────────────────────────────────────────────────────────
-- Close a private-chapter exposure caused by exact string matching.
--
-- private_chapters is a text[] of chapter NAMES, and get_public_profile hid an
-- entry only when its chapter matched one of them exactly:
--
--     AND (p.chapter IS NULL OR NOT (p.chapter = ANY(v_private_chapters)))
--
-- Chapters are free text typed per entry — there is no chapter table and no
-- rename operation, so "renaming a chapter" means retyping the string on each
-- entry. That makes near-miss spellings routine, and every near miss silently
-- publishes:
--
--   Owner marks chapter "Therapy" private and has a PUBLIC entry inside it (the
--   chapter rule is what was hiding it). They later edit that entry and type
--   "therapy" — same chapter as far as any human is concerned. The string no
--   longer matches, so the entry appears on their public page immediately, with
--   no warning and nothing in the UI to indicate it happened.
--
-- Fix: compare case-insensitively and ignoring surrounding whitespace, so
-- "Therapy", "therapy" and " Therapy " are one chapter for privacy purposes.
-- This matches how a user thinks about chapter names.
--
-- Deliberately NOT changed: moving an entry to a genuinely different chapter
-- ("Therapy" -> "Therapy 2026") still publishes it. That is a real content move
-- and the entry's own is_private flag is the control for it — silently forcing
-- such entries private would be its own surprise. The UI should warn on that
-- transition instead.
--
-- Everything else in this function is carried over verbatim from
-- 20260501141057_add_profile_status_message.sql, which is the definition this
-- supersedes.

CREATE OR REPLACE FUNCTION public.get_public_profile(
  p_username text
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_profile_id uuid;
  v_private_chapters text[];
  v_result jsonb;
BEGIN
  SELECT id, private_chapters INTO v_profile_id, v_private_chapters
  FROM public.profiles
  WHERE username = p_username
    AND is_public = true;

  IF v_profile_id IS NULL THEN
    RETURN NULL;
  END IF;

  -- Normalize once so the per-row comparison below stays cheap.
  v_private_chapters := ARRAY(
    SELECT lower(btrim(c))
    FROM unnest(COALESCE(v_private_chapters, ARRAY[]::text[])) AS c
    WHERE btrim(c) <> ''
  );

  SELECT jsonb_build_object(
    'profile', jsonb_build_object(
      'username', pr.username,
      'display_name', pr.display_name,
      'bio', pr.bio,
      'avatar_url', pr.avatar_url,
      'theme', pr.theme,
      'current_mood', pr.current_mood,
      'current_music', pr.current_music,
      'status_message', pr.status_message,
      'created_at', pr.created_at
    ),
    'posts', COALESCE((
      SELECT jsonb_agg(post_row ORDER BY post_row->>'created_at' DESC)
      FROM (
        SELECT jsonb_build_object(
          'id', p.id,
          'title', p.title,
          'content', LEFT(p.content, 500),
          'author', p.author,
          'chapter', p.chapter,
          'mood', p.mood,
          'music', p.music,
          'is_private', p.is_private,
          'created_at', p.created_at,
          'content_truncated', (char_length(p.content) > 500)
        ) AS post_row
        FROM public.posts p
        WHERE p.user_id = v_profile_id
          AND p.is_private = false
          -- Normalized comparison: "Therapy", "therapy" and " Therapy " are the
          -- same chapter for privacy purposes.
          AND (
            p.chapter IS NULL
            OR btrim(p.chapter) = ''
            OR NOT (lower(btrim(p.chapter)) = ANY(v_private_chapters))
          )
        ORDER BY p.created_at DESC
        LIMIT 50
      ) sub
    ), '[]'::jsonb)
  ) INTO v_result
  FROM public.profiles pr
  WHERE pr.id = v_profile_id;

  RETURN v_result;
END;
$$;

NOTIFY pgrst, 'reload schema';

