# Retrowave Blog - Project Guide

## Critical Warnings

- **NEVER open the dev server preview** (Vite `npm run dev`). It crashes the environment. Use `npm run build` to verify changes compile correctly.
- **ALWAYS commit and push before ending a session.** Use `/commit-push-pr` or at minimum `git add . && git commit && git push`. Worktrees reset and uncommitted work is lost forever.

## Cross-Agent Contract

This file is the shared interface between **two independent Claude agents** — one handles frontend, one handles backend. Neither agent sees the other's conversation. This section is the canonical reference for their shared boundaries.

### Frontend ↔ Backend Interface

| Boundary | Frontend Owns | Backend Owns |
|----------|--------------|-------------|
| Auth | `useAuth.ts` consumes session, reads `user_metadata` | Supabase GoTrue config, magic link OTP settings, DB trigger in `005_fix_missing_profiles.sql` |
| Posts | `usePosts.ts` calls RPC, applies optimistic updates | `get_posts_with_reactions` SQL function, `post_constraints` migration |
| Reactions | `useReactions.ts` toggles + rollback | `post_reactions` table, RLS policies |
| Profiles | `useAuth.ts` CRUD, `ProfileModal.tsx` UI | `profiles` table, auto-create trigger, RLS policies |
| Moderation | `src/lib/moderation.ts` calls edge function | `supabase/functions/moderate-content/` (Deno + OpenAI API) |
| Themes | `src/lib/themes.ts` defines CSS vars, UI applies them | `profiles.theme` column stores user's chosen theme |

### Shared Data Shapes (must stay in sync)

| Type | Frontend Location | Backend Location | Notes |
|------|------------------|-----------------|-------|
| Post field limits | `src/lib/validation.ts` `POST_LIMITS` | `20260223000001_post_constraints.sql` CHECK constraints | **Must match exactly** |
| RPC params/return | `src/types/database.ts` `Functions` | `20260223000002_get_posts_rpc.sql` | Frontend types must mirror SQL return shape |
| `ModerationResult` | `src/lib/moderation.ts` (severity optional) | `supabase/functions/moderate-content/index.ts` (severity required) | Known divergence — see Tech Debt |
| Profile fields | `src/types/profile.ts` | `profiles` table columns | Adding a profile field requires both a migration AND a type update |

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
| `sb-*` | Supabase SDK | Auth tokens — never read/write directly |

### Rules for Cross-Agent Changes

1. **Adding a DB column** → backend agent adds migration + RLS; frontend agent updates TypeScript type + UI
2. **Adding an RPC function** → backend agent writes SQL + registers in `database.ts`; frontend agent calls it
3. **Adding an edge function** → backend agent creates in `supabase/functions/`; frontend agent calls via `supabase.functions.invoke()`
4. **Changing validation limits** → update BOTH `validation.ts` AND the SQL migration. Document in this section.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, TypeScript 5.9, Vite 7 |
| Styling | Tailwind CSS 4, CSS custom properties (theme variables) |
| Animation | Framer Motion 12 |
| Backend | Supabase (PostgreSQL + PostgREST + GoTrue Auth + Realtime) |
| Edge Functions | Deno (Supabase Edge Functions) |
| Content Moderation | OpenAI Moderation API via `moderate-content` edge function |
| Virtualization | @tanstack/react-virtual |
| Markdown | react-markdown + rehype-sanitize + DOMPurify |

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

