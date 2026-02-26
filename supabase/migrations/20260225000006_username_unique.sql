-- Username UNIQUE Constraint
--
-- profiles.username currently has no unique constraint, allowing two users
-- to have identical usernames. This migration:
--   1. Backfills duplicate usernames by appending "_" + first 8 chars of UUID
--      (truncates username to 41 chars first to stay within the 50-char CHECK)
--   2. Adds a UNIQUE constraint

-- ── Step 1: Backfill duplicates ───────────────────────────────────────────

DO $$
DECLARE
  r RECORD;
BEGIN
  -- Find all profiles that have a duplicate username (keeping the oldest one untouched)
  FOR r IN
    SELECT p.id, p.username
    FROM public.profiles p
    INNER JOIN (
      SELECT username
      FROM public.profiles
      GROUP BY username
      HAVING count(*) > 1
    ) dups ON dups.username = p.username
    WHERE p.id NOT IN (
      -- Keep the oldest profile with each duplicate username unchanged
      SELECT DISTINCT ON (username) id
      FROM public.profiles
      ORDER BY username, created_at ASC
    )
  LOOP
    -- Truncate to 41 chars + "_" + 8 hex chars of UUID = 50 max (within CHECK)
    -- 8 hex chars = 4 billion combinations — effectively no collision risk
    UPDATE public.profiles
    SET username = left(r.username, 41) || '_' || left(r.id::text, 8)
    WHERE id = r.id;
  END LOOP;
END $$;

-- ── Step 2: Add UNIQUE constraint ─────────────────────────────────────────

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_username_unique UNIQUE (username);

NOTIFY pgrst, 'reload schema';
