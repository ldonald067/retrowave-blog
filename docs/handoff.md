# Handoff — current state

**This is a living document. Overwrite it; do not append.** Six dated audit
snapshots were deleted in `1c966da` for describing branches that no longer
existed and constraints that no longer applied. Keep this one true or delete it.

Read `CLAUDE.md` first, then `.claude/docs/gotchas.md`.

Last rewritten 2026-09-17, at `fbb4840` — after both halves of the iPhone SE pass,
their fixes, and a round of feed spacing from your screenshots.

---

## Where the project is

The web app and backend are done and live at https://retrowaveblog.com. The UI
audit's sweeps are finished and every finding is fixed; some journeys in it were
never exercised (see below). **What remains for submission is Apple-side
only**: signing, archive/upload, and the App Store Connect listing.

**The Supabase project pauses when idle.** It was found `INACTIVE` on 2026-09-15
after 13 quiet days, which takes the whole app down — sign-in, entries,
everything. Check it before any device session, and keep it active through App
Review.

`docs/app-store-submission-guide.md` is the single source of truth for
submission. All six screenshots are captured at 1320 × 2868 in
`store-assets/screenshots/`.

**The iOS deployment target is 16.4**, raised from 15.0 on 2026-09-16 because
the CSS cannot run earlier: Tailwind 4 and the theme system's `color-mix()` need
Safari 16.2–16.4. The iPhone 6s, 7 and first-generation SE lose the app. Do not
lower it without re-checking the built CSS — gotchas has the detail.

CI is green. **344 tests across 39 files.** Before committing, run
**`npm run check`** — lint, format check, typecheck, tests, build, in exactly the
order CI runs them. CI now fails on Prettier drift; `npm run format` fixes it.

## The one blocker

**Apple Developer Program enrollment.** `security find-identity -v -p
codesigning` reports **0 valid identities** and no team is configured, so
nothing can be signed, archived, or uploaded. Every other submission input is
ready. Nothing in the repo moves it forward — it needs your Apple ID and a paid
enrollment.

## The UI audit

`docs/audit/ui-audit-plan.md` is the checklist and findings log. **Start there,
not here**, for anything UI.

**41 findings, all fixed** — numbered to 44, because 40–42 were never assigned.
The sweeps are complete: hierarchy (7c), accessibility (9) and themes (10).

**Journey coverage is not.** This file used to say every phase was complete with
only Phase 8 left; the plan itself still has unticked rows in Phases 2–7b.
Never exercised: age verification, the whole first-run flow, delete confirm, the
YouTube card, a long feed, the avatar picker, data export, and block from a public
profile. A public page **was** viewed as a signed-out visitor during the iPhone SE
pass on 2026-09-16, but the plan's Phase 6 row also asks for publishing a page
and viewing it as another account, so it stays unticked. Read the plan's
checkboxes, not this summary, before calling a surface done.

- **Phase 7** — both moderation actions run against real reports, confirmed in
  the database.
- **Phase 7c** — the hierarchy system applied to all eight surfaces.
- **Phase 9** — Dynamic Type, focus traps and `aria-label`s came back clean; one
  real gap found and fixed.
- **Phase 10** — all eight themes rendered.

**5 dismissals** recorded so they are not re-raised. Two matter: `EmptyState`'s
`toLocaleDateString('en-US', …)` looks exactly like finding 32 and is
deliberately different — **do not "fix" it**; and `AgeVerification` correctly has
no focus trap, because it is an early return with nothing behind it.

**Finding 44 landed after the sweep had closed**, and is worth knowing about
because it is the newest shape on a visitor-facing screen: the public profile
card used to be a 96pt avatar beside a 400pt column, so a third of it was an
empty strip under the avatar. The identity row now holds the display name and
handle only; status, bio, the mood/music panel, the stat line and the actions
are all full width beneath. `.stack-when-scaled` still stacks and centres the
identity at large Dynamic Type, and its comment has been corrected to match.

The design system is written into `/frontend`: three size tiers, style encoding
kind, colour mapped to the same kinds, space as a material. Apply it from there
rather than re-deriving it. Two rules were settled on 2026-09-16 and are easy to
break by reflex:

