---
name: fullstack
description: Run fullstack integration audit — verifies RPC types, RLS policies, shared data contracts, and frontend-backend wiring
---

# Fullstack Agent

Run a fullstack integration audit across the Retrowave Blog codebase. Verify that frontend and backend are correctly wired together.

Read `CLAUDE.md` first, then `.claude/docs/gotchas.md` ("Supabase and RPCs").
**Read `.claude/docs/false-positives.md` before flagging anything** — jsonb
return types, `TO authenticated` on rate-limit policies, the merged reactions
policy and the duplicated `ModerationResult` have all been filed and dismissed
before.

## Audit against prod, not against `supabase/migrations/`

This is the whole trap for this skill. `supabase db push` is blocked here, every
migration was applied by hand, and `schema_migrations` holds 1 row out of 40+.
**A migration file does not mean the object is live**, and prod also carries
columns that appear in no migration at all.

An audit that compares TypeScript to migration files is comparing two documents
neither of which is the database.

```bash
TOKEN=$(security find-generic-password -s "Supabase CLI" -a supabase -w)
Q() { curl -s -X POST "https://api.supabase.com/v1/projects/$(cat supabase/.temp/project-ref)/database/query" \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -d "{\"query\":\"$1\"}"; }

Q "select p.proname from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.prokind='f' order by 1;"
Q "select tablename, policyname, cmd, qual from pg_policies where schemaname='public' order by tablename;"
Q "select table_name, column_name from information_schema.columns where table_schema='public' order by 1,2;"
```

**Read a function's body before calling anything missing.** Prod implements the
same guarantee its own way — `v_user_id := auth.uid()` rather than inline,
`public.normalize_chapter()` rather than `lower(btrim(...))`. Two privacy smoke
checks reported FAIL against correct code for exactly that reason.

## Audit Checklist

### 1. RPC Type Alignment

- Compare every function in `src/types/database.ts` `Functions` section against **the live list above**, then read the definition of anything that looks wrong
- Verify Args and Returns types match the SQL parameter and return types
- Flag any RPCs defined in SQL but missing from TypeScript (or vice versa)
- In any SECURITY DEFINER function with `SET search_path = public, pg_temp`, verify `auth.users` is fully qualified

### 2. RLS Policy Coverage

- For each table (`posts`, `profiles`, `post_reactions`, `user_blocks`, `content_reports`), verify RLS is enabled. `content_reports` has RLS on and **no policies**, on purpose — it is only reachable through the report and admin RPCs
- Check that INSERT/UPDATE/DELETE policies exist and reference `auth.uid()`
- Verify rate limits by reading the live policy and function bodies — they are not documented elsewhere

**Never rate-limit a table by selecting from it inside its own policy.** That is finding 36: the reactions policy counted recent `post_reactions` rows, Postgres raised `42P17` infinite recursion, and no reaction ever saved. The count now lives in the `SECURITY DEFINER` function `recent_reaction_count`, which runs outside RLS. Any new rate limit needs the same shape.

### 3. Shared Data Contracts

Cross-check every row of `.claude/docs/data-contracts.md` against prod — the
constraints live there, not in the migration named beside them.

### 4. Frontend-Backend Integration Points

- `supabase.rpc()` calls in React components/hooks match existing RPCs
- Error handling uses `toUserMessage()` from `src/lib/errors.ts` — NEVER raw `error.message`
- Auth guards use `requireAuth()` from `src/lib/auth-guard.ts`
- Retry logic wraps Supabase calls with `async () =>` (Supabase returns `PromiseLike`, not `Promise`)

**RPC ↔ caller map:** the complete list of 12 lives in `/feature` under
"Existing RPCs" — verify all of them, and regenerate the list from source rather
than trusting either doc:

```bash
grep -rhno "rpc('[a-z_]*'" src --include='*.ts*' | grep -v __tests__ | sed "s/.*rpc('//;s/'//" | sort -u
```

**Direct table access** (no RPC):

- `useReactions.ts` → `post_reactions` (INSERT/DELETE with optimistic UI)
- `useAuth.ts` → `profiles` (SELECT/UPDATE)
- `usePosts.ts` → `posts` (INSERT/UPDATE/DELETE for mutations)

### 5. Trigger-Protected Fields

Verify these fields can't be set directly via PostgREST:

- `profiles.is_admin` — protected by `20260224000006` trigger (silently preserves)
- `profiles.age_verified`, `tos_accepted`, `birth_year` — protected by `20260224000007` trigger (blocks UPDATE)

### 6. Build Verification

```bash
npm run check          # lint, format, typecheck, tests, build — the same checks as CI
```

An audit verifies with `npm run build`, not a dev server — the dev server proves nothing about the production bundle.

## Output Format

Present findings as a table:

| Check | Status         | Details |
| ----- | -------------- | ------- |
| ...   | PASS/WARN/FAIL | ...     |

Flag only genuine issues. Distinguish actual bugs from minor improvements and from entries already in `.claude/docs/false-positives.md`.

## Cross-Domain Checks

Before completing your audit:

- If RPC changes affect modal data: flag for `/mobile` review (safe areas, touch targets)
- If shared data contracts change: flag for `/frontend` review (UI needs updating)
- If new features are detected: flag for `/feature` review (architecture patterns)

## Learning Contribution

After completing your audit, append NEW findings to the relevant `.claude/docs/*.md` topic doc under
the appropriate section — usually `gotchas.md`, or `false-positives.md` for a dismissal.
Use the format:

```
- [YYYY-MM-DD /fullstack] One-line finding description
```

Only add genuinely new findings. Don't repeat what's already in the learnings file.

$ARGUMENTS
