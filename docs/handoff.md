# Handoff — current state

**This is a living document. Overwrite it; do not append.** Six dated audit
snapshots were deleted in `1c966da` for describing branches that no longer
existed and constraints that no longer applied. Keep this one true or delete it.

Read `CLAUDE.md` first, then `.claude/docs/gotchas.md`.

---

## Where the project is

The web app, backend, and security surface are done and live at
https://retrowaveblog.com. **What remains is Apple-side only**: signing,
archive/upload, the App Store Connect listing, and one screenshot.

`docs/app-store-submission-guide.md` is the single source of truth for
submission — paste-ready listing copy, App Privacy answers, age rating, review
notes, and the screenshot plan. `APP_STORE_TODO.md` no longer exists; it was
merged into the guide in `a3caf86`.

CI is green. `main` is current; everything below is pushed.

## Verified working (on device, this session)

- Composer and profile modals survive the iOS keyboard; both use `flex flex-col`
  - `flex-1 min-h-0` so the panel shortening is absorbed rather than clipping.
- Modals centre at every width and sit above the keyboard.
- Dynamic Type: 0% → 130%, capped at 1.3×, with no truncation at any size and
  pixel-identical rendering at the default size.
- Content reports end to end: UI → row → webhook → edge function → Resend →
  inbox, with an enriched email and an in-app moderation queue.
- Anonymous clients read **0 rows** from every table (verified by real anon
  requests, not policy inspection).

Added 2026-08-10, on the iPhone 17 simulator unless noted:

- **Root font size no longer clobbers a browser preference.**
  `applyDynamicType` clears `font-size` at 1× rather than writing 16px, so a web
  reader's own default stands; it still undoes a previous scale-up when the
  setting comes back down. Verified in the browser pane — no `font-size` in the
  `<html>` style attribute at all — plus two new unit tests (267 total, up from
  265).
- **The last 8 fixed-px labels now follow Dynamic Type.** Converted to arbitrary
  rem, so they are pixel-identical at the default root (13/11/10/8px measured)
  and scale exactly 1.3× at the cap (16.9/14.3/13/10.4px measured). On device at
  `accessibility-extra-extra-extra-large` the theme descriptions and the Select
  ▼ grow in step with the text around them, wrapping without truncation.
- **Keyboard listeners are independent of resize-mode setup.** Each
  `Keyboard.*` call now has its own `nativeOnly`. Round trip verified: focusing a
  composer field shortens the panel (`keyboardWillShow` fired) and dismissing
  restores it (`keyboardWillHide`/`DidHide` fired), with the accessory bar
  proving `setAccessoryBarVisible` ran from its own block. Caveat: the hardware
  keyboard was connected, so only the accessory-bar-height inset was exercised,
  not a full software-keyboard height.

## Open work

All three findings from the second adversarial review are **fixed and verified**
(2026-08-10) — see "Verified working" below. Nothing from that review is
outstanding.

Still open, lower value:

- **Ban is not implemented.** The moderation queue has hide + dismiss only.
  Banning needs enforcement across sign-in and every feed RPC; a half-built ban
  is worse than none. Use the dashboard's auth controls meanwhile.
- **Silent sign-out, unreproduced.** Observed once mid-session, never again
  across a dozen relaunches. No cause found. If it recurs, note whether the app
  had been backgrounded a while — that would point at token refresh rather than
  storage eviction.

## Waiting for you, not for a session

- **One open report is deliberately left in the queue** so you can exercise the
  moderation screen. Sign in as `ldonald0234` (the only admin) and open the
  "Review in app" link from the report email, or `#/report/<id>` directly.
- **Screenshot 06** (empty-journal first run) is the last one missing; the other
  five are in `store-assets/screenshots/`. Note they are 1320×2868 while the
  guide previously said 1290×2796 — both have been valid 6.9" sizes, so confirm
  which App Store Connect accepts at upload rather than re-capturing blind.
- **Apple Developer Program enrollment** needs confirming before signing.

## Things that will waste your time if you do not know them

- **Migrations are not applied by `supabase db push`** — it is blocked on this
  hosted project. Verify schema claims by querying prod (recipe in `CLAUDE.md`);
  a file in `supabase/migrations/` does not mean it is live. This session applied
  `20260810000000_admin_moderation_rpcs.sql` through the Management API query
  endpoint, which works.
- **Green tests are not proof.** Several suites mock the thing under test, and
  anything native-only (`--keyboard-inset`, Dynamic Type, safe areas) is
  permanently inert in jsdom. Verify user-facing work on the simulator.
- **Watch the test count, not just red/green.** CI silently ran 241 of 265 tests
  for over a week.
- **The simulator's hardware-keyboard setting** hides the software keyboard, so
  keyboard-open geometry cannot be screenshotted while it is on. Measure against
  the real stylesheet in the browser pane, or toggle it off in Simulator.app.
- **Dynamic Type is settable from the CLI**, no Settings.app detour:
  `xcrun simctl ui <udid> content_size accessibility-extra-extra-extra-large`.
  Underscore, not hyphen — the hyphenated spelling just prints usage and exits 117. Read the current value first and restore it; background and relaunch the
  app after changing it, since it only re-reads on foreground.
- **Admin is the owner account only.** Never `appreview@retrowaveblog.com` —
  App Review signs into it.
