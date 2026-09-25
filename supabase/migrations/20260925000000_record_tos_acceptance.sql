-- Record the terms acceptance people actually gave at sign-up (2026-09-25).
--
-- 20260318000000 made handle_new_user always store tos_accepted = false, on the
-- reasoning that sign-up metadata is client-set and set_age_verification is the
-- one trusted path to record it. But since sign-up started sending birth_year,
-- handle_new_user derives age_verified from that same client-set metadata, so
-- anyone 13+ skips the age screen and never reaches set_age_verification. The
-- result: every profile created since 2026-08-13 said its owner never accepted
-- the terms, although each one ticked the box (raw_user_meta_data.tos_accepted
-- = "true"). Nothing in the app reads the column; the record was just wrong.
--
-- 1. handle_new_user records the tick when the same sign-up passed the age
--    check — the same trust it already gives birth_year. Anyone who does not
--    pass still records both through set_age_verification. Everything else is
--    the live body, unchanged (checked against prod 2026-09-25).
-- 2. Backfill: profiles whose sign-up metadata shows the box ticked. The
--    protect_coppa_fields trigger reverts direct writes to tos_accepted unless
--    app.coppa_bypass is set for the transaction — the way
--    set_age_verification does it. A DO block keeps the setting and the update
--    in one transaction, so the bypass cannot outlive it. 3 rows expected
--    (ldonald234, ldonald234_xanga, rainbowpudding1); their updated_at moves.

CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_fallback    text;
  v_base        text;
  v_display     text;
  v_birth_year  integer := COALESCE((NEW.raw_user_meta_data->>'birth_year')::integer, NULL);
  v_age_ok      boolean;
  v_tos_ok      boolean;
BEGIN
  v_fallback := 'user_' || substring(NEW.id::text, 1, 8);

  -- The chosen name, cleaned; never the email. Reserved or empty -> fallback.
  v_base := lower(left(
    regexp_replace(
      COALESCE(NULLIF(NEW.raw_user_meta_data->>'username', ''), v_fallback),
      '[^a-zA-Z0-9_-]', '_', 'g'
    ),
    41
  ));
  IF v_base IS NULL OR v_base = '' OR public.is_reserved_username(v_base) THEN
    v_base := v_fallback;
  END IF;

  -- NULL unless sign-up sent one: an empty display name is what triggers the
  -- app's first-run setup, where the person picks the name their page shows.
  v_display := left(NULLIF(NEW.raw_user_meta_data->>'display_name', ''), 50);

  v_age_ok := v_birth_year IS NOT NULL
    AND (EXTRACT(YEAR FROM CURRENT_DATE) - v_birth_year) >= 13;

  -- The terms box ticked at sign-up, recorded only when that same sign-up
  -- passed the age check. Those people never see the age screen, which was the
  -- only other thing that records the terms, so a hard-coded false left every
  -- one of them "never accepted" (2026-09-25). Anyone who does not pass here
  -- still goes through set_age_verification, which records both together.
  v_tos_ok := v_age_ok AND COALESCE(NEW.raw_user_meta_data->>'tos_accepted', '') = 'true';

  -- Try the chosen name, then fall back to a uuid-suffixed one. Checking
  -- availability first was racy: two concurrent confirmations wanting one name
  -- both saw it free, and the loser's auth.users write rolled back.
  BEGIN
    INSERT INTO public.profiles (id, username, display_name, birth_year, age_verified, tos_accepted)
    VALUES (NEW.id, v_base, v_display, v_birth_year, v_age_ok, v_tos_ok)
    ON CONFLICT (id) DO NOTHING;
  EXCEPTION WHEN unique_violation THEN
    BEGIN
      INSERT INTO public.profiles (id, username, display_name, birth_year, age_verified, tos_accepted)
      VALUES (NEW.id, left(v_base, 41) || '_' || substring(NEW.id::text, 1, 8),
              v_display, v_birth_year, v_age_ok, v_tos_ok)
      ON CONFLICT (id) DO NOTHING;
    EXCEPTION WHEN unique_violation THEN
      -- Effectively unreachable (the uuid prefix would have to collide), but a
      -- signup must never fail outright because of name generation.
      INSERT INTO public.profiles (id, username, display_name, birth_year, age_verified, tos_accepted)
      VALUES (NEW.id, 'user_' || replace(NEW.id::text, '-', ''),
              v_display, v_birth_year, v_age_ok, v_tos_ok)
      ON CONFLICT (id) DO NOTHING;
    END;
  END;

  RETURN NEW;
END;
$function$;

DO $$
BEGIN
  PERFORM set_config('app.coppa_bypass', 'true', true);
  UPDATE public.profiles p
     SET tos_accepted = true
    FROM auth.users u
   WHERE u.id = p.id
     AND p.tos_accepted = false
     AND p.age_verified = true
     AND COALESCE(u.raw_user_meta_data->>'tos_accepted', '') = 'true';
  PERFORM set_config('app.coppa_bypass', '', true);
END;
$$;

-- Verify (read-only):
--   select count(*) filter (where tos_accepted) as accepted, count(*) as total from public.profiles;  -> 7 / 7
--   select position('v_tos_ok' in pg_get_functiondef('public.handle_new_user()'::regprocedure)) > 0;  -> true
