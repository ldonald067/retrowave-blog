# Handoff — current state

**This is a living document. Overwrite it; do not append.** State, open work and
pointers only — lessons live in `.claude/docs/gotchas.md`, history in
`docs/audit/ui-audit-plan.md`. Keep it short: every session reads it.

Last rewritten 2026-10-22, end of day. App code is `7fd3229`. Every finding in
the audit plan is fixed except 52 (left as is on purpose). Mood art is on hold
(your call, 2026-09-30) — don't raise it.

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

**Build 1.0 (2) is uploaded to App Store Connect** (2026-10-22, 14:25 local;
"Upload succeeded") and carries `7fd3229`'s web build (`index-CzrxaNnZ.js`).
Select **1.0 (2)** for review, not 1.0 (1), which predates the Glass fix. You are filling in App Store Connect: App Privacy, Age Rating (13+
by override, matching the terms) and App Information are answered as recorded in
the guide; still to do are the description/screenshots/review notes (Parts 2,
5, 6), the Digital Services Act trader declaration (your call), and submit. The real-device checks under "Waiting for
you" need your iPhone registered — plug it in with Xcode open.

Last done (2026-10-22, late): the terms page credits the four CC BY 4.0 avatar
styles (section 8, live on retrowaveblog.com/terms), and the picker no longer
offers "Glass", which DiceBear 7.x answers 404 (`7fd3229`; picker seen on the
17e, editor closed unsaved, prod unchanged).

Before that: a private chapter whose last entry is deleted, or
edited into another chapter, now drops out of `private_chapters` (`1242015`).
Before, the name lingered with no control to clear it. Seen on the 17e against
prod with a fixture you approved on `ldonald234` (one private entry in private
chapter "zz fixture"): deleting it in the app took `private_chapters` from
`['zz fixture']` to `[]` and removed the 🤫 chip. Prod re-diffed clean apart from
`profiles.updated_at`. The edit-into-another-chapter path runs the same code but
was not driven on device. No profile in prod has a private chapter, so nothing
lingers from older builds.

Before that, the four open simulator checks all passed on the Pro with the
throwaway `simrenamed` (see Accounts): first-run setup refuses "emma van dyke";
a rename locks the username field until nov 21 and the old name reads as taken;
finding 95's "~ this goes public ~" confirm (fixture reverted, prod re-diffed);
and the session-expired toast on resume after its `auth.sessions` row was
deleted. Earlier, `12ffaa0` had fixed the unblock double toast (`251d775`),
logout during an outage (`b11b9ed`) and unnamed rate limits.

Before that, `/adversarial-review` of the code since `c0fd392` found 115–117.
All three are fixed, and so is 114:

- **115–116** (`20261022010000`, which you pasted): `toggle_user_block` is
  unblock-only, and anon lost EXECUTE. An entry's owner can no longer block
  reactor ids to read their names off `get_blocked_users`, and a repeated
  unblock can no longer re-block. Proven in a `DO` block that always raised.
- **116's double toast** (`251d775`): seen on the dev server against prod, with
  one fixture block you approved. Two clicks 60ms apart sent one request and
  showed one toast. Prod was back to 0 blocks afterwards.
- **117** (`b11b9ed`) and **114** (`12ffaa0`) are client-only. Each one's tests
  fail without the fix, and both were checked read-only against prod's policies
  and raise text. Neither was triggered live: a real limit takes 10 entries on
  prod, and the pane cannot fake a 503 for supabase-js (`gotchas.md` → "Auth
  and email").

Earlier 2026-10-22: finding 113 was fixed (`20261022000000`: reactions honour
blocks), the `/fullstack` audit ran, findings 111–112 were seen on the Pro,
`ui/Button.tsx` was deleted, and `delete-account` (v5) and `notify-report` (v9)
were redeployed. The new email footer has not been seen in an inbox yet. Details
are in the audit plan. Prod now: 9 accounts, 0 blocks, 1 reaction, 11 entries,
2 reports.

Still not seen: the offline banner (real device).

**Desktop-only UI** (the sidebar, the chapter header's make public/private button,
hover states) is checked on the dev server at 1280 (`resize_window`). You sign in
in the browser pane first, since an agent can't, and that session expired within
two days last time. A hover can be read back with the pane's `hover` action, then
`getComputedStyle`.

Store shots: all six are brand-free; 06 is `rainbowpudding`, whose display name
"Yes" is your placeholder — a shot reads "Hi, Yes!", so recapture if you rename
it. `retrodemo`'s password lives only in App Store Connect and your password
manager.

## Where the project is

Web app and backend are done and live at https://retrowaveblog.com. **What
remains is Apple-side only** — signing, archive/upload, App Store Connect;
`docs/app-store-submission-guide.md` is the source of truth.

- **Signing works** (2026-10-22): your Apple ID is in Xcode, team `VUHVZ7V5M8`
  is set on the App target (`efddcaa`), and an Apple Distribution certificate
  exists. The team has **no registered devices**, so a normal archive fails;
  the recipe that worked is in guide Part 1.
- **Supabase pauses when idle** (found `INACTIVE` 2026-09-15). Check before any
  device session; keep it active through App Review.
- iOS deployment target 16.4 (the CSS needs it).
- **CI green, 414 tests across 49 files.** `npm run check` = CI.
- Pushing to `main` deploys the site (Cloudflare Workers build — it failed once
  during a Cloudflare incident on 2026-09-30; a later push fixed it).

## Prod state worth knowing (checked by query)

- Migrations through `20261022010000` are applied (pasted by you). 8 auth users,
  8 profiles, 8/8 terms accepted, none unconfirmed (2026-10-18).
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

## Waiting for you

- App Store Connect (Parts 2–6, submit) is yours to paste. Prod writes (SQL, dashboard switches) — you paste/flip, the
  agent verifies read-only; email template pushes work from here (with your OK).
- Real-device only: offline banner, and finding 82 (background >1h, Airplane
  Mode, reopen — no "session expired").
- Signing in: an agent cannot authenticate; sign in and say which account.

## Accounts

| Account                                          | Use                                                                                                           |
| ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------- |
| `ldonald234`                                     | **Test data.** cottage-core, 2 entries incl. the overflow fixture — keep it                                   |
| `ldonald0234`                                    | **Admin — the only one.** emo-dark, reaches `ModerationView`                                                  |
| `retrodemo` (`appreview@retrowaveblog.com`)      | App Review demo, 3 public entries, emo-dark. **Never a fixture**                                              |
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
this Xcode; the software keyboard still appears (seen 2026-10-01).

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
