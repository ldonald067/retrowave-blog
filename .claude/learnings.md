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
- [2026-02-25 /mobile] PostList virtualizer container uses
  `maxHeight: calc(100vh - 200px)` — the 200px magic number accounts for Header
  height. If Header layout changes, this value must be updated.
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
- [2026-02-26 /mobile] RESOLVED: `sm:min-h-0` → `lg:min-h-0` in Button, ReactionBar,
  AvatarPicker, PostCard. iPads (810px) now keep 44px targets; only desktop (1024px+)
  relaxes. Fixed in commit 5739ab3.

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
  grunge `#a09078`, pastel-goth `#b0a0c0`. These are the verified-passing values.
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

## Code Debt

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
