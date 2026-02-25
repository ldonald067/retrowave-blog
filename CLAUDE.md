# Retrowave Blog - Project Guide

## Critical Warnings

- **NEVER open the dev server preview** (Vite `npm run dev`). It crashes the environment. Use `npm run build` to verify changes compile correctly.
- **ALWAYS commit and push before ending a session.** Use `/commit-push-pr` or at minimum `git add . && git commit && git push`. Worktrees reset and uncommitted work is lost forever.
- **Never expose raw `error.message` from Supabase in the UI.** Always use `toUserMessage(err)` from `src/lib/errors.ts`.

## Overview

**Retrowave Blog** is a Xanga/MySpace-era nostalgia journal app. Users sign up via magic link email, write Markdown blog posts, and react with emoji. The aesthetic is aggressively 2005: Comic Sans, dotted borders, marquee banners, AIM status messages, cursor sparkles, and 88x31 pixel badges.

| Layer | What | Where |
|-------|------|-------|
| **Web app** | React 19 SPA, 8 retro themes, lazy-loaded modals, virtualized feed | `src/` |
| **iOS app** | Capacitor 8 wrapper (haptics, share, deep links, status bar) | `ios/`, `capacitor.config.ts` |
| **Database** | Supabase PostgreSQL — posts, profiles, reactions (no comments, no likes) | `supabase/migrations/` |
| **Auth** | Magic link OTP via Supabase GoTrue, COPPA age gate (13+) | `useAuth.ts`, migrations 005-010 |
| **Moderation** | 3-layer: local regex → OpenAI API edge function → fail-open | `moderation.ts`, `supabase/functions/` |
| **Blocking** | Bidirectional user blocking (Apple 1.2), reactions RLS, `is_blocked_pair()` helper | `useBlocks.ts`, `user_blocks` table, migrations 000001-000002 |

**Not built (by design):** comments, analytics, RSS, visitor counters, likes, custom reactions, cron jobs.

### Product Philosophy

Solo operator, low budget, zero moderation overhead. Every feature must pass: "Does this require moderation, storage, or money?" If yes → don't build it. Supabase free tier only. Decorative features (pixel badges, sparkles) are fine because they cost nothing.

## Commands

```bash
npm run build          # Production build (USE THIS to verify changes)
npm run preview        # Serve production build locally (safe alternative to dev server)
npm run lint           # ESLint (JS/JSX only — TS errors caught by tsc)
npm run test           # Vitest (run once)
npm run test:watch     # Vitest (watch mode)
npm run format         # Prettier (singleQuote, printWidth: 100)
npx tsc --noEmit       # Type check without emitting
```

Capacitor (iOS — macOS only):
```bash
npm run build && npx cap sync   # Sync web build to iOS project
npx cap open ios                # Open in Xcode
```

## Environment Setup

