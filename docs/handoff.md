# Handoff — current state

**This is a living document. Overwrite it; do not append.** Six dated audit
snapshots were deleted in `1c966da` for describing branches that no longer
existed and constraints that no longer applied. Keep this one true or delete it.

Read `CLAUDE.md` first, then `.claude/docs/gotchas.md`.

Last rewritten 2026-09-02, at `6dd9ed5`.

---

## Where the project is

The web app and backend are done and live at https://retrowaveblog.com. The UI
audit is finished. **What remains is Apple-side only**: signing, archive/upload,
and the App Store Connect listing.

`docs/app-store-submission-guide.md` is the single source of truth for
submission. All six screenshots are captured at 1320 × 2868 in
`store-assets/screenshots/`.

CI is green. `main` is current; everything below is pushed.
**322 tests across 39 files.**

## The one blocker

**Apple Developer Program enrollment.** `security find-identity -v -p
codesigning` reports **0 valid identities** and no team is configured, so
nothing can be signed, archived, or uploaded. Every other submission input is
ready. Nothing in the repo moves it forward — it needs your Apple ID and a paid
enrollment.

## The audit is finished

`docs/audit/ui-audit-plan.md` is the checklist and findings log. **Start there,
not here**, for anything UI.

**44 findings, all fixed.** Every phase is complete. The only unticked rows are
Phase 8 states this rig physically cannot produce — they are under "Waiting for
you" below, each with why.

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
rather than re-deriving it.

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
  truncates, modal footers keep their buttons on one row.
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

## Open work

- **Ban is not implemented.** Prod has `admin_list_reports` and
  `admin_resolve_report` only. `ReportDialog` used to promise reporters it could
  ban and no longer does (finding 43) — **restore that sentence when a ban
  exists**, not before.
- **Renaming a chapter republishes its entries** and nothing warns. Deliberate —
  a rename is a real content move and the post's own `is_private` is the control
  — but a confirmation step is worth building.
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

**Last known simulator state** (sessions live in `UserDefaults`, so they survive
a reboot): iPhone 17 Pro Max signed in as `ldonald234`, iPhone 17 as
`ldonald0234`. Both were shut down at the end of the session. Check which sim is
booted and which build it carries before trusting anything you see on one.

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

### Code

- **Grep a class name before trusting it.** `PublicProfileView` used `.marquee`,
  defined nowhere, so its banner never scrolled — the component looks correct
  until you check the stylesheet.
- **Retro icons mark sections; `Pepicon` marks controls.** Both are used
  app-wide, so neither is legacy. Give each glyph one meaning.
- **The press bloom is `saturate() brightness()`, which does nothing to a grey.**
  A bare `--text-muted` icon button needs `.icon-btn-hover` or it has no visible
  press state at all.

### Simulator

- **Tap delivery is roughly 1-in-3 and can land seconds late.** A tap you wrote
  off as missed may register later — a chapter-privacy toggle flipped after I had
  concluded it had not. **Read state from a screenshot after every tap**, and
  re-check before assuming your own earlier action failed. This is why the
  success toast and the sub-400ms rapid tap are not drivable from here.
- **The tap space is points; screenshots are ~2.09× that** on the Pro Max.
  Reading a control's position off a screenshot and passing it to `tap` lands in
  empty space and looks exactly like a dead button. `touch_path` does **not**
  share `tap`'s mapping.
- **Catching a transient needs the screenshot armed first:**
  `( sleep N; xcrun simctl io <udid> screenshot f.png ) &` then fire the tap.
  MCP round trips are ~1.5–2s, so bracket 1.6–3.4s.
- **Check which simulator is booted and which build it runs.** A second sim
  carrying a build several commits back showed already-fixed bugs.
  `xcrun simctl install` over a running install keeps the container, so the
  session survives.
- **Re-issuing the same deep-link hash is a no-op** by design. Vary the id.
- **There is no `.xcworkspace`.** SPM project — pass
  `-project ios/App/App.xcodeproj`. Commands are in `/release`.
- **The scratchpad gets cleaned mid-session** — it took the built `.app` once.
  Rebuild rather than trusting a path from earlier in the session.
- **The software keyboard needs Simulator.app open**, not just the streaming
  panel: `defaults write com.apple.iphonesimulator ConnectHardwareKeyboard
-bool false` **and** `open -a Simulator`.
- **Dynamic Type from the CLI:** `xcrun simctl ui <udid> content_size
accessibility-extra-extra-extra-large`. Underscore, not hyphen. Read the
  current value first and restore it.

### Testing

- **Green tests are not proof.** Suites mock the thing under test —
  `PostModal.test.tsx` mocks `useFocusTrap`, both card suites mock
  `react-markdown` — and anything native-only is inert in jsdom. The four bugs
  at the top of this file are the proof.
- **Watch the test count, not just red/green.** CI silently ran 241 of 265 for
  over a week. Currently **322**.
- **The env file is `.env.local`**, not `.env`.