- **No grey controls.** Rank controls by how much accent they carry — fill, then
  outline, then link — never by switching one to `--text-muted`. Your call: grey
  reads as disabled fine print here and does not fit the aesthetic. Every grey
  control that rendered grey is gone: "forgot ur password?" (moved under the
  password field), the inactive sign in / sign up tab (accent, no underline), the
  cancel buttons in `ConfirmDialog` and `ReportDialog` (now `.xanga-button-ghost`),
  and the modal close ✕ (`--text-title`, because the accent fails 3:1 on the
  header gradient). The sidebar's 🔒/🔓 toggle is still set to `--text-muted`, but
  its only child is an emoji, which ignores `color`, so it never renders grey.
- **`font-bold` in the title font does not look bold on classic-xanga.** Comic
  Neue's Bold is 1.8% wider than its Regular and there is no heavier weight. Use
  `.title-bold`, which adds a text stroke by `--title-font-bold-stroke` (`0.45px`
  on classic-xanga, `0px` on the seven themes whose font has a real bold). Every
  bold title-font element uses it — the auth tabs, the form labels, and 29 more
  sites fixed 2026-09-17. Theme variables are now **44**.

## The four bugs that mattered

All four were invisible to 322 passing tests. Three needed looking rather than
reading; the fourth needed the error message the app was swallowing. They are
the argument for the whole method.

- **Reactions had never worked.** `42P17: infinite recursion detected in policy
for relation "post_reactions"` — the INSERT policy rate-limited by selecting
  from the table it guards, so evaluating it required evaluating that table's
  SELECT policy, which required evaluating it again. Postgres raised instead of
  looping and no insert ever landed; the table held one row from 2026-07-09. The
  count now lives in a `SECURITY DEFINER` function. Applied to prod and verified.
- **A cold-launch deep link was silently dropped** — the emailed "Review in app"
  link's own case, and every shared `#/u/<name>` link opened from a closed app.
  `getLaunchUrl()` resolves async and set the hash in the gap between the initial
  render reading it and the effect attaching the `hashchange` listener. Fixed in
  `0a3db5c`; the plan keeps the isolation method, which is the reusable part.
- **Auth field labels failed WCAG on the default theme** — `--accent-primary` at
  **4.11:1** on the auth gradient. The same two numbers finding 2 recorded,
  because it is the same failure: `d683a7a` fixed it by changing `--link-color`
  and left the accent where it was. **Fixing one token does not fix the
  pairing.** Fixed in `cc3fed1` by moving the form onto `--card-bg`.
- **Reduce Motion was ignored on most of the app.** `MotionConfig` sat inside the
  main return, covering the feed and nothing else — `AuthModal`,
  `PublicProfileView`, `ModerationView` and `AgeVerification` are early returns
  above it and all run Framer animations, which the CSS `prefers-reduced-motion`
  block does not reach. Fixed in `7270da9`.

## Verified on device

iPhone 17 Pro Max simulator unless noted.

- **Session survives web-storage eviction** and a full device reboot. The token
  lives in `UserDefaults` only.
- **Reactions work** — inserted, survived a relaunch (so server state, not
  optimistic UI), then deleted.
- **Moderation works end to end, both actions.** `~ dismiss ~` and
  `~ hide entry ~` each run against a real report and confirmed in the database.
- **Deep links route cold and warm**, signed in and signed out.
- **Composer with the full software keyboard raised** — textarea keeps its
  height, draft autosaves, panel clear of the accessory bar. `ReportDialog` too.
- **Dynamic Type at max** across feed, composer, settings and profile — nothing
  truncates. Modal footers keep their buttons on one row on the 440pt Pro Max; on
  the 375pt SE the composer footer wraps to two rows, by design since 2026-09-17.
- **Reduce Motion** verified with it actually enabled: two frames two seconds
  apart are byte-identical.
- **All eight themes rendered**, and all eight clear 4.5:1 for the card title on
  both the header gradient and `--card-bg` (worst value anywhere: 4.53).
- **The overflow fixture's filter pill truncates** without the page shifting into
  horizontal scroll.
- **The redesigned profile card** at 393pt and 440pt, emo-dark and classic-xanga,
  a full profile and a sparse one, and at max Dynamic Type.
- **A 100-character status** — the field maximum — wraps to two lines at full
  width on that card with no overflow. Set on the QA account and reverted.
