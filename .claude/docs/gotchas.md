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
- Input `font-size: max(1rem, 16px) !important` at mobile breakpoint prevents iOS Safari auto-zoom. NEVER let the computed input font drop below 16px on mobile. Use `max()`, not a flat `16px` — an absolute unit does not follow the root scaling that carries Dynamic Type, so a flat value froze every field at 16px while its label grew to 20.8px.
- [2026-07-05 /mobile] RESOLVED: Mojibake (double-encoded UTF-8, cp1252 round-trip) in Sidebar, Header, ProfileModal, PublicProfileView — from Windows-era edits (`npm.cmd` in audit logs). Two waves fixed 2026-07-05: 10× 4-byte emoji (`ðŸ..`) and 20× 3-byte chars (`â..`: ✨ ♥ ☆ ⏮▶⏸⏹⏭, em-dashes). If editing on Windows again, keep files UTF-8 and grep `ðŸ\|â\|Ã\|Â` before committing.
- [2026-07-05 /mobile] RESOLVED: ChapterChips.tsx conditional hook (early return before `useMemo`) crashed on first-chapter creation. Fixed 2026-07-05; regression test added ("survives the 0 → 1 chapters transition").
- [2026-07-05 /mobile] `npm run lint` covered NOTHING until 2026-07-05 — eslint.config.js only matched `**/*.{js,jsx}` but all source is `.ts/.tsx`. Now fixed (typescript-eslint added); all findings triaged 2026-07-05 and rules run at full recommended strictness (0 problems). Keep it that way.
- [2026-07-05 /mobile] For "reset/sync state when a prop changes" use the guarded adjust-during-render pattern (prev-value in useState, compare, set) — passes react-hooks v7 compiler rules and avoids a stale paint. Don't reintroduce reset-effects; see Avatar.tsx / Header.tsx / ProfileModal.tsx for house examples.
- [2026-07-05 /mobile] react-hooks v7 compiler rules (set-state-in-effect, immutability, refs, …) report ONE bail-out per component at a time — fixing one can surface more on the next lint run. Keep re-running lint until stable.
- [2026-07-05 /mobile] RESOLVED: Sidebar chapter privacy toggle was a bare `min-h-[36px]`, below 44px HIG on mobile. It is now `min-h-[44px] min-w-[44px]` at every breakpoint (Sidebar.tsx:412). Verified 2026-08-10 that no unguarded sub-44px tap target remains: every `min-h-[36px]` in the codebase is prefixed `min-h-[44px] lg:`.
- [2026-08-10 /mobile] Reduce Motion is settable from the CLI: `xcrun simctl spawn <udid> defaults write com.apple.Accessibility ReduceMotionEnabled -bool true`, then relaunch the app. The visible tell that WKWebView honoured it is the Winamp progress bar sitting at 65% — that width comes only from the reduced-motion override in `index.css`. Restore it to `false` afterwards.
- [2026-08-10 /mobile] **The browser pane cannot verify anything behind `AnimatePresence`.** Its tab reports `document.visibilityState === "hidden"`, so rAF is throttled and Framer Motion animations freeze mid-flight: entrance animations stall at partial opacity (the auth screen sat at `opacity: 0.196`) and `AnimatePresence mode="wait"` never finishes its exit, so the outgoing child never unmounts and the incoming one never mounts. That renders as a genuine-looking bug — the AuthModal showed "Welcome Back" with SignUpForm's fields still mounted, because the heading lives outside the AnimatePresence and updated on its own. `read_page` reporting `Viewport: 0x0` is the giveaway. Assert on such panels with a component test instead.
- [2026-08-10 /mobile] iOS Password AutoFill needs `autoComplete` tokens, and the pairing is what matters: `username` + `current-password` on sign-in, `email` + `new-password` on sign-up. `new-password` is what makes iOS offer a generated password — worth keeping, since Supabase enforces lower+upper+digit+symbol server-side and a suggested password always satisfies it. Email fields also need `autoCapitalize="none"`; WKWebView capitalises the first letter otherwise.

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
- [2026-08-11 /feature] **`emailRedirectTo` is mandatory on every email-sending auth call**, and omitting it fails in the most confusing possible way: Supabase falls back to the project Site URL, so an iOS signup got confirmed in _Safari_, the session was written to Safari's storage, and the Capacitor WKWebView — which has entirely separate storage — still showed the signup screen. It reads exactly like "the confirmation link doesn't work". `authRedirectTo()` in `lib/auth-callback.ts` picks the target: the deep link on native, `window.location.origin` on web (NOT the Site URL, or a localhost signup bounces to production).
- [2026-08-11 /feature] The native redirect must be the **bare** `com.retrowave.journal://`, with no path. Supabase's `uri_allow_list` holds that exact string with no wildcard, and a redirect that fails to match is _silently_ replaced by the Site URL — so adding a tidier `://auth-callback` path reintroduces the bug with no error anywhere. Widening the allow-list to `com.retrowave.journal://**` is the alternative, but that is a production auth-config change.
- [2026-08-13 /feature] `initAuthCallback` is native-only, and `consumeAuthCallback` clears the hash in a `finally`. Both came out of adversarial review. Running the manual consumer on the web put two consumers on one set of single-use tokens alongside `detectSessionInUrl`, with ordering decided by client-init timing; and clearing the URL only on success meant a failed exchange — the exact case where they linger — left access and refresh tokens sitting in the address bar. Supabase also signals a dead link as `#error=...&error_code=otp_expired` with **no tokens at all**, which is indistinguishable from an ordinary route unless checked for; unhandled, that is what silently returned users to the signup screen.
- [2026-08-11 /feature] `detectSessionInUrl` (default on) only reads the URL **when the client is constructed**. That covers the web, where the browser navigates to the callback before the client exists, but not native: the app is already running when `appUrlOpen` delivers the deep link, so those tokens arrive long after the single check and must be consumed by hand via `setSession`. `initAuthCallback()` handles both the cold-start hash and later `hashchange`s.
- [2026-07-22 /feature] Auth action fns (signIn/signUp/password) live in `src/lib/auth-actions.ts` (stateless). LoginForm/SignUpForm import them directly; only App.tsx instantiates the stateful `useAuth` (one onAuthStateChange subscription). Don't call useAuth() in form components — it spins up duplicate subscriptions + racing profile INSERTs.
- [2026-07-22 /feature] Tests that mock a module whose export is referenced directly in the `vi.mock` factory must define the mock via `vi.hoisted(() => ({...}))` — a plain top-level const throws "Cannot access before initialization" because vi.mock is hoisted.
- [2026-07-22 /security] Security headers live in `public/_headers` (copied to dist, served by Cloudflare Workers assets). CSP allows Supabase (rest/auth/functions + wss), dicebear avatars, youtube oembed/thumbnails/embeds; style-src needs 'unsafe-inline' for React inline styles. HTTP→HTTPS redirect is the Cloudflare "Always Use HTTPS" toggle, not a file.

