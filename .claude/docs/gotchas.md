# Gotchas

Non-obvious behaviours and footguns, grouped by area. Read the section for what
you are about to touch. New entries: `- [YYYY-MM-DD /skill] finding`, under the
section they belong to — not at the bottom.

## TypeScript, lint and React

- `noUncheckedIndexedAccess` is on — array indexing returns `T | undefined`.
- Supabase query builders return `PromiseLike`, not `Promise` — wrap with `async` in `withRetry()`.
- `requireAuth()`'s discriminated union does not narrow — use `auth.user!` after the error check.
- Path aliases: `@/*`, `@components/*`, `@hooks/*`, `@utils/*`, `@lib/*`.
- ESLint runs typescript-eslint and react-hooks v7 at full recommended strictness, with 0 problems. Keep it there. The compiler rules report **one bail-out per component at a time**, so fixing one can surface the next — re-run until stable.
- To reset state when a prop changes, use the guarded adjust-during-render pattern (previous value in `useState`, compare, set), not a reset effect. House examples: `Avatar.tsx`, `Header.tsx`, `ProfileModal.tsx`.
- If a file is ever edited on Windows again, keep it UTF-8 and grep for `ðŸ\|â\|Ã\|Â` before committing. Two waves of mojibake (double-encoded emoji and ✨ ♥ ☆ ⏮ em-dashes) shipped that way on 2026-07-05.

## UI conventions

