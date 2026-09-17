# Handoff — current state

**This is a living document. Overwrite it; do not append.** Keep it to state,
open work and pointers — the reusable lessons live in `.claude/docs/gotchas.md`,
not here.

Read `CLAUDE.md` first, then `.claude/docs/gotchas.md`.

Last rewritten 2026-09-17, at `32138fe` (code) — after the iPhone SE pass, its
fixes, a round of feed spacing and both marquees from your screenshots, and a
full docs cleanup.

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
- **CI is green, 344 tests across 39 files.** `npm run check` runs exactly what
  CI runs, including the Prettier check.

## The UI audit

`docs/audit/ui-audit-plan.md` is the checklist and findings log — **start there
for anything UI**. 56 findings are logged — 41 from the main audit, 12 from the
iPhone SE pass, 3 from your screenshots — and all are fixed except 52, left as is
on purpose.

**Journey coverage is not complete.** Never exercised: age verification, the
first-run flow, delete confirm, the YouTube card, a long feed, the avatar
picker, data export, and block from a public profile. Read the plan's
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
- **Launch screen** (2026-09-17, `32138fe`, Pro Max and SE): the icon now sits on
  the classic-xanga gradient inside the dotted frame, instead of alone on dark
  navy. `scripts/make-splash.py` regenerates it — see `/release` for the crop
  rule.

## Open work

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

Last known state, 2026-09-17 — all four booted, each build read from the
installed bundle (`index-saWQQgQf.js`). Sessions live in `UserDefaults` and
survive reboots, but **simulators shut down between sessions**, so boot before
installing, and re-check the installed build before trusting this table.

| Simulator                  | Session       | Build              |
| -------------------------- | ------------- | ------------------ |
| iPhone 17 Pro Max          | `ldonald234`  | current, `32138fe` |
| iPhone 17 Pro              | signed out    | current, `32138fe` |
| iPhone 17                  | `ldonald0234` | current, `32138fe` |
| iPhone SE (3rd generation) | signed out    | current, `32138fe` |

Use the **Pro** or the **SE** for signed-out screens: an agent cannot sign back
in, so signing another simulator out cannot be undone from here. The SE lost
`ldonald234` on 2026-09-17 when you signed that account out on the Pro Max —
sign-out is global (see Open work).

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
