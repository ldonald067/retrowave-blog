# Handoff — current state

**This is a living document. Overwrite it; do not append.** Keep it to state,
open work and pointers — the reusable lessons live in `.claude/docs/gotchas.md`,
not here.

Read `CLAUDE.md` first, then `.claude/docs/gotchas.md`.

Last rewritten 2026-09-30, at `8034cb6` (code) — after the fifth
`/adversarial-review` (findings 80–83): unsaved profile edits now survive a trip
out of the app, setup refuses a filtered display name on its first step, an
offline resume no longer claims the session expired, and a migration keeps the
free rename after a sign-up name swap. **One thing waits on you: run migration
`20260930000000`** (finding 83). Everything else is fixed and live. **Mood art
is on hold** (your call, 2026-09-30) — see "Mood art".

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
- **CI is green, 401 tests across 47 files.** `npm run check` runs exactly what
  CI runs, including the Prettier check.

## Prod state worth knowing

Everything below was checked against prod by query, not read from migrations.

- **Waiting to be run: `20260930000000`** (finding 83) — paste it into the SQL
  editor, then I check it with the queries in its footer. Until then, picking a
  handle in setup after a sign-up swap still spends the free rename. No current
  account is affected (checked 2026-09-30).

- **Migrations applied this stretch, all pasted into the SQL editor by you:**
  `20260920000000` (tombstones, cooldown), `20260923000000` (sign-up hook,
  cooldown hardening), `20260925000000` (terms acceptance). 8 auth users, 7
  profiles.
- **The Before User Created auth hook is ON** → `public.hook_before_user_created`.
  It refuses a sign-up whose `username` metadata is not a handle (3–30,
  `[a-z0-9_-]`, not reserved). This is dashboard state; the migration records
  it. **Never drop or rename that function while the hook is on** — every
  sign-up fails.
- **Auth email limits are deliberate:** 30 per hour project-wide, no captcha,
  Resend's free plan (100/day, 3,000/month, stops rather than bills). Anyone can
  burn the hourly allowance; nothing gained by it, so it stays until there is a
  sign of abuse (then Cloudflare Turnstile, free) or real volume (~50 sign-ups a
  day → Resend paid, about $20/month).
- **All six auth email templates are live and equal to the repo**
  (`node supabase/templates/build.mjs --push`, then compare). The confirmation
  email names the handle only when it is plain text of 30 characters or fewer.

## Usernames and sign-up — how it works now

- Chosen at sign-up, lowercase only, never derived from the email. Reserved
  names (admin, support, anything with "retrowave"…) are refused in the app, by
  the hook and by a CHECK.
- **A profile is created when the email is confirmed**, so an unfinished
  sign-up holds no name. Display name starts empty, which is what brings up
  first-run setup.
- **First-run setup is `ProfileSetup`, three steps** (2026-09-26): the display
  name alone, marked required, with "next" under the field; the theme, marked
  optional, with a sample entry that repaints live; then an optional profile pic
  and status, with "skip 4 now". The username is shown, not asked, unless
  sign-up could not give the name asked for. Nothing saves until the end. The
  panel is pinned to the top (`.setup-panel`) because the website cannot measure
  the keyboard. `ProfileModal` is only the editor now.
- **Renames:** the first is free, then one per 30 days; moving off a name
  sign-up assigned (`<chosen>_<id8>`) will not count once `20260930000000` runs. A released name is
  tombstoned to its old owner forever (`username_history`); only they can take
  it back. Deleting an account releases its names. The guard trigger owns
  `username_changed_at` and refuses a NULL username.
- **Resending a confirmation retires every earlier link** (Supabase swaps the
  token). A dead link now says so on the web and in the app.
- **Terms:** `tos_accepted` is recorded at sign-up when the same sign-up passed
  the age check; otherwise by `set_age_verification` with the age. 7 of 7
  profiles show it.

## Mood art — on hold

- **Your call (2026-09-30): no more mood emojis for now** — no hand-drawn
  sprites, and the found-pixel (sadthemes) idea is dropped too. Don't raise it.
