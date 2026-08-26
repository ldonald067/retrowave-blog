---
name: feature
description: Feature development following Retrowave Blog architecture — Supabase integration, auth patterns, error handling, and cross-layer wiring
---

# Feature Agent

Build new features for the Retrowave Blog app.

Read `CLAUDE.md` first. Read `.claude/docs/gotchas.md` for known footguns.

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

### Session durability — do not touch these without reading why

- The session is persisted through `lib/auth-storage.ts`, which uses
  `@capacitor/preferences` (`UserDefaults`) on native and `localStorage` on web.
  **Never revert to plain `localStorage` on native** — iOS reclaims WKWebView
  web storage, which silently signed users out with no warning and no error.
- supabase-js **clears a session by writing `""`**, not by calling `removeItem`.
  Any storage adapter must treat empty as absent on read and as a clear on write.
- `capacitor.ts` revalidates on `appStateChange`, because the refresh timer is a
  JS timer and iOS suspends those in a backgrounded web view.
- An unrequested `SIGNED_OUT` raises `AUTH_SESSION_EXPIRED` so the UI can say the
  session expired instead of silently showing the auth screen. Keep that
  distinction when touching `useAuth`.

### Error Handling

Never expose raw errors: `toUserMessage(err)` from `errors.ts`.

### Retry

Supabase returns `PromiseLike`, not `Promise`. Always wrap:

```typescript
const { data, error } = await withRetry(async () => supabase.from('posts').select('*'));
```

### Existing RPCs

| RPC                        | Caller                | Purpose                                             |
| -------------------------- | --------------------- | --------------------------------------------------- |
| `set_age_verification`     | `App.tsx`             | COPPA age gate (trigger-protected)                  |
| `get_posts_with_reactions` | `usePosts.ts`         | Feed pagination + reactions                         |
| `get_post_by_id`           | `usePosts.ts`         | Single post (full content)                          |
| `toggle_user_block`        | `useBlocks.ts`        | Block/unblock user                                  |
| `block_user_by_username`   | `lib/reporting.ts`    | Block from a public profile page                    |
| `export_user_data`         | `SettingsModal.tsx`   | GDPR data export                                    |
| `delete_user_account`      | `SettingsModal.tsx`   | Account deletion                                    |
| `get_public_profile`       | `usePublicProfile.ts` | Read-only public page, `#/u/<username>`             |
| `get_user_chapters`        | `useChapters.ts`      | Chapter list + counts                               |
| `report_public_post`       | `lib/reporting.ts`    | Report an entry — **works anonymously**, on purpose |
| `admin_list_reports`       | `ModerationView.tsx`  | Moderation queue (owner account only)               |
| `admin_resolve_report`     | `ModerationView.tsx`  | Hide entry or dismiss report                        |

**Reporting has an anonymous path by design.** `report_public_post` branches on
`v_reporter IS NULL` with its own rate limit, because App Store Guideline 1.2
expects reporting without an account. Blocking is gated — it is meaningless
without one. Do not "fix" the ungated report button.

**Ban is not implemented.** The queue is hide + dismiss only. Enforcing a ban
means touching sign-in and every feed RPC; a half-built one is worse than none.

### Tables → Hooks

| Table            | Hook           | Access                         |
| ---------------- | -------------- | ------------------------------ |
| `profiles`       | `useAuth`      | Direct `.from()`               |
| `posts`          | `usePosts`     | `.from()` mutations, RPC reads |
| `post_reactions` | `useReactions` | Direct `.from()`               |
| `user_blocks`    | `useBlocks`    | Via RPC                        |

### Hook Quick Reference

| Hook              | Key Returns                                                   |
| ----------------- | ------------------------------------------------------------- |
| `useAuth`         | `user`, `profile`, `signIn`, `signOut`, `updateProfile`       |
| `usePosts`        | `posts`, `createPost`, `updatePost`, `deletePost`, `loadMore` |
| `useReactions`    | `toggleReaction`                                              |
| `useBlocks`       | `toggleBlock`, `fetchBlockedUsers`                            |
| `useToast`        | `success`, `error`, `info`                                    |
| `useFocusTrap`    | Focus trap for modals                                         |
| `useOnlineStatus` | `boolean`                                                     |
| `useYouTubeInfo`  | `YouTubeInfoWithTitle \| null`                                |

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

Append findings to the relevant `.claude/docs/*.md` topic doc:

```
- [YYYY-MM-DD /feature] One-line finding
```

$ARGUMENTS