> **⚠️ Do NOT run `npm run dev`** — the Vite dev server crashes the environment. Use `npm run build` + `npm run preview` instead.

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
  App.tsx               # Root component — lazy imports, MotionConfig, toast/confirm state
  index.css             # Global styles, keyframes, theme classes, reduced-motion query
  components/
    Header.tsx          # Marquee banner, AIM status, theme toggle
    Sidebar.tsx         # Profile card, stats, collapsible on mobile
    PostCard.tsx        # Individual post display with reactions
    PostModal.tsx       # Create/edit post form with draft auto-save
    ProfileModal.tsx    # Edit profile (avatar, bio, mood, music, theme)
    AuthModal.tsx       # Login/signup tabs
    OnboardingFlow.tsx  # Multi-step signup wizard
    EmptyState.tsx      # Lined paper journal empty state
    Toast.tsx           # Notification toast with stacking
    LoadingSpinner.tsx  # Themed spinner
    ErrorMessage.tsx    # Themed error display with retry
    ErrorBoundary.tsx   # Class component — catches render errors, fallback UI
    CursorSparkle.tsx   # Mouse trail sparkle effect (respects reduced-motion)
    ConfirmDialog.tsx   # Styled confirm dialog (replaces window.confirm)
    PostSkeleton.tsx    # Pulsing placeholder cards for initial feed load
    LinkPreview.css     # Styles for embedded link previews
    ui/                 # Reusable primitives (Input, Button, Card, Textarea, Avatar, AvatarPicker, Select, ReactionBar)
  hooks/
    useAuth.ts          # Authentication, profile CRUD, session management
    usePosts.ts         # Post feed with pagination, caching, CRUD, optimistic reactions
    useReactions.ts     # Emoji reaction toggle with optimistic updates + rollback
    useLikes.ts         # Like/unlike (UNUSED — see Known Tech Debt)
    useToast.ts         # Toast notification state (max 3, type-based durations)
    useFocusTrap.ts     # Keyboard focus trap for modals
  lib/
    supabase.ts         # Supabase client singleton (reads VITE_SUPABASE_URL/KEY from env)
    errors.ts           # Error mapping — raw Supabase errors → user-safe messages
    retry.ts            # Exponential backoff with jitter for transient failures
    validation.ts       # Client-side field validation (mirrors DB constraints)
    cache.ts            # TTL cache for posts feed and YouTube titles
    moderation.ts       # Content moderation (local filter + AI edge function)
    themes.ts           # 8 theme definitions, CSS variable application
    constants.ts        # App-wide constants (age limits, validation rules, mood emojis, messages)
    linkPreview.ts      # URL detection, YouTube/Vimeo/Spotify oEmbed fetching
  types/
    index.ts            # Barrel re-exports from post, link-preview, supabase
    post.ts             # Post, CreatePostInput, UpdatePostInput
    profile.ts          # Profile, UpdateProfileInput, SignupData
    database.ts         # Supabase generated types + RPC function types
    link-preview.ts     # LinkPreview, LinkType
    like.ts             # PostLike, PostWithLikes (UNUSED — see Known Tech Debt)
    supabase.ts         # SupabaseConfig, DatabaseError, SupabaseResponse<T>
  utils/
    parseYouTube.ts     # YouTube URL parsing + cached oEmbed title fetch
    formatDate.ts       # formatDate() + formatRelativeDate() via date-fns

supabase/
  config.toml           # Local dev config (ports, auth settings, edge runtime)
  migrations/           # SQL migrations (run in order by Supabase CLI)
  functions/
    moderate-content/   # Content moderation endpoint (Deno, JWT-protected, uses OpenAI API)
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

### Caching

`src/lib/cache.ts` provides a `TTLCache` class with two singleton instances:

- `postsCache` (5 min TTL) - Keyed by `"userId:cursor"`. Invalidated on any mutation (create/update/delete/reaction).
- `youtubeTitleCache` (60 min TTL) - Keyed by YouTube video ID. Prevents redundant oEmbed fetches.

Both caches are in-memory Maps that persist across re-renders but reset on page reload.

### Pagination

Posts use **cursor-based pagination** via the `get_posts_with_reactions` RPC function:

- Page size: 20 posts (constant `PAGE_SIZE` in `usePosts.ts`)
- Cursor: `created_at` timestamp of the last post on the current page
- First page: `p_cursor = null`
- Next page: `p_cursor = posts[posts.length - 1].created_at`
- Max page size capped at 100 in the SQL function

The `usePosts` hook exposes: `loadMore()`, `loadingMore`, `hasMore`.

### Optimistic Updates (Reactions)

Emoji reactions update the UI instantly without waiting for the server:

1. `useReactions.toggleReaction()` calls `onOptimisticUpdate()` immediately
2. `usePosts.applyOptimisticReaction()` updates the post's `reactions` and `user_reactions` in state
3. Server request fires in background
4. On server error: `onOptimisticUpdate()` is called again with opposite values (rollback)
5. Cache is invalidated so next refetch gets fresh data

The wiring in `App.tsx`:
```
usePosts() --applyOptimisticReaction--> useReactions({ onOptimisticUpdate })
```

### Authentication Flow

1. User enters email -> age verification -> `signUp()` sends magic link via OTP
2. User clicks magic link -> `onAuthStateChange` fires -> `fetchProfile()` loads or creates profile
3. Profile creation reads `user_metadata` (age_verified, tos_accepted, birth_year) from the auth user
4. If profile doesn't exist, `createProfileForUser()` inserts it (with retry for race conditions against the DB trigger in migration `005_fix_missing_profiles.sql`)

Session management: `getSession()` is the initial source of truth. `onAuthStateChange` handles subsequent changes but skips `INITIAL_SESSION` to avoid duplicate fetches.

### Content Moderation

`src/lib/moderation.ts` runs a two-layer check:
1. **Local filter** (client-side): Regex-based blocked patterns for slurs, hate speech, violence
2. **AI moderation** (server-side): Calls `moderate-content` edge function which uses OpenAI's moderation API

The edge function (`supabase/functions/moderate-content/index.ts`) requires JWT authentication. The client passes the auth token:

```typescript
moderateContent(title, content, embeddedLinks, async () => {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
});
```

