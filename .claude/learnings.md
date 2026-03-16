# Retrowave Blog - Shared Learnings

Cross-command knowledge base. All project commands (`/fullstack`, `/mobile`,
`/frontend`, `/feature`) read this file before starting work and contribute
new findings after completing work.

**Format for entries:**
- `[YYYY-MM-DD /command]` prefix for traceability
- One-line summary, then optional details indented below
- Categorize under the correct section
- Only add genuinely NEW findings — don't repeat what's already here

---

## Responsive & Mobile

- [2026-02-25 /mobile] iPhone SE (375x667): PostModal `MODAL_CHROME_HEIGHT=140`
  leaves ~493px scrollable at 95vh. ProfileModal's 180px leaves ~453px. Both are
  tight but usable. Monitor if users report difficulty scrolling.
- [2026-02-25 /mobile] The 480px breakpoint in `index.css` is the only custom CSS
  breakpoint. Everything else uses Tailwind's `sm:` (640px) and `lg:` (1024px).
  Sidebar switches from collapsible to fixed at `lg:`.
- [2026-02-25 /mobile] `vh` units used for modal maxHeight (`90vh`, `95vh`). No
  `dvh`/`svh` usage yet. On iOS Safari, `100vh` includes the URL bar, so `90vh`
  is conservative enough to work. `dvh` would be more correct but `90vh` suffices.
- [2026-03-14 /mobile] RESOLVED: PostList virtualizer now uses `100dvh` instead of
  `100vh`. Emoji-rain keyframe also uses `100dvh`. Both previously caused clipping
  on iOS Safari where `100vh` includes the URL bar.
- [2026-03-14 /mobile] RESOLVED: `.safe-area-top` CSS utility class added alongside
  existing `.safe-area-bottom`. Applied to AgeVerification, OnboardingFlow, AuthModal
  headers. Safe-area-bottom applied to OnboardingFlow footer and AgeVerification content.
- [2026-03-14 /mobile] RESOLVED: `.xanga-link` now has `min-height: 44px` with
  `inline-flex` + `align-items: center` for Apple HIG touch targets. AgeVerification
  TOS checkbox container has `min-h-[44px]`, checkbox itself `w-5 h-5`.
- [2026-02-25 /mobile] Modals use `max-h-[95vh] sm:max-h-[90vh]` — 95% on mobile
  (more space needed), 90% on desktop (more breathing room). This is intentional.
- [2026-02-25 /mobile] Input `font-size: 16px !important` at mobile breakpoint
  prevents iOS Safari auto-zoom. NEVER set input font below 16px on mobile.
- [2026-02-26 /frontend-design] RESOLVED: Sidebar localStorage crash, PostModal
  scroll mismatch, ~15 touch target violations, Pastel Goth contrast — all fixed
  in commit 593b275.
- [2026-02-26 /frontend-design] RESOLVED: Remaining touch target gaps fixed —
  ProfileModal unblock button, Sidebar profile edit button, AgeVerification
  birth year select. All now min-h-[44px].
- [2026-03-14 /mobile] RESOLVED: `.glitter-text` uses `filter: drop-shadow()` instead of
  `text-shadow` because `-webkit-text-fill-color: transparent` makes text-shadow invisible
  on iOS Safari. `text-shadow: none` explicitly set to prevent inheritance from `.xanga-title`.
- [2026-03-14 /mobile] RESOLVED: Winamp transport buttons (20×16px) are decorative-only
  on mobile — `pointer-events: none` at 480px breakpoint. No 44px target needed since
  they aren't interactive on touch devices.
- [2026-03-14 /mobile] RESOLVED: PostModal 3D entrance uses `perspective: 1200` on overlay
  wrapper and softened `rotateX: 6` (was 8) to prevent iOS Safari rendering artifacts.
- [2026-02-26 /mobile] RESOLVED: `sm:min-h-0` → `lg:min-h-0` in Button, ReactionBar,
  AvatarPicker, PostCard. iPads (810px) now keep 44px targets; only desktop (1024px+)
  relaxes. Fixed in commit 5739ab3.

