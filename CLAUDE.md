# Retrowave Blog

## Product Philosophy

Bare-bones Xanga/LiveJournal nostalgia blog. Solo operator, zero overhead.

**Not building (by design):** comments, search/filter, follow system, admin dashboard, analytics, notifications, DMs, tags/categories, RSS.

Keep moderation minimal — client-side regex only is fine. No heavy AI moderation pipeline.

If a feature requires ongoing moderation, storage costs, or maintenance → don't build it.
Decorative features (sparkles, badges, animations) are fine — they cost nothing.

## Commands

```bash
npm run dev            # Vite dev server (port 5174)
npm run build          # Production build
npm run preview        # Preview production build
npm run lint           # ESLint
npm run test           # Vitest (run once)
npm run test:watch     # Vitest (watch mode)
npm run format         # Prettier (singleQuote, printWidth: 100)
npx tsc --noEmit       # Type check
```

## Tech Stack

React 19 + TypeScript 5.9 + Vite 7 + Tailwind CSS 4 + Framer Motion + Supabase (PostgreSQL + Auth + Edge Functions).

No Express/Node server. Entire backend is Supabase (PostgREST + GoTrue). All backend logic lives in SQL migrations, RLS policies, and Deno edge functions.

## Environment

Copy `.env.example` → `.env`:
```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

`OPENAI_API_KEY` is a Supabase edge function secret (not in `.env`): `supabase secrets set OPENAI_API_KEY=sk-...`

## Project Structure

```
src/
  App.tsx                 # Root — lazy imports, modal state, virtual list, theme application
  index.css               # Tailwind + global styles, theme CSS vars, keyframes
  components/
    Header.tsx            # Marquee banner, AIM status, theme toggle
    Sidebar.tsx           # Profile card, collapsible on mobile
    PostCard.tsx          # Post display with emoji reactions, block/report
    PostModal.tsx         # Create/edit post (markdown, mood, music, swipe-to-dismiss)
    ProfileModal.tsx      # Edit profile, account deletion, data export
    AuthModal.tsx         # Login/signup tabs (magic link + password)
    OnboardingFlow.tsx    # First-time signup wizard
    AgeVerification.tsx   # COPPA age gate (13+)
    ConfirmDialog.tsx     # Styled confirm dialog (replaces window.confirm)
    CursorSparkle.tsx     # Mouse trail sparkle effect
    Toast.tsx             # Notification toasts (spring physics, swipe-to-dismiss)
    PostSkeleton.tsx      # Loading skeleton placeholders
    ErrorBoundary.tsx     # React error boundary with retry
    ui/                   # Primitives: Input, Button, Card, Textarea, Avatar, AvatarPicker,
                          #   Select, ReactionBar, StyledEmoji, YouTubeCard
  hooks/
    useAuth.ts            # Auth + profile CRUD + session management
    usePosts.ts           # Post feed + pagination + CRUD + optimistic reactions
    useReactions.ts       # Emoji reaction toggle (optimistic + rollback)
    useBlocks.ts          # User blocking toggle + blocked users list
    useYouTubeInfo.ts     # YouTube URL parsing + title fetch
    useOnlineStatus.ts    # Browser online/offline detection
    useToast.ts           # Toast notification state
    useFocusTrap.ts       # Keyboard focus trap for modals
  lib/
    supabase.ts           # Supabase client singleton
    errors.ts             # Raw Supabase errors → user-safe messages
    auth-guard.ts         # Shared requireAuth() helper
    retry.ts              # Exponential backoff with jitter
    validation.ts         # Client-side field validation (mirrors DB constraints)
    cache.ts              # TTL cache for posts feed and YouTube titles
    moderation.ts         # Client-side content filtering (regex + domain blocking)
    themes.ts             # 8 theme definitions + CSS variable application
    constants.ts          # Moods, validation rules, error/success messages
    emojiStyles.ts        # Emoji rendering styles (native + CDN sets)
    capacitor.ts          # Capacitor plugin wrappers (no-op on web)
  types/                  # TypeScript definitions (post, profile, database, link-preview)
  utils/                  # formatDate, parseYouTube

supabase/
  migrations/             # 24 SQL migrations (run in order)
  functions/
    moderate-content/     # Edge function for AI moderation (optional)
```

## Architecture Patterns

- **Themes**: 8 retro themes via CSS custom properties. Stored in `profiles.theme`. Use `var(--accent-primary)`, `var(--card-bg)`, etc.
- **Auth**: Magic link OTP via Supabase GoTrue. COPPA age gate (13+). `requireAuth()` for all authenticated ops.
- **Error handling**: All Supabase errors go through `toUserMessage()` from `errors.ts`. Never expose raw errors to UI.
- **Retry**: `withRetry()` provides exponential backoff. Wrap Supabase queries with `async` (PromiseLike issue).
- **Feed**: Cursor-based pagination via `get_posts_with_reactions` RPC (20/page). Excerpt-only feed (500 chars).
- **Reactions**: Emoji set `['❤️', '🔥', '😂', '😢', '✨', '👀']`. Optimistic UI with in-flight guard + 400ms cooldown.
- **Blocking**: Bidirectional user blocking. Feed RPCs and reactions RLS both filter blocked users.
- **Validation**: `validation.ts` mirrors DB CHECK constraints. Keep `POST_LIMITS` and `PROFILE_LIMITS` in sync with SQL.
- **Lazy loading**: PostModal, ProfileModal, AuthModal, AgeVerification, OnboardingFlow are `React.lazy()`.
- **Caching**: `postsCache` (5min TTL), `youtubeTitleCache` (60min TTL). Both invalidated on mutations.

## Styling Conventions

- Xanga-era aesthetic: Comic Sans, dotted borders, marquee banners
- `.xanga-box` (cards), `.xanga-button` (actions), `.xanga-link` (links), `.xanga-title` (headings)
- All components use CSS vars — works across all 8 themes
- Borders: `border-2 border-dotted` with `var(--border-primary)`
- Touch targets: all interactive elements ≥ 44px
- `prefers-reduced-motion` respected everywhere

## Gotchas

- `is_admin` is trigger-protected — `supabase.from('profiles').update({ is_admin: true })` silently fails
- COPPA fields (`age_verified`, `tos_accepted`, `birth_year`) are trigger-protected — only `set_age_verification` RPC can set them
- TypeScript strict mode with `noUncheckedIndexedAccess` — array indexing returns `T | undefined`
- Supabase query builders return `PromiseLike` not `Promise` — always wrap with `async` in `withRetry()`
- Path aliases: `@/`, `@/components`, `@/hooks`, `@/utils`, `@/lib` (defined in both vite.config.ts and tsconfig.json)
- Vitest config lives in `vite.config.ts`, not a separate file
- All `localStorage` access is wrapped in try/catch (Safari private browsing throws on `setItem()`)
- `devSignUp` in useAuth.ts uses anonymous auth, gated behind `import.meta.env.DEV`
