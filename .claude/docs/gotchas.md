# Gotchas

Non-obvious behaviors and footguns. Read before making changes in these areas.

## TypeScript
- `noUncheckedIndexedAccess` enabled — array indexing returns `T | undefined`.
- Supabase query builders return `PromiseLike` not `Promise` — wrap with `async` in `withRetry()`.
- `requireAuth()` discriminated union doesn't narrow — use `auth.user!` after the error check.
- Path aliases: `@/*`, `@components/*`, `@hooks/*`, `@utils/*`, `@lib/*`.

## Mobile & iOS
- Touch targets: `min-h-[44px] lg:min-h-0` (or `lg:min-h-[36px]`). Never bare `min-h-[36px]` — fails Apple HIG.
- `ESTIMATED_POST_HEIGHT` (380px) must match real PostCard height or virtualizer overlaps.
- WCAG AA: `--accent-primary` must hit 4.5:1 on `--card-bg`. `--text-title` only needs 3:1 (large text).
- Input `font-size: 16px !important` at mobile breakpoint prevents iOS Safari auto-zoom. NEVER set input font below 16px on mobile.
- [2026-07-05 /mobile] RESOLVED: Mojibake (double-encoded UTF-8, cp1252 round-trip) in Sidebar, Header, ProfileModal, PublicProfileView — from Windows-era edits (`npm.cmd` in audit logs). Two waves fixed 2026-07-05: 10× 4-byte emoji (`ðŸ..`) and 20× 3-byte chars (`â..`: ✨ ♥ ☆ ⏮▶⏸⏹⏭, em-dashes). If editing on Windows again, keep files UTF-8 and grep `ðŸ\|â\|Ã\|Â` before committing.
- [2026-07-05 /mobile] RESOLVED: ChapterChips.tsx conditional hook (early return before `useMemo`) crashed on first-chapter creation. Fixed 2026-07-05; regression test added ("survives the 0 → 1 chapters transition").
- [2026-07-05 /mobile] `npm run lint` covered NOTHING until 2026-07-05 — eslint.config.js only matched `**/*.{js,jsx}` but all source is `.ts/.tsx`. Now fixed (typescript-eslint added); all findings triaged 2026-07-05 and rules run at full recommended strictness (0 problems). Keep it that way.
- [2026-07-05 /mobile] For "reset/sync state when a prop changes" use the guarded adjust-during-render pattern (prev-value in useState, compare, set) — passes react-hooks v7 compiler rules and avoids a stale paint. Don't reintroduce reset-effects; see Avatar.tsx / Header.tsx / ProfileModal.tsx for house examples.
- [2026-07-05 /mobile] react-hooks v7 compiler rules (set-state-in-effect, immutability, refs, …) report ONE bail-out per component at a time — fixing one can surface more on the next lint run. Keep re-running lint until stable.
- [2026-07-05 /mobile] Sidebar chapter privacy toggle uses bare `min-h-[36px]` (Sidebar.tsx:345) — below 44px HIG on mobile; adjacent chapter button correctly uses `min-h-[44px] lg:min-h-[36px]`.

## UI Conventions
- Settings (gear) and Profile (avatar) are separate modals. Don't merge.
- Toast: minimal centered pills. Error messages use `~` tildes. Never raw error strings.
- Auth forms use inline field errors (not toasts) — App-level `<Toast>` isn't mounted during auth.
- Keyboard shortcut: Ctrl+N / Cmd+N opens new post modal.
- PostModal ⋮ menu (top-right header): contains privacy toggle (🔒/🔓) and delete entry. Footer is just cancel + save + privacy badge.

## Data & Environment
- `is_admin` and COPPA fields are trigger-protected — need SECURITY DEFINER RPCs.
- All `localStorage` access in try/catch (Safari private browsing throws).
- `react-old-icons` fetches `.webp` from GitHub at runtime — won't render offline.
- `.env` is gitignored. Copy `.env.example` → `.env` on each machine.
- `useChapters` called once in App.tsx — don't add a second call (duplicate RPCs).

