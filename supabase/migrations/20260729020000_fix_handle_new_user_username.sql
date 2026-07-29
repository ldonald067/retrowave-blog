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
