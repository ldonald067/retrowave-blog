# Handoff — current state

**This is a living document. Overwrite it; do not append.** Six dated audit
snapshots were deleted in `1c966da` for describing branches that no longer
existed and constraints that no longer applied. Keep this one true or delete it.

Read `CLAUDE.md` first, then `.claude/docs/gotchas.md`.

Last rewritten 2026-08-28, at `74c20b7`.

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

A **full UI audit** is roughly half done, run as `/mobile` and `/frontend`
together. `docs/audit/ui-audit-plan.md` is the live checklist, the phase plan,
and the findings log — **start there, not here**, for anything UI.

- **16 findings, all fixed.** Four contrast failures (one on the default theme's
  sign-in screen), three overflow bugs from a single maximum-length entry, and
  a set of hierarchy problems in the entry detail.
- **3 dismissals**, recorded so they are not re-raised: two "muddy" headings
  that measured 8.04 and 14.3, and one misdiagnosis of mine.
- **Phase 7c (hierarchy sweep) is 1 of 8 surfaces done** — `PostCard` is
  applied; `PublicProfileView`, `ProfileModal`, `SettingsModal`,
  `ModerationView`, the auth forms, `EmptyState` and `Sidebar` are not.
- **Phase 8 (adverse states) is barely started.** `ErrorMessage` was seen by
  accident and is fine. Toasts, skeletons, offline and rapid-tap are untouched.

The design system that came out of it is written into `/frontend`: three size
tiers, style encoding kind, colour mapped to the same kinds, and space as a
material. Apply it from there rather than re-deriving it.

## Verified on device

iPhone 17 Pro Max simulator unless noted.

- **Session survives web-storage eviction.** Deleted the whole
  `localstorage.sqlite3` and relaunched: still signed in. The token lives in
  `UserDefaults` only. This closes the silent sign-out.
- **Composer with the full software keyboard raised** — textarea keeps its
  height, draft autosaves while typing, panel clear of the accessory bar.
- **Dynamic Type 0% → 130%**, capped at 1.3×, no truncation. Native-only, so a
  web reader's own font preference is never clobbered.
- **Chapters end to end** — create, chip, filter, detail bar, filter pill.
- **Markdown renders through the lazy chunk** in both composer preview and feed.
- **First-run intro** appears once per install and never again; all four slides
  hold at max Dynamic Type.
- **Cold start** median 1.94s (Debug, warm, n=5). Treat past ~3s as a finding.
- **Privacy smoke checks 9/9 green against prod.**
- **Anonymous clients read 0 rows** from every table.

## Open work

- **Finish the audit.** Phase 7c has 7 surfaces left, Phase 8 is open, and 4 of
  8 themes have never been rendered. The plan lists every one.
- **Ban is not implemented.** Prod has `admin_list_reports` and
  `admin_resolve_report` only. A half-built ban is worse than none.
- **Renaming a chapter republishes its entries** and nothing warns. Deliberate —
  a rename is a real content move and the post's own `is_private` is the control
  — but a confirmation step is worth building.
- **The offline path cannot be tested on a simulator.** It shares the Mac's
  connection. `useOnlineStatus` uses `@capacitor/network` now, but that needs a
  device in Airplane Mode to confirm.

## Waiting for you, not for a session

- **Apple Developer Program enrollment**, as above.
- **One open report sits in the moderation queue** (confirmed still `open`) so
  the screen can be exercised. Admin is `ldonald0234` and nobody else. That
  account's password is in a `curl` entry in `.claude/settings.local.json`
  around line 65 — **worth deleting; a plaintext password does not belong in a
  config file**, even a gitignored one.
- **`ModerationView` has never been rendered** because it needs that account.

## Test data on the signed-in account

`@ldonald234` has two entries, both deliberate:

1. A normal one in chapter `summer 2026`, with markdown in the body.
2. **`Supercalifragilistic…` — a 200-character title, a 100-character
   space-free chapter, and an unbreakable token in the body.** This is an
   overflow fixture, not junk. It is the only thing that exercises the wrapping
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
  guarantee differently — `v_user_id := auth.uid()`, `public.normalize_chapter()`
  — and two smoke checks reported FAIL against correct code because of it.
- **A colour verified on one surface is not verified on another.** The accent
  that clears 4.5:1 on `--card-bg` measures 2.38 on a modal header gradient.
  That single mistake accounts for three of this audit's findings.
- **Emoji ignore `color`.** Two places styled an emoji and silently did nothing.
  If a glyph must be themed, use a text glyph like `✦`.
- **There is no `.xcworkspace`.** SPM project — pass
  `-project ios/App/App.xcodeproj`. Commands are in `/release`.
- **Simulator names move with each Xcode release.** Target the booted UDID.
- **The simulator wedges on long sessions** — `machPortNotConnected`, or
  "Timeout waiting for screen surfaces". A full `shutdown` + `boot` clears it;
  a relaunch does not.
- **The scratchpad gets cleaned mid-session.** `mkdir -p` before writing
  screenshots, and do not rely on captures from earlier in a session.
- **Green tests are not proof.** Suites mock the thing under test —
  `PostModal.test.tsx` mocks `useFocusTrap`, both card suites mock
  `react-markdown` — and anything native-only is inert in jsdom.
- **Watch the test count, not just red/green.** CI silently ran 241 of 265 for
  over a week. Currently **322**.
- **The software keyboard needs Simulator.app open**, not just the streaming
  panel. `defaults write com.apple.iphonesimulator ConnectHardwareKeyboard
-bool false` **and** `open -a Simulator`; neither works alone.
- **Dynamic Type from the CLI:** `xcrun simctl ui <udid> content_size
accessibility-extra-extra-extra-large`. Underscore, not hyphen. Read the
  current value first and restore it.
- **The env file is `.env.local`**, not `.env`.
