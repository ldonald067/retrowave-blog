---
name: feature
description: Feature development following Retrowave Blog architecture — Supabase integration, auth patterns, error handling, and cross-layer wiring
---

# Feature Agent

Build new features for the Retrowave Blog app. This command supplements the global
`feature-dev` skill with project-specific architecture rules.

Read `CLAUDE.md` first for full architecture, shared data contracts, and conventions.
Read `.claude/learnings.md` for accumulated knowledge and known gotchas.

---

## Product Philosophy Gate

Before building ANY feature, ask: **"Does this require moderation, storage, or money?"**
If yes — DON'T build it. Solo operator, Supabase free tier only.

Decorative features (sparkles, badges, animations) are fine because they cost nothing.

**Explicitly NOT built by design**: comments, analytics, RSS, visitor counters,
likes, custom reactions, cron jobs.

---

## Supabase Integration Patterns

### Auth Guard

Every authenticated operation must use `requireAuth()`:
```typescript
import { requireAuth } from '../lib/auth-guard';
const { user, error: authError } = await requireAuth();
if (authError || !user) return { error: authError ?? 'You must be logged in.' };
```

**Known gotcha**: Always check BOTH `authError` AND `!user`. The user can be null
even when error is null (race condition during sign-out).

### Error Handling

Never expose raw errors to users:
```typescript
import { toUserMessage } from '../lib/errors';
catch (err) { onError?.(toUserMessage(err)); }
```

The `POSTGREST_CODES` map in `errors.ts` is the single source of truth. `retry.ts`
imports it to derive non-retryable error codes.

### Retry Logic

Supabase query builders return `PromiseLike`, not `Promise`. Always wrap:
```typescript
import { withRetry } from '../lib/retry';
const { data, error } = await withRetry(async () =>
  supabase.from('posts').select('*')
);
```

### RPC Calls

```typescript
const { data, error } = await supabase.rpc('function_name', { param: value });
if (error) throw error;
```

### Existing RPCs

| RPC | Called From | Purpose |
|-----|-----------|---------|
| `set_age_verification` | `App.tsx` | COPPA age gate (trigger-protected) |
| `get_posts_with_reactions` | `usePosts.ts` | Feed pagination with reaction counts |
| `get_post_by_id` | `usePosts.ts` | Single post fetch (full content) |
| `toggle_user_block` | `useBlocks.ts` | Block/unblock user |
| `export_user_data` | `ProfileModal.tsx` | GDPR data export |
| `delete_user_account` | `ProfileModal.tsx` | Account deletion |

### Database Tables

| Table | Hook/Component | Access Pattern |
|-------|---------------|----------------|
| `profiles` | `useAuth.ts` | Direct `.from()` queries |
| `posts` | `usePosts.ts` | Direct `.from()` for mutations, RPC for reads |
| `post_reactions` | `useReactions.ts` | Direct `.from()` (no RPC) |
| `user_blocks` | `useBlocks.ts` | Via `toggle_user_block` RPC |

### Hook API Quick Reference

| Hook | Key Returns | When to Use |
|------|------------|-------------|
| `useAuth` | `user`, `profile`, `signIn`, `signOut`, `updateProfile` | Auth state, profile CRUD |
| `usePosts` | `posts`, `createPost`, `updatePost`, `deletePost`, `loadMore` | Feed operations |
| `useReactions` | `toggleReaction` | Emoji reactions (optimistic UI) |
| `useBlocks` | `toggleBlock`, `fetchBlockedUsers` | User blocking |
| `useToast` | `showToast`, `dismissToast` | Feedback messages |
| `useFocusTrap` | (void) | Modal keyboard accessibility |
| `useOnlineStatus` | `boolean` | Network connectivity |
| `useYouTubeInfo` | `YouTubeInfoWithTitle \| null` | YouTube URL metadata |

---

## Adding Backend Functionality

When a feature needs new backend logic, follow this pipeline:

### 1. SQL Migration
Create in `supabase/migrations/` with timestamp prefix:
```
YYYYMMDDHHMMSS_descriptive_name.sql
```

Required in every migration:
- `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` for new tables
- RLS policies referencing `auth.uid()`
- `GRANT EXECUTE ON FUNCTION ... TO authenticated` for mutation RPCs
- `NOTIFY pgrst, 'reload schema'` at the end

