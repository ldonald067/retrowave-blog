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
- PostModal ⋮ menu (top-right header) holds **delete entry only**, so the button itself is gated on delete being available — it does not render in create mode. Privacy is stated exactly once, by the toggle in the editor body; the menu's duplicate privacy control, a status badge and a footer chip were removed in `121c4ba`. Footer is cancel + save, plus the create-only draft status.

## Supabase & RPCs

- `ModerationResult` is intentionally duplicated between `lib/moderation.ts` and the Deno edge function — the edge function cannot import through Vite, so the two definitions must be changed together.
- SECURITY DEFINER functions with `SET search_path = public, pg_temp` need fully-qualified `auth.users` references.
- PostgREST parses `jsonb` return values into structured TypeScript objects automatically — no manual parse step.
- The `get_posts_result` composite type must be **dropped and recreated** when adding a column. `ALTER TYPE ADD ATTRIBUTE` fails while dependent functions exist.
- Private-chapter matching goes through `public.normalize_chapter()` on both sides. See Chapters below.

## Auth & Errors

- `tos_accepted` defaults to `false` in the trigger. `set_age_verification()` is the only legitimate path to flip it.
- `useReactions`' in-flight guard only prevents sequential duplicates — the 400ms cooldown is the real rapid-tap protection.
- Every hook routes failures through `toUserMessage()`; no raw `error.message` reaches the UI. 27 patterns plus a fallback in `lib/errors.ts`.

## Features

- Public profiles: `is_public` boolean, `get_public_profile(username)` RPC, hash routing `#/u/username`. Visitors get a read-only journal in the owner's theme and must sign up to react.
- No comments, no followers, no discovery feed — deliberate, to keep moderation overhead at zero. Reporting and the admin queue are the only moderation surface, and ban is not implemented.
- 6 emoji styles fill a 2×3 grid: native, fluent, twemoji, openmoji, blob, noto.

## Icons

- **pepicons** (Pop! variant) for functional UI icons. Only 11 are imported by name, for tree-shaking — adding one means a named import in `Pepicon.tsx` _and_ an entry in the `usedIcons` map.
- **react-old-icons** for decorative Win98 accents. Fetches `.webp` from GitHub at runtime, so it will not render offline.

## Performance

- Tree-shaking pepicons cut the main bundle from 3,130 KB to 672 KB (-78%). Code splitting since brought it to **316 KB raw / 97 KB gzipped** (`index-*.js`), with vendor chunks split out — 891 KB of JS total. Measured 2026-08-20; re-run `npm run build` rather than trusting this number.
- **76% of that JS is on the critical path** — 683 KB eager, down from 802 KB since `react-markdown` moved behind `MarkdownContent`. On Capacitor the bytes are local, so cold-start cost is JS parse/eval on the device CPU, not transfer. See `/ios`.
- **Post bodies render through `ui/MarkdownContent`, never `react-markdown` directly.** It lazy-loads the renderer and prefetches it on idle, so the ~120 KB is off the startup path but resident before the feed request resolves. Importing `react-markdown` directly anywhere puts it straight back on the critical path.
- `PostCard.test.tsx` and `PostModal.test.tsx` both **mock `react-markdown`**, so neither would notice the lazy chunk failing to resolve — the Suspense fallback renders the same text. `ui/__tests__/MarkdownContent.test.tsx` uses the real renderer and is what actually guards it.
- `filteredPosts` and `looseCount` are memoized with `useMemo` in App.tsx.

## Signed-out states