- The earlier work is kept, not merged: local branch `pixel-moods-prototype`
  (`17fabc0`, **not pushed**) — 16 hand-drawn 12×12 sprites keyed by existing
  `MOODS` emoji (no schema change), a one-field `MoodPicker`, a `MoodLabel` for
  cards, entry view, sidebar and public profile, and a `--pixel-halo` theme
  variable. It was green (405 tests) and verified on the SE when parked; its
  commit message lists each piece.

## The UI audit

`docs/audit/ui-audit-plan.md` is the checklist and findings log — **start there
for anything UI**. 80 findings are logged — 41 from the main audit, 12 from the
iPhone SE pass, 27 since (19 from five `/adversarial-review` runs). All are
fixed except 52, left as is on purpose, and 83, whose migration waits to be
run. The next `/adversarial-review` starts after the 2026-09-30 line there
(code since `8034cb6`).

**Journey coverage is not complete.** Never exercised: the YouTube card, a long feed, the avatar picker, block from a public profile, and a
username rename. Read the plan's checkboxes, not this summary, before calling a
surface done.

The design system is written into `/frontend`. Rules that are easy to break by
reflex: **no grey controls**; **`.title-bold`, not `font-bold`, in the title
font**; and **a control's tier comes from what it does** — links navigate or
switch modes, anything that sends, saves or deletes is at least
`.xanga-button-ghost`, and two controls doing different jobs never share a
treatment side by side (the sign-in screen is the reference: outlined resend →
underlined "forgot ur password?" → solid "sign in" → bold tertiary "or use a
magic link"). And **a status never wears a control's treatment**: states are
plain bold text, names italic in `--text-subtitle`.

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

This stretch added two more of the same kind: **account deletion failed for
every user** (prod's FK was NO ACTION; finding 60), and **a dead confirmation
link looked like success on the web** (finding 78 — reported as "the first link
still worked" while prod showed the account unconfirmed).

## Verified on device

iPhone 17 Pro Max simulator unless noted.

- **Session** survives web-storage eviction and a device reboot (`UserDefaults`).
- **Reactions** insert, survive a relaunch, delete. **Moderation** dismiss and
  hide entry, each on a real report, confirmed in the database.
- **Deep links** route cold and warm, signed in and out.
- **Composer with the full keyboard up** — textarea keeps its height, draft
  autosaves. `ReportDialog` too.
- **Max Dynamic Type** across feed, composer, settings, profile, and (2026-09-24,
  iPhone 17) the sign-in screen's control tiers.
- **Reduce Motion** actually enabled: two frames 2s apart byte-identical.
- **All eight themes** rendered; card titles clear 4.5:1 on both surfaces (worst
  4.53).
- **Cold start** median 1.94s (Debug, warm, n=5); treat past ~3s as a finding.
- **Privacy smoke checks** 9/9 against prod; anonymous clients read 0 rows.
- **iPhone SE pass** (2026-09-16/17): every main surface signed out and signed
  in, at max Dynamic Type. Findings 45–56.
- **Feed spacing, marquees and launch screen** (2026-09-17): sidebar mood beside
  its label, FAB clearance at the feed's end, the public banner scrolls the
  owner's status, the launch image and `SplashCurtain` (iOS only) hand over at
  the same size and are static under Reduce Motion.
- **Account deletion, end to end** (2026-09-18, SE): every row goes, the
  farewell is the only message, and the deletion email arrived on brand in
  Gmail on your iPhone 16. `moderate-content` runs from the iOS app.
- **A real sign-up, end to end** (2026-09-25/26, SE,
  `nonoabc2345+hook@gmail.com` → `@rainbowpudding1`): the hook let the handle
  through; the email named it; a resend killed the first link; the resend
  button's email confirmed it; the profile appeared at confirmation, 7½ hours
  after sign-up; first-run setup ran; terms recorded after the backfill.
- **Empty entry says what is missing** (2026-09-27, SE, `d0a8178`): save with
  no title scrolls to the title, focuses it and shows "❌ give ur entry a
  title" above the keyboard; no toast, no row written. Before, it showed
  "couldnt post that :( try again".
- **Delete an entry, end to end** (2026-09-27, SE, `rainbowpudding1`): a
  private test entry was saved, then deleted from the app via edit → ⋮ →
  "delete entry" → a confirmation naming the entry → "~ entry deleted ~" toast
  and the empty journal. Prod re-diffed identical to the pre-test snapshot (0
  entries, profile untouched).
- **Unsaved profile edits survive leaving the app** (2026-09-30, SE,
  `1eb335f`, finding 80): a typed status (24/100) was still there after 5s on
  the home screen. Before the fix it went to 0/100, and a picked theme
  reverted with the old one re-selected. Cancelled each time; prod unchanged.
- **Dead-link message on the live site** (2026-09-25): an expired link now
  shows "that link doesn't work anymore ~ … a newer email replaced it" and the
  error leaves the address bar; a shared profile link is unaffected.

## Open work

- **Run migration `20260930000000`** (finding 83) — see "Prod state".
- **Form field errors use `--accent-secondary`**, which fails contrast on
  emo-dark and cottage-core. True of every `Input`/`Textarea` error (the new
  composer ones included) — one token change, then re-sweep the pairing.

- **See the new first-run setup in the app itself.** `ProfileSetup` (three
  steps) was verified on a local preview in Safari on the iPhone 17 and SE, with
  the keyboard up, live theme preview, and the swap case; the native app only
  shows it to a brand-new account. Sign up with a `nonoabc2345+…@gmail.com`
  address on the SE or iPhone 17 and walk the three steps; on step 1 try a name
  the filter refuses (e.g. "emma van dyke") — it should say "that name isn't
  allowed here" under the field (finding 81). Known and accepted: on
  the SE, in the rare swap case, "next" sits behind Safari's keyboard toolbar —
  the keyboard's go key still advances.

- **See the single "session expired" message on a device.** Fixed in code
  (`ca2dbdc`; the new test fails on the old code). To check: sign
  `rainbowpudding1` in on the SE, sign the same account in and then out on the
  Pro (sign-out is global), then relaunch the SE — one message, not two.
- **Try a rename.** The cooldown and tombstone are proven by query and tests
  only. Change `rainbowpudding1`'s username once in the profile editor: the field
  should lock with a date 30 days out, and the old name should read "taken" on
  the sign-up form.
- **Finding 52, left as is on purpose:** the feed reads through a ~105pt slot
  on the SE at rest. Fixing it means replacing the feed's own scroll container
  and virtualizer — not worth it for a shrinking class of phone.
- **Known trade-off on the SE:** at max Dynamic Type with the keyboard up, the
  composer field being typed in can scroll out of view. Typing and saving work.
- **Ban is not implemented** — prod has `admin_list_reports` and
  `admin_resolve_report` only. Restore `ReportDialog`'s ban sentence (finding 43)
  only when a ban exists.
- **Finding 21's truncation is code-level only** — no public account has a
  chapter long enough to photograph `PublicPostCard` truncating.
- **Store screenshots `02-feed`, `03-composer` and `05-public-profile` still
  show the old fixed marquees**; `04-signup` predates the username field and the
  new sign-in tiers. Recapture before submission if you want them exact.
- **Signing out is global.** `supabase.auth.signOut()` defaults to
  `scope: 'global'`, so signing out on one device ends that account's session
  everywhere. Your call whether it should be `scope: 'local'`.
- **`create ur xanga`** is the sign-up heading, and screenshot `04-signup` shows
  it, while the submission guide keeps "Xanga" out of public metadata. Your
  call whether that matters for the store.

## Waiting for you, not for a session

- **Apple Developer Program enrollment**, as above.
- **Prod writes.** The agent's writes to prod (SQL, auth config) are blocked by
  Claude Code's safety check, so migrations are pasted into the SQL editor by
  you and dashboard switches are flipped by you; the agent verifies read-only
  afterwards. Email template pushes still go through from here.
- **Offline banner** — needs a real device in Airplane Mode; the simulator
  shares the Mac's connection. Same device test for finding 82: leave the app
  in the background over an hour, turn on Airplane Mode, reopen — it should
  not say "ur session expired".
- **Success toast and sub-400ms rapid taps** — not drivable from here (tap
  delivery); code-verified only.
- **Signing in.** An agent cannot authenticate, so a surface needing an account
  needs you to sign in first and say which one.

## Accounts

| Account                                          | Use                                                                    |
| ------------------------------------------------ | ---------------------------------------------------------------------- |
| `ldonald234`                                     | **The test data.** cottage-core, 2 entries, incl. the overflow fixture |
| `ldonald0234`                                    | **Admin — the only one.** emo-dark, reaches `ModerationView`           |
| `retrodemo`                                      | App Review demo — public page, 3 public entries. **Never a fixture**   |
| `codex-qa-24e3a82f`                              | Public page, **classic-xanga** — the light-theme public fixture        |
| `blankslate`, `ldonald234_xanga`                 | Zero posts — reach `EmptyState`                                        |
| `rainbowpudding1` (`nonoabc2345+hook@gmail.com`) | New-flow test account, zero posts. Its free rename is unspent          |
| `nonoabc2345@gmail.com`                          | Unconfirmed since 2026-09-19 (`rainbowpudding`); holds no username     |

`@ldonald234`'s second entry — a 200-character title, a 100-character space-free
chapter, and an unbreakable token in the body — is an **overflow fixture, not
junk**. It found four bugs. Keep it.

Gmail `+` addresses (`nonoabc2345+anything@gmail.com`) reach the same inbox and
count as new accounts — the cheapest way to test a fresh sign-up.

## Simulators

State on 2026-09-30 — all four on `8034cb6` (`index-CzPag2b4.js`, checked on
each). The SE is booted and signed in as `rainbowpudding1`; the other three are
shut down and signed out. Sessions live in `UserDefaults`
and survive reboots and in-place installs, but **simulators shut down between
sessions**, so boot before installing, and re-check the installed build before
trusting this table.

| Simulator                  | Session           | Build              |
| -------------------------- | ----------------- | ------------------ |
| iPhone 17 Pro Max          | signed out        | current, `8034cb6` |
| iPhone 17 Pro              | signed out        | current, `8034cb6` |
| iPhone 17                  | signed out        | current, `8034cb6` |
| iPhone SE (3rd generation) | `rainbowpudding1` | current, `8034cb6` |

Use the **Pro** or the **SE** for signed-out screens: an agent cannot sign back
in, so signing another simulator out cannot be undone from here.

## Traps that cost a session

The full list, with fixes, is in `gotchas.md` under "Simulator and
verification" and "Supabase and RPCs". The ones that bite every session:

- **Never `supabase db push`**, and never trust a migration file as a
  description of prod — query it (`CLAUDE.md`). An audit row that says "Fixed"
  for a migration nobody ran is how finding 76 happened.
- **The Mac's keychain prompt blocks every prod query** — a "Supabase CLI"
  dialog, often behind other windows. Click Allow; queries hang until then.
- **Build a replacement function from prod's live body** (`pg_get_functiondef`),
  diff it, then change only what you mean to.
- **Switch an auth hook on only after its function exists**, and off before
  removing it.
- **Tap delivery is ~1-in-3 and can land late** — screenshot after every tap.
  Swipes are reliable.
- **Screenshot pixels are not tap points** — divide by the scale.
- **Check the installed build** before believing what a simulator shows.
- **An Xcode update blocks `git`** until you run `sudo xcodebuild -license`.
- **Signing an account out on one simulator signs it out on all of them.**
- **Ask before each prod write**; approval for one test does not cover the next.
- **Every return to the app refetches the profile** (supabase-js sends
  `SIGNED_IN`). Anything keyed on the `profile` object sees it — that is how
  finding 80 wiped edits.
- **A dark theme can be checked on device with no prod write** — the profile
  editor's theme picker repaints the app live, and cancel reverts it.