Copy `.env.example` to `.env`:
```bash
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

`OPENAI_API_KEY` is **not** in `.env` — it's a Supabase edge function secret: `supabase secrets set OPENAI_API_KEY=sk-...`

## Tech Stack

React 19, TypeScript 5.9, Vite 7, Tailwind CSS 4, Framer Motion 12, Supabase (Postgres + PostgREST + GoTrue), Capacitor 8, @tanstack/react-virtual, react-markdown + rehype-sanitize, lucide-react.

**No Express/Node server.** The entire backend is Supabase. PostgREST auto-generates a REST API from PostgreSQL. All "backend" logic lives in SQL migrations, RLS policies, and Deno edge functions.

## Project Structure

```
src/
  App.tsx               # Root — lazy imports, MotionConfig, toast/confirm/block state
  index.css             # Global styles, keyframes, theme vars, safe area, reduced-motion
  components/
    Header.tsx          # Marquee banner, AIM status, theme toggle
    Sidebar.tsx         # Profile card, stats, collapsible on mobile
    PostCard.tsx        # Post display with reactions, block/report buttons (Apple 1.2)
    PostModal.tsx       # Create/edit post with draft auto-save (MODAL_CHROME_HEIGHT=140)
    ProfileModal.tsx    # Edit profile, blocked users, account deletion + data export (MODAL_CHROME_HEIGHT=180)
    AuthModal.tsx       # Login/signup tabs
    OnboardingFlow.tsx  # Multi-step signup wizard
    AgeVerification.tsx # COPPA age gate (lazy-loaded)
    Toast.tsx           # Spring physics, swipe-to-dismiss, type accents
    ConfirmDialog.tsx   # Styled confirm dialog (focus trap, loading state)
    CursorSparkle.tsx   # Mouse trail sparkle (pointer:fine guard, reduced-motion)
    ErrorBoundary.tsx   # React error boundary with retry
    ErrorMessage.tsx    # Styled error display
    EmptyState.tsx      # Empty feed placeholder
    PostSkeleton.tsx    # Loading skeletons (exports PostSkeleton + SidebarSkeleton)
    LoadingSpinner.tsx  # Spinner primitive
    LoginForm.tsx       # Login tab content
    SignUpForm.tsx      # Signup tab content
    ui/                 # Primitives: Input, Button, Card, Textarea, Avatar, AvatarPicker,
                        #   Select, ReactionBar, StyledEmoji, YouTubeCard
  hooks/
    useAuth.ts          # Auth, profile CRUD, session management
    usePosts.ts         # Post feed + pagination + CRUD + optimistic reactions
    useReactions.ts     # Emoji reaction toggle (optimistic + rollback)
    useBlocks.ts        # User blocking toggle + blocked users list
    useYouTubeInfo.ts   # YouTube URL parsing + title fetch (shared by PostCard, Sidebar, PostModal)
    useOnlineStatus.ts  # Browser online/offline
    useToast.ts         # Toast notification state (max 3, type-based durations)
    useFocusTrap.ts     # Keyboard focus trap for modals
  lib/
    supabase.ts         # Supabase client singleton
    errors.ts           # Error mapping — raw Supabase errors → user-safe messages
    auth-guard.ts       # Shared `requireAuth()` — eliminates duplicated getSession() patterns
    retry.ts            # Exponential backoff with jitter for transient failures
    validation.ts       # Client-side field validation (mirrors DB CHECK constraints)
    cache.ts            # TTL cache for posts feed and YouTube titles
    moderation.ts       # Content moderation (local filter + AI edge function)
    themes.ts           # 8 theme definitions, CSS variable application
    capacitor.ts        # Capacitor plugin wrappers (deep links, status bar, haptics, share)
    emojiStyles.ts      # 5 emoji styles (native + 4 CDN sets), reactive store
    constants.ts        # BLOG_OWNER_EMAIL, age limits, moods, VALIDATION, ERROR_MESSAGES, SUCCESS_MESSAGES
    linkPreview.ts      # Link preview metadata (Vimeo, Spotify, Twitter, generic)
  types/
    post.ts             # Post, CreatePostInput
    profile.ts          # Profile
    database.ts         # Supabase types + RPC function types
    supabase.ts         # SupabaseConfig, DatabaseError, SupabaseResponse
    link-preview.ts     # LinkPreview, LinkType, oEmbed response types, DetectedUrl
  utils/
    parseYouTube.ts     # YouTube URL parsing + cached oEmbed title fetch (SINGLE SOURCE OF TRUTH)
    formatDate.ts       # formatDate() + formatRelativeDate()
  test/
    setup.ts            # Vitest setup — imports @testing-library/jest-dom/vitest

supabase/
  migrations/           # SQL migrations (run in order)
  functions/
    moderate-content/   # Content moderation endpoint (Deno, JWT-protected, OpenAI API)
