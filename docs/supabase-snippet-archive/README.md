# Supabase Snippet Archive

Saved SQL snippets from the Supabase dashboard editor, dated by the day they
were run. **Historical record — do not run these.**

## Why this exists

`supabase db push` does not work on this hosted project (see `CLAUDE.md`), so
every schema change was applied by pasting SQL into the dashboard. The
`supabase_migrations.schema_migrations` table holds 1 row out of 40+, because it
was never populated. That makes `supabase/migrations/` a statement of intent
rather than a description of production.

These snippets are the closest thing to a record of what was _actually_ executed
against prod, in the order it happened. They are worth keeping for archaeology —
"when did this policy change, and what did it replace?" — and worthless as a
setup script.

## Do not run these

They are point-in-time captures, several are superseded, and some would be
actively harmful to replay. `docs/APPLY-TO-PROD.sql` was deleted for exactly
this reason: it had fully landed, but its header still declared profile editing
broken, and re-running it would have _downgraded_ `normalize_chapter` to a
weaker version than the one live in prod.

## Verify prod instead

Never infer the live schema from a file — query it. The recipe is in
`CLAUDE.md`; the short form:

```bash
TOKEN=$(security find-generic-password -s "Supabase CLI" -a supabase -w)
curl -s -X POST "https://api.supabase.com/v1/projects/$(cat supabase/.temp/project-ref)/database/query" \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"query":"select column_name from information_schema.columns where table_name='"'"'profiles'"'"';"}'
```

For a function, read its live body rather than grepping for an idiom — prod may
implement the same behaviour a different way. Checking `get_public_profile` for
a literal `lower(btrim` reports a false negative, because prod factors that into
a `public.normalize_chapter()` helper:

```sql
select pg_get_functiondef(p.oid)
from pg_proc p join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public' and p.proname = 'get_public_profile';
```

## Related

- `supabase/migrations/20260729010000_capture_undocumented_prod_state.sql` —
  records prod-only objects (`birthdate`, `about`, `terms_accepted_date`) that
  exist in no earlier migration.
- `docs/audit/backend-privacy-smoke-checks.md` — the privacy assertions to run
  after any change to RLS or the public-profile path.