### RPC Function: `get_posts_with_reactions`

Single SQL query that replaces the old N+1 waterfall (posts query + reactions query per post). Returns:

- All post fields
- `profile_display_name`, `profile_avatar_url` (from joined profiles)
- `like_count` (aggregate from post_likes)
- `user_has_liked` (boolean, requires p_user_id)
- `reactions` (jsonb object like `{"heart": 3, "fire": 1}`)
- `user_reactions` (jsonb array like `["heart"]`, requires p_user_id)

Calling convention:
```typescript
supabase.rpc('get_posts_with_reactions', {
  p_cursor: cursor,   // timestamptz | null
  p_limit: 20,        // integer (max 100)
  p_user_id: userId,  // uuid | null
})
```

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

Theme is persisted in `profiles.theme` (database column), not localStorage. Applied on login via `applyTheme()` from `themes.ts`.

## Database Migrations

Run in order by filename. Key migrations:

| Migration | Purpose |
|-----------|---------|
| `003_post_reactions_and_theme.sql` | Reactions table, theme support |
| `004_profile_mood_music.sql` | Mood/music fields on profiles |
| `005_fix_missing_profiles.sql` | DB trigger auto-creates profiles on signup |
| `20260125000000_add_age_validation.sql` | Age verification fields |
| `20260223000001_post_constraints.sql` | CHECK constraints on posts (sync with `validation.ts`) |
| `20260223000002_get_posts_rpc.sql` | `get_posts_with_reactions` RPC function |

## Development Notes

### devSignUp (Development Only)

`useAuth.ts` includes a `devSignUp` function that uses anonymous auth to bypass the magic link flow. It's gated behind `import.meta.env.DEV` and tree-shaken from production builds. This is a temporary development convenience and will be removed once the magic link flow is fully configured.

### Hook Return Patterns

All mutation hooks follow the pattern `Promise<{ data?: T | null; error: string | null }>`:
- `error` is always a user-safe string from `toUserMessage()`, never a raw Error
- `data` is present on success, `null` on failure

### Type Registration for RPC

Custom RPC functions must be registered in `src/types/database.ts` under `Database.public.Functions` for type safety. See `get_posts_with_reactions` for the pattern.

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
| Cursor sparkle trail | `CursorSparkle.tsx` — DOM-based sparkle spans on mousemove | Throttled to 50ms, max 20 sparkles, CSS animation cleanup |
| Marquee banner | `Header.tsx` — CSS `@keyframes marquee-scroll` | Continuous right-to-left scroll, dotted borders |
| AIM-style status | `Header.tsx` + `Sidebar.tsx` — `localStorage` key `xanga-status` | Click to edit inline, Enter to save, Escape to cancel |
| Emoji float-up | `ReactionBar.tsx` — CSS `.emoji-float-up` | Spawns floating emoji on reaction toggle, 800ms animation |
| Lined paper empty state | `EmptyState.tsx` — CSS `repeating-linear-gradient` | Typing cursor animation, journal page aesthetic |

### Theme Fonts

Title font varies by theme — **not always Comic Sans**. Applied via `var(--title-font)` on `.xanga-title` and form labels.

| Theme | `--title-font` |
|-------|---------------|
| Classic Xanga (default) | Comic Sans MS, Brush Script MT, cursive |
| Emo Dark | Georgia, Times New Roman, serif |
| Scene Kid | Impact, Arial Black, sans-serif |
| MySpace Blue | Verdana, Tahoma, sans-serif |
| Y2K Cyber | Trebuchet MS, Orbitron, sans-serif |
| Cottage Core | Georgia, Palatino Linotype, serif |
| Grunge | Courier New, Courier, monospace |
| Pastel Goth | Georgia, Palatino, serif |

### Styling Conventions

- **Typography**: `var(--title-font)` on `.xanga-title` and form labels (see theme font table above)
- **Borders**: Dotted borders via `border-2 border-dotted` with `var(--border-primary)`
- **Cards**: `.xanga-box` class for themed card containers
- **Buttons**: `.xanga-button` class for all primary actions
- **Links**: `.xanga-link` class for era-appropriate underlined links
- **Auth backgrounds**: `.xanga-auth-bg` class for full-screen auth/onboarding views
- **iPhone responsive**: `@media (max-width: 480px)` in `index.css` for smaller text/padding

### UI Primitive Components

All reusable UI components use CSS variables so they adapt to the active theme:

| Component | Key Changes |
|-----------|-------------|
| `Input.tsx` | Dotted borders, themed label (Comic Sans), emoji error prefix |
| `Button.tsx` | Primary uses `.xanga-button`, secondary/ghost/danger use themed CSS vars, spinner is `✦` |
| `Card.tsx` | Uses `.xanga-box` base with variant-specific border colors |
| `Textarea.tsx` | Dotted borders, themed label, themed char count colors |
| `Avatar.tsx` | Border uses `var(--accent-primary)` instead of hardcoded pink |
| `AvatarPicker.tsx` | All pills/buttons use CSS vars, grid is 4-col on mobile / 5-col desktop |

