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
- [2026-02-26 /mobile] Remaining touch target gaps: ProfileModal unblock button
  (py-1, ~24px), Sidebar profile edit button (p-1.5, ~27px), AgeVerification
  raw select (py-2.5, ~40px). Low-traffic elements, not blocking.
- [2026-02-26 /mobile] `sm:min-h-0` pattern removes 44px touch target at 640px+.
  Used in Button.tsx, ReactionBar, AvatarPicker, PostCard edit/delete. iPad users
  (810px portrait) get undersized targets.

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
- [2026-02-25 /feature] The `requireAuth()` pattern returns `{ user, error }`.
  Always check BOTH: `if (authError || !user)`. The user can be null even when
  error is null (race condition during sign-out).
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
- [2026-02-26 /mobile] `usePosts.ts` (421 lines, zero tests) is the most complex
  hook: pagination, caching, optimistic reactions, CRUD. Repeats
  `supabase.auth.getSession()` 5 times. No `withRetry()` on mutations.
- [2026-02-26 /mobile] `useAuth.ts` `createProfileForUser` hand-rolls retry (80
  lines) instead of using `withRetry()`. Different behavior: no jitter, no
  exponential backoff, no non-retryable error codes.
- [2026-02-26 /mobile] MODAL_CHROME_HEIGHT (140 in PostModal, 180 in ProfileModal)
  and swipe-dismiss threshold (80px) are magic numbers duplicated across modals.
  Should be shared constants.
- [2026-02-26 /mobile] 6 of 8 hooks have zero tests. Only useAuth (shallow) and
  useToast have test files. usePosts is the critical gap.
- [2026-02-26 /mobile] No hook uses `useOnlineStatus` — offline users get generic
  errors after retry exhaustion instead of "you appear offline" messaging.

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
