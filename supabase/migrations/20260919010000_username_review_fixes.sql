-- Fixes from the /adversarial-review of chosen usernames (2026-09-19).
--
-- 1. Nothing is derived from the email any more. handle_new_user took the
--    display name — the heading of a public page — from the email's local part
--    even after people started choosing a username, so "jane.doe.1990" still
--    headlined the page of someone who picked "glitterqueen". The display name
--    is now left empty unless sign-up sends one, which also brings back the
--    first-run profile setup: App shows it when display_name is empty, and the
--    old default meant no new user had ever seen it. With no chosen username
--    the fallback is user_<id>, not the email.
-- 2. Reserved names. admin, support, moderator, official and anything
--    containing "retrowave" were free, so anyone could pass as the operator on
--    a public page and in the report emails. is_reserved_username() is the one
--    list (mirrored by RESERVED_USERNAMES in src/lib/validation.ts — change
--    both), enforced by a CHECK and honoured by is_username_available and
--    handle_new_user, which falls back instead of failing the sign-up.
-- 4. Unfinished sign-ups no longer hold a username. The profile used to be
--    created on INSERT into auth.users, before the email was confirmed, so an
--    abandoned or fake sign-up kept its name forever. It is now created when
--    the account is confirmed: on INSERT only if it arrives already confirmed
--    (dashboard-created users), otherwise when email_confirmed_at is first set.
--    Nothing in the app reads a profile before confirmation — sign-in is
--    refused until then — and handle_new_user is idempotent (ON CONFLICT (id)).
--
-- (3 and 5 are client-side: the notice when sign-up could not give someone
-- the name they asked for, and the username field's position for AutoFill.)
--
-- No existing username was reserved when this was written (0 of 6).

CREATE OR REPLACE FUNCTION public.is_reserved_username(p_username text)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT lower(p_username) = ANY (ARRAY[
      'admin', 'administrator', 'root', 'system', 'support', 'help', 'helpdesk',
      'contact', 'hello', 'info', 'abuse', 'security', 'moderator', 'moderators',
      'mod', 'mods', 'staff', 'team', 'official', 'owner', 'appreview',
      'app-review', 'app_review', 'apple', 'anonymous', 'deleted', 'user',
      'null', 'undefined'
    ])
    OR position('retrowave' in lower(p_username)) > 0;
$$;

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_username_not_reserved,
  ADD CONSTRAINT profiles_username_not_reserved
    CHECK (username IS NULL OR NOT public.is_reserved_username(username));

CREATE OR REPLACE FUNCTION public.is_username_available(p_username text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT NOT public.is_reserved_username(btrim(p_username))
    AND NOT EXISTS (
      SELECT 1 FROM public.profiles WHERE username = lower(btrim(p_username))
    );
$$;

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

  -- Try the chosen name, then fall back to a uuid-suffixed one. Checking
  -- availability first was racy: two concurrent confirmations wanting one name
  -- both saw it free, and the loser's auth.users write rolled back.
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

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_confirmed ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  WHEN (NEW.email_confirmed_at IS NOT NULL)
  EXECUTE FUNCTION public.handle_new_user();

CREATE TRIGGER on_auth_user_confirmed
  AFTER UPDATE OF email_confirmed_at ON auth.users
  FOR EACH ROW
  WHEN (OLD.email_confirmed_at IS NULL AND NEW.email_confirmed_at IS NOT NULL)
  EXECUTE FUNCTION public.handle_new_user();

NOTIFY pgrst, 'reload schema';

-- Verify:
--   select public.is_username_available('support');       -> false (reserved)
--   select public.is_username_available('glitterqueen-x'); -> true
--   select tgname, pg_get_triggerdef(t.oid) from pg_trigger t
--     join pg_class c on c.oid = t.tgrelid where c.relname = 'users' and not t.tgisinternal;
