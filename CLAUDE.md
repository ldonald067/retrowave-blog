# Retrowave Blog - Project Guide

## Critical Warnings

- **NEVER open the dev server preview** (Vite `npm run dev`). It crashes the environment. Use `npm run build` to verify changes compile correctly.
- **ALWAYS commit and push before ending a session.** Use `/commit-push-pr` or at minimum `git add . && git commit && git push`. Worktrees reset and uncommitted work is lost forever.

## Product Philosophy

**Solo operator, low budget, zero moderation overhead.** This blog is run by one person with limited money and no tech background. Every feature decision must pass this filter:

- **No visitor counters / analytics** — storage cost, pointless for a personal blog
- **No comments** — requires moderation, spam filtering, abuse management
- **No RSS feed** — adds complexity for near-zero audience benefit
- **Reactions only** — lightweight emoji reactions (❤️🔥😂😢✨👀) are the only social feature. Fixed set, no custom reactions, no moderation needed
- **No features that require ongoing maintenance** — if it needs a cron job, webhook, or manual review, it's out
- **Supabase free tier** — all backend costs must fit within Supabase's free tier limits
- **Keep it decorative** — purely aesthetic features (pixel badges, custom cursors, sparkle trails) are fine because they cost nothing

When in doubt, ask: "Does this require moderation, storage, or money?" If yes → don't build it.

## Cross-Agent Contract

This file is the shared interface between **two independent Claude agents** — one handles frontend, one handles backend. Neither agent sees the other's conversation. This section is the canonical reference for their shared boundaries.

### Frontend ↔ Backend Interface

| Boundary | Frontend Owns | Backend Owns |
|----------|--------------|-------------|
| Auth | `useAuth.ts` consumes session, reads `user_metadata` | Supabase GoTrue config, magic link OTP settings, DB trigger in `005_fix_missing_profiles.sql` |
| Posts | `usePosts.ts` calls RPC, applies optimistic updates | `get_posts_with_reactions` SQL function, `post_constraints` migration |
| Reactions | `useReactions.ts` toggles + rollback | `post_reactions` table, RLS policies |
| Profiles | `useAuth.ts` CRUD, `ProfileModal.tsx` UI | `profiles` table, auto-create trigger, RLS policies |
| Moderation | `App.tsx` calls `moderateContent()` before save; `PostModal.tsx` calls `quickContentCheck()` for instant local feedback | `supabase/functions/moderate-content/` (Deno + OpenAI API) |
| COPPA | `App.tsx` calls `set_age_verification` RPC | `protect_coppa_fields` trigger + `set_age_verification` SECURITY DEFINER function |
| Themes | `src/lib/themes.ts` defines CSS vars, UI applies them | `profiles.theme` column stores user's chosen theme |

### Shared Data Shapes (must stay in sync)

