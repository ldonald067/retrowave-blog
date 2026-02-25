---
name: fullstack
description: Run fullstack integration audit — verifies RPC types, RLS policies, shared data contracts, and frontend-backend wiring
---

# Fullstack Agent

Run a fullstack integration audit across the Retrowave Blog codebase. Verify that frontend and backend are correctly wired together.

Read `CLAUDE.md` first — it contains the shared data contracts table, architecture patterns, and known tech debt. Don't re-discover what's already documented.
Read `.claude/learnings.md` for accumulated integration knowledge and known false
positives. Check the "False Positives" section to avoid repeating previously
dismissed findings.

## Audit Checklist

### 1. RPC Type Alignment
- Compare every function in `src/types/database.ts` `Functions` section against actual SQL in `supabase/migrations/`
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

| Data | Frontend File | Backend File |
|------|--------------|--------------|
| Post field limits | `src/lib/validation.ts` `POST_LIMITS` | `20260223000001_post_constraints.sql` |
| Profile field limits | `src/lib/validation.ts` `PROFILE_LIMITS` | `20260224000004` + `20260224000008` |
| Reaction emoji set | `src/components/ui/ReactionBar.tsx` `REACTION_EMOJIS` | `20260224000004` CHECK constraint |
| Moderation blocklists | `src/lib/moderation.ts` `BLOCKED_DOMAINS` + `BLOCKED_PATTERNS` | `supabase/functions/moderate-content/index.ts` |
| `ModerationResult` type | `src/lib/moderation.ts` | `supabase/functions/moderate-content/index.ts` |

**Known gotcha**: `ModerationResult` is intentionally duplicated between client and edge function. Deno can't share Vite imports. Don't flag this as tech debt — it's documented in CLAUDE.md.

### 4. Frontend-Backend Integration Points
- `supabase.rpc()` calls in React components/hooks match existing RPCs
- Error handling uses `toUserMessage()` from `src/lib/errors.ts` — NEVER raw `error.message`
- Auth guards use `requireAuth()` from `src/lib/auth-guard.ts`
- Retry logic wraps Supabase calls with `async () =>` (Supabase returns `PromiseLike`, not `Promise`)

Check these specific integration points:
- `ProfileModal.tsx` → `delete_user_account` RPC + `export_user_data` RPC
- `usePosts.ts` → `get_posts_with_reactions` + `get_post_by_id` RPCs
- `useBlocks.ts` → `toggle_user_block` RPC
- `useAuth.ts` → `set_age_verification` RPC
- `useReactions.ts` → `post_reactions` table (direct, not RPC)

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

| Check | Status | Details |
|-------|--------|---------|
| ... | PASS/WARN/FAIL | ... |

Flag only genuine issues. Distinguish between actual bugs vs minor improvements vs false positives. Reference the "Known gotcha" notes above and `.claude/learnings.md` false positives to avoid repeating false alarms from previous audits.

## Cross-Domain Checks

Before completing your audit:
- If RPC changes affect modal data: flag for `/mobile` review (safe areas, touch targets)
- If shared data contracts change: flag for `/frontend` review (UI needs updating)
- If new features are detected: flag for `/feature` review (architecture patterns)

## Learning Contribution

After completing your audit, append NEW findings to `.claude/learnings.md` under
the appropriate section (usually "Architecture & Integration" or "False Positives").
Use the format:
```
- [YYYY-MM-DD /fullstack] One-line finding description
```

Only add genuinely new findings. Don't repeat what's already in the learnings file.

$ARGUMENTS
