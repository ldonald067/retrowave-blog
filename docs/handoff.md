# Handoff — current state

**This is a living document. Overwrite it; do not append.** Keep it to state,
open work and pointers — the reusable lessons live in `.claude/docs/gotchas.md`,
not here.

Read `CLAUDE.md` first, then `.claude/docs/gotchas.md`.

Last rewritten 2026-09-22, at `dca899c` (code) — after the username tombstone
and rename cooldown (applied to prod), the confirmation-email resend button, and
the sign-in screen's control hierarchy.

---

## Where the project is

The web app and backend are done and live at https://retrowaveblog.com. **What
remains for submission is Apple-side only**: signing, archive/upload, and the
App Store Connect listing. `docs/app-store-submission-guide.md` is the single
source of truth for that; all six screenshots are captured.

- **The one blocker is Apple Developer Program enrollment.** `security
find-identity -v -p codesigning` still reports 0 valid identities (checked
  2026-09-17) and no team is configured. It needs your Apple ID and a paid
  enrollment.
- **The Supabase project pauses when idle** — found `INACTIVE` on 2026-09-15
  after 13 quiet days, which takes the whole app down. Check it before any device
  session, and keep it active through App Review.
- **The iOS deployment target is 16.4** (raised from 15.0 on 2026-09-16) because
  the CSS cannot run earlier. The iPhone 6s, 7 and first-generation SE lose the
  app.
- **CI is green, 371 tests across 41 files.** `npm run check` runs exactly what
  CI runs, including the Prettier check.

## The UI audit

`docs/audit/ui-audit-plan.md` is the checklist and findings log — **start there
for anything UI**. 68 findings are logged — 41 from the main audit, 12 from the
iPhone SE pass, 15 since (nine from two `/adversarial-review` runs) — and all
are fixed except 52, left as is on purpose.

**Journey coverage is not complete.** Never exercised: delete-entry confirm, the YouTube card, a long feed, the avatar
picker, and block from a public profile. Read the plan's
checkboxes, not this summary, before calling a surface done.

The design system is written into `/frontend` (size tiers, style encodes kind,
colour mapped to kinds, space as a material, the control tiers). Two rules
settled 2026-09-16 are easy to break by reflex: **no grey controls**, and
**`.title-bold`, not `font-bold`, in the title font**.

## The four bugs that justify the method

All four were invisible to a passing suite; three needed looking, one needed the
error message the app was swallowing. Details in the audit plan and gotchas.

- **Reactions had never worked** — an RLS policy that selected from its own
  table (`42P17`). Fixed and applied to prod (finding 36).
- **A cold-launch deep link was silently dropped** — a race between
  `getLaunchUrl()` and the `hashchange` listener. Fixed `0a3db5c`.
- **Auth field labels failed WCAG** — fixing `--link-color` in `d683a7a` left the
  accent pairing failing. **Fixing one token does not fix the pairing.** Fixed
  `cc3fed1`.
- **Reduce Motion was ignored on most of the app** — `MotionConfig` covered the
  feed only. Fixed `7270da9` (finding 37).

## Verified on device

iPhone 17 Pro Max simulator unless noted.

- **Session** survives web-storage eviction and a device reboot (`UserDefaults`).
- **Reactions** insert, survive a relaunch, delete. **Moderation** dismiss and
  hide entry, each on a real report, confirmed in the database.
- **Deep links** route cold and warm, signed in and out.
- **Composer with the full software keyboard up** — textarea keeps its height,
  draft autosaves. `ReportDialog` too.
- **Max Dynamic Type** across feed, composer, settings and profile. Modal footers
  stay on one row on the Pro Max; on the SE the composer footer wraps by design.
- **Reduce Motion** actually enabled: two frames 2s apart byte-identical.
- **All eight themes** rendered; card titles clear 4.5:1 on both surfaces (worst
  4.53).