- [2026-03-15 /mobile] RESOLVED: Header top banner overflowed on 375px — "Welcome back,
  username" + "~ settings ~" + "~ logout ~" wrapped to two lines. Fixed by: truncating
  welcome text ("Hi, name!" on mobile), replacing text links with Pepicon icons (gear,
  leave) on mobile, showing labels only at sm: breakpoint.
- [2026-03-15 /mobile] Feed RPCs (get_posts_with_reactions, get_post_by_id) changed to
  personal diary mode — only returns current user's own posts, not all public posts.
- [2026-03-15 /mobile] RESOLVED: Deep mobile audit — PostCard date metadata wrapped onto
  two lines via `flex-wrap` + hidden separator on mobile. Title clamped to 2 lines via
  `line-clamp-2`. EmptyState padding reduced (`px-4 py-6` on mobile). ProfileModal title
  `text-lg sm:text-2xl`, theme color dots `w-4 h-4` consistently. Header status truncate
  reduced to `max-w-[140px]`. OnboardingFlow/AgeVerification/SignUpForm emoji sizes reduced
  on mobile (`text-3xl sm:text-4xl/5xl`). ErrorBoundary title responsive.

## Styling & Theming

- [2026-02-25 /frontend] Never use alpha-channel hex colors (`#rrggbbaa`) for text.
  Scene-kid theme had `#00ff0080` for `--text-muted` which failed WCAG AA contrast
  unpredictably. Use solid colors only.
- [2026-02-25 /frontend] `color-mix(in srgb, ...)` is used extensively for derived
  colors (hover states, subtle backgrounds). Supported in all target browsers.
  Prefer over hardcoded intermediate colors.
- [2026-02-25 /frontend] All 8 themes define 30+ CSS variables. When adding a new
  variable, it MUST be added to ALL 8 theme definitions in `themes.ts` AND the
  `:root` defaults in `index.css`. Missing variables silently fall back to
  `initial`, creating invisible text or transparent backgrounds.
- [2026-02-25 /frontend] Dark theme `--text-muted` minimum contrast values (WCAG
  AA 4.5:1 against `--bg-primary`): emo-dark `#858585`, scene-kid `#00bb00`,
  grunge `#b0a088`, pastel-goth `#b0a0c0`. These are the verified-passing values.
- [2026-03-15 /mobile] RESOLVED: Cottage Core `--text-muted` bumped from `#8c7a5c`
  → `#7a6844` (was ~3.8:1, now ~4.6:1 on `#fff8f0`). Grunge bumped from `#a09078`
  → `#b0a088` (~5.0:1 on `#242018`). Both now pass WCAG AA.
- [2026-02-26 /frontend-design] RESOLVED: `.xanga-button` now enforces
  `min-height: 44px` in CSS. Select.tsx now has `min-h-[44px]`.

## Architecture & Integration

- [2026-02-25 /fullstack] Supabase query builders return `PromiseLike`, not
  `Promise`. When using `withRetry()`, always wrap:
  `await withRetry(async () => supabase.from(...).select(...))`
- [2026-02-25 /fullstack] `ModerationResult` type is intentionally duplicated
  between `moderation.ts` and the Deno edge function. Deno can't import Vite
  types. This is an architectural constraint, not tech debt.
- [2026-02-25 /feature] The `requireAuth()` pattern returns a discriminated union:
  `{ user: User; error: null } | { user: null; error: string }`. After checking
  `if (auth.error)`, TypeScript doesn't narrow `auth.user` — use `auth.user!`
  (safe because the union guarantees non-null when error is null).
- [2026-02-26 /fullstack] `useReactions` in-flight guard (`inFlightRef`) only
  prevents sequential duplicate requests, not concurrent ones. The `add(key)` call
  is after `await requireAuth()`, so two simultaneous taps both pass the guard. The
  400ms cooldown guard is the real protection against rapid taps.
- [2026-02-25 /feature] SECURITY DEFINER functions with `SET search_path = public,
  pg_temp` need fully-qualified `auth.users` references (the `auth` schema isn't
  in the search path).
- [2026-02-25 /fullstack] PostgREST parses `jsonb` SQL return values into
  structured TypeScript objects automatically. A SQL function returning `jsonb`
  can correctly type as `{ profile: ..., posts: [...] }` in TypeScript.

