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

## Open work

Three findings from the second adversarial review, in the order I would take
them. None block submission.

1. **Root font size clobbers a web user's preference.** `dynamic-type.ts` always
   writes `documentElement.style.fontSize`, minimum 16px, so a browser user who
   set a 20px default is silently reduced. Fix: return without mutating when
   `scale === 1`. Smallest of the three and the only one that degrades something
   a user chose.
2. **Eight fixed-px labels bypass Dynamic Type.** `text-[13px]` in
   `Sidebar.tsx:328/352/382`, `text-[11px]` in `ProfileModal.tsx:670`,
   `text-[10px]`/`text-[8px]` in `YouTubeCard.tsx`, `text-[10px]` in
   `Select.tsx:61`. Tailwind emits arbitrary values as literal px. At the 1.3×
   cap the surrounding text grows and these do not.
3. **Keyboard listeners are coupled to resize-mode setup.** `capacitor.ts:95` —
   `setResizeMode`, `setAccessoryBarVisible` and both `addListener` calls share
   one swallowed `nativeOnly` block. If either setup call rejects, the listeners
   never register, `--keyboard-inset` stays `0px`, and the composer sits behind
   the keyboard with no diagnostic. Pre-existing, not introduced.

Also open, lower value:

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
- **Admin is the owner account only.** Never `appreview@retrowaveblog.com` —
  App Review signs into it.
