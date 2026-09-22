-- Username tombstones and a change cooldown (2026-09-20).
--
-- People could already rename themselves, unlimited times, and the old name
-- became free the instant they did. That is the name-grab: someone shares
-- /#/u/glitterqueen, renames, a stranger claims @glitterqueen, and every link
-- they ever posted now points at the stranger. With one operator there is no
-- support queue to adjudicate that, so it is made impossible instead.
--
-- 1. username_history is a tombstone: the name a profile gives up stays claimed
--    by its former owner forever. Only they can take it back (and doing so
--    clears the row). Deleting an account releases its names — the FK cascades
--    off auth.users — which is also what keeps test accounts reusable.
-- 2. A 30-day cooldown between renames, with the FIRST change free, because a
--    handle typed wrong at sign-up should not lock someone out for a month.
--    profiles.username_changed_at drives both the check and the app's copy;
--    NULL means "never renamed".
--
-- Both live in one BEFORE INSERT OR UPDATE trigger, so they hold no matter how
-- the row is written (the app updates profiles straight through PostgREST).
-- On INSERT a tombstoned name raises unique_violation, which handle_new_user
-- already catches and answers with its uuid-suffixed fallback — a sign-up must
-- never fail over name generation.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS username_changed_at timestamptz;

COMMENT ON COLUMN public.profiles.username_changed_at IS
  'When the username was last changed. NULL = never; the first change is free.';

CREATE TABLE IF NOT EXISTS public.username_history (
  username    text PRIMARY KEY,
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  released_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS username_history_user_id_idx
  ON public.username_history (user_id);

COMMENT ON TABLE public.username_history IS
  'Names given up by a rename. Claimed by their former owner until the account is deleted.';

ALTER TABLE public.username_history ENABLE ROW LEVEL SECURITY;

-- Readable only by its owner: the tombstone list is otherwise a map of who used
-- to be whom. is_username_available answers everyone else, as a bare boolean.
DROP POLICY IF EXISTS "Users read their own released usernames" ON public.username_history;
CREATE POLICY "Users read their own released usernames"
  ON public.username_history FOR SELECT
  USING (auth.uid() = user_id);

REVOKE ALL ON public.username_history FROM anon, authenticated;
GRANT SELECT ON public.username_history TO authenticated;

-- 30 days, mirrored by USERNAME_CHANGE_COOLDOWN_DAYS in src/lib/validation.ts.
CREATE OR REPLACE FUNCTION public.guard_username_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_next_allowed timestamptz;
BEGIN
  IF NEW.username IS NULL THEN
    RETURN NEW;
  END IF;

  -- Someone else's tombstone is taken, on INSERT as well as UPDATE. 23505 so
  -- the app's existing "That username is taken." mapping answers it, and so
  -- handle_new_user's unique_violation fallback catches it at sign-up.
  IF EXISTS (
    SELECT 1 FROM public.username_history h
     WHERE h.username = NEW.username AND h.user_id <> NEW.id
  ) THEN
    RAISE EXCEPTION 'username % was released by another account', NEW.username
      USING ERRCODE = 'unique_violation';
  END IF;

  IF TG_OP = 'INSERT' THEN
    RETURN NEW;
  END IF;

  IF NEW.username IS NOT DISTINCT FROM OLD.username THEN
    RETURN NEW;
  END IF;

  -- Filling in a missing username is not a rename: nothing is given up, and the
  -- one free change stays unspent.
  IF OLD.username IS NULL THEN
    RETURN NEW;
  END IF;

  IF OLD.username_changed_at IS NOT NULL THEN
    v_next_allowed := OLD.username_changed_at + interval '30 days';
    IF v_next_allowed > now() THEN
      -- Parsed by usernameCooldownMessage() in src/lib/errors.ts, which puts the
      -- date into the app's own voice.
      RAISE EXCEPTION 'username_cooldown:%', to_char(v_next_allowed, 'YYYY-MM-DD')
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

DROP TRIGGER IF EXISTS profiles_guard_username_change ON public.profiles;
CREATE TRIGGER profiles_guard_username_change
  BEFORE INSERT OR UPDATE OF username ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.guard_username_change();

-- Tombstones count as taken for everyone but their former owner. auth.uid() is
-- NULL for the signed-out sign-up form, so there every tombstone reads taken.
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
    )
    AND NOT EXISTS (
      SELECT 1 FROM public.username_history h
       WHERE h.username = lower(btrim(p_username))
         AND h.user_id IS DISTINCT FROM auth.uid()
    );
$$;

REVOKE ALL ON FUNCTION public.is_username_available(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_username_available(text) TO anon, authenticated;

NOTIFY pgrst, 'reload schema';

-- Verify:
--   select public.is_username_available('definitely-free-xyz');  -> true
--   select column_name from information_schema.columns
--     where table_name = 'profiles' and column_name = 'username_changed_at';
--   select tgname, pg_get_triggerdef(oid) from pg_trigger
--     where tgname = 'profiles_guard_username_change';