### Components Restyled

All of these were converted from generic modern UI (iOS-style gradients, blue/violet colors) to Xanga-themed:

**Auth flow:**
- `AuthModal.tsx` — Xanga tabs with dotted borders, sparkle emoji header
- `SignUpForm.tsx` — `.xanga-box` cards, Comic Sans headers, `.xanga-button` submit
- `LoginForm.tsx` — Native inputs with dotted borders, Xanga-era mode toggle links
- `AgeVerification.tsx` — `.xanga-box` sections, themed dropdown, emoji-based notices
- `OnboardingFlow.tsx` — Step counter wizard (not iOS carousel), Next/Back buttons, emoji illustrations

**Core screens:**
- `PostModal.tsx` — Comic Sans labels ("entry title:", "ur thoughts:"), dotted-border inputs, `.xanga-link` preview toggle, themed cancel button
- `ProfileModal.tsx` — Xanga-styled section headers, themed dropdowns/inputs, dotted-border theme picker, responsive 2-col grid
- `PostCard.tsx` — `.xanga-link` for "read more", fully themed via CSS vars
- `EmptyState.tsx` — Lined paper journal page with typing cursor
- `Toast.tsx` — `.xanga-box` with themed border colors, emoji icons instead of Lucide icons
- `LoadingSpinner.tsx` — Themed border colors via CSS vars, "~ loading... ~" text
- `ErrorMessage.tsx` — `.xanga-box` error display with emoji, themed retry button

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
- Touch targets: all interactive elements meet 44px minimum (ReactionBar, PostCard edit/delete, Toast close)

### Accessibility

| Feature | Implementation |
|---------|---------------|
| `prefers-reduced-motion` | CSS media query disables all animations; CursorSparkle early-returns; `<MotionConfig reducedMotion="user">` wraps app |
| Focus traps | `src/hooks/useFocusTrap.ts` — Tab/Shift+Tab wrapping in modals, focus restore on close |
| ARIA attributes | Marquee: `role="marquee" aria-live="off"`. Sidebar: `role="complementary"`. Status: `aria-label`. Edit/delete: `aria-label` |
| PostCard title semantics | `<h2>` wraps a `<button>` with `aria-label="View post: {title}"` |

Focus trap is integrated in: `PostModal`, `ProfileModal`, `AuthModal`, `OnboardingFlow`, `ConfirmDialog`.

### UX Polish

| Feature | Implementation |
|---------|---------------|
| Draft auto-save | `PostModal.tsx` — debounced 500ms save to `localStorage` key `post-draft` (create mode only), restored on reopen, cleared on save |
| Marquee pause on hover | CSS-only: `.marquee-banner:hover .marquee-banner-inner { animation-play-state: paused }` |
| Delete confirmation | `ConfirmDialog.tsx` — styled Xanga modal replaces `window.confirm()`, uses focus trap |
| Skeleton loaders | `PostSkeleton.tsx` — 3 pulsing placeholder cards for initial feed load, matches PostCard layout |
| Toast stacking | `index` prop offsets toasts vertically, max 3 visible via `useToast.ts` |
| Toast timing by type | Success: 3s, Info: 4s, Error: 6s — configurable via `useToast.ts` `DEFAULT_DURATIONS` |
| Collapsible sidebar | Mobile: compact bar (avatar + name + chevron), click to expand full sidebar content |

## Known Tech Debt

1. **`useLikes.ts` + `types/like.ts` are unused** — The `post_likes` table exists and the RPC aggregates likes, but no UI component calls `likePost()`/`unlikePost()`. The reactions system (`useReactions`) handles all user interactions. Either wire up likes in UI or remove the hook + types.
2. **`ModerationResult` type is duplicated** — Defined in both `src/lib/moderation.ts` (optional `severity`) and `supabase/functions/moderate-content/index.ts` (required `severity`). The edge function is Deno so sharing types is non-trivial. If you add a shared types package, consolidate this.
3. **`createProfileForUser` uses a hand-rolled retry loop** instead of `withRetry()` — This is intentional because it has special `23505` (unique constraint) handling that falls back to a re-fetch rather than a simple retry. The generic retry is linear (300ms * attempt) instead of exponential, which is acceptable for this specific case.
4. **`react-syntax-highlighter` is installed but unused** — Listed in `package.json` (+ `@types/react-syntax-highlighter`). No component imports it. Either use it for markdown code blocks or remove both packages.
5. **`ui/Select.tsx` uses hardcoded white background** — Not themed with CSS variables like other UI primitives. Needs `var(--card-bg)` and `var(--border-primary)` treatment to match the Xanga styling conventions.