For SECURITY DEFINER functions:
```sql
CREATE OR REPLACE FUNCTION public.my_function()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
```
Use fully-qualified `auth.users` (auth schema isn't in the search path).

### 2. TypeScript Types
Mirror SQL return shapes in `src/types/database.ts` under the `Functions` section:
```typescript
my_function: {
  Args: Record<string, never>;  // or { param: string }
  Returns: { ... };
};
```

### 3. Domain Types
Add frontend domain types in `src/types/` (post.ts, profile.ts, etc.)

### 4. Hook
Create or extend a hook in `src/hooks/`. Use `requireAuth()`, `toUserMessage()`,
`withRetry()`. Follow existing patterns in `usePosts.ts`, `useBlocks.ts`.

### 5. UI Component
Build in `src/components/`. Follow the Xanga aesthetic (see `/frontend` command).

---

## Shared Data Contracts

These MUST stay in sync. When changing one side, update the other:

| Data | Frontend | Backend |
|------|----------|---------|
| Post field limits | `validation.ts` `POST_LIMITS` | Migration CHECK constraints |
| Profile field limits | `validation.ts` `PROFILE_LIMITS` | Migration CHECK constraints |
| RPC params/return | `database.ts` `Functions` | SQL function signatures |
| Reaction emoji set | `ReactionBar.tsx` + `emojiStyles.ts` | `20260224000004` CHECK |
| Moderation blocklists | `moderation.ts` | `moderate-content/index.ts` |
| `ModerationResult` type | `moderation.ts` | `moderate-content/index.ts` |

---

## Trigger-Protected Fields

These cannot be modified via normal PostgREST UPDATE:

| Field | Protection | How to Modify |
|-------|-----------|--------------|
| `profiles.is_admin` | Trigger silently preserves value | SECURITY DEFINER RPC only |
| `profiles.age_verified` | Trigger blocks UPDATE | `set_age_verification` RPC only |
| `profiles.tos_accepted` | Trigger blocks UPDATE | `set_age_verification` RPC only |
| `profiles.birth_year` | Trigger blocks UPDATE | `set_age_verification` RPC only |

Any feature touching these fields MUST use a SECURITY DEFINER function.

---

## Caching

Two caches in `src/lib/cache.ts`:
- `postsCache` (5 min TTL, max 50) — keyed by `"userId:cursor"`
- `youtubeTitleCache` (60 min TTL, max 200) — keyed by video ID

**If your feature mutates data that feeds the post cache**, call `postsCache.clear()`
to invalidate. See `usePosts.ts` for the pattern.

## Capacitor Guards

All native API calls must be guarded:
```typescript
if (!Capacitor.isNativePlatform()) return; // no-op on web
```

Add new native wrappers in `src/lib/capacitor.ts`. Uses dynamic `await import()`
for plugin lazy-loading.

---

## Feature Implementation Checklist

- [ ] Passes product philosophy gate (no moderation/storage/money required)
- [ ] Auth guard on all authenticated operations (`requireAuth()`)
- [ ] Error messages use `toUserMessage()` — never raw `error.message`
- [ ] Retry logic wraps Supabase calls with `async () =>`
- [ ] New SQL migrations have RLS enabled
- [ ] TypeScript types in `database.ts` mirror SQL return shapes
- [ ] Client validation mirrors DB CHECK constraints
- [ ] UI uses theme variables (no hardcoded colors)
- [ ] Touch targets >= 44px
- [ ] `localStorage` access wrapped in try/catch
- [ ] Capacitor calls guarded by `isNativePlatform()`
- [ ] Build passes: `npx tsc --noEmit && npm run build && npm run test`

---

## Cross-Domain Checks

- After building UI: verify responsive behavior at 375px (`/mobile` domain)
- After adding/modifying RPCs: verify type alignment (`/fullstack` domain)
- After modifying theme-visible UI: test with at least 2 themes (`/frontend` domain)
- After adding modals: verify safe areas, swipe-to-dismiss, MODAL_CHROME_HEIGHT (`/mobile`)

## Learning Contribution

After completing work, append NEW findings to `.claude/learnings.md` under the
appropriate section. Use the format:
```
- [YYYY-MM-DD /feature] One-line finding description
```

$ARGUMENTS