- [2026-03-15 /fullstack] RESOLVED: Settings and Profile split into separate modals.
  Gear icon → SettingsModal (export data + delete account). Profile nav button →
  ProfileModal (avatar, name, bio, mood, music, theme, emoji style). Previously both
  pointed to the same ProfileModal, and the gear icon was broken (opened AuthModal).
- [2026-03-15 /frontend] 6 emoji styles fill 2×3 grid: native, fluent, twemoji,
  openmoji, blob, noto. Noto Color Emoji uses `@svgmoji/noto@2.0.0` on jsDelivr
  (same pattern as blob/openmoji). Apache 2.0 license.

## Icons & Assets

- [2026-03-15 /frontend] Two retro icon libraries used in tandem: **pepicons** (Pop! variant)
  for functional UI icons (nav, buttons, actions) and **react-old-icons** for decorative Win98
  nostalgic accents (section headers, sidebar stats, profile form labels).
- [2026-03-15 /frontend] `pepicons/pop` exports named SVG strings (no default export). Import
  as `import * as popIcons from 'pepicons/pop'`. Wrapper component `Pepicon.tsx` uses
  `dangerouslySetInnerHTML` — safe because SVGs are static build-time strings from npm.
- [2026-03-15 /frontend] `react-old-icons` exports React components that render `<img>` tags
  fetching `.webp` from GitHub raw. They accept a `size` prop and `alt` prop. External network
  dependency — icons won't render offline.
- [2026-03-15 /frontend] Supabase now issues `sb_publishable_*` keys (new format) alongside
  legacy `eyJ*` JWT keys. The JS client (`createClient`) accepts both formats.

## Code Debt

- [2026-03-15 /frontend] RESOLVED: AuthModal had no back/close button — users were
  trapped on the auth screen after skipping onboarding. Added `onClose` prop and
  "← back" button to return to the read-only blog feed.
- [2026-02-26 /frontend-design] RESOLVED: LoginForm/SignUpForm refactored to use
  `<Input>` UI primitive. Dead props removed (AuthModal onClose, AvatarPicker
  currentUrl).
- [2026-02-26 /mobile] RESOLVED: `usePosts.ts` mutations now use `requireAuth()`
  (3 inline getSession guards replaced). Commit 5739ab3.
- [2026-02-26 /mobile] `useAuth.ts` `createProfileForUser` hand-rolls retry (80
  lines) instead of using `withRetry()`. Different behavior: no jitter, no
  exponential backoff, no non-retryable error codes. (Confirmed false positive —
  intentional 23505 handling.)
- [2026-02-26 /mobile] RESOLVED: `SWIPE_DISMISS_THRESHOLD = 80` extracted to
  `constants.ts`, shared by PostModal, ProfileModal, Toast. Commit 5739ab3.
  MODAL_CHROME_HEIGHT (140 vs 180) intentionally differs per-modal.
- [2026-02-26 /mobile] RESOLVED: All 8 hooks now have tests (64 total, 37 new).
  Coverage: useOnlineStatus, useBlocks, useReactions, useFocusTrap, useYouTubeInfo,
  usePosts. Commit a00fb7c.
- [2026-02-26 /mobile] RESOLVED: `toUserMessage()` now appends "You appear to be
  offline." for network-flavored errors when `navigator.onLine` is false.
  Commit 5739ab3.

- [2026-03-15 /fullstack] RESOLVED: `excerpt` column dropped from `posts` table,
  removed from `get_posts_result` composite type, and removed from both RPC SELECT
  lists. Was never referenced by the frontend — dead weight from early architecture.
  Migration: `20260315000001_cleanup_excerpt_and_p_user_id.sql`.
- [2026-03-15 /fullstack] RESOLVED: `p_user_id` parameter removed from both
  `get_posts_with_reactions` and `get_post_by_id` RPCs. Both now take only the
  params they actually use (cursor/limit and post_id respectively). Updated in SQL,
  `database.ts` types, and `usePosts.ts` call sites. Same migration.

