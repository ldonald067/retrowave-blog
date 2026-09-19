-- APPLIED TO PROD 2026-09-19, not 2026-03-15. Until then prod had only the
-- 1-50 length check: the first /adversarial-review found the gap, because
-- notify-report put the reporter's username into the operator email's HTML.
-- All 6 usernames passed the pattern first, and the constraint validated.

-- Username format constraint: alphanumeric, underscores, and hyphens only.
-- Matches the client-side USERNAME_PATTERN in validation.ts.
-- Existing usernames that violate this pattern (e.g., email-based defaults
-- with dots) are allowed via IS NULL OR — they'll be enforced on next update.

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_username_format;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_username_format
  CHECK (username IS NULL OR username ~ '^[a-zA-Z0-9_-]+$');

NOTIFY pgrst, 'reload schema';