## iOS layout (2026-08 session)

- [2026-08 /mobile] `--keyboard-inset` has exactly ONE owner per scroll context. Modals: `.modal-panel-safe` subtracts it and `.modal-overlay-safe` pads by it — these two agree by construction (same value) and are NOT a double-count. Nothing _inside_ the panel may add it again. It was applied at four levels once and the composer's textarea collapsed to zero height.
- [2026-08 /mobile] A modal whose frame is not `flex flex-col` with a `flex-1 min-h-0` body cannot absorb the panel shortening — its body keeps a viewport-measured height and the footer is clipped out of the `overflow-hidden` panel. Both PostModal and ProfileModal now use that structure; copy it for any new modal.
- [2026-08 /mobile] `contentInset: 'never'` in capacitor.config.ts is load-bearing. The app pads for the notch/home indicator itself via `env(safe-area-inset-*)` + `viewport-fit=cover`; letting WKWebView add its own inset too parks the scroll view at a negative offset — a white band above the header with the status bar unreadable, which `window.scrollTo(0,0)` cannot clear.
- [2026-08 /mobile] iOS Dynamic Type does NOT scale WKWebView text. The signal is the `-apple-system-body` font shorthand: 17px at default, 53px at the largest accessibility size (3.12×). `src/lib/dynamic-type.ts` reads it and scales the root font size, capped at 1.3×. The cap is where the current layouts stop truncating — raising it needs stacked layouts at large sizes.
- [2026-08 /mobile] Tailwind arbitrary sizes (`text-[13px]`) emit literal px and do NOT follow root scaling. RESOLVED 2026-08-10: the last 8 (Sidebar ×3, ProfileModal, YouTubeCard ×3, Select) are now arbitrary **rem** — `text-[0.8125rem]` rather than the named scale, because rem keeps the exact px at the default root while still scaling. Reach for the named scale first; use arbitrary rem only when no named step matches (13px and 11px have none). Never arbitrary px on anything text-bearing.
- [2026-08-10 /mobile] `xcrun simctl ui <udid> content_size accessibility-extra-extra-extra-large` sets Dynamic Type without touching Settings.app — the fastest way to verify text scaling. Note `content_size` with an UNDERSCORE (the hyphenated form silently prints usage and exits 117). Read the current value first and restore it when done. The app only re-reads on foreground, so background + relaunch after changing it.
- [2026-08-13 /mobile] **`applyDynamicType` is native-only.** Superseded a 2026-08-10 note claiming that clearing `font-size` at 1x was the whole fix — it was not, and the entry was wrong for two days. Off Apple platforms the `-apple-system-body` shorthand is invalid, so the probe reports the reader's _current root size_; treating that as an iOS ratio meant a reader who chose 20px produced a 20/17 ratio out of nothing and got `16 × 1.18 = 18.8px` written back. Guarding at exactly 1x only rescued readers who had chosen exactly 16px. There is no ratio to compute on the web — browsers already scale rem with that setting — so the fix is to not run there at all. The clear-at-1x behaviour still matters on native, for returning from a large size to the default.
- [2026-08 /mobile] The simulator's "Connect Hardware Keyboard" setting suppresses the software keyboard, so keyboard-open geometry cannot be screenshotted while it is on. Measure against the real stylesheet in the browser pane instead, or toggle it off in Simulator.app (⇧⌘K).