- **There are exactly two**: the intro on first launch, then the auth wall. There is no guest mode. `AuthModal` has no close control on purpose — dismissing it used to drop into an `@guest` journal that looked like a real empty account, offered "write ur first entry", and bounced to signup when tapped.
- `OnboardingFlow` sat in the repo unused from the initial commit until 2026-08-21. Its last slide is a preview of the empty journal plus the signup/sign-in choice, so the intro ends in a decision rather than a fourth description.
- The seen flag (`lib/onboarding.ts`) is in `Preferences`, versioned `onboarding-seen-v1`. `UserDefaults` dies with an uninstall and survives updates and backups — once per install, which is what "first launch after download" means. Bump the suffix to re-show a rewritten intro.
- **The intro is gated on having no session**, not only on the flag. Existing users have never written the flag, so without that check an app update would greet them with a tour of the app they already use.
- **Do not centre the slide with `justify-content` on the scroll container** — it clips the top of overflowing content, which is what happens at large Dynamic Type. `.onboarding-panel` uses `margin-block: auto`, which centres without that failure mode. `short-viewport-start` is still correct for `AgeVerification`, which does not scroll the same way.
- The hero is `clamp(3.5rem, 11vh, 6rem)` so it scales with the device rather than one phone, and drops to `2.5rem` under `[data-text-scaled]` where the words need the room. A minimum height on the card was tried and reverted: it produced a tall white box with the content pooled in the middle.

## Session storage (iOS)

- **The Supabase session must not live in `localStorage` on native.** A Capacitor app's `localStorage` is in the WKWebView website data store, which iOS reclaims under disk pressure and after long idle. Nothing warns the app — the token is gone next launch and the user lands on signup having never signed out. This was the "silent sign-out"; it reproduces first try by deleting the `sb-*-auth-token` row from `WebsiteData/.../LocalStorage/localstorage.sqlite3` and relaunching.
- `lib/auth-storage.ts` routes it to `@capacitor/preferences` (`UserDefaults`) on native, keeps `localStorage` on web, and migrates an existing session on first read so upgrades do not sign everyone out.
- **supabase-js clears a session by writing `""`, not by calling `removeItem`.** An adapter that treats `""` as a present value hands it to `JSON.parse` and permanently shadows the migration fallback beneath it. Treat empty as absent on read, and as a clear on write.
- **Nothing re-validates the session on resume without an `appStateChange` listener.** The refresh timer is a JS timer, and iOS suspends those in a backgrounded WKWebView, so a long background can outlive the token with no refresh scheduled. `capacitor.ts` calls `getSession()` on resume and raises `AUTH_SESSION_EXPIRED` when it fails.
- An unrequested `SIGNED_OUT` is now distinguished from a deliberate one (`useAuth`), so an expired session says so instead of silently swapping to the auth screen.
- **`navigator.onLine` is not trustworthy in WKWebView** — it often stays `true` with no route to the internet, and the `offline` event may never fire. `useOnlineStatus` uses `@capacitor/network` on native. Seed with `getStatus()`, since `networkStatusChange` only reports changes and an app launched offline would otherwise claim to be online. Assume online if reachability fails, rather than pinning a permanent banner over a working app. Only verifiable on a real device — the simulator shares the Mac's connection.

## Data & Environment

- `is_admin` and COPPA fields are trigger-protected — need SECURITY DEFINER RPCs.
- All `localStorage` access in try/catch (Safari private browsing throws).
- `.env.local` is gitignored. Copy `.env.example` → `.env.local` on each machine. Without it the Supabase client fails to initialise and the app renders blank.
- `useChapters` called once in App.tsx — don't add a second call (duplicate RPCs).

## Chapters

