-- Chosen, lowercase usernames.
--
-- Until 2026-09-19 nobody chose a username: handle_new_user copied the email's
-- local part, and it showed as the @handle on every public page — half of the
-- person's email address, on a private-first journal. Sign-up and the profile
-- editor now ask for one (src/lib/validation.ts validateUsername: 3-30,
-- lowercase letters, digits, _ and -).
--
-- 1. is_username_available — for those forms, callable before sign-in. It
--    returns a boolean only, from a SECURITY DEFINER function, because profiles
--    RLS lets a user read only their own row. It does tell anyone whether a
--    username exists; that is inherent to a public handle.
-- 2. handle_new_user lowercases the name it stores. It already reads
--    raw_user_meta_data->>'username' (now sent by sign-up) and replaces
--    anything outside [a-zA-Z0-9_-]; without lower() a crafted uppercase name
--    would now violate the constraint below and fail the whole sign-up. An
--    empty metadata username now falls back to the email part (NULLIF) instead
--    of becoming ''. Everything else is unchanged from the live prod body.
-- 3. profiles_username_format becomes lowercase-only. Uniqueness and every
--    lookup (get_public_profile, block_user_by_username) are exact-match, so
--    'Glitter' and 'glitter' could otherwise be two people — a look-alike
--    impersonation route. All 6 usernames were lowercase when this was written.

CREATE OR REPLACE FUNCTION public.is_username_available(p_username text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT NOT EXISTS (
    SELECT 1 FROM public.profiles WHERE username = lower(btrim(p_username))
  );
$$;

REVOKE ALL ON FUNCTION public.is_username_available(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_username_available(text) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_email_local text;
  v_fallback    text;
  v_base        text;
  v_display     text;
  v_birth_year  integer := COALESCE((NEW.raw_user_meta_data->>'birth_year')::integer, NULL);
  v_age_ok      boolean;
BEGIN
  v_email_local := NULLIF(split_part(COALESCE(NEW.email, ''), '@', 1), '');
  v_fallback    := 'user_' || substring(NEW.id::text, 1, 8);

  -- lower(): usernames are lowercase-only (profiles_username_format).
  v_base := lower(left(
    regexp_replace(
      COALESCE(NULLIF(NEW.raw_user_meta_data->>'username', ''), v_email_local, v_fallback),
      '[^a-zA-Z0-9_-]', '_', 'g'
    ),
    41
  ));
  IF v_base IS NULL OR v_base = '' THEN
    v_base := v_fallback;
  END IF;

  v_display := left(COALESCE(NEW.raw_user_meta_data->>'display_name', v_email_local, v_fallback), 50);

  v_age_ok := v_birth_year IS NOT NULL
    AND (EXTRACT(YEAR FROM CURRENT_DATE) - v_birth_year) >= 13;

  -- Try the natural name, then fall back to a uuid-suffixed one. Checking
  -- availability first was racy: two concurrent signups sharing an email local
  -- part both saw the name free, and the loser's auth.users insert rolled back.
  BEGIN
    INSERT INTO public.profiles (id, username, display_name, birth_year, age_verified, tos_accepted)
    VALUES (NEW.id, v_base, v_display, v_birth_year, v_age_ok, false)
    ON CONFLICT (id) DO NOTHING;
  EXCEPTION WHEN unique_violation THEN
    BEGIN
      INSERT INTO public.profiles (id, username, display_name, birth_year, age_verified, tos_accepted)
      VALUES (NEW.id, left(v_base, 41) || '_' || substring(NEW.id::text, 1, 8),
              v_display, v_birth_year, v_age_ok, false)
      ON CONFLICT (id) DO NOTHING;
    EXCEPTION WHEN unique_violation THEN
      -- Effectively unreachable (the uuid prefix would have to collide), but a
      -- signup must never fail outright because of name generation.
      INSERT INTO public.profiles (id, username, display_name, birth_year, age_verified, tos_accepted)
      VALUES (NEW.id, 'user_' || replace(NEW.id::text, '-', ''),
              v_display, v_birth_year, v_age_ok, false)
      ON CONFLICT (id) DO NOTHING;
    END;
  END;

  RETURN NEW;
END;
$function$;

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_username_format,
  ADD CONSTRAINT profiles_username_format
    CHECK (username IS NULL OR username ~ '^[a-z0-9_-]+$');

NOTIFY pgrst, 'reload schema';

-- Verify:
--   select public.is_username_available('ldonald234');   -> false
--   select public.is_username_available('definitely-free-xyz'); -> true
--   select pg_get_constraintdef(oid) from pg_constraint where conname = 'profiles_username_format';
