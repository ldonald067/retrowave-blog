# Handoff — current state

**This is a living document. Overwrite it; do not append.** Six dated audit
snapshots were deleted in `1c966da` for describing branches that no longer
existed and constraints that no longer applied. Keep this one true or delete it.

Read `CLAUDE.md` first, then `.claude/docs/gotchas.md`.

Last rewritten 2026-09-01, at `4f1b83e`.

---

## Where the project is

The web app, backend, and security surface are done and live at
https://retrowaveblog.com. **What remains is Apple-side only**: signing,
archive/upload, and the App Store Connect listing.

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

## What is in flight

The **full UI audit** — `docs/audit/ui-audit-plan.md` is the live checklist and
findings log. **Start there, not here**, for anything UI.

- **37 findings: 36 fixed, 1 open.** **Phase 7c (the hierarchy sweep) and
  Phase 9 (accessibility) are both COMPLETE.**
- **4 dismissals** recorded so they are not re-raised, including one that
  matters: `EmptyState`'s `toLocaleDateString('en-US', …)` looks exactly like
  finding 32 and is deliberately different. Do not "fix" it.
- **Phase 8 (adverse states) is part done.** `ErrorMessage`, the skeletons and
  the error toast are verified on device. The success toast, an isolated
  `LoadingSpinner`, a genuine sub-400ms rapid tap, offline and session expiry
  are not — the plan says why for each.
- **Phase 9 found one real gap**: `MotionConfig` covered only the feed, so
  Reduce Motion was ignored on the auth screen, public profiles, the moderation
  queue and the age gate. Fixed in `7270da9`. Dynamic Type, focus traps and
  `aria-label`s all came back clean.
- **Phase 10 has four themes never rendered**: `myspace-blue`, `y2k-cyber`,
  `grunge`, `pastel-goth`.

The design system that came out of it is written into `/frontend`: three size
tiers, style encoding kind, colour mapped to the same kinds, and space as a
material. Apply it from there rather than re-deriving it.

## Two bugs this audit found that tests could never have

Both were invisible to 322 passing tests, and both needed looking rather than
reading. They are the argument for the whole method.

- **Auth field labels failed WCAG on the default theme** — `--accent-primary` at
  **4.11:1** on the auth gradient, 4.14 on cottage-core. Those are the same two
  numbers finding 2 recorded, because it is the same failure: `d683a7a` fixed it
  by changing `--link-color` and left the accent where it was. **Fixing one
  token does not fix the pairing.** Fixed in `cc3fed1` by moving the form onto
  `--card-bg`, where the accent is 4.82 at worst.
- **A cold-launch deep link was silently dropped** — the emailed "Review in app"
  link's own case, and every shared `#/u/<name>` link opened from a closed app.
  `getLaunchUrl()` resolves async and set the hash in the gap between the initial
  render reading it and the effect attaching the `hashchange` listener. Fixed in
  `0a3db5c`. The write-up in the audit plan keeps the isolation method, which is
  the reusable part.

## Verified on device

iPhone 17 Pro Max simulator unless noted.

- **Session survives web-storage eviction.** Deleted the whole
  `localstorage.sqlite3` and relaunched: still signed in. The token lives in
  `UserDefaults` only. Survives a full device reboot too.
- **Composer with the full software keyboard raised** — textarea keeps its
  height, draft autosaves while typing, panel clear of the accessory bar.
- **Dynamic Type 0% → 130%**, capped at 1.3×, no truncation. Native-only, so a
  web reader's own font preference is never clobbered.
- **Chapters end to end** — create, chip, filter, detail bar, filter pill.
- **Markdown renders through the lazy chunk** in both composer preview and feed.
- **First-run intro** appears once per install and never again; all four slides
  hold at max Dynamic Type.
- **Cold start** median 1.94s (Debug, warm, n=5). Treat past ~3s as a finding.
- **Deep links route cold and warm**, signed in and signed out, after `0a3db5c`.
- **The moderation queue works end to end** — rendered, `~ dismiss ~` run, and
  confirmed server-side by remounting and re-querying `admin_list_reports`.
- **Privacy smoke checks 9/9 green against prod.**
- **Anonymous clients read 0 rows** from every table.

## Open work

- **Finding 36 — reactions do not work, and never have.** Tapping ❤️ fails with
  the generic error toast, and `post_reactions` has held **one row in all of
  prod since July**. RLS, the emoji `CHECK` constraint, column drift and a
  duplicate-key collision are all ruled out and written up in the plan; the raw
  error is still swallowed by `toUserMessage`. Leading hypothesis is an expired
  JWT making `auth.uid()` null while cached reads still render — which would
  also explain why session expiry has never been seen. `/feature` work.
- **Phase 8, then Phase 10.** The plan lists every item.
- **`~ hide entry ~` has never been run.** Both moderation buttons call the same
  `admin_resolve_report` and both consume the report, and there was one to
  spend. **A new report must be filed before that path can be exercised.**
- **Ban is not implemented.** Prod has `admin_list_reports` and
  `admin_resolve_report` only. A half-built ban is worse than none.
