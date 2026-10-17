-- APPLIED to prod 2026-10-16 (pasted into the SQL editor); the verify query
-- below returned the one expected row, and profiles_username_key's index is
-- gone from pg_indexes. Recorded here because a migration file's existence is
-- NOT evidence it is live.
--
-- Drop the duplicate unique constraint on profiles.username (2026-10-16).
--
-- Prod has two identical UNIQUE (username) constraints, each with its own index
-- (queried 2026-10-16):
--   profiles_username_key     -- in no migration; prod-only, from the original
--                                dashboard-created table (username text unique)
--   profiles_username_unique  -- 20260225000006, which the repo records
--
-- Every insert and username change maintains both indexes for nothing. This
-- keeps profiles_username_unique, the one the repo describes, and drops the
-- undocumented one. Checked first: no constraint depends on either index, no
-- function in prod names either constraint, and nothing in src/ or supabase/
-- matches on a constraint name -- a duplicate username still raises 23505
-- (unique_violation) from the remaining index, and ON CONFLICT (username) can
-- use it.
--
-- The DO block stops the whole paste, changing nothing, unless the constraint
-- being kept is present and is exactly UNIQUE (username).

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conrelid = 'public.profiles'::regclass
       AND conname = 'profiles_username_unique'
       AND contype = 'u'
       AND pg_get_constraintdef(oid) = 'UNIQUE (username)'
  ) THEN
    RAISE EXCEPTION 'profiles_username_unique is missing or changed; not dropping profiles_username_key';
  END IF;
END $$;

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_username_key;

NOTIFY pgrst, 'reload schema';

-- Verify (read-only):
--   select conname, pg_get_constraintdef(oid) from pg_constraint
--    where conrelid = 'public.profiles'::regclass and contype = 'u';
--     -> one row: profiles_username_unique | UNIQUE (username)
