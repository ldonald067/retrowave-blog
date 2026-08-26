---
name: fullstack
description: Run fullstack integration audit — verifies RPC types, RLS policies, shared data contracts, and frontend-backend wiring
---

# Fullstack Agent

Run a fullstack integration audit across the Retrowave Blog codebase. Verify that frontend and backend are correctly wired together.

Read `CLAUDE.md` first — it contains the shared data contracts table, architecture patterns, and known tech debt. Don't re-discover what's already documented.
Read `.claude/docs/gotchas.md` for integration knowledge, and `.claude/docs/false-positives.md` for known false
positives. Check the "False Positives" section to avoid repeating previously
dismissed findings.

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
checks reported FAIL against correct code for exactly that reason. Before
flagging, also read `.claude/docs/false-positives.md`.

## Audit Checklist

### 1. RPC Type Alignment

- Compare every function in `src/types/database.ts` `Functions` section against **the live list above**, then read the definition of anything that looks wrong
- Verify Args and Returns types match the SQL parameter and return types
- Flag any RPCs defined in SQL but missing from TypeScript (or vice versa)

**Known gotcha**: RPCs returning `jsonb` in SQL map to structured TypeScript objects because PostgREST parses jsonb automatically. Don't flag `jsonb` vs `{ profile: ..., posts: ... }` as a mismatch — it's correct.

**Known gotcha**: SECURITY DEFINER functions with `SET search_path = public, pg_temp` need fully-qualified references to `auth.users` (it's in the `auth` schema, not `public`). Verify this in any function that touches `auth.users`.

### 2. RLS Policy Coverage

- For each table (`posts`, `profiles`, `post_reactions`, `user_blocks`), verify RLS is enabled
- Check that INSERT/UPDATE/DELETE policies exist and reference `auth.uid()`
- Verify rate limiting policies match the limits documented in CLAUDE.md

**Known gotcha**: Rate limiting policies don't need explicit `TO authenticated` grants. Anon users may pass the rate limit check, but they'll fail the ownership policy (`user_id = auth.uid()`) which is the real guard. Don't flag missing `TO authenticated` on rate limit policies — it's a minor improvement, not a bug.

**Known gotcha**: The reactions INSERT policy combines BOTH the block check (`is_blocked_pair()`) AND rate limiting in a single combined policy. Don't flag "missing separate rate limit policy" on reactions — it's intentionally merged.

### 3. Shared Data Contracts

Cross-check the contracts listed in CLAUDE.md:

| Data                    | Frontend File                                                  | Backend File                                   |
| ----------------------- | -------------------------------------------------------------- | ---------------------------------------------- |
| Post field limits       | `src/lib/validation.ts` `POST_LIMITS`                          | `20260223000001_post_constraints.sql`          |
| Profile field limits    | `src/lib/validation.ts` `PROFILE_LIMITS`                       | `20260224000004` + `20260224000008`            |
| Reaction emoji set      | `src/components/ui/ReactionBar.tsx` `REACTION_EMOJIS`          | `20260224000004` CHECK constraint              |
| Moderation blocklists   | `src/lib/moderation.ts` `BLOCKED_DOMAINS` + `BLOCKED_PATTERNS` | `supabase/functions/moderate-content/index.ts` |
| `ModerationResult` type | `src/lib/moderation.ts`                                        | `supabase/functions/moderate-content/index.ts` |

**Known gotcha**: `ModerationResult` is intentionally duplicated between client and edge function. Deno can't share Vite imports. Don't flag this as tech debt — it's documented in CLAUDE.md.

### 4. Frontend-Backend Integration Points

- `supabase.rpc()` calls in React components/hooks match existing RPCs
- Error handling uses `toUserMessage()` from `src/lib/errors.ts` — NEVER raw `error.message`
- Auth guards use `requireAuth()` from `src/lib/auth-guard.ts`
- Retry logic wraps Supabase calls with `async () =>` (Supabase returns `PromiseLike`, not `Promise`)

**Complete RPC ↔ Caller map** (verify ALL of these):

| RPC                        | Caller              | Access Pattern                              |
| -------------------------- | ------------------- | ------------------------------------------- |
| `set_age_verification`     | `App.tsx`           | SECURITY DEFINER (trigger-protected fields) |
| `get_posts_with_reactions` | `usePosts.ts`       | Read-only, cursor pagination                |
| `get_post_by_id`           | `usePosts.ts`       | Read-only, full post content                |
| `toggle_user_block`        | `useBlocks.ts`      | Mutation, returns `is_blocked`              |
| `export_user_data`         | `SettingsModal.tsx` | SECURITY DEFINER, returns jsonb             |
| `delete_user_account`      | `SettingsModal.tsx` | SECURITY DEFINER, cascading delete          |

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
npx tsc --noEmit       # 0 errors expected
npm run build          # Should succeed
npm run test           # All tests should pass
```

**NEVER run `npm run dev`** — it crashes the environment. Use `npm run build` only.

## Output Format

Present findings as a table:

| Check | Status         | Details |
| ----- | -------------- | ------- |
| ...   | PASS/WARN/FAIL | ...     |

Flag only genuine issues. Distinguish between actual bugs vs minor improvements vs false positives. Reference the "Known gotcha" notes above and `.claude/docs/false-positives.md` to avoid repeating false alarms from previous audits.

## Cross-Domain Checks

Before completing your audit:

- If RPC changes affect modal data: flag for `/mobile` review (safe areas, touch targets)
- If shared data contracts change: flag for `/frontend` review (UI needs updating)
- If new features are detected: flag for `/feature` review (architecture patterns)

## Learning Contribution

After completing your audit, append NEW findings to the relevant `.claude/docs/*.md` topic doc under
the appropriate section (usually "Architecture & Integration" or "False Positives").
Use the format:

```
- [YYYY-MM-DD /fullstack] One-line finding description
```

Only add genuinely new findings. Don't repeat what's already in the learnings file.

$ARGUMENTS
