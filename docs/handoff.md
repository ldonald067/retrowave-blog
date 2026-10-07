# Handoff — current state

**This is a living document. Overwrite it; do not append.** State, open work and
pointers only — lessons live in `.claude/docs/gotchas.md`, history in
`docs/audit/ui-audit-plan.md`. Keep it short: every session reads it.

Last rewritten 2026-10-07, at `b9f1b8b` (code `fec6021`). Mood art is on hold
(your call, 2026-09-30) — don't raise it.

---

## Keep sessions lean — you are hitting usage limits

You reported (2026-10-07) that a new chat starts around **300k tokens of cache**
and limits arrive too soon. Every session:

- Read this file, then **only the `gotchas.md` section** for the area you touch
  (grep the heading) — not the whole file. Grep the audit plan; never read it whole.
- Screenshots at `scale: 0.4`–`0.5`, and prefer `read_page`/`get_page_text`.
  One simulator unless the task is about a specific width.
- No subagents. Don't re-verify what this file says is verified.
- Finish one task per chat; hand off and start fresh rather than running long.

## Next: decide on the `/frontend` audit (2026-10-01), findings 89–94

Reported, **not yet accepted, fixed or logged**. Contrast numbers are WCAG
ratios (4.5 needed); full sweep script is in `/frontend`.

- **89 MED — accent text on a tint of its own accent** (the general case of 87,
  which fixed only the avatar picker). Composer private/public toggle
  `PostModal.tsx:777/794` (14% tint, worst 3.92, 5 themes incl. classic);
  profile editor tabs `ProfileModal.tsx:442` (16%, 3.79, 5); active reaction
  count `ui/ReactionBar.tsx:103` (20%, 3.54, 6); sidebar active chapter
  `Sidebar.tsx:342/366/~401` (10%, 4.19, 4); offline banner `App.tsx:1235` and
  "~ unblock ~" `ProfileModal.tsx:879` (3.58/3.73, 3); song title without a
  YouTube link `PostCard.tsx:147` and pending notice
  `PublicPageSettings.tsx:130` (4.24, 2). Fix: text on a tint stays
  `--text-body` (bold for a state); border/fill carries the accent. Add the
  rule to `/frontend`.
- **90 MED — text faded with `opacity`** fails on 7 of 8 themes: end-of-feed
  line `App.tsx:318` (worst 2.60), footer "Made with 💕" `App.tsx:1666` and
  emoji licence credit `App.tsx:1670`, public page "powered by"
  `PublicProfileView.tsx:437`. Fix: drop the opacity.
- **91 MED — header settings + log-out are grey twins** (`Header.tsx:147/157`):
  breaks "no grey controls" and "different jobs, different looks"; log-out is
  global. **Needs your call.** Recommended: accent icons, log-out keeps its
  label on phones.
- **92 LOW — delete confirmations don't look destructive** (`ConfirmDialog.tsx:89`):
  same fill as save/publish; the accent-secondary "destructive" border vanishes
  on cottage-core/grunge; smaller serif than other primaries. Seen on the 17e.
  Fix: a danger tone (caution amber) for delete entry, delete account, block.
- **93 LOW — age screen** (`AgeVerification.tsx:39`): three stiff errors
  ("Please select your birth year"…), year `<select>` has no ▼. Code-read only;
  normal sign-ups never reach it. Use `ui/Select`.
- **94 LOW — support page email pill** `#d6157e` on `#fff0f5` = 4.46
  (`public/support.html`).

Held up: no stray hex in components (RetroIcons fills are deliberate), every
`:hover` guarded, aria-labels plain English, theme text on card/modal passes,
static pages on brand. Not filed: the public page at desktop width is one 640px
column (product call). The old open item "form errors use `--accent-secondary`"
looks **stale** — it passes on card and modal in all 8 themes; it only fails on
tints (89).

When accepted: log 89–94 in the audit plan (count line, rows, Phase 7c), fix,
check one light and one dark theme on device (profile editor's vibe tab
previews a theme with no prod write), `npm run check`, commit, push.

## Where the project is

Web app and backend are done and live at https://retrowaveblog.com. **What
remains is Apple-side only** — signing, archive/upload, App Store Connect;
`docs/app-store-submission-guide.md` is the source of truth.

- **Blocker: Apple Developer Program enrollment** (0 signing identities,
  checked 2026-09-17). Needs your Apple ID and a paid enrollment.
- **Supabase pauses when idle** (found `INACTIVE` 2026-09-15). Check before any
  device session; keep it active through App Review.
