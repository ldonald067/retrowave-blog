# Handoff — current state

**This is a living document. Overwrite it; do not append.** Six dated audit
snapshots were deleted in `1c966da` for describing branches that no longer
existed and constraints that no longer applied. Keep this one true or delete it.

Read `CLAUDE.md` first, then `.claude/docs/gotchas.md`.

Last rewritten 2026-08-20, at `8918305`.

---

## Where the project is

The web app, backend, and security surface are done and live at
https://retrowaveblog.com. **What remains is Apple-side only**: signing,
archive/upload, and the App Store Connect listing.

`docs/app-store-submission-guide.md` is the single source of truth for
submission — paste-ready listing copy, App Privacy answers, age rating, review
notes, and the screenshot plan.

CI is green. `main` is current; everything below is pushed.

## The one blocker

**Apple Developer Program enrollment.** `security find-identity -v -p
codesigning` reports **0 valid identities** and no team is configured, so
nothing can be signed, archived, or uploaded. Every other submission input is
ready and waiting on this. Nothing in the repo can move it forward — it needs
your Apple ID and a paid enrollment.

## Verified on device

iPhone 17 Pro Max simulator unless noted. These are the surfaces that green
tests do not cover.

- **Composer with the full software keyboard raised.** Textarea keeps its
  height, typed lines visible with the caret at the end, save reachable, panel
  ~54pt clear of the accessory bar, draft autosaved _while the keyboard was up_.
  This is the surface whose textarea once collapsed to zero height.
- **Profile modal, same test.** Focused field auto-scrolls into view, counter
  and helper text stay visible, save and cancel both reachable. Note iOS shows a
  one-time QuickPath intro on the very first software-keyboard use — tap
  Continue, it is not a layout bug.
- **Dynamic Type 0% → 130%**, capped at 1.3×, no truncation at any size and
  pixel-identical rendering at the default. `applyDynamicType` is native-only,
  so a web reader's own font preference is never clobbered.
- **Signed-in home and PostCard at accessibility-extra-extra-extra-large.**
  Nothing truncated or overlapping; the reaction bar wraps rather than overflows.
- **Entry detail and editor** (2026-08-20). Detail shows
  `📅 date · 🔒 private · ~ author` in one muted row. The editor states privacy
  once — heading, toggle, consequence line — where it used to assert it six
  times, which put `ur thoughts:` below the fold.
- **Content reports end to end:** UI → `content_reports` row → webhook → edge
  function → Resend → inbox, with an in-app moderation queue.
- **Anonymous clients read 0 rows** from every table, verified with real anon
  requests rather than policy inspection.
- **Privacy smoke checks: 9/9 green against prod** (2026-08-20). Run them with
  the recipe in `docs/audit/backend-privacy-smoke-checks.md` before shipping
  anything that touches RLS or the public-profile path.

## Open work

Nothing is outstanding from either adversarial review. Still open, lower value:

- **Ban is not implemented.** Prod has `admin_list_reports` and
  `admin_resolve_report` only — hide and dismiss, no ban. Enforcing one means
  touching sign-in and every feed RPC, and a half-built ban is worse than none.
  Use the dashboard's auth controls meanwhile.
- **Renaming a chapter republishes its entries** and the UI does not warn. A
  post moved from a private chapter to a new name drops out of
  `private_chapters` and becomes publicly visible. Deliberate — a rename is a
  real content move and the post's own `is_private` is the control — but a
  confirmation step would be worth building.
- **Silent sign-out, unreproduced.** Observed once mid-session, never again
  across a dozen relaunches. If it recurs, note whether the app had been
  backgrounded a while — that points at token refresh rather than storage
  eviction.

## Waiting for you, not for a session

- **One open report is deliberately left in the queue** (confirmed still `open`)
  so you can exercise the moderation screen. Sign in as `ldonald0234` — the only
  admin — and open `#/report/<id>`, or the "Review in app" link from the report
  email.
- **Apple Developer Program enrollment**, as above.

All six screenshots are captured at 1320 × 2868 in `store-assets/screenshots/`.
Confirm App Store Connect accepts that size at upload rather than re-capturing
blind; 1290 × 2796 has also been a valid 6.9" size and the guide explains what
to do if it rejects them.

## Things that will waste your time if you do not know them

- **Migrations are not applied by `supabase db push`** — it is blocked on this
  hosted project, as are `migration list` and `test db`. A file in
  `supabase/migrations/` does not mean it is live. Verify schema claims by
  querying prod (recipe in `CLAUDE.md`); apply SQL through the dashboard editor
  or the Management API query endpoint.
- **The Management API returns only the LAST statement's result.** A file of
  nine `select`s reports one row and hides the other eight — silently, looking
  like success. `supabase/tests/privacy_smoke.sql` is a single `union` for
  exactly this reason. Do not split it up.
- **Do not trust a function check that matches on SQL text.** Prod writes the
  same guarantee differently — `v_user_id := auth.uid()` instead of
  `p.user_id = auth.uid()`, unaliased `is_public` instead of `pr.is_public` —
  and two smoke checks reported FAIL against correctly-scoped code because of
  it. Dump the live definition with `pg_get_functiondef` before believing a
  failure.
- **There is no `.xcworkspace`.** The iOS project is SPM (`CapApp-SPM`), so
  `xcodebuild -workspace App.xcworkspace` fails with "does not exist" and reads
  like a broken checkout. Pass `-project ios/App/App.xcodeproj`. Full build and
  launch commands are in `.claude/commands/release.md`.
- **Simulator names move with each Xcode release.** A hardcoded
  `name=iPhone 16` fails at destination resolution. Target the booted device's
  UDID instead.
- **Keep build output out of `ios/` paths ESLint does not ignore.** The config
  ignores `dist` and `ios` wholesale now, but it previously named
  `ios/App/App/public` alone, and pointing DerivedData at `ios/DerivedData`
  turned `npm run lint` into a review of minified vendor bundles — 266 errors
  with nothing wrong in `src/`.
- **Green tests are not proof.** Several suites mock the thing under test —
  `PostModal.test.tsx` mocks `useFocusTrap` — and anything native-only
  (`--keyboard-inset`, Dynamic Type, safe areas) is permanently inert in jsdom.
  Verify user-facing work on the simulator and show the evidence.
- **Watch the test count, not just red/green.** CI silently ran 241 of 265 tests
  for over a week. Currently **299**.
- **The software keyboard needs Simulator.app open**, not just the assistant's
  streaming panel — the panel forwards the Mac keyboard, so iOS shows the
  accessory bar with no keys and `--keyboard-inset` lands at the bar's height
  instead of the real ~400pt. Run
  `defaults write com.apple.iphonesimulator ConnectHardwareKeyboard -bool false`
  and then `open -a Simulator`; neither step works alone.
- **Dynamic Type is settable from the CLI**, no Settings.app detour:
  `xcrun simctl ui <udid> content_size accessibility-extra-extra-extra-large`.
  Underscore, not hyphen — the hyphenated spelling prints usage and exits 117.
  Read the current value first and restore it; background and relaunch the app
  after changing it, since it only re-reads on foreground.
- **Admin is the owner account only.** Never `appreview@retrowaveblog.com` —
  App Review signs into it.
- **The env file is `.env.local`**, not `.env`. Without it the Supabase client
  fails to initialise and the app renders blank.