```

## Architecture Patterns

### Auth Guard

Use `requireAuth()` from `src/lib/auth-guard.ts` for all authenticated operations:
```typescript
const { user, error: authError } = await requireAuth();
if (authError || !user) return { error: authError ?? 'You must be logged in to do that.' };
```

### Error Handling

All Supabase errors go through `toUserMessage()` from `src/lib/errors.ts`. The error code list (`POSTGREST_CODES`) is the single source of truth — `retry.ts` imports it to derive non-retryable errors.

### Retry Logic

`withRetry()` provides exponential backoff with jitter. **Important**: Supabase query builders return `PromiseLike`, not `Promise`. Always wrap with `async`:
```typescript
const { data, error } = await withRetry(async () => supabase.from('posts').select('*'));
```

### YouTube Parsing

`src/utils/parseYouTube.ts` is the **single source of truth** for YouTube URL extraction, parsing, and title fetching. The dependency chain:
- `parseYouTube.ts` → `useYouTubeInfo.ts` (hook) → `YouTubeCard.tsx` (UI)
- `linkPreview.ts` imports `extractYouTubeId` for internal use only — does NOT re-export it

### Pagination

Cursor-based via `get_posts_with_reactions` RPC. Page size: 20. Cursor: `created_at` timestamp. Feed returns `LEFT(content, 500)` + `content_truncated` boolean. Full content loaded on-demand via `get_post_by_id`.

### Optimistic Updates (Reactions)

1. `useReactions.toggleReaction()` checks in-flight guard + 400ms cooldown
2. Calls `onOptimisticUpdate()` immediately (UI updates)
3. Server request fires in background
4. On error: calls `onOptimisticUpdate()` with opposite values (rollback)

Debounce guards: `inFlightRef` (`Set<string>`) prevents competing insert+delete. `cooldownRef` (`Map<string, number>`) handles rapid iPhone taps.

### User Blocking (Apple Guideline 1.2)

**Bidirectional blocking** — neither party sees the other's posts or can react to them.

| Component | What |
|-----------|------|
| `user_blocks` table | Stores blocker_id/blocked_id pairs with RLS |
| `toggle_user_block` RPC | SECURITY DEFINER toggle (insert or delete) |
| `is_blocked_pair()` SQL function | Bidirectional check used by feed RPCs and reactions RLS |
| Feed RPCs | `get_posts_with_reactions` and `get_post_by_id` both call `is_blocked_pair()` |
| Reactions RLS | INSERT policy prevents blocked users from reacting to each other's posts |
| PostCard UI | Block button (Ban icon, 44px touch target) + Report link (Flag icon) |
| ProfileModal | Blocked users list with unblock buttons |

### Caching

- `postsCache` (5 min TTL, max 50) — keyed by `"userId:cursor"`, invalidated on any mutation
- `youtubeTitleCache` (60 min TTL, max 200) — keyed by video ID

### Lazy Loading

Heavy modals use `React.lazy()` in `App.tsx` with `<Suspense fallback={<LazyFallback />}>`.

## Config & Tooling

- **TypeScript strict mode** — `noUncheckedIndexedAccess` is enabled, so array indexing returns `T | undefined`. Use optional chaining or guards.
- **ESLint only lints JS/JSX** — TypeScript errors are caught by `tsc`, not ESLint. Run both `npm run lint` and `npx tsc --noEmit`.
- **Prettier** — `singleQuote: true`, `printWidth: 100`, `trailingComma: 'es5'`.
- **Path aliases** — `@`, `@/components`, `@/hooks`, `@/utils`, `@/lib` (defined in both `vite.config.ts` and `tsconfig.json`).
- **Vitest config lives in `vite.config.ts`** — no separate `vitest.config.ts`. Setup file: `src/test/setup.ts`. CSS disabled in tests (`css: false`).
- **Vite dev port** — `5174` (not default 5173). Irrelevant since dev server is banned, but `npm run preview` uses it.
- **Build chunks** — `vendor-motion`, `vendor-markdown`, `vendor-supabase` split for cache efficiency.
- **Capacitor config** — `Keyboard.resize: 'body'` (prevents modal push), `SplashScreen.launchAutoHide: false` (hidden manually in `initCapacitor()`), `server.allowNavigation: ['*.supabase.co']`.

## Shared Data Contracts

These must stay in sync between frontend and backend:

| Data | Frontend | Backend | Notes |
|------|----------|---------|-------|
| Post field limits | `validation.ts` `POST_LIMITS` | `20260223000001_post_constraints.sql` | Must match exactly |
| Profile field limits | `validation.ts` `PROFILE_LIMITS` | `20260224000004` + `20260224000008` | `constants.ts` auto-imports from `PROFILE_LIMITS` |
| RPC params/return | `database.ts` `Functions` | Migration SQL | Frontend types must mirror SQL return shape |
| Reaction emoji set | `ReactionBar.tsx` `REACTION_EMOJIS` | `20260224000004` CHECK | `['❤️', '🔥', '😂', '😢', '✨', '👀']` — also hardcoded in `emojiStyles.ts` |
| Moderation blocklists | `moderation.ts` `BLOCKED_DOMAINS` + `BLOCKED_PATTERNS` | `moderate-content/index.ts` | Both lists must sync between client and edge function |
| `ModerationResult` type | `moderation.ts` | `moderate-content/index.ts` | Duplicated (Deno can't share Vite types) |

## Gotchas

### Trigger-Protected Fields

- **`is_admin`**: `20260224000006_protect_is_admin.sql` silently preserves on UPDATE. Admin features require a SECURITY DEFINER function.
- **COPPA fields** (`age_verified`, `tos_accepted`, `birth_year`): `20260224000007_protect_coppa_fields.sql` blocks direct updates. Only `set_age_verification` RPC can set them.

### localStorage

All `localStorage` access is wrapped in try/catch. Safari private browsing throws on `setItem()`.

| Key | Owner | Purpose |
|-----|-------|---------|
| `xanga-status` | Header/Sidebar | AIM-style status message |
| `post-draft` | PostModal | Auto-saved draft (cleared on save) |
| `hasCompletedOnboarding` | App.tsx | First-time wizard completion |
| `sidebar-collapsed` | Sidebar | Mobile collapse state |
| `emoji-style` | emojiStyles.ts | Emoji rendering style preference |

### Capacitor Platform Guards

All Capacitor calls in `src/lib/capacitor.ts` are guarded by `Capacitor.isNativePlatform()` — no-ops on web.

### devSignUp

`useAuth.ts` includes `devSignUp` using anonymous auth, gated behind `import.meta.env.DEV` and tree-shaken from production.

## Styling Conventions

- **Theme variables**: All components use `var(--accent-primary)`, `var(--card-bg)`, etc. See `index.css` `:root` for the full set.
- **Xanga classes**: `.xanga-box` (cards), `.xanga-button` (actions), `.xanga-link` (links), `.xanga-title` (headings with theme font)
- **Borders**: `border-2 border-dotted` with `var(--border-primary)`
- **Touch targets**: All interactive elements meet 44px minimum (`min-h-[44px]`)
- **Safe areas**: `modal-footer-safe` and `safe-area-bottom` classes for bottom insets. Header uses inline `paddingTop: max(0.5rem, env(safe-area-inset-top))` for Dynamic Island.
- **Input zoom**: `font-size: 16px !important` on inputs at mobile breakpoint (iOS Safari zoom fix)
- **Reduced motion**: CSS media query + `<MotionConfig reducedMotion="user">` + per-component `useReducedMotion()`
- **iOS smoothing**: `-webkit-font-smoothing: antialiased`, `-webkit-tap-highlight-color: transparent`, `-webkit-overflow-scrolling: touch`
- **Animations**: Framer Motion spring physics preferred over duration-based. `whileTap={{ scale: 0.95-0.98 }}` on interactive elements.
- **iOS modal gestures**: All overlay modals use `drag="x"` with `dragElastic={{ left: 0, right: 0.5 }}`, `dragSnapToOrigin`, and `onDragEnd` → close if `offset.x > 80`. Scrollable content areas use `onTouchMove` → `document.activeElement.blur()` for keyboard dismiss.

## iOS App Store

### What's Done

Bundle ID `com.retrowave.journal`, version 1.0, iOS 15.0 target, encryption declaration, COPPA age gate, content reporting (mailto), moderation (OpenAI + regex), privacy/terms pages, portrait-only iPhone, Info.plist privacy descriptions (camera, photo library).

### What YOU Must Do Manually

1. **Apple Developer Account** ($99/year) at developer.apple.com
2. **App Store Connect** — app name "My Journal", content rating **17+** (UGC), Privacy Policy URL
3. **Screenshots** — iPhone 6.9" (1320x2868), iPhone 6.5" (1284x2778), iPad Pro 12.9" (2048x2732)
4. **Signing** — select team in Xcode → Signing & Capabilities
5. **Review `terms.html` and `privacy.html`** — AI-generated, not lawyer-reviewed

### Apple Review Gotchas

- **UGC (Guideline 1.2)**: Must have reporting + moderation + age gate + blocking. All done.
- **WebView (Guideline 4.2)**: May reject "thin wrapper" apps. Xanga aesthetic helps differentiate.
- **Login required (Guideline 4.0)**: Prepare a demo account for reviewers.

## Database Migrations

| Migration | Purpose |
|-----------|---------|
| `001-005` | Core tables: posts, profiles, reactions, mood/music, auto-create trigger |
| `20260125000000` | Age verification fields |
| `20260223000001-2` | Post CHECK constraints + `get_posts_with_reactions` RPC |
| `20260224000001-3` | Fix `handle_new_user`, RPC security (`auth.uid()`), performance indexes |
| `20260224000004-8` | Data constraints, COPPA backfill, `is_admin` trigger, COPPA trigger, schema hardening |
| `20260224000009` | Retire `post_likes`, excerpt-only feed, `get_post_by_id` RPC |
| `20260224000010` | Fix COPPA trust (derive `age_verified` from birth_year arithmetic) |
| `20260225000001-2` | User blocking + block enforcement: `user_blocks` table, `toggle_user_block`, `is_blocked_pair()`, reactions RLS |
| `20260225000003-6` | App Store hardening: account deletion RPC, data export RPC, rate limiting (posts + reactions), username UNIQUE |

## Claude Code Automations

| Hook | Trigger | What It Does |
|------|---------|-------------|
| Prettier auto-format | After every Edit/Write | Formats files automatically |
| Block `.env` edits | Before Edit/Write | Prevents accidental key exposure |
| Block lock file edits | Before Edit/Write | Prevents hand-editing lock files |

### Custom Slash Commands

| Command | File | Purpose |
|---------|------|---------|
| `/fullstack` | `.claude/commands/fullstack.md` | Fullstack integration audit — verifies RPC types, RLS policies, shared data contracts, and frontend-backend wiring |
| `/mobile` | `.claude/commands/mobile.md` | iOS/Capacitor audit — checks Apple App Store compliance, native UX patterns, accessibility, and dark theme contrast |

## Pre-Launch Work Queue

Work items required before App Store submission. **Backend agent goes first** (creates APIs), then frontend agent (builds UI on top).

### Backend Agent — CRITICAL (App Store Blockers)

Done: account deletion RPC (`000003`), data export RPC (`000004`), rate limiting posts+reactions (`000005`), username UNIQUE (`000006`), edge function double-read verified not a bug.

- [ ] **Demo account** — Apple reviewers need to test the app. Create a pre-populated account (e.g. `demo@retrowave-journal.com`) with sample posts. Document credentials for App Store Connect review notes.

### Frontend Agent — CRITICAL (App Store Blockers)

Done: Delete Account UI + ConfirmDialog in ProfileModal, Export My Data download button in ProfileModal.

### Backend Agent — HIGH (Production Readiness)

- [ ] **Verify anonymous signups OFF in production** — `config.toml` has `enable_anonymous_sign_ins = true` for local dev. Must be disabled in production Supabase dashboard or spam accounts bypass email verification.
- [ ] **Document content reporting SLA** — Apple may ask: "How do you handle reports?" Have answer ready: "reviewed within 48 hours, violating content removed." The mailto report link exists but the process needs documenting in App Store review notes.

### Frontend Agent — HIGH (iOS UX)

Done: iOS swipe-to-dismiss on PostModal + ProfileModal (`drag="x"`, `offset.x > 80`), keyboard dismiss on scroll (`onTouchMove` blur), safe area insets on Header (`paddingTop: max(0.5rem, env(safe-area-inset-top))`), dark theme contrast fixes (emo-dark `#858585`, scene-kid `#00bb00` solid, grunge `#a09078`), image error fallbacks (Avatar double-fallback + YouTubeCard placeholder), ReactionBar accessibility (`aria-pressed` + `aria-label`).

### Frontend Agent — MEDIUM (Polish)

Done: haptic feedback on block/delete/post/update, marquee `will-change: transform` GPU optimization.

- [ ] **iPhone SE modal testing** — `MODAL_CHROME_HEIGHT` (140 in PostModal, 180 in ProfileModal) on 667px screen may leave too little scroll area. Test and adjust.

## Known Tech Debt

1. **`ModerationResult` duplicated** — `moderation.ts` and `moderate-content/index.ts` both define it. Deno can't share Vite imports.
2. **`createProfileForUser` hand-rolled retry** — Intentional: special `23505` handling with re-fetch fallback.
3. **`types/like.ts` is dead code** — References retired `post_likes` table. Safe to delete.
4. **iOS not deployed** — `ios/` scaffolded, no Apple Developer account or Xcode build yet.