- **Cold start** median 1.94s (Debug, warm, n=5). Treat past ~3s as a finding.
- **Privacy smoke checks 9/9 green against prod**; anonymous clients read 0 rows
  from every table.
- **The chapter-rename confirmation, end to end against prod** (2026-09-16).
  Fixture on `ldonald234`: profile public, `summer 2026` private, one entry
  public inside it — `get_public_profile` served 0 entries. Renaming to
  `summer 2026 v2` raised the dialog, and the row was confirmed unchanged in the
  database. `go back` closed it with the typed name intact, still no write.
  `yes, publish it` saved, and `get_public_profile` then served the entry. All
  three fixture writes reverted and re-diffed; the one residue is that entry's
  `updated_at`, which a trigger restamps on any update. **No account carries
  this fixture** — every `private_chapters` in prod is empty — so re-testing
  means building it again and reverting it. Ask before each fixture: approval
  for one test does not cover the next.
- **The iPhone SE (375 × 667pt), signed out** (2026-09-16) — intro, sign in with
  the keyboard up, a public profile as a visitor, and the report dialog (opened
  and cancelled; prod confirmed no report written). Five findings, all fixed and
  re-verified the same day: content scrolling under the status bar on every
  iPhone (now a blur strip, pixel-identical at rest), "powered by YourJournal"
  in two footers (now Retrowave Journal), grey dialog cancel buttons (now the
  outline tier), slide 4's preview below the fold on short screens, and the
  intro header crammed under the SE's status bar.
- **The iPhone SE, signed in as `ldonald234`** (2026-09-16, fixes re-checked
  2026-09-17), including max Dynamic Type. Held up: the entry view with the
  overflow fixture, the composer with the keyboard up (textarea keeps its height,
  draft autosaves), Settings, all three profile tabs and their two-column grids,
  and `ConfirmDialog`'s outline cancel. Seven findings; six fixed and seen on the
  SE — the composer footer now wraps instead of clipping, "find old entries" keeps
  its heading on one line, dialog titles balance instead of orphaning `~`, and the
  public page copy uses the voice. The other two fixes: `.title-bold` at 29 more
  sites, and the "new entry" button disappearing after sign-in — confirmed
  2026-09-17 when you signed in fresh on the Pro Max and iPhone 17 and it was there. Nothing was saved to prod; test drafts left on
  the device were deleted.
- **Feed spacing from your screenshots** (2026-09-17, `c0c1a15`, `d1dbacb`,
  `fbb4840`). The sidebar's "current mood:" and the mood now share a row (iPhone
  17, `ldonald0234`). The collapsed "find old entries" card lost 12pt of empty
  margin from an always-rendered filter-chip container (Pro Max). The feed now
  ends in `.feed-fab-clearance`, so the last post's reactions scroll clear of the
  "new entry" button, and the gap from the end of the feed to the footer went
  160pt → 91pt on the Pro Max and 82pt → 57pt on the SE. On the SE, with the feed
  scrolled to its end and flush with the screen bottom, the closing line clears
  the button by ~6pt — that spacing is the floor, see "iOS layout".
- **The modal close ✕ in accent-family colour** (2026-09-16) — Settings opened on
  the Pro Max in cottage-core and the iPhone 17 in emo-dark, where it went from
  `#858585` grey to the theme's red; both modals closed from it.
- **The sign-in screen with no grey** (iPhone 17 Pro, signed out, 2026-09-16) —
  both links and the inactive tab in accent, both tab states checked, and a
  before/after crop showing the tab and field labels now read bold.

## Chapter privacy

- **The chapter-rename confirmation** landed 2026-09-15. Renaming a chapter out of
  `private_chapters` — or clearing the chapter — publishes the entry on save,
  and nothing warned. `PostModal` now gates that save on a `ConfirmDialog`.
  `chapterChangeRepublishes()` in `utils/chapterPrivacy.ts` is the decision, kept
  as a pure function so it is testable apart from the modal. It stays silent on
  a case variant, on an entry saved private, on a private profile, and on a
  hand-flipped `is_private` — see `gotchas.md` for why each one matters. The
  four positive tests were mutation-checked: stubbing the gate to `false` turns
  all four red. Verified on device — see above.
