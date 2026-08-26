---
name: migration
description: Create Supabase SQL migrations and keep all cross-file sync points updated — database.ts types, validation limits, constants, and RLS policies
---

# Migration Agent

Create Supabase SQL migrations and keep cross-file sync points consistent.

Read `CLAUDE.md` first. Read `.claude/docs/gotchas.md` for known footguns.
Read existing migrations in `supabase/migrations/` for patterns.

---

## Migration File

Name: `supabase/migrations/YYYYMMDDHHMMSS_descriptive_name.sql`

### Required Boilerplate

```sql
-- New tables:
ALTER TABLE public.new_table ENABLE ROW LEVEL SECURITY;
CREATE POLICY "..." ON public.new_table FOR SELECT USING (user_id = auth.uid());

-- Mutation RPCs:
GRANT EXECUTE ON FUNCTION public.my_function TO authenticated;

-- Always end with:
NOTIFY pgrst, 'reload schema';
```

### SECURITY DEFINER Pattern

For functions bypassing RLS or trigger-protected fields:

```sql
CREATE OR REPLACE FUNCTION public.my_function(...)
RETURNS ... LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp
AS $$ BEGIN
  -- Fully-qualified auth.users (auth schema not in search_path)
  -- set_config('app.bypass_...', 'true', true) to bypass triggers
END; $$;
```

---

## Cross-File Sync Points (CRITICAL)

When a migration changes schema, these files MUST be updated in lockstep:

### 1. `src/types/database.ts`

| SQL Change     | Update                                                     |
| -------------- | ---------------------------------------------------------- |
| New table      | Add `Row`, `Insert`, `Update`, `Relationships` to `Tables` |
| New column     | Add to `Row` + `Insert` (optional?) + `Update` (optional?) |
| New RPC        | Add to `Functions` with `Args` and `Returns`               |
| Dropped entity | Remove from types                                          |

RPCs returning `jsonb` → structured TS objects (PostgREST parses automatically).
Void RPCs → `Returns: undefined` (not `void`).

### 2. `src/lib/validation.ts`

If CHECK constraints change, update `POST_LIMITS` or `PROFILE_LIMITS` and the
corresponding `validatePostInput()` / `validateProfileInput()` function.

### 3. `src/lib/constants.ts`

Re-exports `POST_LIMITS` and `PROFILE_LIMITS`. Update if adding a new limits object.

### 4. `src/components/ui/ReactionBar.tsx` + `src/lib/emojiStyles.ts`

If emoji CHECK constraint changes, update `REACTION_EMOJIS` and the preload set.

### 5. RLS Policies

New UGC tables may need `is_blocked_pair()` enforcement and rate limiting
(see `20260225000005_rate_limiting.sql`).

### 6. Trigger-Protected Fields

| Field                                           | Trigger            | Bypass                     |
| ----------------------------------------------- | ------------------ | -------------------------- |
| `profiles.is_admin`                             | Silently preserves | SECURITY DEFINER only      |
| `profiles.age_verified/tos_accepted/birth_year` | Blocks UPDATE      | `set_age_verification` RPC |

---

## Applying it — the CLI cannot

**`supabase db push` does not work on this project.** The hosted Postgres
refuses the CLI's login-role creation; `migration list` and `test db` fail for
the same reason. Every migration in this repo was applied by hand, and
`supabase_migrations.schema_migrations` holds **1 row out of 40+**.

**A file in `supabase/migrations/` is a statement of intent, not a description
of production.** On 2026-08-01 that gap broke profile editing for every user:
the app sent `status_message`, a column whose migration had never been applied,
and PostgREST returned `PGRST204` while the repo looked perfectly correct.

Apply by pasting into the dashboard SQL editor, or through the Management API:

```bash
TOKEN=$(security find-generic-password -s "Supabase CLI" -a supabase -w)
curl -s -X POST "https://api.supabase.com/v1/projects/$(cat supabase/.temp/project-ref)/database/query" \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"query":"alter table public.profiles add column if not exists foo text;"}'
```

The endpoint returns **only the last statement's result**, so a multi-statement
script reports one row and hides the rest. Send one statement at a time, or
`union` the checks.

## Verifying it — query prod, never the migration

```bash
# columns
-d '{"query":"select column_name from information_schema.columns where table_name='"'"'profiles'"'"';"}'

# a function's live body — grep the definition, do not assume the idiom
-d '{"query":"select pg_get_functiondef(p.oid) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='"'"'public'"'"' and p.proname='"'"'get_public_profile'"'"';"}'
```

Prod may implement the same guarantee a different way — it filters on
`v_user_id := auth.uid()` rather than `auth.uid()` inline, and normalises
chapters through `public.normalize_chapter()` rather than `lower(btrim(...))`.
Two privacy smoke checks reported FAIL against correct code for exactly this
reason. **Read the definition before concluding anything is missing.**

Prod also carries columns that exist in no migration (`birthdate`, `about`,
`terms_accepted_date`) — see
`20260729010000_capture_undocumented_prod_state.sql`.

## Workflow

1. Write SQL migration
2. **Apply it to prod** and confirm with a query — the steps above
3. Update `database.ts` types
4. Update `validation.ts` limits (if CHECK constraints changed)
5. Update domain types in `src/types/` (if shape changed)
6. Wire up in hook (if new RPC)
7. Verify: `npx tsc --noEmit && npm run build && npm run test && npm run lint`
8. If RLS or the public-profile path changed, run
   `supabase/tests/privacy_smoke.sql` — see
   `docs/audit/backend-privacy-smoke-checks.md`

## Audit Mode

When invoked without a task, check all sync points for drift and report:

| Sync Point | Status          | Details |
| ---------- | --------------- | ------- |
| ...        | IN SYNC / DRIFT | ...     |

## Cross-Domain

- After migration: run `/fullstack` to verify RPC type alignment
- New RPCs need wiring: `/feature` (hooks, auth guards, error handling)
- Schema changes affecting UI: `/frontend` (new fields to display)
- New tables with UGC: `/mobile` (App Store compliance — reporting, moderation)

## Learnings

Append findings to the relevant `.claude/docs/*.md` topic doc:

```
- [YYYY-MM-DD /migration] One-line finding
```

$ARGUMENTS
