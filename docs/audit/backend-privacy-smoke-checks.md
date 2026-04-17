# Backend Privacy Smoke Checks

Branch: `fix/intentional-public-profile`

Updated from `fix/private-journal-rls-hardening` after the branch inventory found
that the older private-journal RLS migration had not been carried onto `main`.

Run `supabase/tests/privacy_smoke.sql` against a migrated Supabase database before shipping privacy-sensitive changes. These checks are metadata/function-definition smoke checks, not a replacement for seeded integration tests.

## What The Smoke Checks Cover

- Old public post read policies are gone.
- Post SELECT policy is owner-scoped.
- Globally readable profile SELECT policy is gone.
- Profile SELECT policy is owner-scoped.
- Globally readable reaction SELECT policy is gone.
- Reaction SELECT policy is scoped to the reacting user or the owner of the
  reacted-to post.
- New posts default private at the database layer.
- `get_public_profile` requires a public profile and public entries, and does not expose reaction data.
- `get_posts_with_reactions` remains scoped to `auth.uid()`.

## Expected Result

Every result row should have `passed = true`.

## Manual Follow-Up

- With no session, direct `posts` reads should return no private rows.
- With user A signed in, user B's private rows should not be readable.
- With a public profile, only public entries outside private chapters should appear in `get_public_profile`.
- With a private profile, `get_public_profile` should return null.
