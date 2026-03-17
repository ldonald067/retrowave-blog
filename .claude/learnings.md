# Retrowave Blog - Shared Learnings

Cross-command knowledge base. All project commands (`/fullstack`, `/mobile`,
`/frontend`, `/feature`) read this file before starting work and contribute
new findings after completing work.

**Format for entries:**
- `[YYYY-MM-DD /command]` prefix for traceability
- One-line summary, then optional details indented below
- Categorize under the correct section
- Only add genuinely NEW findings — don't repeat what's already here
- Mark fixed items with `RESOLVED:` prefix — they'll be archived periodically

---

## Responsive & Mobile

- [2026-02-25 /mobile] iPhone SE (375x667): PostModal `MODAL_CHROME_HEIGHT=140`
  leaves ~493px scrollable at 95vh. ProfileModal's 180px leaves ~453px. Both are
  tight but usable. Monitor if users report difficulty scrolling.
- [2026-02-25 /mobile] The 480px breakpoint in `index.css` is the only custom CSS
  breakpoint. Everything else uses Tailwind's `sm:` (640px) and `lg:` (1024px).
  Sidebar switches from collapsible to fixed at `lg:`.
- [2026-02-25 /mobile] Modals use `max-h-[95vh] sm:max-h-[90vh]` — 95% on mobile
  (more space needed), 90% on desktop (more breathing room). This is intentional.
- [2026-02-25 /mobile] Input `font-size: 16px !important` at mobile breakpoint
  prevents iOS Safari auto-zoom. NEVER set input font below 16px on mobile.
- [2026-03-16 /mobile] Chapters on mobile: horizontal swipeable chip row (`ChapterChips`)
  placed above the feed in App.tsx, always visible without expanding sidebar. Sidebar
  chapter list now `hidden lg:block` (desktop only). Chips use `scroll-snap-type: x`,
  fade edges for scroll hint, `role="tablist"`/`aria-selected` for a11y, 44px min-height.
- [2026-03-15 /mobile] Feed RPCs (get_posts_with_reactions, get_post_by_id) changed to
  personal diary mode — only returns current user's own posts, not all public posts.

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
- [2026-03-16 /mobile] `--accent-primary` contrast values (WCAG AA 4.5:1 on `--card-bg`):
  Classic Xanga `#d6157e` (4.88:1 on white), Cottage Core `#617544` (4.70:1 on `#fff8f0`),
  MySpace Blue `#1188dd` (5.01:1 on `#001133`), Grunge `#a89070` (5.24:1 on `#242018`).
  `--text-title` kept at original values — headings (text-lg+) only need 3:1 for large text.
- [2026-03-16 /mobile] LoadingSpinner has `role="status" aria-live="polite"`, ErrorMessage
  has `role="alert"` for screen reader announcements.

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
- [2026-03-15 /frontend] 6 emoji styles fill 2x3 grid: native, fluent, twemoji,
  openmoji, blob, noto. Noto Color Emoji uses `@svgmoji/noto@2.0.0` on jsDelivr
  (same pattern as blob/openmoji). Apache 2.0 license.
- [2026-03-15 /feature] Chapters feature: nullable `chapter` text column on posts
  (100 chars max), `get_user_chapters()` RPC returns chapter list with post counts
  and latest dates. `useChapters` hook called once in App.tsx — chapters passed as
  props to Sidebar and PostModal (no duplicate RPC calls). Client-side filtering only.
- [2026-03-15 /migration] `get_posts_result` composite type must be dropped and recreated
  when adding columns — can't ALTER TYPE ADD ATTRIBUTE because the RPC functions depend
  on it. Drop functions first, then type, then recreate both.

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

## Toast & Notifications

- [2026-03-16 /frontend] Toast redesigned from boxed notification to minimal centered pill. Uses
  `rounded-full`, theme CSS vars (`--card-bg`, `--border-primary`, `--title-font`), emoji prefix
  per type, 0.75rem font. Positioned bottom-center with `env(safe-area-inset-bottom)` for iOS.
  Click-to-dismiss + auto-dismiss (success 2500ms, info 3000ms, error 4000ms).
- [2026-03-16 /frontend] Error toast messages use `~` tildes retro style. Never include raw
  error strings from Supabase/network — always use friendly copy.
- [2026-03-16 /frontend] Toast stacking uses `index * 2.75rem` offset from bottom. Max 3 visible
  toasts (`MAX_VISIBLE_TOASTS` in useToast.ts) — oldest dropped when exceeded.

## UX & Interaction

- [2026-03-16 /fullstack] Share button removed from PostCard — no public URLs exist yet (personal
  diary mode). `sharePost` and `SHARE_SNIPPET_MAX` removed. Will return when shareable links built.
- [2026-03-16 /fullstack] Keyboard shortcut Ctrl+N / Cmd+N opens new post modal. Guarded by: user
  authenticated, no modal open, active element not input/textarea/select.
- [2026-03-16 /mobile] Sidebar defaults to collapsed on mobile (first-time users). Desktop sidebar
  unaffected (`hidden lg:block` always visible).
- [2026-03-16 /mobile] ErrorMessage emoji wiggle animation removed — was using Framer Motion
  `animate` which ignores CSS `prefers-reduced-motion`. `<MotionConfig reducedMotion="user">`
  wrapper in App.tsx only covers the main app, not error/loading early-returns.
- [2026-03-16 /mobile] Celebration particles (sparkleBurst + emojiRain) halved on mobile
  (6 particles vs 12 on desktop). `window.innerWidth < 640` detection at call site.
