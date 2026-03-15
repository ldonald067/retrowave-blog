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