- **Cold start** median 1.94s (Debug, warm, n=5); treat past ~3s as a finding.
- **Privacy smoke checks** 9/9 against prod; anonymous clients read 0 rows.
- **Chapter-rename confirmation, end to end against prod** (2026-09-16), on a
  temporary fixture on `ldonald234`, reverted and re-diffed (residue: that
  entry's `updated_at`). No account carries the fixture now — re-testing means
  rebuilding it, and asking first.
- **Entry privacy badge** read `🔒 hidden by chapter`, then `🔒 private` after the
  fixture was reverted (2026-09-16).
- **iPhone SE (375 × 667pt), signed out and signed in as `ldonald234`**
  (2026-09-16/17): intro, sign-in with keyboard, a public profile as a visitor,
  report dialog, entry view, composer with keyboard, Settings, all three profile
  tabs, at max Dynamic Type. Findings 45–56; all fixed but 52, including the
  "new entry" button vanishing after sign-in (confirmed 2026-09-17 by your
  fresh sign-ins on the Pro Max and iPhone 17).
- **No grey left** (2026-09-16): sign-in links and inactive tab in accent, dialog
  cancels as outlines, the modal ✕ in `--text-title`.
- **Feed spacing** (2026-09-17, `c0c1a15`, `d1dbacb`, `fbb4840`): the sidebar
  mood shares a row with its label (iPhone 17); the collapsed "find old entries"
  card lost 12pt of dead margin (Pro Max); the last post's reactions scroll clear
  of the "new entry" button, and the feed-to-footer gap went 160 → 91pt on the Pro
  Max and 82 → 57pt on the SE.
- **Marquees** (2026-09-17). The journal header's fixed "welcome to my xanga ~
  thanks 4 stopping by" is gone (`d4d2f2f`, Pro Max) — it greeted owners as
  visitors to their own journal. On a public profile the banner now scrolls the
  owner's **status**, which left the card (`f06dce4`): checked on the signed-out
  Pro against prod with a temporary status on `codex-qa-24e3a82f` (approved,
  reverted, re-diffed clean but `updated_at`) — short and 100-character statuses
  scroll, Reduce Motion wraps it static, no status means no banner.
- **Launch screen** (2026-09-17, Pro Max and SE): the icon sits on the
  classic-xanga gradient inside the dotted frame instead of alone on dark navy
  (`32138fe`, `scripts/make-splash.py` regenerates it — crop rule in
  `/release`), and `SplashCurtain` continues that composition in the web view
  with the icon popping in and sparkles twinkling before it fades into the app
  (`92ef0c2`). Cold-launch frames show still image → curtain at the same size →
  feed; with Reduce Motion on, two frames are identical below the status bar.
- **Account deletion, end to end** (2026-09-18, SE, `nonoabc2345`, deleted with
  your approval). The first attempt failed for **every user** — prod's
  `profiles_id_fkey` was NO ACTION (finding 60); fixed in `58275a8`, applied to
  prod with approval, and the retry removed the login, identity, sessions and
  profile (6 users / 6 profiles remain). Export my data was checked on the same
  account: the share sheet's JSON matched prod and the cached copy was deleted.
  Re-run end to end the same day on a re-created `nonoabc2345`, through the
  `delete-account` function (`POST 200`, no logged errors): only the farewell
  showed (finding 61 confirmed on device) and every row went, including a public
  entry. That run also covered sign-up → confirmation email → age gate → first
  entry, and proved **`moderate-content` now runs from the iOS app**
  (`41fe32c`, `POST 200` logged for the public entry).
- **Every email is on brand** (`b699dc7`): one design in
  `supabase/functions/_shared/email.ts`, used by all six auth templates (pushed
  and compared equal to the repo), the deletion email and the report email;
  sender and subjects say Retrowave Journal. The first version showed in Gmail
  on your iPhone 16 with the wordmark and button text washed out by dark mode;
  `eee02de` keeps all text off gradients, and the deletion email in that design
  arrived and looked right in Gmail on your iPhone 16 (2026-09-18).
- **Deletion confirmation email** (`5992357`): deletion now runs through the
  `delete-account` edge function (deployed with approval, JWT on), which emails
  the account's own address after the deletion succeeds. Checked: 401 without a
  session, and the iOS origin passes CORS. **Not yet seen end to end** — needs a
  throwaway account with an inbox you can read.
- **First `/adversarial-review`** (2026-09-19): four findings, all fixed
  (`8595489`). The splash curtain is now iOS-only (verified live: the site opens
  straight to a profile and never fetches the splash image; the SE still shows
  it); email sends time out after 8s; the report email escapes usernames and
  prod finally has the username format check; a failed deletion only says
  "nothing was removed" when the server confirms the rollback.
- **Chosen usernames** (2026-09-19, `8b3e88d`). Usernames used to be copied
  from the email's local part and shown as the public @handle. Sign-up now asks
  for one and the profile editor can change it; a live check says "~ @name is
  taken, try another ~" (seen on the SE, typed as `LDonald234`); usernames are
  lowercase-only in prod (migration `20260919000000`, applied with approval), so
  look-alikes by capitalisation are impossible. A reset to the current password
  now says so instead of "Something went wrong". Existing accounts keep their
  email-derived names until changed in the profile editor.
- **Username review fixes** (`8c6d006`, migration `20260919010000`, applied
  with approval): nothing is derived from the email any more (the display name
  starts empty, so **first-run setup is back** — no new user had ever seen it);
  operator-like names are reserved; profiles are created on email confirmation,
  so unfinished sign-ups hold no name; setup says when a chosen name was lost;
  the username field is first. **Not yet proven by a real sign-up** — see Open
  work.
- **Confirmation email names the handle** (`ba82639`): seen in Gmail on your
  iPhone 16 for `rainbowpudding` — "ur handle is @rainbowpudding".
- **Username tombstone and rename cooldown** (`c06aec5`, migration
  `20260920000000`, pasted into the SQL editor by you 2026-09-22). Verified by
  query: column present and NULL on all 6 profiles, `username_history` empty with
  RLS and an owner-only read policy, the trigger attached, and
  `is_username_available` consulting it (free name true, `ldonald234` and
  `support` false; anon can call it but cannot read the history). **Not yet
  exercised by a real rename.**

## Open work

- **"ur session expired" shows twice** on a launch whose stored session the
  server refuses (iPhone 17, 2026-09-22). Two identical toasts stacked; one
  would do.

- **The verification sign-up is unconfirmed.** `rainbowpudding` (gmail) signed up
  2026-09-19; its last confirmation email went out 2026-09-20 17:16 UTC and
  `email_confirmed_at` is still NULL, so it has no profile. Links expire after
  an hour (`mailer_otp_exp` 3600) and auth logs keep one day, so whether the link
  was ever clicked is unknowable. Profile-on-confirmation, first-run setup and
  the chosen @handle on a public page remain unproven until it is confirmed.
- **The resend button is built but not yet seen working end to end**
  (`f443689`, `dca899c`). It shows on the "almost there" screen and under the
  sign-in error for an unconfirmed address, as an outlined secondary button —
  the first version was a third identical link (the rule is now in `/frontend`,
  "Pick the tier by what the control does"). Seen rendered on the SE with your
  `nonoabc2345` sign-in; not yet tapped.
- **Finding 52, left as is on purpose:** the feed reads through a ~105pt slot
  on the SE at rest. Fixing it means replacing the feed's own scroll container
  and virtualizer — not worth it for a shrinking class of phone. Swiping on the
  header scrolls the page and the feed grows.
- **Known trade-off on the SE:** at max Dynamic Type with the keyboard up, the
  wrapped composer footer leaves little room, so the field being typed in scrolls
  out of view. Typing and saving still work.
- **Ban is not implemented** — prod has `admin_list_reports` and
  `admin_resolve_report` only. Restore `ReportDialog`'s ban sentence (finding 43)
  only when a ban exists.
- **Finding 21's truncation is code-level only** — no public account has a
  chapter long enough to photograph `PublicPostCard` truncating.
- **Store screenshots `02-feed`, `03-composer` and `05-public-profile` still
  show the old fixed marquees** (`d4d2f2f`, `f06dce4`). A small drift; recapture
  if you want them exact.
- **Signing out is global.** `supabase.auth.signOut()` defaults to
  `scope: 'global'`, so signing out on one device ends that account's session
  everywhere within the hour. That is how the SE lost `ldonald234` on 2026-09-17.
  Your call whether sign-out should be `scope: 'local'` (this device only).
- **`create ur xanga`** is the signup heading, and screenshot `04-signup` shows
  it, while the submission guide keeps "Xanga" out of public metadata. Your
  call whether that matters for the store.

## Waiting for you, not for a session

- **Apple Developer Program enrollment**, as above.
- **Offline banner** — needs a real device in Airplane Mode; the simulator
  shares the Mac's connection.
- **Session expiry** — fires only when a token _refresh_ fails. Revoke the
  session from the Supabase dashboard (Auth → Users → sign out) while the app is
  backgrounded, then foreground it.
- **Success toast and sub-400ms rapid taps** — not drivable from here (tap
  delivery); code-verified only.
- **Signing in.** An agent cannot authenticate, so a surface needing an account
  needs you to sign in first and say which one.

## Accounts

| Account                                         | Use                                                                    |
| ----------------------------------------------- | ---------------------------------------------------------------------- |
| `ldonald234`                                    | **The test data.** cottage-core, 2 entries, incl. the overflow fixture |
| `ldonald0234`                                   | **Admin — the only one.** emo-dark, reaches `ModerationView`           |
| `retrodemo`                                     | App Review demo — public page, 3 public entries. **Never a fixture**   |
| `codex-qa-24e3a82f`                             | Public page, **classic-xanga** — the light-theme public fixture        |
| `blankslate`, `nonoabc2345`, `ldonald234_xanga` | Zero posts — reach `EmptyState`                                        |

`@ldonald234`'s second entry — a 200-character title, a 100-character space-free
chapter, and an unbreakable token in the body — is an **overflow fixture, not
junk**. It found four bugs. Keep it.

## Simulators

State on 2026-09-22 — all four booted with the same build
(`index--SxVGHhG.js`, `dca899c`). Sessions live in `UserDefaults` and survive
reboots and in-place installs, but **simulators shut down between sessions**, so
boot before installing, and re-check the installed build before trusting this
table.

| Simulator                  | Session    | Build              |
| -------------------------- | ---------- | ------------------ |
| iPhone 17 Pro Max          | signed out | current, `dca899c` |
| iPhone 17 Pro              | signed out | current, `dca899c` |
| iPhone 17                  | signed out | current, `dca899c` |
| iPhone SE (3rd generation) | signed out | current, `dca899c` |

**Every simulator is signed out.** The iPhone 17 launched with "ur session
expired, sign in again" (twice — see Open work), so its stored `ldonald0234`
session was still there and the server refused it: an install does not do that,
a global sign-out elsewhere does. The Pro Max had no session to restore.

Use the **Pro** or the **SE** for signed-out screens: an agent cannot sign back
in, so signing another simulator out cannot be undone from here.

## Traps that cost a session

The full list, with fixes, is in `gotchas.md` under "Simulator and
verification" and "Supabase and RPCs". The ones that bite every session:

- **Never `supabase db push`**, and never trust a migration file as a
  description of prod — query it (`CLAUDE.md`).
- **Tap delivery is ~1-in-3 and can land late** — screenshot after every tap.
  Swipes are reliable.
- **Screenshot pixels are not tap points** — divide by the scale.
- **Check the installed build** before believing what a simulator shows.
- **An Xcode update blocks `git`** until you run `sudo xcodebuild -license`.
- **Discarding the composer leaves its draft on the device** — delete it when a
  test typed one.
- **Signing an account out on one simulator signs it out on all of them**
  within the hour.
- **Ask before each prod write**; approval for one test does not cover the next.
