# Backend Privacy Smoke Checks

Run `supabase/tests/privacy_smoke.sql` against production before shipping any
change to RLS, the public-profile path, or chapter privacy. These are
metadata/function-definition smoke checks, not a replacement for seeded
integration tests — they prove the policies and function signatures are shaped
correctly, not that a real session sees the right rows.

## How to run it

`supabase db push` and `supabase test db` do not work on this hosted project, so
there is no CLI path. Two options:

1. **Dashboard** — paste the file into the SQL editor and run it.
2. **Management API** — from the repo root:

```bash
TOKEN=$(security find-generic-password -s "Supabase CLI" -a supabase -w)
python3 -c "import json,sys;print(json.dumps({'query':open('supabase/tests/privacy_smoke.sql').read()}))" \
  | curl -s -X POST "https://api.supabase.com/v1/projects/$(cat supabase/.temp/project-ref)/database/query" \
      -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" --data-binary @-
```

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

Every result row should have `passed = true`. All 9 passed against prod on
2026-08-20.

## When a check fails, read the function before believing it

Checks 8 and 9 assert on `pg_get_functiondef` text, so they fail whenever prod
implements the same guarantee a different way. Both have already done this once:

- Check 9 asserted the literal `p.user_id = auth.uid()`, but prod assigns
  `v_user_id := auth.uid()` and filters on the variable. Correctly owner-scoped,
  reported as FAIL.
- Check 8 asserted `pr.is_public = true`, but prod looks the owner up on
  `profiles` unaliased (`AND is_public = true`) and only introduces the `pr`
  alias later. Correctly filtered, reported as FAIL.

Both now accept either shape. If one fails again, dump the live definition
before concluding anything is leaking:

```sql
select pg_get_functiondef(p.oid)
from pg_proc p join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public' and p.proname = 'get_public_profile';
```

## Manual Follow-Up

- With no session, direct `posts` reads should return no private rows.
- With user A signed in, user B's private rows should not be readable.
- With a public profile, only public entries outside private chapters should appear in `get_public_profile`.
- With a private profile, `get_public_profile` should return null.