- iOS deployment target 16.4 (the CSS needs it).
- **CI green, 404 tests across 48 files.** `npm run check` = CI.
- Pushing to `main` deploys the site (Cloudflare Workers build — it failed once
  during a Cloudflare incident on 2026-09-30; a later push fixed it).

## Prod state worth knowing (checked by query)

- Migrations through `20260930000000` are applied (pasted by you). 8 auth users,
  7 profiles, 7/7 terms accepted.
- **Before User Created hook is ON** → `public.hook_before_user_created`. Never
  drop or rename that function while it is on — every sign-up fails.
- Auth email: 30/hour project-wide, no captcha, Resend free plan — deliberate
  until abuse or volume. Six templates live and equal to the repo
  (`node supabase/templates/build.mjs --push`).
- How usernames, renames, tombstones, terms and first-run setup work:
  `gotchas.md` → "Supabase and RPCs" and "Auth and email".

## Open work, smaller

- **See first-run setup in the native app** — only a brand-new account shows it.
  Sign up with a `nonoabc2345+…@gmail.com` address on the SE or 17; on step 1 try
  "emma van dyke" (should say "that name isn't allowed here").
- **Device checks not yet done:** single "session expired" message (sign
  `rainbowpudding1` in on the SE, in+out on the Pro, relaunch SE); a username
  rename (should lock 30 days; old name "taken" at sign-up).
- **Your calls:** sign-out is global (`scope: 'local'`?); "create ur xanga" in
  screenshot `04-signup` vs no "Xanga" in store metadata; recapture store
  screenshots `02`–`05` (old marquees, pre-username sign-up).
- Left as is: finding 52 (SE feed slot); SE max-text composer can scroll the
  field away. Ban not implemented (restore finding 43's sentence only if built).
- Never exercised: YouTube card, a long feed, block from a public profile.

## Waiting for you

- Apple enrollment. Prod writes (SQL, dashboard switches) — you paste/flip, the
  agent verifies read-only; email template pushes work from here.
- Real-device only: offline banner, and finding 82 (background >1h, Airplane
  Mode, reopen — no "session expired").
- Signing in: an agent cannot authenticate; sign in and say which account.

## Accounts

| Account                                          | Use                                                                         |
| ------------------------------------------------ | --------------------------------------------------------------------------- |
| `ldonald234`                                     | **Test data.** cottage-core, 2 entries incl. the overflow fixture — keep it |
| `ldonald0234`                                    | **Admin — the only one.** emo-dark, reaches `ModerationView`                |
| `retrodemo`                                      | App Review demo, 3 public entries. **Never a fixture**                      |
| `codex-qa-24e3a82f`                              | Public page, classic-xanga (light public fixture)                           |
| `blankslate`, `ldonald234_xanga`                 | Zero posts — `EmptyState`                                                   |
| `rainbowpudding1` (`nonoabc2345+hook@gmail.com`) | New-flow test account, zero posts, free rename unspent                      |
| `nonoabc2345@gmail.com`                          | Unconfirmed since 2026-09-19; holds no username                             |

Gmail `+` addresses reach the same inbox and count as new accounts.

## Simulators

All six on `fec6021` (`index-Hze02Jbd.js`, checked 2026-10-01). Sessions live in
`UserDefaults` and survive reboots and in-place installs; simulators shut down
between sessions, so boot first and re-check the installed build.

| Simulator                  | Session           |
| -------------------------- | ----------------- |
| iPhone 17 Pro Max          | signed out        |
| iPhone 17 Pro              | signed out        |
| iPhone 17                  | signed out        |
| iPhone Air                 | signed out        |
| iPhone 17e                 | `ldonald234`      |
| iPhone SE (3rd generation) | `rainbowpudding1` |

Use the Pro, 17 or Air for signed-out screens. Simulator.app is not installed in
this Xcode; the software keyboard still appears (seen 2026-10-01).

## Traps that cost a session

- **Never `supabase db push`**; never trust a migration as prod — query it.
- The keychain "Supabase CLI" prompt blocks prod queries until you click Allow.
- Build replacement SQL functions from prod's live body; keep them ASCII.
- Tap delivery ~1-in-3 and late — screenshot after each tap; swipes are reliable.
  Screenshot pixels are not tap points.
- Signing an account out on one simulator signs it out everywhere.
- Ask before each prod write; approval for one test does not cover the next.
- Every return to the app refetches the profile (`SIGNED_IN`) — anything keyed on
  the `profile` object sees it.
