# Retrowave Blog - Project Guide

## Critical Warnings

- **NEVER open the dev server preview** (Vite `npm run dev`). It crashes the environment. Use `npm run build` to verify changes compile correctly.
- **ALWAYS commit and push before ending a session.** Use `/commit-push-pr` or at minimum `git add . && git commit && git push`. Worktrees reset and uncommitted work is lost forever.

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
```

## Project Structure

```
src/
  components/         # React components (UI layer)
  hooks/              # Custom React hooks (data/business logic)
    useAuth.ts        # Authentication, profile CRUD, session management
    usePosts.ts       # Post feed with pagination, caching, CRUD, optimistic reactions
    useReactions.ts   # Emoji reaction toggle with optimistic updates + rollback
    useLikes.ts       # Like/unlike (legacy - currently unused, see Known Tech Debt)
    useToast.ts       # Toast notification state
  lib/                # Shared utilities
    supabase.ts       # Supabase client singleton
    errors.ts         # Error mapping - raw Supabase errors -> user-safe messages
    retry.ts          # Exponential backoff with jitter for transient failures
    validation.ts     # Client-side field validation (mirrors DB constraints)
    cache.ts          # TTL cache for posts feed and YouTube titles
    moderation.ts     # Content moderation (local filter + AI edge function)
    themes.ts         # Theme management (CSS custom properties)
  types/              # TypeScript type definitions
    post.ts           # Post, CreatePostInput, UpdatePostInput
    profile.ts        # Profile, UpdateProfileInput, SignupData
    database.ts       # Supabase generated types + RPC function types
    link-preview.ts   # Link preview type
  utils/              # Pure utility functions
    parseYouTube.ts   # YouTube URL parsing + cached oEmbed title fetch

supabase/
  migrations/         # SQL migrations (run in order by Supabase CLI)
  functions/          # Deno edge functions
    moderate-content/ # Content moderation endpoint (JWT-protected)
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

### Styling Conventions

- **Typography**: Comic Sans via `var(--title-font)`, applied on `.xanga-title` and form labels
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

## Known Tech Debt

1. **`useLikes.ts` is unused** - The `post_likes` table exists and the RPC aggregates likes, but no UI component calls `likePost()`/`unlikePost()`. The reactions system (`useReactions`) handles all user interactions. Either wire up likes in UI or remove the hook.
2. **`ModerationResult` type is duplicated** - Defined in both `src/lib/moderation.ts` (optional `severity`) and `supabase/functions/moderate-content/index.ts` (required `severity`). The edge function is Deno so sharing types is non-trivial. If you add a shared types package, consolidate this.
3. **`createProfileForUser` uses a hand-rolled retry loop** instead of `withRetry()` - This is intentional because it has special `23505` (unique constraint) handling that falls back to a re-fetch rather than a simple retry. The generic retry is linear (300ms * attempt) instead of exponential, which is acceptable for this specific case.