- **The entry view's privacy badge reports effective visibility.** It read
  `🌐 public` on a public entry in a private chapter while `get_public_profile`
  served it 0 times — and so gave no hint that renaming the chapter would publish
  it. `entryVisibility()` in `utils/chapterPrivacy.ts` now yields `private`,
  `hidden-by-chapter` or `public`; the entry's own flag wins when both apply, and
  the profile's `is_public` is deliberately ignored. Verified on device
  2026-09-16 with the profile kept private throughout: the same entry read
  `🔒 hidden by chapter`, then `🔒 private` after the fixture was reverted.
- **The chapter padlock now matches the server.** `Sidebar` and `ChapterChips`
  compared raw strings while the toggle and the RPC compared normalized, so a
  case variant drew 📖 on a chapter that was genuinely private and the toggle's
  label inverted. Both call `isChapterPrivate()`.

## Open work

- **The feed reads through a ~105pt slot on the iPhone SE at rest — left as is
  on purpose.** The feed is its own scroll container, and the virtualizer, the
  load-more observer and the height maths all depend on that; changing it means a
  window-scrolling virtualizer and re-verifying scroll on iOS, which you judged not
  worth it for a shrinking class of phone. Swiping on the header scrolls the page
  and the feed grows, so it works.
- **Known trade-off on the SE:** at max Dynamic Type **with the keyboard up**, the
  wrapped composer footer leaves little room above the keyboard, so the field
  being typed in scrolls out of view. Typing and saving still work; only that
  triple extreme is affected.

- **Ban is not implemented.** Prod has `admin_list_reports` and
  `admin_resolve_report` only. `ReportDialog` used to promise reporters it could
  ban and no longer does (finding 43) — **restore that sentence when a ban
  exists**, not before.
- **Finding 21's truncation is code-level only.** No public account has a chapter
  long enough to photograph `PublicPostCard` truncating one. (Finding 12's filter
  pill _is_ photographed now.)

## Waiting for you, not for a session

- **Apple Developer Program enrollment**, as above.
- **Offline banner** — needs a real device in Airplane Mode. The simulator shares
  the Mac's connection. `useOnlineStatus` uses `@capacitor/network`.
- **Session expiry** — fires only when a token _refresh_ fails, not when one
  expires, so waiting will not trigger it. Revoke the session from the Supabase
  dashboard (Auth → Users → sign out) while the app is backgrounded, then
  foreground it.
- **Success toast and sub-400ms rapid taps** — not drivable from here; see the
  tap-reliability note below. Both are code-verified only.
- **Signing in.** An agent cannot authenticate, so any surface needing a
  particular account needs you to sign in first and say which one.

## Accounts, and what each is for

| Account                                         | Use                                                                    |
| ----------------------------------------------- | ---------------------------------------------------------------------- |
| `ldonald234`                                    | **The test data.** cottage-core, 2 entries, incl. the overflow fixture |
| `ldonald0234`                                   | **Admin — the only one.** emo-dark, reaches `ModerationView`           |
| `retrodemo`                                     | Public page, emo-dark, mood + music + bio, **3 public entries**        |
| `codex-qa-24e3a82f`                             | Public page, **classic-xanga** — the light-theme public fixture        |
| `blankslate`, `nonoabc2345`, `ldonald234_xanga` | Zero posts — reach `EmptyState`                                        |

**Last known simulator state, 2026-09-17** (sessions live in `UserDefaults`, so
they survive a reboot). **Simulators shut down between sessions** — all four were
found shut down the next morning — so boot before installing or screenshotting,
and check which build each carries before trusting anything you see on one.

| Simulator                  | Session       | Build              |
| -------------------------- | ------------- | ------------------ |
| iPhone 17 Pro Max          | `ldonald234`  | current, `fbb4840` |
| iPhone 17 Pro              | signed out    | current, `fbb4840` |
| iPhone 17                  | `ldonald0234` | current, `fbb4840` |
| iPhone SE (3rd generation) | `ldonald234`  | current, `fbb4840` |

The iPhone 17 Pro is the one to use for signed-out screens: an agent cannot sign
back in, so signing a session out to reach the auth wall cannot be undone from
here. The SE was created 2026-09-16 for the 375pt pass.