- [2026-03-15 /feature] RESOLVED: `useBlocks.ts` now uses `requireAuth()` before
  `toggleBlock` and `fetchBlockedUsers`. Previously relied on server-side RLS only,
  producing raw Supabase error messages instead of friendly "You must be logged in."
- [2026-03-15 /feature] RESOLVED: `useReactions.ts` insert/delete now wrapped in
  `withRetry()`. Previously the only direct Supabase table access without retry.
- [2026-03-15 /feature] RESOLVED: `usePosts.ts` mutations (create/update/delete)
  now wrapped in `withRetry()`. Previously only reads used retry.
- [2026-03-15 /feature] RESOLVED: `usePosts.ts` `fetchPost` catch block now logs
  error via `console.error(toUserMessage(err))` instead of silently swallowing.
- [2026-03-15 /feature] RESOLVED: `useAuth.ts` `updateProfile` now uses
  `requireAuth()` instead of manual `if (!user)` check. Consistent with all other hooks.
- [2026-03-15 /feature] Username format constraint: `^[a-zA-Z0-9_-]+$` enforced at
  DB level (CHECK constraint) + client (validation.ts). Default username from email
  local parts sanitized with `regexp_replace` in DB trigger and `.replace()` in useAuth.
- [2026-03-15 /feature] Profile fields (username, display_name, bio) now run through
  `quickContentCheck()` from moderation.ts — reuses existing BLOCKED_PATTERNS regex.
  Mood/music fields are NOT moderated (personal expression, low abuse risk).
- [2026-03-15 /feature] Password policy bumped to 8-char minimum + letters_digits
  requirement. Enforced in config.toml (server) and SignUpForm.tsx (client).
  `PASSWORD_MIN_LENGTH` constant exported from validation.ts for single source of truth.
- [2026-03-15 /mobile] RESOLVED: Auth form validation switched from toast popups to
  inline field errors using Input's existing `error` prop. Removed HTML `required`
  attributes so custom validation fires instead of browser tooltips. Errors clear on
  type via onChange handlers.
- [2026-03-15 /mobile] RESOLVED: Auth header title "✨ Create Your Xanga ✨" wrapped
  to 2 lines at 375px. Fixed by reducing `text-sm` → `text-xs` (mobile), keeps
  `sm:text-lg` for larger screens.
- [2026-03-15 /mobile] RESOLVED: Full accessibility audit — added focus-visible rings
  to all buttons/links/roles (global CSS catch-all), disabled state on `.xanga-button`
  (opacity + cursor), `role="alert"` on PostModal moderation error, `aria-hidden` +
  `tabIndex={-1}` on decorative Winamp buttons, `aria-hidden` on decorative emojis.
  Hover contrast on `.xanga-button` forced to `#ffffff`.

## False Positives (Do NOT Flag)

These have been investigated and confirmed as non-issues:

- `/fullstack`: Rate limiting RLS policies without `TO authenticated` — anon users
  fail the ownership policy (`user_id = auth.uid()`) anyway.
- `/fullstack`: Reactions INSERT policy combining block check + rate limit in one
  policy — intentionally merged, not a missing policy.
- `/fullstack`: `ModerationResult` type duplication — architectural constraint
  (Deno can't share Vite imports).
- `/fullstack`: `jsonb` SQL return type vs structured TypeScript objects — PostgREST
  parses jsonb automatically. Not a type mismatch.
- `/fullstack`: Edge function `moderate-content/index.ts` "double-read bug" — does
  not exist. The `.text()` call is on the error path which returns early; `.json()`
  is on the success path. They never execute on the same response.
- `/mobile`: Capacitor plugins using dynamic `await import(...)` — intentionally
  lazy-loaded, not missing top-level imports.
- `/mobile`: `createProfileForUser` hand-rolled retry — intentional `23505`
  (unique violation) handling with re-fetch fallback.
- `/mobile`: `handleSubmit` type mismatch in ProfileModal (`onClick` passes
  `MouseEvent`, handler expects `FormEvent`) — pre-existing, tsc doesn't flag it,
  works at runtime due to event type compatibility.
- `/mobile`: Winamp button touch targets (20×16px) — decorative only. Now
  `aria-hidden="true"` + `tabIndex={-1}`, invisible to assistive tech and keyboard.