- Optional `chapter` column on `posts` (no separate table). `get_user_chapters()` RPC. Client-side filtering.
- Mobile: `ChapterChips` horizontal swipe row. Desktop: vertical list in sidebar.
- `refetchChapters()` called on post create, edit, delete, and block to keep counts in sync.
- "Loose entries" filter (`__loose__` sentinel) shows posts with no chapter. 🍃 icon.
- Chapter privacy: `private_chapters` text[] on profiles. Toggle via 🔒 button. Post-level `is_private` works independently — two privacy layers.
- Private-chapter matching is normalized in the database, not by string equality. `public.normalize_chapter()` lowercases, trims, and collapses unicode whitespace (NBSP, en/em spaces, ZWNBSP), so `"  ThErApY  "` and `"therapy"` are the same chapter. Both `get_public_profile` and the client must go through it — comparing raw `chapter` text anywhere reintroduces a leak where a case variant escapes the private list.
- **Renaming a chapter republishes its entries.** Moving a post from a private chapter to a new name (`"Therapy"` → `"Therapy 2026"`) drops it out of `private_chapters` and it becomes publicly visible. This is deliberate — a rename is a real content move, and the entry's own `is_private` flag is the control — but the UI does not warn about it yet.
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
- [2026-08 /mobile] The simulator's "Connect Hardware Keyboard" setting suppresses the software keyboard, so keyboard-open geometry cannot be screenshotted while it is on.
- [2026-08-17 /mobile] **The software keyboard will not appear while the assistant's streaming simulator panel is the only host UI.** That panel forwards the Mac keyboard, so iOS treats a hardware keyboard as connected: focusing a field shows the accessory bar (⌃ ⌄ ✓) and applies `--keyboard-inset` at the accessory bar's height only, never the full ~400pt. The tell is a focused field with a caret and an accessory bar but no keys. Setting `defaults write com.apple.iphonesimulator ConnectHardwareKeyboard -bool false` alone does nothing, because that is a Simulator.app preference and Simulator.app is not what is driving the device. The fix is both, in this order: write the default, then `open -a Simulator`. `xcrun simctl io … screenshot` keeps working throughout, since it captures the device framebuffer rather than either window.
- [2026-08-17 /mobile] Composer verified with the full software keyboard raised (iPhone 17 Pro Max): body textarea keeps its height, three typed lines all visible, save button reachable, panel bottom ~54pt clear of the accessory bar, draft autosave fires while the keyboard is up, and the panel returns to full height on dismiss. This is the surface whose textarea once collapsed to zero height, so it is worth re-checking here after any change to `--keyboard-inset`, the modal classes, or the keyboard listeners.

## Testing & CI (2026-08 session)

- [2026-08 /preflight] `src/lib/supabase.ts` throws at IMPORT time when the env vars are missing, so any test file that transitively imports it fails to collect. `vite.config.ts` supplies placeholders via `test.env` — do not remove them or CI loses ~24 tests silently while merely going red.
- [2026-08 /preflight] Watch the test COUNT, not just red/green. CI ran 241 tests against 265 locally for over a week; the failure looked like "something is broken" rather than "a fifth of the suite never ran".
- [2026-08 /test] Testing a pure helper does not test the decision that uses it. `computeFeedHeight` was correct and fully tested while the render site discarded its most important output on a truthiness check. If a falsy value is meaningful, make the _decision_ a testable function too (`feedMaxHeight`).

## Moderation (2026-08 session)

- [2026-08 /feature] `protect_is_admin_on_update` reverts any change to `is_admin` for EVERY role including the service role. Granting admin requires `alter table public.profiles disable trigger protect_is_admin_on_update` around the update — do it in one transaction so the guard is never left off, and re-verify afterwards that a second promotion attempt is reverted.
- [2026-08 /feature] Admin belongs to the owner account ONLY. Never `appreview@retrowaveblog.com` — App Review signs into it and would inherit moderation powers.
- [2026-08 /feature] The report email's "Review in app" link (`#/report/<id>`) intentionally carries no authority — a signed action URL would be a permanent delete-capable secret sitting in an inbox that scanners follow. Authority comes from `is_admin`, checked at three layers: route render, `GRANT`/`REVOKE`, and `is_admin()` inside each RPC.
- [2026-08 /feature] `notify-report` is fail-soft by design: every failure path returns HTTP 200 with `emailed:false`. A 200 in `net._http_response` therefore proves only that the webhook reached the function — check the `emailed` flag in the body for whether Resend accepted it.