`@ldonald234`'s second entry — **`Supercalifragilistic…`, a 200-character title,
a 100-character space-free chapter, and an unbreakable token in the body** — is
an overflow fixture, not junk. It is the only thing that exercises the wrapping
paths, and it found four bugs. Keep it unless you have a reason not to.

## Things that will waste your time if you do not know them

### Database

- **Migrations are not applied by `supabase db push`** — blocked on this hosted
  project. A file in `supabase/migrations/` does not mean it is live, and
  `schema_migrations` holds 1 row against 40+ files. **Never run `db push`**: it
  would try to re-apply forty already-live migrations. Apply through the
  dashboard editor or the Management API, and record in the file that you did.
- **The Management API returns only the LAST statement's result.** A file of
  nine `select`s reports one row and hides eight, silently.
- **The reports table is `content_reports`**, not `reports`.
- **The keychain gates the Management API token intermittently.**
  `security find-generic-password -s "Supabase CLI" -a supabase -w` sometimes
  returns empty with no error, and an empty bearer makes the API answer
  `Format is Authorization: Bearer [token]` — which reads like an outage and is
  not one. Check `${#TOKEN}` before blaming the API. The CLI lives at
  `node_modules/.bin/supabase`, not on PATH.
- **Do not trust a check that matches on SQL text.** Prod writes the same
  guarantee differently, and two smoke checks reported FAIL against correct code.

### Colour

- **A colour verified on one surface is not verified on another**, and **fixing
  one token does not fix the pairing** — see the auth labels above.
- **State the threshold once, then compare against that number every time.** The
  card title needs **4.5:1**, not 3:1: on a phone it is `text-lg`, 18px bold,
  under WCAG's 18.66px bold cutoff. Comparing against 3:1 let myspace-blue pass
  a sweep it failed.
- **Emoji ignore `color`.** If a glyph must be themed, use a text glyph like `✦`.
- **No grey controls**, and **`font-bold` is not bold in Comic Neue** — see the
  design system notes under "The UI audit" above.

### Code

- **Grep a class name before trusting it.** `PublicProfileView` used `.marquee`,
  defined nowhere, so its banner never scrolled — the component looks correct
  until you check the stylesheet.
- **Retro icons mark sections; `Pepicon` marks controls.** Both are used
  app-wide, so neither is legacy. Give each glyph one meaning.
- **The press bloom is `saturate() brightness()`, which does nothing to a grey**
  — one more reason there are no grey controls. A bare icon button still needs
  `.icon-btn-hover` for its press fill.
- **Scan for grey controls in the built bundle, not only in source.** A source
  scan for `<button>` elements missed the sidebar toggle, whose style sits in a
  nested attribute, and matched comments that merely mention `--text-muted`.
  Grepping `dist/assets/*.js` for `color:"var(--text-muted)"` next to an
  `onClick` or `aria-label` finds what actually ships.

### Simulator

- **Tap delivery is roughly 1-in-3 and can land seconds late.** A tap you wrote
  off as missed may register later — a chapter-privacy toggle flipped after I had
  concluded it had not. **Read state from a screenshot after every tap**, and
  re-check before assuming your own earlier action failed. This is why the
  success toast and the sub-400ms rapid tap are not drivable from here.
- **The tap space is points; screenshots are pixels.** Divide a position read
  off a screenshot by (screenshot width ÷ point width): 440pt on the Pro Max,
  402pt on the Pro and iPhone 17, 375pt on the SE. A raw `simctl io` capture is
  3× on the Face ID phones and 2× on the SE; an image shown scaled down has its
  own ratio, so always compute from the width you are looking at. Passing
  screenshot numbers straight to `tap` lands in empty space and looks exactly
  like a dead button. `touch_path` does **not** share `tap`'s mapping.
- **An Xcode update blocks `git` and the simulator.** `git` here is Xcode's shim
  at `/usr/bin/git`, so after an update every `git`, `xcrun` and `xcodebuild`
  call fails with "You have not agreed to the Xcode license agreements" until
  you run `sudo xcodebuild -license` (space to page, then type `agree`). This
  happened on 2026-09-15 with Xcode 27.0. Until then, git state can still be
  read from `.git/HEAD`, `.git/refs/` and `.git/logs/HEAD`.