## Testing & CI (2026-08 session)

- [2026-08 /preflight] `src/lib/supabase.ts` throws at IMPORT time when the env vars are missing, so any test file that transitively imports it fails to collect. `vite.config.ts` supplies placeholders via `test.env` — do not remove them or CI loses ~24 tests silently while merely going red.
- [2026-08 /preflight] Watch the test COUNT, not just red/green. CI ran 241 tests against 265 locally for over a week; the failure looked like "something is broken" rather than "a fifth of the suite never ran".
- [2026-08 /test] Testing a pure helper does not test the decision that uses it. `computeFeedHeight` was correct and fully tested while the render site discarded its most important output on a truthiness check. If a falsy value is meaningful, make the _decision_ a testable function too (`feedMaxHeight`).

## Moderation (2026-08 session)

- [2026-08 /feature] `protect_is_admin_on_update` reverts any change to `is_admin` for EVERY role including the service role. Granting admin requires `alter table public.profiles disable trigger protect_is_admin_on_update` around the update — do it in one transaction so the guard is never left off, and re-verify afterwards that a second promotion attempt is reverted.
- [2026-08 /feature] Admin belongs to the owner account ONLY. Never `appreview@retrowaveblog.com` — App Review signs into it and would inherit moderation powers.
- [2026-08 /feature] The report email's "Review in app" link (`#/report/<id>`) intentionally carries no authority — a signed action URL would be a permanent delete-capable secret sitting in an inbox that scanners follow. Authority comes from `is_admin`, checked at three layers: route render, `GRANT`/`REVOKE`, and `is_admin()` inside each RPC.
- [2026-08 /feature] `notify-report` is fail-soft by design: every failure path returns HTTP 200 with `emailed:false`. A 200 in `net._http_response` therefore proves only that the webhook reached the function — check the `emailed` flag in the body for whether Resend accepted it.
