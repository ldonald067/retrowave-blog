-- H2 FIX: Correct COPPA backfill defaults for existing users.
--
-- Migration 005 backfilled missing profiles with COALESCE(..., true) for
-- age_verified and tos_accepted, grandfathering pre-existing users as
-- verified without evidence. This migration corrects users who were
-- backfilled with no actual metadata (birth_year IS NULL implies no
-- metadata was ever set, so verification was never completed).

UPDATE public.profiles
SET
  age_verified = false,
  tos_accepted = false
WHERE
  age_verified = true
  AND birth_year IS NULL
  AND created_at < now() - interval '1 minute';
  -- Only affects profiles that were backfilled (not freshly created).
  -- New signups set birth_year via user_metadata, so birth_year IS NULL
  -- is a reliable indicator of a backfilled profile.

NOTIFY pgrst, 'reload schema';