- **Swipes land reliably where taps do not.** Where a swipe starts matters: on
  the feed it scrolls the feed's own box first, on the header or chips it scrolls
  the page.
- **Catching a transient needs the screenshot armed first:**
  `( sleep N; xcrun simctl io <udid> screenshot f.png ) &` then fire the tap.
  MCP round trips are ~1.5–2s, so bracket 1.6–3.4s.
- **Check which simulator is booted and which build it runs.** A second sim
  carrying a build several commits back showed already-fixed bugs. Verify from
  the **installed** bundle, not the build output: `xcrun simctl
get_app_container <udid> com.retrowave.journal app`, then compare its
  `public/assets/index-*.js` name with the current build's. `xcrun simctl
install` over an existing install keeps the container, so the session
  survives. `simctl listapps` reports nothing for a shut-down device, which
  looks like "not installed" and is not.
- **The first keyboard on a fresh simulator is covered by an iOS tutorial**
  ("Speed up your typing…"). It is the OS, not the app — tap Continue.
- **Re-issuing the same deep-link hash is a no-op** by design. Vary the id.
- **There is no `.xcworkspace`.** SPM project — pass
  `-project ios/App/App.xcodeproj`. Commands are in `/release`.
- **The scratchpad gets cleaned** — mid-session it took the built `.app`, and
  overnight it took a Management API helper script. Rebuild or recreate rather
  than trusting a path from earlier.
- **The software keyboard needs Simulator.app open**, not just the streaming
  panel: `defaults write com.apple.iphonesimulator ConnectHardwareKeyboard
-bool false` **and** `open -a Simulator`.
- **Dynamic Type from the CLI:** `xcrun simctl ui <udid> content_size
accessibility-extra-extra-extra-large`. Underscore, not hyphen. Read the
  current value first, relaunch the app (it only re-reads on foreground), and
  restore it when done.
- **Discarding the composer does not clear its autosaved draft.** Anything typed
  during a test reappears next time the composer opens. It lives in WebKit's
  `localStorage`, which can only be edited with the device **shut down**:
  `find` the container's `localstorage.sqlite3`, `xcrun simctl shutdown`, remove
  the `-wal`/`-shm` files, then `delete from ItemTable where key like
'post-draft%'`, and boot. The session survives, since it is in `UserDefaults`.

### iOS layout

- **Content scrolls under a transparent status bar.** `body::before` is a
  blur-only strip behind it, on `body` because five screens are early returns.
  Test any change to page chrome twice: scrolled content under the clock, and at
  rest against a before screenshot, where it must be pixel-identical. No tint,
  no `saturate()` — both show at rest.
- **`.safe-area-top` adds space only on home-button iPhones**:
  `inset + clamp(0px, 44px - inset, 0.5rem)`. Web and every notched phone are
  unchanged by construction.
- **The feed scrolls in its own box, so page padding never reaches its end.**
  `.page-fab-clearance` pads the page; the feed's last post still sat under the
  floating button. `.feed-fab-clearance` (`3rem` + bottom safe area, `0` at
  `lg`) ends the feed instead, and while posts show, the layout's bottom padding
  and the footer's top margin shrink on phones so the spacing does not stack.
  Do not trim `3rem`: it is measured, not guessed. Test both ends — the feed
  scrolled to its end with its box flush to the screen bottom (the SE, swiping on
  the feed from the top of the page), and the page scrolled to the footer.
- **The intro compacts below 700pt of height** so slide 4's preview fits on the
  SE. Face ID phones never match.

### Testing

- **Green tests are not proof.** Suites mock the thing under test —
  `PostModal.test.tsx` mocks `useFocusTrap`, both card suites mock
  `react-markdown` — and anything native-only is inert in jsdom. The four bugs
  at the top of this file are the proof.
- **Watch the test count, not just red/green.** CI silently ran 241 of 265 for
  over a week. Currently **344**.
- **Mutation-check a new guard.** Stub the condition to `false` and confirm the
  tests that name it go red — the chapter-rename and privacy-badge tests were
  both checked this way.
- **A contrast ratio proves legibility, not that a control reads as tappable.**
  The grey reset link measured 9.74:1 and still looked like disabled fine print.
- **The env file is `.env.local`**, not `.env`.