- [2026-03-16 /mobile] Virtualizer ESTIMATED_POST_HEIGHT bumped 280 to 380. PostCards with
  title, date, chapter tag, content, author, and reactions are typically 340-380px.
- [2026-03-16 /mobile] Footer spacing tightened on mobile: `mt-6 sm:mt-12 py-4 sm:py-6` and
  end-of-list `py-3 sm:py-6`. Gap reduced from ~72px to ~36px.
- [2026-03-16 /mobile] "Powered by YourJournal" moved from sidebar to page footer.
- [2026-03-15 /feature] Username format: `^[a-zA-Z0-9_-]+$` enforced at DB + client. Default
  username from email sanitized with `regexp_replace` in DB trigger and `.replace()` in useAuth.
- [2026-03-15 /feature] Profile fields (username, display_name, bio) moderated via
  `quickContentCheck()`. Mood/music NOT moderated (personal expression, low abuse risk).
- [2026-03-15 /feature] Password policy: 8-char minimum + letters_digits. Enforced in
  config.toml (server) and SignUpForm.tsx (client). `PASSWORD_MIN_LENGTH` in validation.ts.

## Code Debt

- [2026-02-26 /mobile] `useAuth.ts` `createProfileForUser` hand-rolls retry (80
  lines) instead of using `withRetry()`. Different behavior: no jitter, no
  exponential backoff, no non-retryable error codes. (Confirmed false positive —
  intentional 23505 handling.)

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
- `/mobile`: Winamp button touch targets (20x16px) — decorative only. Now
  `aria-hidden="true"` + `tabIndex={-1}`, invisible to assistive tech and keyboard.

---

## Archive (Resolved)

Historical fixes kept for reference. Don't re-investigate these.

<details>
<summary>Responsive & Mobile — resolved fixes</summary>

- [2026-03-14 /mobile] PostList virtualizer now uses `100dvh` instead of `100vh`.
- [2026-03-14 /mobile] `.safe-area-top` CSS utility class added. Applied to AgeVerification, OnboardingFlow, AuthModal.
- [2026-03-14 /mobile] `.xanga-link` now has `min-height: 44px` with `inline-flex`.
- [2026-02-26 /frontend-design] Sidebar localStorage crash, PostModal scroll mismatch, ~15 touch target violations fixed (593b275).
- [2026-02-26 /frontend-design] ProfileModal unblock, Sidebar edit, AgeVerification select — all 44px.
- [2026-03-14 /mobile] `.glitter-text` uses `filter: drop-shadow()` for iOS Safari compatibility.
- [2026-03-14 /mobile] Winamp buttons decorative-only on mobile (`pointer-events: none` at 480px).
- [2026-03-14 /mobile] PostModal 3D entrance softened `rotateX: 6` for iOS Safari.
- [2026-02-26 /mobile] `sm:min-h-0` → `lg:min-h-0` for iPad touch targets (5739ab3).
- [2026-03-15 /mobile] Header banner overflow fixed — truncated welcome text, icon-only on mobile.
- [2026-03-15 /mobile] Deep mobile audit — PostCard dates, title clamp, EmptyState padding, etc.

</details>

<details>
<summary>Styling & Theming — resolved fixes</summary>

- [2026-03-15 /mobile] Cottage Core `--text-muted` bumped `#8c7a5c` → `#7a6844`. Grunge `#a09078` → `#b0a088`.
- [2026-02-26 /frontend-design] `.xanga-button` enforces `min-height: 44px`. Select.tsx `min-h-[44px]`.
- [2026-03-16 /mobile] `--accent-primary` contrast fixed on 4 themes (see active Styling section for values).

</details>

<details>
<summary>Architecture — resolved fixes</summary>

- [2026-03-15 /fullstack] Settings and Profile split into separate modals.
- [2026-03-15 /fullstack] `excerpt` column and `p_user_id` parameter removed from RPCs.
- [2026-03-15 /fullstack] `useChapters.ts` now uses `requireAuth()`.
- [2026-03-15 /feature] All hooks now use `requireAuth()` and `withRetry()` consistently.
- [2026-03-15 /frontend] AuthModal back/close button added.
- [2026-02-26 /frontend-design] LoginForm/SignUpForm use `<Input>` primitive. Dead props removed.
- [2026-02-26 /mobile] `usePosts.ts` mutations use `requireAuth()` (5739ab3).
- [2026-02-26 /mobile] SWIPE_DISMISS_THRESHOLD extracted to constants.ts (5739ab3).
- [2026-02-26 /mobile] All 8 hooks have tests (138 total). (a00fb7c).
- [2026-02-26 /mobile] `toUserMessage()` appends offline message (5739ab3).
- [2026-03-16 /fullstack] Chapter refetchChapters() now called in all success paths.
- [2026-03-16 /feature] Profile polling storm fixed (2s cooldown throttle).
- [2026-03-16 /mobile] PostCard footer restructured (justify-between fix).

</details>

<details>
<summary>Mobile UX — resolved fixes</summary>

- [2026-03-15 /mobile] Auth form inline field errors (replaced toast popups).
- [2026-03-15 /mobile] Auth header title responsive (`text-xs` mobile, `sm:text-lg` desktop).
- [2026-03-15 /mobile] Full accessibility audit — focus-visible rings, disabled states, aria attributes.
- [2026-03-15 /mobile] Chapter touch targets — PostCard badge, Sidebar nav, PostModal autocomplete all 44px.
- [2026-03-15 /feature] Chapter filtering is client-side. Pagination stays active during filtering.

</details>
