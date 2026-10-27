# Handoff — current state

**This is a living document. Overwrite it; do not append.** State, open work and
pointers only — lessons live in `.claude/docs/gotchas.md`, history in
`docs/audit/ui-audit-plan.md`. Keep it short: every session reads it.

Last rewritten 2026-10-27. **The iOS app is in App Review.** App code is
`7fd3229`; the hosted legal pages are at `e6f4482`. Every finding in the audit
plan is fixed except 52 (left as is on purpose). Mood art is on hold (your call,
2026-09-30) — don't raise it.

---

## Keep sessions lean — you are hitting usage limits

You reported (2026-10-07) that a new chat starts around **300k tokens of cache**
and limits arrive too soon. Every session:

- Read this file, then **only the `gotchas.md` section** for the area you touch
  (grep the heading) — not the whole file. Grep the audit plan; never read it whole.
- Screenshots at `scale: 0.4`–`0.5`, and prefer `read_page`/`get_page_text`.
  One simulator unless the task is about a specific width.
  The simulator panel's screenshot is always full size — capture with `simctl io`
  and shrink with `sips -Z 600` instead (`gotchas.md` → "Simulator and
  verification"). Taps render a beat late: tap, wait ~2s, then screenshot.
- No subagents. Don't re-verify what this file says is verified.
- Finish one task per chat; hand off and start fresh rather than running long.

## Next

**Wait for App Review.** You submitted the app (you said on 2026-10-27 that
Apple is reviewing it). The build to review is **1.0 (2)** — uploaded
2026-10-22, `7fd3229`, `index-CzrxaNnZ.js`. 1.0 (1) predates the Glass fix;
confirm in App Store Connect which one is attached. If Apple rejects or asks a
question (Resolution Center, plus email), paste the message into a new chat.

While in review:

- **Don't touch `retrodemo`** (`appreview@retrowaveblog.com`) or prod schema.
  Checked 2026-10-22: confirmed, public page on, 3 public entries, not admin.
- **Supabase stays awake on its own** — see "Where the project is".
- **A push does not change the reviewed app**: its UI is bundled in the build.
  It does change what reviewers can open from it — the terms, privacy and
  support pages on retrowaveblog.com go live about 1–2 minutes after a push.
- A fix to the app itself needs a new build: bump `CURRENT_PROJECT_VERSION`
  (now 2), then guide Part 1's recipe.

Your decisions, not recorded as made (all in App Store Connect):

- Digital Services Act trader declaration (App Information) — needed to sell in
  the EU. If you declare trader, your address and phone are shown on EU pages.
- Pricing and Availability: untick **China mainland** (needs an ICP licence;
  YouTube is blocked there). **Australia** is your call — its under-16
  social-media law probably doesn't cover a private-by-default diary, but that
  was a reading, not a certainty.
- Automatic vs manual release after approval.

After approval: the real-device checks under "Waiting for you" need your iPhone
registered with the team (plug it in with Xcode open).

## Last done

- **2026-10-27:** `.github/workflows/keep-supabase-awake.yml` (`2ac10bc`) —
  one anonymous REST read a day; the first run on GitHub passed.
- **2026-10-22, App Store Connect:** filled in with you. Every answer (privacy
  labels, age rating 13+ by override, category, copyright, content rights,
  screenshots at 1206 × 2622) is recorded in `docs/app-store-submission-guide.md`
  Parts 2–4 and 6.
- **2026-10-22, site:** the privacy page says the data is stored in the US
  (`e6f4482`); the terms page credits the four CC BY 4.0 avatar styles (section
  8, `7fd3229`). Both checked live.
- **2026-10-22, app:** the avatar picker no longer offers "Glass", which
  DiceBear 7.x answers 404 (`7fd3229`, seen on the 17e, editor closed unsaved).
  A private chapter whose last entry is deleted or moved out drops out of
  `private_chapters` (`1242015`, seen on the 17e with a fixture you approved,
  prod re-diffed clean).
- **2026-10-22, builds:** 1.0 (1) and 1.0 (2) uploaded. The team has no
  registered devices, so the archive is built unsigned and the App Store export
  signs it (guide Part 1).
- Earlier on 2026-10-22: findings 113–117 fixed (reactions honour blocks;
  `toggle_user_block` unblock-only; one toast per double tap; logout offline
  message; named rate limits) and the four open simulator checks passed —
  details in the audit plan.

Still not seen: the offline banner (real device). The new email footer has not
been seen in an inbox.

**Desktop-only UI** (the sidebar, the chapter header's make public/private button,
hover states) is checked on the dev server at 1280 (`resize_window`). You sign in
in the browser pane first, since an agent can't, and that session expired within
two days last time. A hover can be read back with the pane's `hover` action, then
`getComputedStyle`.

Store shots: originals (1320 × 2868) in `store-assets/screenshots/`, uploaded
copies (1206 × 2622) in `store-assets/screenshots/1206x2622/`, both gitignored.
All six are brand-free; 06 is `rainbowpudding`, whose display name "Yes" is your
placeholder — a shot reads "Hi, Yes!", so recapture if you rename it.
`retrodemo`'s password lives only in App Store Connect and your password manager.

## Where the project is

Web app and backend are live at https://retrowaveblog.com; the iOS app is in
review. `docs/app-store-submission-guide.md` is the source of truth for the
store side.

- **Signing works** (2026-10-22): your Apple ID is in Xcode, team `VUHVZ7V5M8`
  (paid, Individual) is set on the App target (`efddcaa`), and an Apple
  Distribution certificate exists. The team has **no registered devices**, so a
  normal archive fails; the recipe that works is in guide Part 1.
- **Supabase is on the free plan, which pauses after about a week idle** (it was
  `INACTIVE` on 2026-09-15). The daily `keep-supabase-awake` workflow (15:17 UTC)
  prevents that. GitHub disables scheduled workflows in a public repo after 60
  days with no commits — re-enable it in the Actions tab, or move to Pro
  ($25/month), if the repo goes quiet. Status: `ACTIVE_HEALTHY` (2026-10-27).
- iOS deployment target 16.4 (the CSS needs it).
- **CI green, 418 tests across 49 files.** `npm run check` = CI.
- Pushing to `main` deploys the site (Cloudflare Workers build — it failed once
  during a Cloudflare incident on 2026-09-30; a later push fixed it).

## Prod state worth knowing (checked by query)

- 2026-10-27: 9 auth users, 9 profiles, 11 entries, 1 reaction, 0 blocks,
  2 reports (0 open), no profile with a private chapter, every `avatar_url` null
  (as of 2026-10-22).
- Migrations through `20261022010000` are applied (pasted by you).
- `get_blocked_users` (`20261017000000`): SECURITY DEFINER, authenticated only;
  returns names only while the blocked page is public, because a post's owner can
  read reactors' ids. That is safe only because no RPC blocks an id
  (`toggle_user_block` is unblock-only since `20261022010000`, finding 115).
  Any new "show another user's name" needs the same gate.
- Helper EXECUTE (`20261008000000`): `recent_reaction_count` and
  `recent_post_count` — authenticated only, and since `20261016000000` they
  count only the caller (`p_user = auth.uid()`); `is_blocked_pair` —
  service_role only; since `20261022000000` its one caller is `can_react_to_post`
  (SECURITY DEFINER, authenticated only), which the reactions INSERT policy calls.
- RLS (`20261007000000`): `profiles` INSERT is own-profile only; the `posts`
  limit (10/hour, RESTRICTIVE) counts through SECURITY DEFINER
  `recent_post_count`. Anonymous sign-ins are off.
- **Before User Created hook is ON** → `public.hook_before_user_created`. Never
  drop or rename that function while it is on — every sign-up fails.
- Auth email: 30/hour project-wide, no captcha, Resend free plan — deliberate
  until abuse or volume. Six templates live and equal to the repo, pushed
  2026-10-20 (`node supabase/templates/build.mjs --push`; read back through
  `/v1/projects/<ref>/config/auth`).
- Edge functions: all three live versions equal the repo (checked 2026-10-22 by
  download): `delete-account` v5, `notify-report` v9, `moderate-content` v11.
- How usernames, renames, tombstones, terms and first-run setup work:
  `gotchas.md` → "Supabase and RPCs" and "Auth and email".

## Open work, smaller

- Left as is: finding 52 (SE feed slot); SE max-text composer can scroll the
  field away. Ban not implemented (restore finding 43's sentence only if built).
- Never exercised: YouTube playback (the card renders — `retrodemo`'s "my first
  entry!!" on the Pro Max, 2026-10-14), a long feed.
- Accessibility label in App Store Connect: only Reduced Motion and Sufficient
  Contrast are claimable today. Larger Text needs the composer and feed checked
  at 200% text; VoiceOver needs a full manual pass.

## Waiting for you

- App Review's outcome, and the App Store Connect decisions listed under "Next".
- Prod writes (SQL, dashboard switches) — you paste/flip, the agent verifies
  read-only; email template pushes work from here (with your OK).
- Real-device only: offline banner, and finding 82 (background >1h, Airplane
  Mode, reopen — no "session expired").
- Signing in: an agent cannot authenticate; sign in and say which account.

## Accounts

| Account                                          | Use                                                                                                           |
| ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------- |
| `ldonald234`                                     | **Test data.** cottage-core, 2 entries incl. the overflow fixture — keep it                                   |
| `ldonald0234`                                    | **Admin — the only one.** emo-dark, reaches `ModerationView`                                                  |
| `retrodemo` (`appreview@retrowaveblog.com`)      | App Review demo, 3 public entries, emo-dark. **Never a fixture; don't touch while in review**                 |
| `codex-qa-24e3a82f`                              | Public page, classic-xanga (light public fixture)                                                             |
| `blankslate`, `ldonald234_xanga`                 | 1 entry each (2026-10-18) — no longer `EmptyState` fixtures                                                   |
| `rainbowpudding` (`nonoabc2345@gmail.com`)       | Zero posts, display name "Yes"; **screenshot 06** account. Don't post from it                                 |
| `rainbowpudding1` (`nonoabc2345+hook@gmail.com`) | Zero posts, display name "Yes" — the one empty account free to use as a fixture                               |
| `simrenamed` (a `nonoabc2345+…` address)         | Throwaway (2026-10-22): private, 0 entries, display name "s"; rename-locked to 2026-11-21, `whatsup` reserved |

Gmail `+` addresses reach the same inbox and count as new accounts.

## Simulators

All six on `7fd3229` (`index-CzrxaNnZ.js`, installed 2026-10-22); the Pro was
left booted, the rest shut down. Sessions live in `UserDefaults` and survive
reboots and in-place installs; simulators shut down between sessions, so boot
first and re-check the installed build.

| Simulator                  | Session      |
| -------------------------- | ------------ |
| iPhone 17 Pro Max          | `retrodemo`  |
| iPhone 17 Pro              | signed out   |
| iPhone 17                  | signed out   |
| iPhone Air                 | signed out   |
| iPhone 17e                 | `ldonald234` |
| iPhone SE (3rd generation) | signed out   |

Use the Pro, 17 or Air for signed-out screens. Simulator.app is not installed in
this Xcode; the software keyboard still appears (seen 2026-10-01). On the 17e,
the ⚙ icon opens Settings (export, **delete account**); the 👤 icon opens the
profile editor.

## Traps that cost a session

- **Never `supabase db push`**; never trust a migration as prod — query it.
- The keychain "Supabase CLI" prompt blocks prod queries until you click Allow
  ("Always Allow" stops it repeating per query). It can sit hidden behind other
  windows, and unanswered it times out into an empty token — check `${#TOKEN}`.
- Build replacement SQL functions from prod's live body; keep them ASCII.
- Tap delivery ~1-in-3 and late — screenshot after each tap; swipes are reliable.
  Screenshot pixels are not tap points.
- Ask before each prod write; approval for one test does not cover the next.
- A late tap near a card's reaction row writes a reaction to prod. After a device
  test, check `post_reactions` as well as the rows you meant to touch.
- `simctl io … screenshot` cannot write into the project folder — capture to the
  scratchpad and `cp`. `store-assets/` is gitignored.
- Every return to the app refetches the profile (`SIGNED_IN`) — anything keyed on
  the `profile` object sees it.
- In the browser pane, a local `public/*.html` opens as a `data:` URL — never
  return `location.href` from `javascript_tool` there; it echoes the whole page.
