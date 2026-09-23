-- Fixes from the second username /adversarial-review (2026-09-23), findings
-- 72-74. Finding 72's hook only takes effect once it is switched on in the
-- dashboard (Authentication -> Hooks -> Before User Created -> Postgres,
-- public.hook_before_user_created) — do that AFTER this file has run, or every
-- sign-up fails on a missing function. Recorded here because dashboard state is
-- otherwise invisible to the repo.
--
-- 72. The confirmation email prints {{ .Data.username }}: the raw sign-up
--     metadata, which anyone holding the anon key can set to any text and send
--     to any address. GoTrue escapes markup (html/template) but not words, so a
--     stranger could mail "ur handle is @ur account is suspended, verify at
--     ..." to a real person from our domain. handle_new_user cleans the name it
--     stores; the email never saw that. The hook refuses a sign-up whose
--     username is not handle-shaped, so the email can only ever say a handle.
--     It runs on user creation only; a repeat sign-up for an unconfirmed
--     address does not touch metadata (GoTrue signup.go: "do not update the
--     user because we can't be sure of their claimed identity").
-- 73. The cooldown could be skipped: profiles' update policy lets a user write
--     any column of their own row, so blanking username_changed_at made the
--     next rename "the first, free" one — and with tombstones that meant
--     unlimited name hoarding. Setting the username to NULL and then to a new
--     name skipped it too ("filling in a missing username"), and released the
--     old name without a tombstone. The guard now runs on every insert and
--     update, owns username_changed_at outright, and refuses a NULL username
--     on a profile that has one.
-- 74. The cooldown error carried a UTC calendar date that the app read as a
--     local one — a day early east of UTC. It now carries the full UTC
--     timestamp; errors.ts formats it on the device.

-- 72 ------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.hook_before_user_created(event jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
DECLARE
  v_username jsonb := event->'user'->'user_metadata'->'username';
BEGIN
  -- No username is fine: magic-link and dashboard-created users send none, and
  -- handle_new_user generates one.
  IF v_username IS NULL OR v_username = 'null'::jsonb THEN
    RETURN '{}'::jsonb;
  END IF;

  -- The same rule as validateUsername (src/lib/validation.ts) and the
  -- profiles_username_format / _not_reserved constraints. The app checks all of
  -- this before it sends, so only a hand-made request is refused here.
  IF jsonb_typeof(v_username) <> 'string'
     OR (v_username #>> '{}') !~ '^[a-z0-9_-]{3,30}$'
     OR public.is_reserved_username(v_username #>> '{}') THEN
    RETURN jsonb_build_object('error', jsonb_build_object(
      'http_code', 400,
      -- Matched by errors.ts; change both.
      'message', 'Usernames are 3-30 lowercase letters, numbers, _ or -.'
    ));
  END IF;

  RETURN '{}'::jsonb;
END;
$$;

GRANT EXECUTE ON FUNCTION public.hook_before_user_created(jsonb) TO supabase_auth_admin;
REVOKE EXECUTE ON FUNCTION public.hook_before_user_created(jsonb) FROM authenticated, anon, public;
GRANT EXECUTE ON FUNCTION public.is_reserved_username(text) TO supabase_auth_admin;

-- 73 + 74 ---------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.guard_username_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_next_allowed timestamptz;
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- A new profile has never been renamed, whatever the insert says.
    NEW.username_changed_at := NULL;
    -- Someone else's tombstone is taken. 23505 so handle_new_user's
    -- unique_violation fallback answers it and a sign-up never fails.
    IF NEW.username IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.username_history h
       WHERE h.username = NEW.username AND h.user_id <> NEW.id
    ) THEN
      RAISE EXCEPTION 'username % was released by another account', NEW.username
        USING ERRCODE = 'unique_violation';
    END IF;
    RETURN NEW;
  END IF;

  -- UPDATE. The date belongs to this trigger: a client able to write it could
  -- reset its own cooldown (finding 73).
  NEW.username_changed_at := OLD.username_changed_at;

  IF NEW.username IS NOT DISTINCT FROM OLD.username THEN
    RETURN NEW;
  END IF;

  -- Blanking a username would release it without a tombstone and make the
  -- next name a free "fill-in" — the second cooldown bypass.
  IF NEW.username IS NULL THEN
    RAISE EXCEPTION 'username cannot be removed'
      USING ERRCODE = 'check_violation';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.username_history h
     WHERE h.username = NEW.username AND h.user_id <> NEW.id
  ) THEN
    RAISE EXCEPTION 'username % was released by another account', NEW.username
      USING ERRCODE = 'unique_violation';
  END IF;

  -- Filling in a legacy NULL username is not a rename: nothing is given up,
  -- and the one free change stays unspent.
  IF OLD.username IS NULL THEN
    RETURN NEW;
  END IF;

  IF OLD.username_changed_at IS NOT NULL THEN
    v_next_allowed := OLD.username_changed_at + interval '30 days';
    IF v_next_allowed > now() THEN
      -- Full UTC timestamp (finding 74); usernameCooldownMessage() in
      -- src/lib/errors.ts formats it in the device's own timezone.
      RAISE EXCEPTION 'username_cooldown:%',
        to_char(v_next_allowed AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
        USING ERRCODE = 'check_violation';
    END IF;
  END IF;

  INSERT INTO public.username_history (username, user_id)
  VALUES (OLD.username, NEW.id)
  ON CONFLICT (username) DO UPDATE
    SET user_id = EXCLUDED.user_id, released_at = now();

  -- Taking back one of their own old names frees the tombstone again.
  DELETE FROM public.username_history
   WHERE username = NEW.username AND user_id = NEW.id;

  NEW.username_changed_at := now();
  RETURN NEW;
END;
$$;

-- No column list any more: the guard has to see updates that leave the
-- username alone, because those are the ones that tried to write the date.
DROP TRIGGER IF EXISTS profiles_guard_username_change ON public.profiles;
CREATE TRIGGER profiles_guard_username_change
  BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.guard_username_change();

NOTIFY pgrst, 'reload schema';

-- Verify (read-only):
--   select public.hook_before_user_created('{"user":{"user_metadata":{"username":"glitterqueen"}}}');  -> {}
--   select public.hook_before_user_created('{"user":{"user_metadata":{"username":"ur account is suspended"}}}');  -> {"error": ...}
--   select pg_get_triggerdef(oid) from pg_trigger where tgname = 'profiles_guard_username_change';