## Chapters
- Optional `chapter` column on `posts` (no separate table). `get_user_chapters()` RPC. Client-side filtering.
- Mobile: `ChapterChips` horizontal swipe row. Desktop: vertical list in sidebar.
- `refetchChapters()` called on post create, edit, delete, and block to keep counts in sync.
- "Loose entries" filter (`__loose__` sentinel) shows posts with no chapter. 🍃 icon.
- Chapter privacy: `private_chapters` text[] on profiles. Toggle via 🔒 button. Post-level `is_private` works independently — two privacy layers.
- [2026-07-09 /release] `supabase migration list` fails without SUPABASE_DB_PASSWORD (CLI login-role creation hits permission denied on hosted project) — verify remote schema via REST probes with the publishable key instead.
- [2026-07-09 /feature] `devSignUp` (removed) used `signInAnonymously()` against the HOSTED Supabase — every dev-server signup created a permanent anonymous ghost user in production auth. Dev now uses the real password flow. Consider disabling anonymous sign-ins in the dashboard.
- [2026-07-09 /feature] Supabase enforces a server-side password policy (lower+upper+digit+symbol) — client validation and placeholder in SignUpForm must mirror it or signups fail with a toast after the age gate.
- [2026-07-09 /feature] Email confirmation is ON: `signUp` returns no session; SignUpForm shows the "almost there" inbox screen via `needsConfirmation`. The built-in Supabase mailer is rate-limited (~2/hr) and returns 500 "Error sending confirmation email" — custom SMTP required before launch; Supabase rolls back the user when the send fails.
- [2026-07-22 /feature] Auth action fns (signIn/signUp/password) live in `src/lib/auth-actions.ts` (stateless). LoginForm/SignUpForm import them directly; only App.tsx instantiates the stateful `useAuth` (one onAuthStateChange subscription). Don't call useAuth() in form components — it spins up duplicate subscriptions + racing profile INSERTs.
- [2026-07-22 /feature] Tests that mock a module whose export is referenced directly in the `vi.mock` factory must define the mock via `vi.hoisted(() => ({...}))` — a plain top-level const throws "Cannot access before initialization" because vi.mock is hoisted.
- [2026-07-22 /security] Security headers live in `public/_headers` (copied to dist, served by Cloudflare Workers assets). CSP allows Supabase (rest/auth/functions + wss), dicebear avatars, youtube oembed/thumbnails/embeds; style-src needs 'unsafe-inline' for React inline styles. HTTP→HTTPS redirect is the Cloudflare "Always Use HTTPS" toggle, not a file.

## iOS layout (2026-08 session)
- [2026-08 /mobile] `--keyboard-inset` has exactly ONE owner per scroll context. Modals: `.modal-panel-safe` subtracts it and `.modal-overlay-safe` pads by it — these two agree by construction (same value) and are NOT a double-count. Nothing *inside* the panel may add it again. It was applied at four levels once and the composer's textarea collapsed to zero height.
- [2026-08 /mobile] A modal whose frame is not `flex flex-col` with a `flex-1 min-h-0` body cannot absorb the panel shortening — its body keeps a viewport-measured height and the footer is clipped out of the `overflow-hidden` panel. Both PostModal and ProfileModal now use that structure; copy it for any new modal.
- [2026-08 /mobile] `contentInset: 'never'` in capacitor.config.ts is load-bearing. The app pads for the notch/home indicator itself via `env(safe-area-inset-*)` + `viewport-fit=cover`; letting WKWebView add its own inset too parks the scroll view at a negative offset — a white band above the header with the status bar unreadable, which `window.scrollTo(0,0)` cannot clear.
- [2026-08 /mobile] iOS Dynamic Type does NOT scale WKWebView text. The signal is the `-apple-system-body` font shorthand: 17px at default, 53px at the largest accessibility size (3.12×). `src/lib/dynamic-type.ts` reads it and scales the root font size, capped at 1.3×. The cap is where the current layouts stop truncating — raising it needs stacked layouts at large sizes.
- [2026-08 /mobile] Tailwind arbitrary sizes (`text-[13px]`) emit literal px and do NOT follow root scaling. Use the named scale for anything text-bearing. Several remain in Sidebar/ProfileModal/YouTubeCard/Select — known gap.
- [2026-08 /mobile] The simulator's "Connect Hardware Keyboard" setting suppresses the software keyboard, so keyboard-open geometry cannot be screenshotted while it is on. Measure against the real stylesheet in the browser pane instead, or toggle it off in Simulator.app (⇧⌘K).

## Testing & CI (2026-08 session)
- [2026-08 /preflight] `src/lib/supabase.ts` throws at IMPORT time when the env vars are missing, so any test file that transitively imports it fails to collect. `vite.config.ts` supplies placeholders via `test.env` — do not remove them or CI loses ~24 tests silently while merely going red.
- [2026-08 /preflight] Watch the test COUNT, not just red/green. CI ran 241 tests against 265 locally for over a week; the failure looked like "something is broken" rather than "a fifth of the suite never ran".
- [2026-08 /test] Testing a pure helper does not test the decision that uses it. `computeFeedHeight` was correct and fully tested while the render site discarded its most important output on a truthiness check. If a falsy value is meaningful, make the *decision* a testable function too (`feedMaxHeight`).

## Moderation (2026-08 session)
- [2026-08 /feature] `protect_is_admin_on_update` reverts any change to `is_admin` for EVERY role including the service role. Granting admin requires `alter table public.profiles disable trigger protect_is_admin_on_update` around the update — do it in one transaction so the guard is never left off, and re-verify afterwards that a second promotion attempt is reverted.
- [2026-08 /feature] Admin belongs to the owner account ONLY. Never `appreview@retrowaveblog.com` — App Review signs into it and would inherit moderation powers.
- [2026-08 /feature] The report email's "Review in app" link (`#/report/<id>`) intentionally carries no authority — a signed action URL would be a permanent delete-capable secret sitting in an inbox that scanners follow. Authority comes from `is_admin`, checked at three layers: route render, `GRANT`/`REVOKE`, and `is_admin()` inside each RPC.
- [2026-08 /feature] `notify-report` is fail-soft by design: every failure path returns HTTP 200 with `emailed:false`. A 200 in `net._http_response` therefore proves only that the webhook reached the function — check the `emailed` flag in the body for whether Resend accepted it.