- **Renaming a chapter republishes its entries** and nothing warns. Deliberate —
  a rename is a real content move and the post's own `is_private` is the control
  — but a confirmation step is worth building.
- **The offline path cannot be tested on a simulator.** It shares the Mac's
  connection. `useOnlineStatus` uses `@capacitor/network` now, but that needs a
  device in Airplane Mode to confirm.
- **Finding 21's truncation is code-level only.** No public account has a chapter
  long enough to photograph `PublicPostCard` truncating one.

## Waiting for you, not for a session

- **Apple Developer Program enrollment**, as above.
- **The moderation queue is now empty.** File a report from a non-admin account
  against a public entry if you want `~ hide entry ~` exercised.
- **Signing in.** An agent cannot authenticate, so any surface needing a
  particular account needs you to sign in first and say which one.

## Accounts, and what each is for

| Account                                         | Use                                                                     |
| ----------------------------------------------- | ----------------------------------------------------------------------- |
| `ldonald234`                                    | **The test data.** cottage-core, 2 entries, incl. the overflow fixture  |
| `ldonald0234`                                   | **Admin — the only one.** emo-dark, 3 entries, reaches `ModerationView` |
| `retrodemo`                                     | Public page, emo-dark, mood + music + bio, 3 public entries             |
| `codex-qa-24e3a82f`                             | Public page, **classic-xanga** — the light-theme public fixture         |
| `blankslate`, `nonoabc2345`, `ldonald234_xanga` | Zero posts — reach `EmptyState`                                         |

`@ldonald234`'s second entry — **`Supercalifragilistic…`, a 200-character title,
a 100-character space-free chapter, and an unbreakable token in the body** — is
an overflow fixture, not junk. It is the only thing that exercises the wrapping
paths, and it found four bugs. Keep it unless you have a reason not to.

## Things that will waste your time if you do not know them

- **Migrations are not applied by `supabase db push`** — blocked on this hosted
  project, as are `migration list` and `test db`. A file in
  `supabase/migrations/` does not mean it is live. Verify by querying prod;
  apply through the dashboard editor or the Management API.
- **The Management API returns only the LAST statement's result.** A file of
  nine `select`s reports one row and hides eight, silently, looking like
  success. `privacy_smoke.sql` is a single `union` for that reason.
- **Do not trust a check that matches on SQL text.** Prod writes the same
  guarantee differently — `v_user_id := auth.uid()`,
  `public.normalize_chapter()` — and two smoke checks reported FAIL against
  correct code because of it.
- **The reports table is not called `reports`.** A query against that name
  errors; find the real name before assuming the table is missing.
- **A colour verified on one surface is not verified on another.** The accent
  that clears 4.5:1 on `--card-bg` measures 2.38 on a modal header gradient.
  And fixing one token does not fix the pairing — see the auth labels above.
- **Emoji ignore `color`.** Several places styled an emoji and silently did
  nothing. If a glyph must be themed, use a text glyph like `✦`.
- **Grep a class name before trusting it.** `PublicProfileView` used `.marquee`,
  which is defined nowhere, so its banner never scrolled — the component looks
  correct until you check the stylesheet.
- **Retro icons mark sections; `Pepicon` marks controls.** Both families are
  used app-wide, so neither is legacy. Give each glyph one meaning.
- **The simulator's tap space is points; screenshots are ~2.09× that.** Reading
  a control's position off a screenshot and passing it to `tap` lands in empty
  space and looks exactly like a dead button.
- **Check which simulator is booted and which build it runs.** A second sim
  carrying a build several commits back showed already-fixed bugs. `simctl
install` over a running install keeps the container, so the session survives.
- **Re-issuing the same deep-link hash is a no-op** by design — `routeDeepLink`
  bails when the hash already matches. Vary the id or it looks like a dead link.
- **There is no `.xcworkspace`.** SPM project — pass
  `-project ios/App/App.xcodeproj`. Commands are in `/release`.
- **Simulator names move with each Xcode release.** Target the booted UDID.
- **The scratchpad gets cleaned mid-session.** It took the built `.app` with it
  once. `mkdir -p` before writing, and rebuild rather than trusting a path from
  earlier in the session.
- **Green tests are not proof.** Suites mock the thing under test —
  `PostModal.test.tsx` mocks `useFocusTrap`, both card suites mock
  `react-markdown` — and anything native-only is inert in jsdom. The two bugs at
  the top of this file are the proof.
- **Watch the test count, not just red/green.** CI silently ran 241 of 265 for
  over a week. Currently **322**.
- **The software keyboard needs Simulator.app open**, not just the streaming
  panel. `defaults write com.apple.iphonesimulator ConnectHardwareKeyboard
-bool false` **and** `open -a Simulator`; neither works alone.
- **Dynamic Type from the CLI:** `xcrun simctl ui <udid> content_size
accessibility-extra-extra-extra-large`. Underscore, not hyphen. Read the
  current value first and restore it.
- **The env file is `.env.local`**, not `.env`.