- Settings (gear) and Profile (avatar) are separate modals. Do not merge them.
- Toasts are minimal centred pills. Error copy uses `~` tildes; never a raw error string.
- Auth forms use inline field errors, not toasts — the app-level `<Toast>` is not mounted during auth.
- Ctrl+N / Cmd+N opens the composer.
- **No grey controls** (2026-09-16, the user's call: grey reads as disabled fine print and does not fit the aesthetic, even at 9.74:1). Rank controls by how much accent they carry — fill, outline, link — never by switching one to `--text-muted`. Separate two links by order, wording or tier instead — not by alignment: "forgot ur password?" right-aligned beside a centred magic link read as a layout bug on the SE (2026-09-22), so the two are one centred group. The inactive auth tab is accent text on `--card-bg` with no underline, in a bordered segment. The modal close ✕ is `--text-title`, not the accent: on the header gradient the accent measures 2.38:1 against a 3:1 icon bar, while `--text-title` clears 4.70 in every theme. Tier table: `/frontend`.
- **A control's tier comes from what it does** (2026-09-22): links navigate or switch modes; anything that sends, saves or deletes is at least `.xanga-button-ghost`. Check the screen _state_ a conditional control appears in — the email resend shipped as `.xanga-link` and made three identical links in a row. Rule and incident: "Pick the tier by what the control does" in `/frontend`.
- **`font-bold` in the title font is not bold on classic-xanga** — Comic Neue's Bold is barely wider than its Regular. Use `.title-bold`. Detail in `/frontend`.
- PostModal's ⋮ menu holds **delete entry only**, so it does not render in create mode. Privacy is stated once, by the toggle in the editor body; the duplicates were removed in `121c4ba`.
- Retro icons (`Windows95*`, `Winamp`, `VisualStudioFace`) mark **sections**; `Pepicon` marks **controls**. Both are app-wide, so neither is legacy. Give each glyph one meaning.
- **Grep a class name in `index.css` before trusting it.** `PublicProfileView` used `.marquee`, defined nowhere, so its banner never scrolled; the real classes are `.marquee-banner` + `.marquee-banner-inner`. Several safe-area classes sit indented inside an `@supports` block, so a line-anchored grep reports them missing.
- To find grey controls, grep the **built bundle**, not source: `dist/assets/*.js` for `color:"var(--text-muted)"` beside an `onClick` or `aria-label`. A source scan missed a style in a nested attribute and matched comments.

## Mobile layout (iOS)

- Touch targets: `min-h-[44px] lg:min-h-0` (or `lg:min-h-[36px]`). Never a bare `min-h-[36px]`. As of 2026-08-10 every `min-h-[36px]` in the code is prefixed `min-h-[44px] lg:`.
- Input font is `max(1rem, 16px) !important` on mobile. Below 16px iOS auto-zooms on focus; a flat `16px` does not follow the root scaling that carries Dynamic Type, which froze every field while its label grew.
- Text sizes: named Tailwind scale first, arbitrary **rem** where no step fits (`text-[0.8125rem]`). Never arbitrary px on anything text-bearing — Tailwind emits it literally and it ignores root scaling.
- **iOS Dynamic Type does not scale WKWebView text.** `lib/dynamic-type.ts` reads the `-apple-system-body` shorthand (17px default, 53px at the largest size) and scales the root font, capped at 1.3× — where the layouts stop truncating. It is **native-only**: off Apple platforms the probe reports the reader's own root size, which once produced a phantom 20/17 ratio. The app only re-reads on foreground.
- `--keyboard-inset` has **one owner per scroll context**. Modals: `.modal-panel-safe` subtracts it and `.modal-overlay-safe` pads by it — equal by construction, not a double-count. Nothing inside the panel may add it again; applying it at four levels once collapsed the composer's textarea to zero height.
- A modal frame must be `flex flex-col` with a `flex-1 min-h-0` body, or it cannot absorb the panel shortening and its footer is clipped. Copy PostModal or ProfileModal.
- `contentInset: 'never'` in `capacitor.config.ts` is load-bearing. The app pads for the notch via `env(safe-area-inset-*)` + `viewport-fit=cover`; letting WKWebView add an inset too parks the scroll view at a negative offset — a white band `scrollTo(0,0)` cannot clear.
- **The status bar is transparent and overlays the page.** `body::before` is a fixed strip, `env(safe-area-inset-top)` tall, with `backdrop-filter: blur(14px)` and **no tint and no `saturate()`**: over flat colour a blur is invisible, so screens are pixel-identical at rest, while scrolled text is diffused. A `saturate()` shifted cream by 4 units; a tint draws a band. On `body` because the auth wall, intro, public profile, moderation and age gate are early returns. z-index 45: above header (10) and FAB (30), below modal overlays (50+). Test page-chrome changes twice: scrolled content under the clock, and at rest against a before screenshot.
- **`.safe-area-top` adds room only on home-button iPhones:** `calc(inset + clamp(0px, 44px - inset, 0.5rem))` — web 0.5rem, SE +8pt, notched phones unchanged.
- **The intro compacts below 700pt of height** (`@media (max-height: 700px)`) so slide 4's preview fits on the SE. Face ID iPhones are all ≥812pt and never match.
- **The splash curtain covers every screen while the app boots.** `SplashCurtain` draws the launch image's composition in the web view and hides the native splash once it has painted, so the hand-off is invisible. Sized in `dvh`, because the storyboard scales that square image by the screen's height — match it in `dvh` or the icon jumps at hand-off. It holds for `MIN_VISIBLE_MS` (850) so the animation is seen, then fades for 400ms, which is a floor on time-to-content.
- **The feed scrolls in its own box**, so page padding never reaches its end. `.page-fab-clearance` pads the page; `.feed-fab-clearance` (`3rem` + bottom safe area, `0` at `lg`) ends the feed so the last post's reactions scroll clear of the floating button. While posts show, the layout's bottom padding and the footer's top margin shrink on phones so the spacing does not stack. `3rem` is measured, not guessed: on the SE with the feed flush to the screen bottom and scrolled to its end, the closing line clears the button by ~6pt. Test both ends — feed at its end, and page at the footer.
- `ESTIMATED_POST_HEIGHT` (380px, `App.tsx`) must stay close to a real `PostCard` or virtualized rows overlap before they are measured.
- **The iOS deployment target is 16.4 because the CSS needs it.** Tailwind 4 targets Safari 16.4, and the built CSS uses `@property` (16.4), `color-mix()` (16.2, which theming depends on) and `@layer` (15.4). Do not lower it without re-checking the built CSS. Change it in `project.pbxproj` only — `npx cap sync` regenerates `CapApp-SPM/Package.swift` from that file's first two digits.
- iOS Password AutoFill needs paired `autoComplete` tokens: `username` + `current-password` on sign-in, `email` + `new-password` on sign-up (which makes iOS offer a generated password that satisfies Supabase's policy). Email fields also need `autoCapitalize="none"`.

## Simulator and verification

- **Tap delivery is roughly 1-in-3 and can land seconds late.** Read state from a screenshot after every tap, and re-check before assuming your own earlier tap failed. Time-boxed states (a 3s toast, a sub-400ms double tap) are effectively undrivable. **Swipes land reliably.** A swipe starting on the feed scrolls the feed's box first; one starting on the header or chips scrolls the page.
- **Tap space is points; screenshots are pixels.** Divide a position read off a screenshot by (screenshot width ÷ point width): 440pt Pro Max, 402pt Pro and iPhone 17, 375pt SE. A raw `simctl io` capture is 3× on Face ID phones and 2× on the SE; a scaled-down image has its own ratio. Screenshot numbers passed straight to `tap` land in empty space and look like a dead button. `touch_path` does not share `tap`'s mapping.
- **Catching a transient needs the screenshot armed first:** `( sleep N; xcrun simctl io <udid> screenshot f.png ) &`, then fire the tap. MCP round trips are ~1.5–2s, so bracket 1.6–3.4s.
- **Check which simulator is booted and which build it runs** before auditing — a sim several commits behind showed already-fixed bugs. Read the **installed** bundle: `xcrun simctl get_app_container <udid> com.retrowave.journal app`, then compare `public/assets/index-*.js` with the current build. `simctl install` over an existing install keeps the session. `simctl listapps` reports nothing for a shut-down device, which is not "not installed".
- **An Xcode update blocks `git` and the simulator.** `git` is Xcode's shim, so every `git`, `xcrun` and `xcodebuild` fails with "You have not agreed to the Xcode license agreements" until the user runs `sudo xcodebuild -license`. Meanwhile `.git/HEAD`, `.git/refs/` and `.git/logs/HEAD` are readable directly.
- **The software keyboard needs Simulator.app open**, not just the streaming panel, which forwards the Mac keyboard: iOS then shows only the accessory bar (⌃ ⌄ ✓) and `--keyboard-inset` applies at that height, which looks like a pass. Run `defaults write com.apple.iphonesimulator ConnectHardwareKeyboard -bool false`, **then** `open -a Simulator`. The first keyboard on a fresh simulator is covered by an iOS typing tutorial — tap Continue.
- **Dynamic Type from the CLI:** `xcrun simctl ui <udid> content_size accessibility-extra-extra-extra-large` — underscore; the hyphenated form prints usage and exits 117. Read the current value first, relaunch the app, restore when done.
- **Reduce Motion from the CLI needs the device rebooted, not just the app relaunched.** `xcrun simctl spawn <udid> defaults write com.apple.Accessibility ReduceMotionEnabled -bool true`, then `shutdown` + `boot`, then launch. Written and relaunched only, WKWebView keeps the old value and `prefers-reduced-motion` never matches — animations keep running and it reads as "the reduced-motion CSS is broken" (2026-09-17, on the splash curtain). Restore to `false` and reboot again afterwards, and re-apply the status-bar override, which a reboot clears. The tell that it took: the Winamp progress bar sits at 65%.
- **Discarding the composer does not clear its autosaved draft.** It lives in WebKit `localStorage`, editable only with the device **shut down**: find the container's `localstorage.sqlite3`, `xcrun simctl shutdown`, remove the `-wal`/`-shm` files, `delete from ItemTable where key like 'post-draft%'`, boot. The session survives (it is in `UserDefaults`).
- **Re-issuing the same deep-link hash is a no-op** — `routeDeepLink` returns early when the hash already matches. Vary the id.
- **The browser pane cannot verify anything behind `AnimatePresence`.** It reports `visibilityState: "hidden"`, rAF is throttled, and animations freeze mid-flight — entrances stall at partial opacity and `mode="wait"` never swaps children, which renders as a convincing phantom bug. `read_page` showing `Viewport: 0x0` is the tell. Use a component test, or the simulator.
- The session scratchpad gets cleaned — mid-session it took a built `.app`, overnight a helper script. Rebuild or recreate rather than trusting an earlier path.

## Supabase and RPCs

- `ModerationResult` is duplicated between `lib/moderation.ts` and the Deno edge function on purpose (Deno cannot import through Vite). Change both together.
- SECURITY DEFINER functions with `SET search_path = public, pg_temp` need fully-qualified `auth.users`.
- PostgREST parses `jsonb` returns into objects automatically.
- The `get_posts_result` composite type must be **dropped and recreated** to add a column; `ALTER TYPE ADD ATTRIBUTE` fails while dependent functions exist.
- **Never rate-limit a table by selecting from it inside its own policy** — Postgres raises `42P17` infinite recursion (finding 36: no reaction ever saved). Count in a `SECURITY DEFINER` function instead, like `recent_reaction_count`.
- **The Management API query endpoint returns only the last statement's result.** Send one statement at a time, or `union` checks. For SQL with quotes, build the JSON body in Python and pass `--data @file`.
- **The keychain sometimes returns an empty Management API token** with no error, and the API then answers `Format is Authorization: Bearer [token]`, which reads like an outage. Check `${#TOKEN}` first. The CLI is at `node_modules/.bin/supabase`, not on PATH.
- `supabase migration list` and `test db` fail like `db push` (the hosted project refuses the CLI's login role). Verify schema by querying prod — recipe in `CLAUDE.md`.
- **Do not trust a check that matches on SQL text.** Prod writes the same guarantee differently (`v_user_id := auth.uid()`, `public.normalize_chapter()`), and two privacy smoke checks reported FAIL against correct code.
- The reports table is `content_reports`, not `reports`.
- **A profile is created when the email is confirmed, not at sign-up** (since 2026-09-19): `on_auth_user_confirmed` fires `handle_new_user` when `email_confirmed_at` is first set, and `on_auth_user_created` only for users inserted already confirmed. An unconfirmed account has no profile and holds no username. `handle_new_user` never reads the email: username is the chosen one (or `user_<id>`), and display name stays empty so first-run setup appears.
- **A released username is tombstoned to its old owner** (`20260920000000`, applied 2026-09-22): `username_history` keeps every name a rename gives up, and `guard_username_change()` refuses it to anyone else with `unique_violation`, so `handle_new_user` falls back instead of failing a sign-up. One rename per 30 days, the first free (`profiles.username_changed_at IS NULL`). The cooldown raises `username_cooldown:YYYY-MM-DD`, which `toUserMessage` catches _before_ the code map. Account deletion releases the names (FK cascade off `auth.users`).
- **An edge function the app calls must allow `capacitor://localhost` in its CORS list** — that is the iOS app's origin, and WKWebView enforces CORS like a browser. `delete-account` does; `moderate-content` does not (open question in the handoff).
- **Auth email templates live in the dashboard but are sourced from the repo.** `node supabase/templates/build.mjs --push` renders them from `supabase/functions/_shared/email.ts` and PATCHes them (and the sender name) into the project; editing them in the dashboard forks the design. Verify by comparing the live `mailer_templates_*_content` to `supabase/templates/out/`.
- **Never let an edge function reachable with the anon key email an address from its input.** It becomes a relay for mail from retrowaveblog.com. `delete-account` takes the recipient from the caller's verified session; `notify-report` only ever emails support@.

## Auth and email

- `tos_accepted` defaults to `false`; `set_age_verification()` is the only path that flips it. `is_admin` and the COPPA fields are trigger-protected and need SECURITY DEFINER RPCs.
- Auth actions (sign in/up, password) live in stateless `lib/auth-actions.ts`. Only `App.tsx` calls `useAuth()` — calling it in a form spins up duplicate `onAuthStateChange` subscriptions and racing profile inserts.
- Every hook routes failures through `toUserMessage()`; `lib/errors.ts` maps 7 PostgREST codes and 13 message patterns plus a fallback.
- Supabase enforces lower+upper+digit+symbol server-side; `SignUpForm`'s validation and placeholder must mirror it.
- Email confirmation is on: `signUp` returns no session and `SignUpForm` shows the inbox screen. Auth mail goes through Resend SMTP — the built-in mailer is rate-limited to ~2/hr and rolls back the user when a send fails.
- **`emailRedirectTo` is mandatory on every email-sending auth call.** Omitted, Supabase falls back to the Site URL: an iOS signup confirmed in Safari, and the app's separate WKWebView storage still showed signup. `authRedirectTo()` in `lib/auth-callback.ts` picks the deep link on native and `window.location.origin` on web.
- The native redirect is the **bare** `com.retrowave.journal://`. `uri_allow_list` holds that exact string, and a redirect that fails to match is silently replaced by the Site URL — a tidier `://auth-callback` path reintroduces the bug with no error.
- `detectSessionInUrl` reads the URL only when the client is constructed — fine on web, too early on native, where `appUrlOpen` delivers tokens later. `initAuthCallback()` (native-only) consumes the cold-start hash and later `hashchange`s via `setSession`, and clears the hash in a `finally` so a failed exchange does not leave tokens in the URL. A dead link arrives as `#error=...&error_code=otp_expired` with no tokens.
- Deleted `devSignUp` used `signInAnonymously()` against the hosted project, creating permanent ghost users. Consider disabling anonymous sign-ins in the dashboard.

## Session storage and lifecycle (iOS)

- **The Supabase session must not live in `localStorage` on native.** WKWebView storage is reclaimed under disk pressure and long idle, silently signing the user out. `lib/auth-storage.ts` routes it to `@capacitor/preferences` (`UserDefaults`) on native and migrates an existing session on first read. Reproduce by deleting the `sb-*-auth-token` row from `localstorage.sqlite3` and relaunching — the app must stay signed in.
- **supabase-js clears a session by writing `""`**, not `removeItem`. Treat empty as absent on read and as a clear on write.
- **Sign-out is global.** `supabase.auth.signOut()` defaults to `scope: 'global'`, revoking every session for the account. Other devices keep working until their access token expires (up to an hour), then fail to refresh and silently lose the session — so signing a test account out on one simulator signs it out on the others too.
- The refresh timer is a JS timer, suspended in a backgrounded WKWebView. `capacitor.ts` calls `getSession()` on `appStateChange` and raises `AUTH_SESSION_EXPIRED` when it fails; `useAuth` distinguishes an unrequested `SIGNED_OUT` from a deliberate one.
- **A deep link to a not-running app was dropped** — `getLaunchUrl()` resolves async and set the hash between the initial render reading it and the `hashchange` listener attaching (fixed `0a3db5c`). Any new hash-driven route must read the hash at effect time too.
- **`navigator.onLine` is not trustworthy in WKWebView.** `useOnlineStatus` uses `@capacitor/network` on native, seeds with `getStatus()`, and assumes online if reachability fails. Only verifiable on a real device.

## Signed-out states

- **There are exactly two:** the intro on first launch, then the auth wall. No guest mode — `AuthModal` has no close control because dismissing it used to drop into a fake `@guest` journal.
- The intro's seen flag is in `Preferences` as `onboarding-seen-v1` (once per install). Bump the suffix to re-show a rewritten intro. The intro is also gated on **having no session**, or an update would tour existing users.
- **Do not centre a slide with `justify-content` on the scroll container** — it clips overflowing content at large Dynamic Type. `.onboarding-panel` uses `margin-block: auto`.
- The hero is `clamp(3.5rem, 11vh, 6rem)`, dropping to `2.5rem` under `[data-text-scaled]`. A minimum card height was tried and reverted.
- **The intro always renders in `classic-xanga`** (no session, no theme). Its scenes still use theme variables, and slide 3's swatches are the real `previewColors`. Scenes are CSS, not artwork: a baked image would be wrong in seven themes.
- The intro footer uses three shapes, not three colours: `.xanga-button` next, `.xanga-button-ghost` back, `.xanga-link` skip.

## Chapters

- `chapter` is a column on `posts`, not a table. `get_user_chapters()` RPC; filtering is client-side. Mobile uses `ChapterChips`, desktop the sidebar. `refetchChapters()` runs on post create, edit, delete and block. `useChapters` is called once, in `App.tsx`. "Loose entries" is the `__loose__` sentinel.
- Two privacy layers: `private_chapters` text[] on profiles, and each post's `is_private`.
- **Private-chapter matching is normalized, never string equality.** `public.normalize_chapter()` lowercases, trims and collapses unicode whitespace, so `"  ThErApY  "` is `"therapy"`. The client uses `isChapterPrivate()`; `Sidebar` and `ChapterChips` once compared raw strings and drew 📖 on a chapter the server was hiding. Grep `private_chapters` before adding another read.
- **Renaming a chapter out of `private_chapters` republishes its entries** — deliberate, since a rename is a real content move. The editor confirms first: `chapterChangeRepublishes()` in `utils/chapterPrivacy.ts` decides and `PostModal` gates the save **before** `onSave`, because once the update lands the entry has been public. It stays silent on four load-bearing cases: a case/whitespace variant, an entry saved `is_private`, a private profile, and a hand-flipped `is_private`. Widening any turns the dialog into noise.
- **The entry view's privacy badge shows effective visibility**: `entryVisibility()` returns `private`, `hidden-by-chapter` or `public`. The entry's own flag wins when both apply; the profile's `is_public` is deliberately ignored.

## Moderation

- `protect_is_admin_on_update` reverts any `is_admin` change for **every** role, service role included. Granting admin needs the trigger disabled around the update in one transaction; re-verify afterwards that a second promotion is reverted.
- Admin belongs to the owner account only. Never `appreview@retrowaveblog.com` — App Review signs into it.
- The report email's "Review in app" link (`#/report/<id>`) carries no authority. `is_admin` is checked at three layers: route render, `GRANT`/`REVOKE`, and `is_admin()` inside each RPC.
- `notify-report` is fail-soft: every path returns HTTP 200 with `emailed:false` on failure. Check `emailed` in the body, not the status.
- Reporting is anonymous-capable by design (Guideline 1.2); blocking needs an account. Ban is not implemented.

## Features and product

- Public profiles: `is_public`, `get_public_profile(username)`, hash route `#/u/username`. Visitors get a read-only journal in the owner's theme and must sign up to react.
- No comments, followers or discovery feed — deliberate, to keep moderation at zero.
- 6 emoji styles in a 2×3 grid: native, fluent, twemoji, openmoji, blob, noto.
- `useReactions`' in-flight guard only stops sequential duplicates; the 400ms cooldown is the rapid-tap protection, and it is a silent no-op by design.

## Icons and performance

- **pepicons** (Pop!) for functional icons. Only 11 are imported, for tree-shaking — a new one needs a named import in `Pepicon.tsx` _and_ a `usedIcons` entry.
- **react-old-icons** fetches `.webp` from GitHub at runtime, so decorative icons do not render offline.
- Main chunk `index-*.js` is ~328 KB raw / ~101 KB gzipped, ~906 KB of JS in total, ~76% on the critical path (2026-09-16). Re-run `npm run build` rather than trusting these. On Capacitor the bytes are local, so cold start is JS parse/eval — see `/ios`.
- **Post bodies render through `ui/MarkdownContent`, never `react-markdown` directly** — it lazy-loads ~120 KB and prefetches on idle. `PostCard.test.tsx` and `PostModal.test.tsx` mock `react-markdown`, so only `ui/__tests__/MarkdownContent.test.tsx` guards the lazy chunk.
- `looseCount`, `chapterFilteredPosts` and `visiblePosts` are memoized in `App.tsx`.

## Data, environment and hosting

- All `localStorage` access in try/catch (Safari private browsing throws).
- `.env.local` (not `.env`) is gitignored; without it the Supabase client fails to initialise and the app renders blank.
- Security headers live in `public/_headers` (served by Cloudflare Workers assets). CSP allows Supabase (rest/auth/functions + wss), DiceBear, and YouTube oEmbed/thumbnails/embeds; `style-src` needs `'unsafe-inline'` for React inline styles. HTTP→HTTPS is Cloudflare's "Always Use HTTPS" toggle.

## Testing and CI

- `src/lib/supabase.ts` throws at import time without env vars, so `vite.config.ts` supplies placeholders via `test.env`. Remove them and CI silently loses ~24 tests.
- **Watch the test count, not just red/green.** CI once ran 241 of 265 for over a week.
- Testing a pure helper does not test the decision that uses it. `computeFeedHeight` was correct while its render site discarded the key output on a truthiness check — make the decision testable too (`feedMaxHeight`).
- A mock referenced directly in a `vi.mock` factory must be created with `vi.hoisted(() => ({...}))`.
