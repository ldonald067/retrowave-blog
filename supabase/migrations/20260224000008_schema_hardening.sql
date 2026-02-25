-- Backend hardening: multiple fixes in one migration.
--
-- H1: Fix handle_new_user for NULL email (anonymous signups)
-- H2: Add avatar_url length + URL scheme constraint
-- H4: Drop dead tos_accepted_at column
-- L1: Add SET search_path to protect_is_admin
-- L3: Add username minimum length CHECK

-- ── H1 FIX: handle_new_user NULL email fallback ──────────────────────────
-- split_part(NULL, '@', 1) returns NULL in PostgreSQL.
-- COALESCE(NULL, NULL) = NULL → NOT NULL violation on username.
-- Fix: Add a UUID-derived fallback for email-less users (anonymous auth).

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (
    id,
    username,
    display_name,
    birth_year,
    age_verified,
    tos_accepted
  )
  VALUES (
    NEW.id,
    COALESCE(
      NEW.raw_user_meta_data->>'username',
      NULLIF(split_part(COALESCE(NEW.email, ''), '@', 1), ''),
      'user_' || substring(NEW.id::text, 1, 8)
    ),
    COALESCE(
      NEW.raw_user_meta_data->>'display_name',
      NULLIF(split_part(COALESCE(NEW.email, ''), '@', 1), ''),
      'user_' || substring(NEW.id::text, 1, 8)
    ),
    COALESCE((NEW.raw_user_meta_data->>'birth_year')::integer, NULL),
    COALESCE((NEW.raw_user_meta_data->>'age_verified')::boolean, false),
    COALESCE((NEW.raw_user_meta_data->>'tos_accepted')::boolean, false)
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp;

-- Recreate trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- ── H2 FIX: avatar_url constraint ───────────────────────────────────────
-- Prevent arbitrary strings, javascript: URIs, or unbounded lengths.

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_avatar_url_check;
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_avatar_url_check
  CHECK (
    avatar_url IS NULL
    OR (
      char_length(avatar_url) <= 500
      AND (avatar_url LIKE 'http://%' OR avatar_url LIKE 'https://%')
    )
  );


-- ── H4 FIX: Drop dead tos_accepted_at column ────────────────────────────
-- This column was never populated by any trigger, migration, or frontend
-- code. Removing it eliminates confusion about what data is collected.

ALTER TABLE public.profiles
  DROP COLUMN IF EXISTS tos_accepted_at;


-- ── L1 FIX: Add SET search_path to protect_is_admin ─────────────────────
-- Inconsistent with all other functions. Low risk but important for
-- code consistency and defense-in-depth.

CREATE OR REPLACE FUNCTION public.protect_is_admin()
RETURNS trigger AS $$
BEGIN
  IF NEW.is_admin IS DISTINCT FROM OLD.is_admin THEN
    NEW.is_admin := OLD.is_admin;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql
SET search_path = public, pg_temp;


-- ── L3 FIX: Username minimum length ─────────────────────────────────────
-- Empty string is storable via direct API. Add min length check.

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_username_length;
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_username_length
  CHECK (username IS NULL OR (char_length(username) >= 1 AND char_length(username) <= 50));


NOTIFY pgrst, 'reload schema';
