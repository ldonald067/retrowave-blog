---
name: feature
description: Feature development following Retrowave Blog architecture — Supabase integration, auth patterns, error handling, and cross-layer wiring
---

# Feature Agent

Build new features for the Retrowave Blog app.

Read `CLAUDE.md` first. Read `.claude/learnings.md` for known gotchas.

---

## Product Philosophy Gate

Before building ANY feature, ask: **"Does this require moderation, storage, or money?"**
If yes — DON'T build it. Solo operator, Supabase free tier only.

**Explicitly NOT built by design**: comments, analytics, RSS, visitor counters,
likes, custom reactions, cron jobs.

---

## Supabase Patterns

### Auth Guard

Every authenticated operation must use `requireAuth()`:
```typescript
const { user, error: authError } = await requireAuth();
if (authError || !user) return { error: authError ?? 'You must be logged in.' };
```
Always check BOTH `authError` AND `!user` (user can be null even when error is null).

### Error Handling

Never expose raw errors: `toUserMessage(err)` from `errors.ts`.

### Retry

Supabase returns `PromiseLike`, not `Promise`. Always wrap:
```typescript
const { data, error } = await withRetry(async () =>
  supabase.from('posts').select('*')
);
```

### Existing RPCs

| RPC | Caller | Purpose |
|-----|--------|---------|
| `set_age_verification` | `App.tsx` | COPPA age gate (trigger-protected) |
| `get_posts_with_reactions` | `usePosts.ts` | Feed pagination + reactions |
| `get_post_by_id` | `usePosts.ts` | Single post (full content) |
| `toggle_user_block` | `useBlocks.ts` | Block/unblock user |
| `export_user_data` | `SettingsModal.tsx` | GDPR data export |
| `delete_user_account` | `SettingsModal.tsx` | Account deletion |

### Tables → Hooks

| Table | Hook | Access |
|-------|------|--------|
| `profiles` | `useAuth` | Direct `.from()` |
| `posts` | `usePosts` | `.from()` mutations, RPC reads |
| `post_reactions` | `useReactions` | Direct `.from()` |
| `user_blocks` | `useBlocks` | Via RPC |

### Hook Quick Reference

| Hook | Key Returns |
|------|------------|
| `useAuth` | `user`, `profile`, `signIn`, `signOut`, `updateProfile` |
| `usePosts` | `posts`, `createPost`, `updatePost`, `deletePost`, `loadMore` |
| `useReactions` | `toggleReaction` |
| `useBlocks` | `toggleBlock`, `fetchBlockedUsers` |
| `useToast` | `success`, `error`, `info` |
| `useFocusTrap` | Focus trap for modals |
| `useOnlineStatus` | `boolean` |
| `useYouTubeInfo` | `YouTubeInfoWithTitle \| null` |

---

## Adding Backend Functionality

Use `/migration` for the full pipeline. Summary:
1. SQL migration → 2. `database.ts` types → 3. Domain types → 4. Hook → 5. Component

Data contracts and sync points are documented in `/migration`.

---

## Caching

Two caches in `cache.ts`:
- `postsCache` (5 min TTL, max 50) — keyed by `userId:cursor`
- `youtubeTitleCache` (60 min TTL, max 200) — keyed by video ID

If your feature mutates cached data, call `postsCache.invalidateAll()`.

## Capacitor Guards

All native API calls guarded by `Capacitor.isNativePlatform()`.
Add wrappers in `capacitor.ts` with dynamic `await import()`.

---

## Checklist

- [ ] Passes product philosophy gate
- [ ] `requireAuth()` on authenticated operations
- [ ] `toUserMessage()` on all error displays
- [ ] `withRetry(async () => ...)` on Supabase calls
- [ ] SQL migrations have RLS + `NOTIFY pgrst` (see `/migration`)
- [ ] `database.ts` types match SQL (see `/migration`)
- [ ] UI uses theme variables, 44px touch targets
- [ ] `localStorage` in try/catch, Capacitor calls guarded
- [ ] Build passes: `npx tsc --noEmit && npm run build && npm run test`

---

## Cross-Domain

- UI responsive at 375px → `/mobile`
- New/modified RPCs → `/fullstack`
- Theme-visible UI → `/frontend`
- New modals → `/mobile` (safe areas, swipe-to-dismiss)

## Learnings

Append findings to `.claude/learnings.md`:
```
- [YYYY-MM-DD /feature] One-line finding
```

$ARGUMENTS