| Type | Frontend Location | Backend Location | Notes |
|------|------------------|-----------------|-------|
| Post field limits | `src/lib/validation.ts` `POST_LIMITS` | `20260223000001_post_constraints.sql` CHECK constraints | **Must match exactly** (verified 2026-02-24) |
| Profile field limits | `src/lib/validation.ts` `PROFILE_LIMITS` | `20260224000004_add_data_constraints.sql` + `20260224000008_schema_hardening.sql` CHECK constraints | **Must match exactly** (synced 2026-02-24 — username min:1 added to frontend) |
| RPC params/return | `src/types/database.ts` `Functions` | `20260224000009_retire_likes_excerpt_feed.sql` | Frontend types must mirror SQL return shape. Feed returns truncated content (500 chars); `get_post_by_id` returns full content. |
| `ModerationResult` | `src/lib/moderation.ts` (severity required) | `supabase/functions/moderate-content/index.ts` (severity required) | Both require `severity`. Types duplicated (Deno can't share with Vite). |
| Profile fields | `src/types/profile.ts` | `profiles` table columns | Adding a profile field requires both a migration AND a type update |
| Reaction emoji set | `src/components/ui/ReactionBar.tsx` `REACTION_EMOJIS` | `20260224000004_add_data_constraints.sql` CHECK constraint | Canonical set: `['❤️', '🔥', '😂', '😢', '✨', '👀']`. **Must match exactly** |
| Moderation blocklists | `src/lib/moderation.ts` `BLOCKED_DOMAINS` + `ADULT_URL_KEYWORDS` | `supabase/functions/moderate-content/index.ts` (same lists) | **Synced 2026-02-24**: Both `BLOCKED_DOMAINS` and `ADULT_URL_KEYWORDS` now identical. **Changes must sync both files** |

### Environment Variables

| Variable | Where Used | Set How |
|----------|-----------|---------|
| `VITE_SUPABASE_URL` | Frontend (`src/lib/supabase.ts`) | `.env` file (see `.env.example`) |
| `VITE_SUPABASE_ANON_KEY` | Frontend (`src/lib/supabase.ts`) | `.env` file |
| `OPENAI_API_KEY` | Edge function only | `supabase secrets set OPENAI_API_KEY=...` (never in `.env`) |

### localStorage Keys

| Key | Owner | Purpose |
|-----|-------|---------|
| `xanga-status` | `Header.tsx` / `Sidebar.tsx` | AIM-style status message |
| `post-draft` | `PostModal.tsx` | Auto-saved draft (JSON: title, content, author, mood, music). Cleared on successful post. |
| `hasCompletedOnboarding` | `App.tsx` | Onboarding flow completion flag. Set to `'true'` after first-time wizard. |
| `sidebar-collapsed` | `Sidebar.tsx` | Mobile sidebar collapse state. Absent key = expanded (default for new users). |
| `emoji-style` | `emojiStyles.ts` / `ProfileModal.tsx` | Emoji rendering style: `native`, `fluent`, `twemoji`, `openmoji`, `blob`. Defaults to `native`. |
| `sb-*` | Supabase SDK | Auth tokens — never read/write directly |

### Rules for Cross-Agent Changes

1. **Adding a DB column** → backend agent adds migration + RLS; frontend agent updates TypeScript type + UI
2. **Adding an RPC function** → backend agent writes SQL + registers in `database.ts`; frontend agent calls it
3. **Adding an edge function** → backend agent creates in `supabase/functions/`; frontend agent calls via `supabase.functions.invoke()`
4. **Changing validation limits** → update `validation.ts` (`POST_LIMITS` or `PROFILE_LIMITS`) AND the corresponding SQL migration. `constants.ts` auto-imports from `PROFILE_LIMITS` — do NOT update it manually.
5. **`is_admin` is trigger-protected** → `20260224000006_protect_is_admin.sql` silently preserves `is_admin` on any API UPDATE. `supabase.from('profiles').update({ is_admin: true })` will **silently fail**. Admin features require a `SECURITY DEFINER` SQL function that bypasses the trigger.
6. **COPPA fields are trigger-protected** → `20260224000007_protect_coppa_fields.sql` silently preserves `age_verified`, `tos_accepted`, and `birth_year` on any API UPDATE. The **only** legitimate way to set these is via `supabase.rpc('set_age_verification', { p_birth_year, p_tos_accepted })`. Direct `updateProfile({ age_verified: true })` will silently fail.
7. **Always update the Cross-Agent Queue** (see below) when your work creates action items for the other agent.

### Cross-Agent Queue

Structured handoff between frontend and backend agents. **Every agent session must check this queue on start and update it before ending.**

| ID | Status | Owner | Item | Context | Notes | Added By |
|----|--------|-------|------|---------|-------|----------|
| Q6 | open | frontend | Verify `BLOG_OWNER_EMAIL` value is correct | Session 9 added `retrowave.blog.app@gmail.com` in `constants.ts` — used in PostCard report link, terms.html, privacy.html | backend: confirm or change the email before shipping | backend |
| Q8 | open | frontend | Review `terms.html` and `privacy.html` content for accuracy | Static pages in `public/` — generic legal text written by AI, not lawyer-reviewed | backend: created as App Store requirement (Apple Guideline 5.1.1); user should review before launch | backend |
| Q9 | open | frontend | Test Capacitor iOS build on macOS with Xcode | `capacitor.config.ts` + `ios/` directory scaffolded but never built | backend: ran `npx cap add ios` only; needs `npm run build && npx cap sync && npx cap open ios` on a Mac | backend |
| Q10 | open | frontend | Audit: `useReactions` no longer exports `loading` — verify no consumers relied on it | Removed `loading` state from `useReactions.ts` return (dead code — optimistic updates made it unnecessary) | backend: grep confirmed zero imports of `loading` from useReactions before removal | backend |
| Q11 | open | frontend | Audit: `excerpt` field removed from `Post`, `CreatePostInput`, and `database.ts` types | `excerpt` was dead — never populated by RPC, never rendered in UI | backend: if any new code references `post.excerpt`, it will get a TS error (intentional) | backend |
| Q12 | open | frontend | Audit: `viewMode` prop removed from `PostCard` interface | Was always passed as `"list"` and never used inside the component | backend: removed from PostCardProps and App.tsx usage | backend |
| Q13 | open | frontend | Audit: deleted `src/types/supabase.ts` — `SupabaseConfig` and `DatabaseError` types gone | Zero imports found; re-export from `types/index.ts` also removed | backend: if either type is needed, recreate in `types/supabase.ts` | backend |
| Q14 | open | frontend | Verify iOS safe-area padding renders correctly on iPhone with notch | Added `modal-footer-safe` class (PostModal + ProfileModal footers) and `safe-area-bottom` utility in `index.css` using `env(safe-area-inset-bottom)` | backend: needs physical iPhone or Xcode simulator to confirm padding | backend |
| Q15 | open | frontend | Verify iOS Safari input zoom prevention works | Added `font-size: 16px !important` to inputs/textareas/selects at `@media (max-width: 480px)` in `index.css` | backend: iOS Safari zooms viewport when focused input has font-size < 16px; this override should prevent it | backend |

**Queue Protocol:**

1. **On session start**: Read the queue. Pick up any `open` items assigned to you → set to `in-progress`.
2. **During work**: If your changes create work for the other agent, add a row with `status=open` and `owner=` the other agent. Use the next available `Q` number.
3. **On completion**: Set finished items to `done`.
4. **Cleanup**: Items marked `done` should be deleted by the next agent session that sees them (they've served their purpose).
5. **Either**: Items with `owner=either` can be picked up by whichever agent runs next. Set owner to yourself when you start it.
6. **References**: Use queue IDs in commit messages when relevant (e.g., "Resolves Q3").
7. **Notes**: Use the Notes column to communicate with the other agent about a ticket. Prefix each note with your role (`frontend:` or `backend:`). Append to existing notes with ` · ` separator. Notes die with the ticket — when a `done` item is cleaned up, its notes go too. **Strict: 1 sentence max per note.** Long explanations belong in commit messages or the Agent Session Log, not the queue table.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, TypeScript 5.9, Vite 7 |
| Styling | Tailwind CSS 4, CSS custom properties (theme variables) |
| Animation | Framer Motion 12 |
| Backend | Supabase (PostgreSQL + PostgREST + GoTrue Auth + Realtime) |
| Edge Functions | Deno (Supabase Edge Functions) |
| iOS Wrapper | Capacitor 8 (`@capacitor/core`, `@capacitor/ios`, + app, status-bar, keyboard, haptics, share, browser, splash-screen) |
| Content Moderation | OpenAI Moderation API via `moderate-content` edge function |
| Virtualization | @tanstack/react-virtual |
| Icons | lucide-react (selective — PostCard, Sidebar, ProfileModal) |
| Markdown | react-markdown + rehype-sanitize |

**There is no traditional Express/Node server.** The entire backend is Supabase. PostgREST auto-generates a REST API from the PostgreSQL schema. All "backend" logic lives in SQL migrations, RLS policies, database functions, and Deno edge functions.

## Commands

```bash
npm run build          # Production build (USE THIS to verify changes)
npm run lint           # ESLint
npm run test           # Vitest (run once)
npm run test:watch     # Vitest (watch mode)
npm run format         # Prettier
npx tsc --noEmit       # Type check without emitting
npm run preview        # Serve production build locally (run after `npm run build`)
```

Capacitor (iOS):
```bash
npm run build && npx cap sync   # Sync web build to iOS project
npx cap open ios                # Open in Xcode (macOS only)
```

> **Do NOT run `npm run dev`** — the Vite dev server crashes the environment. Use `npm run build` + `npm run preview` instead.

## Environment Setup

Copy `.env.example` to `.env` and fill in values:

```bash
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

The `OPENAI_API_KEY` is **not** in `.env`. It lives in Supabase edge function secrets:
```bash
supabase secrets set OPENAI_API_KEY=sk-...
```

Local Supabase dev config is in `supabase/config.toml` (ports, auth settings, email testing via Inbucket on port 54324).

## Project Structure

```
src/
  main.tsx              # Entry point — StrictMode + ErrorBoundary wrapper, root render
  App.tsx               # Root component — lazy imports, MotionConfig, toast/confirm state
  index.css             # Global styles, keyframes, theme classes, reduced-motion query
  components/
    AgeVerification.tsx # Birth year / TOS verification (lazy-loaded)
    LoginForm.tsx       # Email + magic link login form
    SignUpForm.tsx       # Email + age + TOS signup form
    Header.tsx          # Marquee banner, AIM status, theme toggle
    Sidebar.tsx         # Profile card, stats, collapsible on mobile
    PostCard.tsx        # Individual post display with reactions
    PostModal.tsx       # Create/edit post form with draft auto-save
    ProfileModal.tsx    # Edit profile (avatar, bio, mood, music, theme, emoji style)
    AuthModal.tsx       # Login/signup tabs
    OnboardingFlow.tsx  # Multi-step signup wizard
    EmptyState.tsx      # Lined paper journal empty state
    Toast.tsx           # Toast with spring physics, progress bar, swipe-to-dismiss, type accent
    LoadingSpinner.tsx  # Themed spinner
    ErrorMessage.tsx    # Themed error display with retry
    ErrorBoundary.tsx   # Class component — catches render errors, fallback UI
    CursorSparkle.tsx   # Mouse trail sparkle effect (respects reduced-motion)
    ConfirmDialog.tsx   # Styled confirm dialog for delete actions (loading state, focus trap)
    PostSkeleton.tsx    # Pulsing placeholder cards + SidebarSkeleton for initial feed load
    ui/                 # Reusable primitives (Input, Button, Card, Textarea, Avatar, AvatarPicker, Select, ReactionBar, StyledEmoji, YouTubeCard)
  hooks/
    useAuth.ts          # Authentication, profile CRUD, session management
    usePosts.ts         # Post feed with pagination, caching, CRUD, optimistic reactions
    useReactions.ts     # Emoji reaction toggle with optimistic updates + rollback
    useYouTubeInfo.ts   # YouTube URL parsing + title fetch (shared by PostCard, Sidebar, PostModal)
    useOnlineStatus.ts  # Browser online/offline status hook
    useToast.ts         # Toast notification state (max 3, type-based durations)
    useFocusTrap.ts     # Keyboard focus trap for modals
    __tests__/          # Hook tests (useAuth, useToast)
  lib/
    supabase.ts         # Supabase client singleton (reads VITE_SUPABASE_URL/KEY from env)
    errors.ts           # Error mapping — raw Supabase errors → user-safe messages
    retry.ts            # Exponential backoff with jitter for transient failures
    validation.ts       # Client-side field validation (mirrors DB constraints)
    cache.ts            # TTL cache for posts feed and YouTube titles
    moderation.ts       # Content moderation (local filter + AI edge function)
    themes.ts           # 8 theme definitions, CSS variable application
    capacitor.ts        # Capacitor plugin wrappers (deep links, status bar, haptics, share, browser, splash)
    emojiStyles.ts      # 5 emoji styles (native + 4 CDN sets), reactive store, codepoint conversion
    constants.ts        # App-wide constants (BLOG_OWNER_EMAIL, age limits, validation rules, mood emojis, MOOD_SELECT_OPTIONS)
    __tests__/          # Lib tests (constants)
  types/
    post.ts             # Post, CreatePostInput, UpdatePostInput
    profile.ts          # Profile
    database.ts         # Supabase generated types + RPC function types
    link-preview.ts     # LinkPreview
  test/
    setup.ts            # Vitest setup file
  utils/
    parseYouTube.ts     # YouTube URL parsing + cached oEmbed title fetch
    formatDate.ts       # formatDate() + formatRelativeDate() via date-fns

public/
  manifest.json         # PWA manifest (app name, icons, theme color)
  terms.html            # Terms of Service (static, linked from AgeVerification)
  privacy.html          # Privacy Policy (static, linked from AgeVerification)
  favicon.png           # Browser favicon (32x32 PNG, generated from assets/appicon.png)
  apple-touch-icon.png  # iOS home screen icon (180x180 PNG)
  icon-192.png          # PWA icon 192x192 (PNG)
  icon-512.png          # PWA icon 512x512 (PNG)

assets/
  appicon.png             # Master app icon (1024x1024 PNG, user-provided)

scripts/
  generate-icons.mjs      # Generates all iOS + web icons from assets/appicon.png (requires sharp)

supabase/
  config.toml           # Local dev config (ports, auth settings, edge runtime)
  migrations/           # SQL migrations (run in order by Supabase CLI)
  functions/
    moderate-content/   # Content moderation endpoint (Deno, JWT-protected, uses OpenAI API)

capacitor.config.ts     # Capacitor config (appId, webDir, server settings)
ios/                    # iOS platform (generated by `npx cap add ios`)
```

## Architecture Patterns

### Error Handling

All Supabase errors go through `toUserMessage()` from `src/lib/errors.ts`. This prevents leaking internal schema details (table names, column names, constraint names) to users.

```typescript
import { toUserMessage } from '../lib/errors';

try {
  const { error } = await supabase.from('posts').insert(data);
  if (error) throw error;
} catch (err) {
  return { error: toUserMessage(err) }; // Safe user-facing message
}
```

**Never expose raw `error.message` from Supabase in the UI.** Always use `toUserMessage(err)`.

The error code list in `errors.ts` (`POSTGREST_CODES`) is the single source of truth. `retry.ts` imports it to derive its non-retryable error set.

### Retry Logic

`withRetry()` from `src/lib/retry.ts` provides exponential backoff with jitter. It only retries transient errors (network, timeout). Auth errors, permission errors, and constraint violations are never retried.

**Important**: Supabase query builders return `PromiseLike`, not `Promise`. Always wrap callbacks with `async`:

```typescript
// CORRECT - async makes it return a proper Promise
const { data, error } = await withRetry(async () =>
  supabase.from('posts').select('*'),
);

// WRONG - PromiseLike causes type inference to break
const { data, error } = await withRetry(() =>
  supabase.from('posts').select('*'),
);
```

### Client-Side Validation

`src/lib/validation.ts` mirrors the DB CHECK constraints in `20260223000001_post_constraints.sql`. The `POST_LIMITS` constants define field length limits:

| Field | Min | Max |
|-------|-----|-----|
| title | 1 | 200 |
| content | 1 | 50,000 |
| author | - | 50 |
| mood | - | 100 |
| music | - | 200 |

**Keep `POST_LIMITS` in `validation.ts` in sync with the SQL migration constraints.** Both must agree.

`PROFILE_LIMITS` in `validation.ts` is the **single source of truth** for profile field limits. `VALIDATION` in `constants.ts` imports from `PROFILE_LIMITS` (not duplicated). DB CHECK constraints in `20260224000004_add_data_constraints.sql` must match:

| Field | Max |
|-------|-----|
| display_name | 50 |
| bio | 500 |
| current_mood | 100 |
| current_music | 200 |
| username | 50 |

`useAuth.updateProfile()` calls `validateProfileInput()` before sending to Supabase.

### Caching

`src/lib/cache.ts` provides a `TTLCache` class with two singleton instances:

- `postsCache` (5 min TTL, max 50 entries) - Keyed by `"userId:cursor"`. Invalidated on any mutation (create/update/delete/reaction).
- `youtubeTitleCache` (60 min TTL, max 200 entries) - Keyed by YouTube video ID. Prevents redundant oEmbed fetches.

Both caches are in-memory Maps that persist across re-renders but reset on page reload. When at capacity, expired entries are evicted first, then the oldest entry is dropped (L5 fix).

### Pagination

Posts use **cursor-based pagination** via the `get_posts_with_reactions` RPC function:

- Page size: 20 posts (constant `PAGE_SIZE` in `usePosts.ts`)
- Cursor: `created_at` timestamp of the last post on the current page
- First page: `p_cursor = null`
- Next page: `p_cursor = posts[posts.length - 1].created_at`
- Max page size capped at 100 in the SQL function

The `usePosts` hook exposes: `loadMore()`, `loadingMore`, `hasMore`, `fetchPost()`.

**M2 Excerpt-only feed**: The feed RPC returns `LEFT(content, 500)` instead of full content, plus a `content_truncated` boolean. PostCard still truncates to 300 chars client-side for display. When a user opens a post in view or edit mode, `PostModal` calls `fetchPost(id)` → `get_post_by_id` RPC to get the full content. If the fetch fails in edit mode, it falls back to the truncated content to prevent data loss.

### Optimistic Updates (Reactions)

Emoji reactions update the UI instantly without waiting for the server:

1. `useReactions.toggleReaction()` checks in-flight guard + 400ms cooldown → drops rapid taps
2. If allowed: calls `onOptimisticUpdate()` immediately (UI updates)
3. Server request fires in background
4. On server error: `onOptimisticUpdate()` is called again with opposite values (rollback)
5. Cache is invalidated so next refetch gets fresh data

**Debounce guards** (F2 fix): `useReactions` uses two `useRef` guards:
- `inFlightRef` (`Set<string>`) — tracks `postId:emoji` keys currently in-flight. Prevents competing insert + delete.
- `cooldownRef` (`Map<string, number>`) — tracks timestamps. 400ms cooldown between taps on the same emoji. Critical for iPhone where touch events fire rapidly.

The wiring in `App.tsx`:
```
usePosts() --applyOptimisticReaction--> useReactions({ onOptimisticUpdate })
```

### Authentication Flow

1. User enters email -> age verification -> `signUp()` sends magic link via OTP
2. User clicks magic link -> `onAuthStateChange` fires -> `fetchProfile()` loads or creates profile
3. Profile creation reads `user_metadata` (tos_accepted, birth_year) from the auth user; `age_verified` is derived from `birth_year` arithmetic (never trusted from client)
4. If profile doesn't exist, `createProfileForUser()` inserts it (with retry for race conditions against the DB trigger in migration `005_fix_missing_profiles.sql`)

Session management: `getSession()` is the initial source of truth. `onAuthStateChange` handles subsequent changes but skips `INITIAL_SESSION` to avoid duplicate fetches.

### Age Verification (COPPA)

Age verification uses a dedicated SECURITY DEFINER RPC to prevent API bypass:

1. `AgeVerification` component collects birth year + TOS acceptance
2. `App.tsx` calls `supabase.rpc('set_age_verification', { p_birth_year, p_tos_accepted })`
3. The RPC validates age >= 13, then sets `age_verified`, `tos_accepted`, `birth_year` on the profile
4. The `protect_coppa_fields` trigger blocks direct `updateProfile()` changes to these fields

**Important**: `updateProfile({ age_verified: true })` will **silently fail**. Only the RPC can set these fields.

### Content Moderation

Content moderation runs in three layers:
1. **Local filter** (PostModal, instant): `quickContentCheck()` — regex-based blocked patterns for slurs, hate speech, violence, blocked URLs
2. **AI moderation** (App.tsx, on save): `moderateContent()` — calls `moderate-content` edge function which uses OpenAI's moderation API (free)
3. **Fail-open**: If the edge function is down or OpenAI is unavailable, the post goes through (local regex already passed)

The edge function (`supabase/functions/moderate-content/index.ts`) requires JWT authentication. The client passes the auth token:

```typescript
moderateContent(title, content, embeddedLinks, supabaseUrl, async () => {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
});
```

### RPC Function: `get_posts_with_reactions`

Feed RPC — returns paginated posts with reactions pre-aggregated. Returns:

- Post fields (content **truncated to 500 chars** via `LEFT(p.content, 500)`)
- `content_truncated` (boolean — `true` when original content exceeds 500 chars)
- `profile_display_name`, `profile_avatar_url` (from joined profiles)
- `reactions` (jsonb object like `{"heart": 3, "fire": 1}`)
- `user_reactions` (jsonb array like `["heart"]`, requires authenticated caller)

**M1**: `like_count`/`user_has_liked` removed — `post_likes` table retired in migration 009.

Calling convention:
```typescript
supabase.rpc('get_posts_with_reactions', {
  p_cursor: cursor,   // timestamptz | null
  p_limit: 20,        // integer (max 100)
  p_user_id: userId,  // uuid | null (IGNORED — uses auth.uid() internally)
})
```

### RPC Function: `get_post_by_id`

Single-post RPC — returns **full content** for view/edit modes. Same return shape as `get_posts_with_reactions` (reuses `get_posts_result` composite type), but with `content_truncated = false`.

```typescript
supabase.rpc('get_post_by_id', {
  p_post_id: postId,  // uuid
  p_user_id: userId,  // uuid | null (IGNORED — uses auth.uid() internally)
})
```

Returns a single-element array (or empty array if post not found / not accessible).

### RPC Function: `set_age_verification`

SECURITY DEFINER function that sets COPPA fields on the user's profile. Uses a session variable (`app.coppa_bypass`) to bypass the `protect_coppa_fields` trigger.

```typescript
supabase.rpc('set_age_verification', {
  p_birth_year: 2000,      // integer, must make user >= 13
  p_tos_accepted: true,    // boolean
})
```

Returns `void`. Raises an exception if the user is not authenticated or is under 13.

### Lazy Loading

Heavy modal components are code-split via `React.lazy()` in `App.tsx`:

```typescript
const PostModal = lazy(() => import('./components/PostModal'));
const ProfileModal = lazy(() => import('./components/ProfileModal'));
const AuthModal = lazy(() => import('./components/AuthModal'));
// ... etc
```

All lazy components are wrapped in `<Suspense fallback={<LazyFallback />}>`. The `LazyFallback` renders a dark overlay with `LoadingSpinner`. When adding new heavy components, follow the same pattern.

### Theme System

Themes are defined in `src/lib/themes.ts` (8 themes). Each theme sets 40+ CSS custom properties on `document.documentElement.style`. Key variables:

| Variable | Purpose |
|----------|---------|
| `--bg-primary`, `--bg-secondary` | Page background gradient stops |
| `--card-bg` | Card/box background |
| `--text-title`, `--text-body`, `--text-muted` | Text hierarchy |
| `--accent-primary`, `--accent-secondary` | Brand accent colors |
| `--border-primary` | Border color (dotted borders) |
| `--title-font` | Theme-specific title font family |
| `--header-gradient-from/via/to` | Header gradient stops |

Additional variable groups (not all listed — see `index.css` `:root` for full set):

| Variable Group | Examples | Purpose |
|----------------|----------|---------|
| Input/Modal | `--input-bg`, `--input-border`, `--input-focus`, `--modal-bg`, `--modal-border` | Form and dialog theming |
| Links | `--link-color`, `--link-hover` | Hyperlink colors |
| Prose/Markdown | `--code-bg`, `--code-border`, `--code-text`, `--blockquote-bg`, `--strong-color`, `--em-color` | Markdown rendered content |
| Scrollbar | `--scrollbar-track`, `--scrollbar-thumb-from`, `--scrollbar-thumb-to` | Custom scrollbar gradient |
| Decorative | `--shadow-color`, `--border-accent`, `--selection-bg`, `--selection-text`, `--footer-bg` | Shadows, selections, footer |

Theme is persisted in `profiles.theme` (database column), not localStorage. Applied on login via `applyTheme()` from `themes.ts`. Uses `setProperty()` loop (not `cssText`, which would destroy other inline styles).

### Animation Conventions (Framer Motion)

All animations use framer-motion. Key patterns used throughout the codebase:

**Spring physics** — preferred over duration-based for natural feel:
```typescript
// Standard entrance (PostCard, EmptyState, modals)
transition={{ type: 'spring', stiffness: 300, damping: 25, mass: 0.8 }}

// Snappy feedback (Toast, reaction count, icon pop)
transition={{ type: 'spring', stiffness: 400-500, damping: 15-28 }}
```

**Drag interactions** — Toast swipe-to-dismiss pattern:
```typescript
drag="x"
dragConstraints={{ left: 0, right: 0 }}
dragElastic={{ left: 0.05, right: 0.4 }}
onDragEnd={(_e, info) => {
  if (info.offset.x > 80 || info.velocity.x > 300) { /* dismiss */ }
  else { /* snap back with animate() */ }
}}
```

**Reduced motion** — three layers of support:
1. CSS: `@media (prefers-reduced-motion: reduce)` disables all keyframe animations
2. React: `<MotionConfig reducedMotion="user">` wraps entire app in `App.tsx`
3. Per-component: `useReducedMotion()` from framer-motion (used in `LoadingSpinner`)
4. Touch guard: `CursorSparkle` checks `pointer: fine` before mounting

**State transition crossfade** — `<AnimatePresence mode="wait">` with keyed `motion.div`:
```typescript
<AnimatePresence mode="wait">
  <motion.div key={activeState}
    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
  />
</AnimatePresence>
```
Used in: PostModal preview/edit, ProfileModal avatar picker, Header status, AuthModal tabs.

**Press feedback** — all interactive motion elements use `whileTap={{ scale: 0.95-0.98 }}`.

## Database Migrations

Run in order by filename. Key migrations:

| Migration | Purpose |
|-----------|---------|
| `001_create_posts.sql` | `posts` table + RLS policies + `update_updated_at_column()` trigger |
| `002_create_profiles_and_likes.sql` | `profiles` + `post_likes` tables + RLS policies |
| `003_post_reactions_and_theme.sql` | Reactions table, theme support |
| `004_profile_mood_music.sql` | Mood/music fields on profiles |
| `005_fix_missing_profiles.sql` | DB trigger auto-creates profiles on signup (backfill defaults `false`, `ON CONFLICT DO NOTHING`) |
| `20260125000000_add_age_validation.sql` | Age verification fields |
| `20260223000001_post_constraints.sql` | CHECK constraints on posts (sync with `validation.ts`, `jsonb_typeof` guard) |
| `20260223000002_get_posts_rpc.sql` | `get_posts_with_reactions` RPC function |
| `20260224000001_fix_handle_new_user.sql` | Combines username + age fields in `handle_new_user()` trigger |
| `20260224000002_fix_rpc_security.sql` | `auth.uid()` override + `GREATEST(1, LEAST(p_limit, 100))` |
| `20260224000003_add_performance_indexes.sql` | Indexes on `posts.created_at DESC`, `posts.user_id`, `post_reactions.post_id` |
| `20260224000004_add_data_constraints.sql` | `reaction_type` CHECK + profile field length constraints |
| `20260224000005_fix_coppa_backfill.sql` | Corrects previously-backfilled users |
| `20260224000006_protect_is_admin.sql` | `BEFORE UPDATE` trigger prevents `is_admin` self-elevation via API |
| `20260224000007_protect_coppa_fields.sql` | `BEFORE UPDATE` trigger prevents self-setting COPPA fields; `set_age_verification` SECURITY DEFINER RPC |
| `20260224000008_schema_hardening.sql` | NULL email fallback, `avatar_url` constraint, `search_path`, username min length |
| `20260224000009_retire_likes_excerpt_feed.sql` | Drop `post_likes` table. Feed returns `LEFT(content, 500)` + `content_truncated`. New `get_post_by_id` RPC. |
| `20260224000010_fix_coppa_trust.sql` | Replaces `handle_new_user()` to derive `age_verified` from `birth_year` arithmetic (never trusts client) |

## Development Notes

### devSignUp (Development Only)

`useAuth.ts` includes a `devSignUp` function that uses anonymous auth to bypass the magic link flow. It's gated behind `import.meta.env.DEV` and tree-shaken from production builds. This is a temporary development convenience and will be removed once the magic link flow is fully configured.

### Hook Return Patterns

All mutation hooks follow the pattern `Promise<{ data?: T | null; error: string | null }>`:
- `error` is always a user-safe string from `toUserMessage()`, never a raw Error
- `data` is present on success, `null` on failure

### Type Registration for RPC

Custom RPC functions must be registered in `src/types/database.ts` under `Database.public.Functions` for type safety. See `get_posts_with_reactions` for the pattern.

### localStorage Gotcha (Private Browsing)

All `localStorage` access is wrapped in try/catch. Safari private browsing and some mobile browsers throw on `localStorage.setItem()`. Pattern used in `App.tsx`, `Sidebar.tsx`, `emojiStyles.ts`:

```typescript
try { localStorage.setItem(key, value); } catch { /* private browsing — silently skip */ }
```

### Capacitor Platform Guards

All Capacitor plugin calls in `src/lib/capacitor.ts` are guarded by `Capacitor.isNativePlatform()`. Functions are no-ops on web (graceful degradation). Key patterns:

- **Deep links**: `App.addListener('appUrlOpen')` in `main.tsx` extracts auth token from URL hash for magic link redirects on iOS
- **Status bar**: `setStatusBarForTheme()` sets light/dark text based on theme — called from `applyTheme()` in `themes.ts`
- **Haptics**: `triggerHaptic('light')` on reaction toggle — 1-line wrapper around `Haptics.impact()`

## iOS App Store Submission

### Build & Deploy

```bash
npm run build                   # Build web assets to dist/
npx cap sync ios                # Copy dist/ into ios/ + update native deps
npx cap open ios                # Open Xcode project (macOS only)
```

In Xcode: select a real device or simulator → Product → Archive → Distribute to App Store Connect.

### What's Done (automated by Capacitor + code changes)

| Requirement | Status | Details |
|---|---|---|
| App icon (1024x1024 PNG) | Done | Auto-generated at `ios/App/App/Assets.xcassets/AppIcon.appiconset/` |
| Bundle ID | Done | `com.retrowave.journal` |
| Version / Build | Done | `1.0` / `1` (in Xcode project) |
| Deployment target | Done | iOS 15.0 |
| Encryption declaration | Done | `ITSAppUsesNonExemptEncryption = NO` in Info.plist |
| COPPA age gate | Done | Birth year verification, `set_age_verification` RPC |
| Content reporting | Done | `mailto:` report link on every post (Apple Guideline 1.2) |
| Privacy Policy page | Done | `public/privacy.html` (static file) |
| Terms of Service | Done | `public/terms.html` (static file) |
| iPhone portrait-only | Done | Info.plist restricts to portrait |
| iPad all orientations | Done | Default Capacitor config |
| Supabase domain allowed | Done | `allowNavigation: ['*.supabase.co']` in `capacitor.config.ts` |

### What YOU Must Do Manually (cannot be automated)

1. **Apple Developer Account** ($99/year) — enroll at [developer.apple.com](https://developer.apple.com)
2. **App Store Connect** — create the app listing with:
   - App name: "My Journal"
   - Bundle ID: `com.retrowave.journal`
   - Content rating: **17+** (UGC apps require this)
   - Privacy Policy URL: your deployed `privacy.html` (e.g., `https://your-supabase-url.supabase.co/storage/v1/object/public/...` or any public host)
3. **Screenshots** — required sizes: iPhone 6.9" (1320x2868), iPhone 6.5" (1284x2778), iPad Pro 12.9" (2048x2732). Take in Xcode Simulator.
4. **App description** — write a brief description for the App Store listing
5. **Signing** — in Xcode, select your team under Signing & Capabilities. Xcode handles provisioning profiles automatically.
6. **Review `terms.html` and `privacy.html`** — AI-generated content, not lawyer-reviewed. Verify accuracy before submission.
7. ~~**Replace SVG icons**~~ — **Done.** All icons now generated as PNGs from `assets/appicon.png` via `node scripts/generate-icons.mjs`.

### Apple Review Gotchas

- **UGC apps (Guideline 1.2)**: Must have content reporting (done — mailto link), moderation (done — OpenAI + regex), and age gate (done — COPPA). Expect extra review scrutiny.
- **WebView apps (Guideline 4.2)**: Apple may reject "thin wrapper" apps. The Xanga aesthetic + offline-capable PWA features help differentiate from a plain website. If rejected, consider adding a native splash screen or push notifications via `@capacitor/push-notifications`.
- **Login required (Guideline 4.0)**: App requires email login to post. Apple may ask for a demo account — prepare one in advance.

## Claude Code Automations

Configured in `.claude/settings.json`. These run automatically — no manual steps needed.

### Hooks

| Hook | Trigger | What It Does |
|------|---------|-------------|
| Prettier auto-format | After every Edit/Write | Formats the file with Prettier so code style is always consistent |
| Block `.env` edits | Before Edit/Write | Prevents accidental exposure of Supabase API keys |
| Block lock file edits | Before Edit/Write | Prevents hand-editing `package-lock.json` / lock files |

### What We Chose Not To Add (and why)

- **MCP servers** — Project is right-sized and CLAUDE.md already documents all patterns. No need for context7 or database MCPs.
- **Custom subagents** — Built-in code-reviewer is sufficient for this codebase size.
- **Custom skills** — Already have the right plugins installed (commit-commands, feature-dev, frontend-design, code-review).

## Xanga-Style Frontend

The entire UI is styled to evoke 2005-era Xanga blogs. All components use CSS custom properties (`var(--accent-primary)`, etc.) so they work across all 8 themes.

### Key Features

| Feature | Implementation | Notes |
|---------|---------------|-------|
| Custom cursors | `index.css` — ✦ default cursor, ♡ for interactive elements | SVG data URIs, disabled on touch devices via `@media (max-width: 480px)` |
| Cursor sparkle trail | `CursorSparkle.tsx` — DOM-based sparkle spans on mousemove | Throttled to 50ms, max 20 sparkles, guarded by `pointer: fine` (no touch devices) |
| Marquee banner | `Header.tsx` — CSS `@keyframes marquee-scroll` | Continuous right-to-left scroll, dotted borders, AnimatePresence on status edit/display |
| AIM-style status | `Header.tsx` + `Sidebar.tsx` — `localStorage` key `xanga-status` | Click to edit inline, AnimatePresence crossfade, CustomEvent sync between components |
| Emoji float-up | `ReactionBar.tsx` — CSS `.emoji-float-up` | Spawns floating emoji on reaction toggle, 800ms animation |
| Lined paper empty state | `EmptyState.tsx` — CSS `repeating-linear-gradient` | Cascading reveal (staggered delays), decorative divider scaleX animation |
| 88x31 pixel badges | `App.tsx` footer + `index.css` `.pixel-badge` | 5 themed CSS-only badges (love/xanga/web2/nostalgia/800x600), zero backend |

### Emoji Style System

Users can choose from 5 emoji rendering styles via ProfileModal. Preference is stored in `localStorage` (key `emoji-style`), not the database. Uses a module-level reactive store (`useEmojiStyle()` hook) so any component can subscribe without React context or prop drilling.

| Style | Library | License | CDN |
|-------|---------|---------|-----|
| `native` | Device default | N/A | None |
| `fluent` | Microsoft Fluent Emoji 3D | MIT | `cdn.jsdelivr.net/gh/ehne/fluentui-twemoji-3d/` |
| `twemoji` | Twemoji (jdecked fork) | CC-BY 4.0 | `cdn.jsdelivr.net/gh/jdecked/twemoji@latest/` |
| `openmoji` | OpenMoji | CC BY-SA 4.0 | `cdn.jsdelivr.net/npm/@svgmoji/openmoji@2.0.0/` |
| `blob` | Google Blob Emoji | Apache 2.0 | `cdn.jsdelivr.net/npm/@svgmoji/blob@2.0.0/` |

**Key files**: `src/lib/emojiStyles.ts` (store + CDN URL builder), `src/components/ui/StyledEmoji.tsx` (render component). Used in `ReactionBar.tsx` for reaction emoji. Falls back to native Unicode on image load error.

### Theme Fonts

Title font varies by theme — **not always Comic Sans**. Applied via `var(--title-font)` on `.xanga-title` and form labels.

| Theme | `--title-font` |
|-------|---------------|
| Classic Xanga (default) | Comic Sans MS, Brush Script MT, cursive |
| Emo Dark | Georgia, Times New Roman, serif |
| Scene Kid | Impact, Arial Black, sans-serif |
| MySpace Blue | Verdana, Tahoma, sans-serif |
| Y2K Cyber | Trebuchet MS, sans-serif |
| Cottage Core | Georgia, Palatino Linotype, serif |
| Grunge | Courier New, Courier, monospace |
| Pastel Goth | Georgia, Palatino, serif |

### Styling Conventions

- **Typography**: `var(--title-font)` on `.xanga-title` and form labels (see theme font table above)
- **Borders**: Dotted borders via `border-2 border-dotted` with `var(--border-primary)`
- **Cards**: `.xanga-box` class for themed card containers
- **Buttons**: `.xanga-button` class for all primary actions. Active state drops shadow to 0 for physical press depth. `whileTap={{ scale: 0.98 }}` on `Button` primitive.
- **Links**: `.xanga-link` class for era-appropriate underlined links
- **Auth backgrounds**: `.xanga-auth-bg` class for full-screen auth/onboarding views
- **Input focus**: Labels shift to accent color via CSS `:has(input:focus)` — no JS. Focus-visible rings via `box-shadow` (WCAG 2.4.7).
- **iPhone responsive**: `@media (max-width: 480px)` in `index.css` for smaller text/padding

### UI Primitive Components

All UI components (primitives + screens) use CSS variables and Xanga-themed classes (`.xanga-box`, `.xanga-button`, `.xanga-link`). Converted from generic modern UI to 2005 Xanga aesthetic: dotted borders, Comic Sans labels, emoji icons (📅⏰✏️🗑️ in PostCard), sparkle headers. `PostCard.tsx` retains Lucide for YouTube/ExternalLink icons. Read individual component files for styling details.

### iPhone Responsiveness

All modals and overlays use `max-h-[95vh]` on mobile (vs `90vh` on desktop). Key responsive patterns:

- PostModal/ProfileModal: `p-2 sm:p-4` outer padding, `p-3 sm:p-4` inner sections
- PostModal form: `grid-cols-1 sm:grid-cols-2` for author/mood row
- AvatarPicker grid: `grid-cols-4 sm:grid-cols-5`
- Theme picker: `gap-2 sm:gap-3` with smaller color swatches on mobile
- All text: appropriate `text-xs`/`text-sm` sizing with `sm:` breakpoints
- Global `@media (max-width: 480px)` reduces marquee speed, header padding, font sizes
- Sidebar: collapsible on mobile (`< lg`), compact summary bar with avatar + name + toggle
- Toast: `left-4 right-4` on mobile (full width), stacked vertically via index
- Touch targets: all interactive elements meet 44px minimum (Button sm/md/lg, Input, ReactionBar, PostCard edit/delete, Toast close, AuthModal tabs, AvatarPicker pills/grid/input)
- Safe area insets: `modal-footer-safe` class adds `env(safe-area-inset-bottom)` padding to PostModal + ProfileModal footers (iPhone notch/home indicator). `safe-area-bottom` utility for general use.
- Input zoom prevention: `font-size: 16px !important` on inputs/textareas/selects at `@media (max-width: 480px)` — iOS Safari zooms viewport when focused input has font-size < 16px

### Accessibility

| Feature | Implementation |
|---------|---------------|
| `prefers-reduced-motion` | CSS media query disables all animations; CursorSparkle checks `pointer: fine` + early-returns; LoadingSpinner uses `useReducedMotion()` from framer-motion; `<MotionConfig reducedMotion="user">` wraps app |
| Focus traps | `src/hooks/useFocusTrap.ts` — Tab/Shift+Tab wrapping in modals, focus restore on close, optional `onEscape` callback (consolidates all Escape key handlers) |
| ARIA attributes | Marquee: `role="marquee" aria-live="off"`. Sidebar: `role="complementary"`. Status: `aria-label="Set your status message"`. Edit/delete: `aria-label`. ConfirmDialog: `aria-labelledby` + `aria-describedby` (not generic `aria-label`) |
| PostCard title semantics | `<h2>` wraps a `<button>` with `aria-label="View post: {title}"` |
| OnboardingFlow | Step indicator: `role="progressbar"` + `aria-valuenow/min/max`. Slide content: `aria-live="polite" aria-atomic="true"` |
| AvatarPicker | Grid buttons: `aria-pressed={selected}` + descriptive `aria-label`. Custom seed: `<label htmlFor>` + input `id` association |
| AuthModal tabs | `role="tab"` + `aria-selected` + `role="tabpanel"` + `aria-controls`/`aria-labelledby` (not `aria-pressed`) |
| Focus-visible rings | `input/textarea/select:focus-visible` gets themed box-shadow ring (WCAG 2.4.7) |

Focus trap is integrated in: `PostModal`, `ProfileModal`, `AuthModal`, `OnboardingFlow`, `ConfirmDialog`.

### UX Polish

| Feature | Implementation |
|---------|---------------|
| Draft auto-save | `PostModal.tsx` — debounced 500ms save to `localStorage` key `post-draft` (create mode only), restored on reopen, cleared on save |
| Marquee pause on hover | CSS-only: `.marquee-banner:hover .marquee-banner-inner { animation-play-state: paused }` |
| Unsaved changes guard | `PostModal.tsx` — warns on close (X/Escape/backdrop/cancel) via styled `ConfirmDialog` if form has unsaved changes |
| Theme/emoji revert | `ProfileModal.tsx` — canceling reverts theme and emoji style to pre-edit values |
| Delete confirmation | `ConfirmDialog.tsx` — styled Xanga modal with loading state (spinning ✦), uses focus trap, motion.button press feedback |
| Skeleton loaders | `PostSkeleton.tsx` — pulsing placeholder cards + `SidebarSkeleton` for initial feed load, matches actual layout |
| Toast polish | Spring entrance (stiffness 400), horizontal exit, swipe-to-dismiss via drag, progress bar countdown, type-specific 4px left accent strip, icon pop bounce, close button rotates 90° on hover |
| Toast stacking | `index` prop offsets toasts vertically, max 3 visible via `useToast.ts` |
| Toast timing by type | Success: 3s, Info: 4s, Error: 6s — configurable via `useToast.ts` `DEFAULT_DURATIONS` |
| Reaction count pulse | `ReactionBar.tsx` — count briefly scales (1.4→1) when value changes via `key={count}` spring animation |
| Error shake animation | `Input.tsx` + `Textarea.tsx` — validation errors shake-in with `x: [-3, 3, -2, 1, 0]` keyframes via AnimatePresence |
| PostCard spring entrance | `PostCard.tsx` — spring physics (stiffness 300, damping 25) with subtle scale (0.98→1) on mount |
| EmptyState cascade | `EmptyState.tsx` — staggered reveal (0.1→0.7s delays), decorative divider scales from center (scaleX: 0→1) |
| Button press depth | `index.css` — `.xanga-button:active` drops shadow to 0 for physical press feel |
| Input label focus shift | `index.css` — `:has(input:focus)` shifts label color to accent via CSS, no JS |
| Collapsible sidebar | Mobile: compact bar (avatar + name + chevron), click to expand. Default **expanded** for new users. State persisted to `localStorage` key `sidebar-collapsed` |
| End-of-list indicator | Feed shows "~ that's all 4 now! ~" when all posts loaded (no silent cutoff) |
| Pagination error handling | `loadMore` failures show inline error with retry link, not full-page error |
| Profile error surfacing | `useAuth` exposes `profileError` — toast shown when profile creation/fetch fails |

## Backend Review Summary

Comprehensive audit completed 2026-02-23. **All 30 findings resolved** across security, hardening, performance, and code quality. Key areas addressed:

- **Security**: `auth.uid()` override in RPCs (prevents user_id spoofing), RPC limit clamping, COPPA field trigger protection, `is_admin` self-elevation prevention, SECURITY DEFINER `set_age_verification` RPC
- **Data integrity**: CHECK constraints on posts + profiles + reactions, `ON CONFLICT DO NOTHING` in profile trigger, `handle_new_user()` derives `age_verified` from `birth_year` arithmetic
- **Performance**: Indexes on `posts.created_at DESC`, `posts.user_id`, `post_reactions.post_id`; excerpt-only feed (`LEFT(content, 500)`) + `get_post_by_id` for full content; `post_likes` table retired
- **Edge function**: Server-side blocklists, 100KB body limit, 5s timeout, keyword sync with client
- **Code quality**: Generic error messages (no schema leaks), 429 non-retryable, cache max size eviction, dead code removal, PromiseLike → async wrappers

## Known Tech Debt

1. **`ModerationResult` type lives in two files** — `src/lib/moderation.ts` and `supabase/functions/moderate-content/index.ts` both define the interface. Shapes are now aligned (both require `severity`), but Deno can't import from Vite so they can't share a single definition. If a shared types package is added, consolidate.
2. **`createProfileForUser` uses a hand-rolled retry loop** instead of `withRetry()` — Intentional: has special `23505` (unique constraint) handling that falls back to a re-fetch. Linear retry (300ms * attempt) is acceptable for this case.
3. **Capacitor iOS setup is scaffolded but not deployed** — `ios/` directory generated, but no Apple Developer account or Xcode build has been run yet. PWA icons are now real PNGs (generated from user's app icon via `scripts/generate-icons.mjs`).

## Agent Session Log

### Frontend (bold-brattain) — 2026-02-23

Xanga-style UI overhaul, accessibility, mobile polish, interaction improvements. Added Q1-Q5 to the Cross-Agent Queue for backend review (all resolved).

### Backend (bold-wozniak) — 2026-02-24

Resolved Q1-Q5. Made `ModerationResult.severity` required in frontend (Q3). Queue cleared.

### Frontend (bold-wozniak) — 2026-02-24

Sessions 1-4: Touch targets (44px), React.memo/useCallback, custom cursors, pixel badges, emoji style system (5 styles, CDN), Product Philosophy, CLAUDE.md audit (87→93).
  Sessions 5-6: UX audit (9 fixes: draft auto-save, unsaved changes guard, sidebar default expanded, loadMore error state, end-of-list indicator, ConfirmDialog loading, profileError surfacing). CLAUDE.md audit (91→96).
  Sessions 7-8: Backend hardening (COPPA trigger protection, `set_age_verification` RPC, handle_new_user null safety, avatar_url constraint, is_admin protection, keyword sync). Retired `post_likes` table + excerpt-only feed + `get_post_by_id` RPC.
  Session 9: Comprehensive 7-batch audit:
  - **Security**: COPPA bypass fix (migration 010 derives `age_verified` from `birth_year`), localStorage try/catch, console.error sanitized
  - **iOS/App Store**: viewport-fit, safe-area CSS, input zoom fix, TOS + privacy pages, PWA manifest, report link (Apple 1.2), Capacitor setup
  - **Performance**: `postsRef` pattern for stable `handleReaction`, hoisted `truncateContent`
  - **Dead code**: 14 categories removed (excerpt, supabase.ts, helper types, unused functions/exports)
  - **Bug fix**: ProfileModal X button → `handleCancel` for theme/emoji revert
  - **Queue**: Added Q6-Q15 for frontend agent review
  Session 10: 15 UX/style fixes + 7 Capacitor plugins:
  - **CSS**: Focus-visible rings (WCAG 2.4.7), :root fallbacks for modal/input vars, explicit transition properties, dark theme shadow glow colors
  - **Components**: PostModal refactored to use Input/Textarea/Select primitives (DRY), YouTube card in view mode, reaction bar two-row layout, Select dropdown arrow, ConfirmDialog themed button text, AuthModal retro animation, onboarding slide accuracy, compact mobile header, ambiguous copy fix
  - **Modal overlays**: 50%→60% opacity for dark theme visibility
  - **Capacitor plugins**: @capacitor/app, status-bar, keyboard, haptics, share, browser, splash-screen (installed, not yet wired up)
  Session 11: Capacitor plugin integration — all 7 plugins wired up:
  - **New file**: `src/lib/capacitor.ts` — centralized Capacitor integration (platform guards, all plugin wrappers)
  - **Deep links**: `App.addListener('appUrlOpen')` in main.tsx for magic link auth redirects
  - **Status bar**: `setStatusBarForTheme()` called from `applyTheme()` — dark themes get light text, light themes get dark text
  - **Keyboard**: `resize: 'body'` in capacitor.config.ts plugin config (prevents modal push on iOS)
  - **Haptics**: Light impact on reaction toggle in `useReactions.ts`
  - **Share**: Share2 icon button in PostCard footer, shares title + content snippet
  - **Browser**: YouTube links in PostCard use `openUrl()` → SFSafariViewController on iOS, window.open on web
  - **Splash screen**: `hideSplashScreen()` after auth resolves in App.tsx, `launchAutoHide: false` in config
  Session 12: Custom app icon + comprehensive audit (8 fixes):
  - **App icons**: User's custom PNG → iOS app icon (1024×1024), splash (2732×2732 ×3), favicon (32×32), PWA icons (192, 512, 180). `scripts/generate-icons.mjs` + sharp.
  - **Manifest/HTML**: SVG icon refs → PNG, `background_color` → `#1a0a2e`, metadata branding "Retrowave Blog" → "My Journal"
  - **Bug fix**: IntersectionObserver used viewport root instead of scroll container — infinite scroll could silently break
  - **Bug fix**: `applyTheme` used `cssText` which destroyed all root inline styles — replaced with `setProperty()` loop
  - **Bug fix**: Sidebar AIM status read localStorage directly — never updated when Header changed it. Added CustomEvent sync.
  - **UX**: PostModal `window.confirm` → styled `ConfirmDialog` for unsaved changes (consistent Xanga aesthetic)
  - **DRY**: Extracted `useYouTubeInfo` hook from identical 25-line blocks in PostCard + Sidebar
  - **A11y**: AuthModal tabs: `aria-pressed` → correct `role="tab"` + `aria-selected` + `role="tabpanel"`
  - **Consistency**: ProfileModal "Currently Listening" raw `<input>` → `Input` primitive
  - **Cleanup**: Removed SVG placeholder icons, scaffold leftovers (vite.svg, react.svg). Resolves Q7.
  Session 13: 13 gap fixes for 10/10 audit across a11y, perf, and UX:
  - **A11y**: ConfirmDialog `aria-labelledby`/`aria-describedby` + Escape via `useFocusTrap`; OnboardingFlow `role="progressbar"` + `aria-live`; AvatarPicker `aria-pressed` + descriptive alts + `<label htmlFor>`; Header status `aria-label`
  - **Perf**: ReactionBar `useEmojiStyle()` lifted to bar level (6→1 subscriptions); `confirmDeletePost` wrapped in `useCallback`; `rootMargin` bottom-only; `scrollbar-thin` class → `scrollbarWidth: 'thin'` inline
  - **UX**: PostSkeleton reaction pills 4→6; new `SidebarSkeleton` export; CursorSparkle `pointer: fine` guard; loading state includes SidebarSkeleton + PostSkeleton
  Session 14: Microinteraction audit + 6 animation fixes:
  - PostModal draft banner AnimatePresence + preview/edit crossfade (0.15s)
  - LoadingSpinner rewritten with `useReducedMotion()` from framer-motion
  - ProfileModal avatar picker toggle AnimatePresence slide-in
  - ConfirmDialog spinning ✦ star loading indicator
  - PostCard edit/delete hover:scale-110 + background tint on hover
  - Header status edit/display AnimatePresence crossfade (width + opacity)
  Session 15: Toast 10/10 + subliminal micro-polish across 8 files:
  - **Toast**: Spring physics entrance, horizontal exit, swipe-to-dismiss via drag, progress bar countdown, type-specific 4px left accent strip, icon pop bounce, close button 90° rotation on hover
  - **Micro-polish**: Reaction count pulse (scale 1.4→1 on change), Input/Textarea error shake-in (AnimatePresence), PostCard spring entrance (scale 0.98→1), ConfirmDialog motion.buttons (whileTap/whileHover), EmptyState cascading reveal (staggered delays), button press depth (shadow→0), input label focus-within color shift (CSS :has())
  Session 16: Full-stack deduplication & divergence audit (20 files, 4 deleted):
  - **Dead code deleted**: `LinkPreview.css` (195 lines, zero class usage), `linkPreview.ts` (entire oEmbed module, zero consumers), `linkPreview.test.ts` (only tested dead module), `types/index.ts` (barrel re-export, zero imports)
  - **Dead types removed**: `LinkType`, `VimeoOEmbedResponse`, `SpotifyMetadata` from link-preview.ts; `UpdateProfileInput`, `SignupData` from profile.ts; `MIN_BIRTH_YEAR`, `MAX_AGE`, `UI` constant, `Mood` type from constants.ts; `hasYouTubeUrl` function from parseYouTube.ts
  - **Cross-agent sync fixes**: BLOCKED_DOMAINS drift (3 entries missing from backend: `imgur.com/a/`, `gfycat`, `documenting`); `PROFILE_LIMITS.username` missing `min: 1` (migration 008 added it); `useAuth.ts` hardcoded `13` → uses `MIN_AGE` constant
  - **DRY**: Extracted `MOOD_SELECT_OPTIONS` from duplicated `MOODS.map()` in PostModal + ProfileModal; App.tsx inline success strings → `SUCCESS_MESSAGES` constants
  - **Export hygiene**: Removed unnecessary `export` from 8 internal-only types/functions across 6 files (UsePostsReturn, ThemeDefinition, ThemeId, RetryOptions, EmojiStyle, emojiToCodepoint, checkUrls, PostValidationErrors, ProfileValidationErrors)
  - **Bug fix**: `motion` not imported in App.tsx (pre-existing — `AnimatePresence`/`MotionConfig` imported but not `motion` for offline banner)
