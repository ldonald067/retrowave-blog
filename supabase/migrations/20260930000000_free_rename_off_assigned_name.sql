-- Leaving the name sign-up assigned does not spend the free rename (2026-09-30,
-- finding 83 of the /adversarial-review that day).
--
-- When the name someone chose at sign-up is gone by the time they confirm,
-- handle_new_user gives them <chosen>_<first 8 of their id> (or user_<id> when
-- there was nothing usable), and first-run setup offers a field to pick a real
-- one. guard_username_change counted that as their one free rename, so a typo in
-- the replacement was locked in for 30 days -- the very case the free rename
-- exists for (validation.ts, USERNAME_CHANGE_COOLDOWN_DAYS).
--
-- Now the first move off an assigned name leaves username_changed_at NULL. It
-- applies only while the profile has never been renamed (no username_history
-- row of theirs), so hopping between names shaped like a fallback earns nothing:
-- the first rename writes a tombstone, and every rename after it follows the
-- ordinary rules. The assigned name is still tombstoned to its owner.
--
-- Built from prod's live body (pg_get_functiondef, 2026-09-30). The only other
-- difference is a comment: prod's copy has a double-encoded em dash ("fill-in"
-- line), which this body writes in ASCII so a paste cannot garble it again.
-- The trigger is unchanged; CREATE OR REPLACE keeps it bound.

CREATE OR REPLACE FUNCTION public.guard_username_change()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_next_allowed timestamptz;
  v_assigned     boolean;
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
  -- next name a free "fill-in" -- the second cooldown bypass.
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

  -- Leaving the name sign-up assigned is not a rename either (finding 83):
  -- handle_new_user's fallbacks end in _<first 8 of the id>, or are
  -- user_<whole id>. Only before any rename, so it happens once.
  v_assigned := OLD.username_changed_at IS NULL
    AND (right(OLD.username, 9) = '_' || substring(NEW.id::text, 1, 8)
         OR OLD.username = 'user_' || replace(NEW.id::text, '-', ''))
    AND NOT EXISTS (
      SELECT 1 FROM public.username_history h WHERE h.user_id = NEW.id
    );

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

  IF NOT v_assigned THEN
    NEW.username_changed_at := now();
  END IF;
  RETURN NEW;
END;
$function$;

NOTIFY pgrst, 'reload schema';

-- Verify (read-only):
--   select position('v_assigned' in pg_get_functiondef('public.guard_username_change()'::regprocedure)) > 0;  -> true
--   select pg_get_triggerdef(oid) from pg_trigger where tgname = 'profiles_guard_username_change';
--     -> ... BEFORE INSERT OR UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION guard_username_change()
