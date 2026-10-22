# Handoff — current state

**This is a living document. Overwrite it; do not append.** State, open work and
pointers only — lessons live in `.claude/docs/gotchas.md`, history in
`docs/audit/ui-audit-plan.md`. Keep it short: every session reads it.

Last rewritten 2026-10-22. App code is `d6b9afc`, which only deletes the unused
`ui/Button.tsx` from `e95e397` and changes nothing a user sees. Two edge functions
were also redeployed to match the repo (below). Mood
art is on hold (your call, 2026-09-30) — don't raise it.

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

**Nothing is queued.** Small candidates, each one chat, if you want one:

1. **See the code-read-only bits:** a toast's weight on classic-xanga (finding
   111), and the lowercase intro slide titles (112).

Otherwise what's left is the Apple enrollment and "Open work, smaller".

Last done (2026-10-22): deleted `src/components/ui/Button.tsx` (`d6b9afc`), which
nothing imported. A build diff against `e95e397` showed identical JS apart from chunk
hashes. The CSS lost `animate-spin` and two `disabled:` utilities that only it used.

Also 2026-10-22: with your OK, redeployed `delete-account` (v5) and
`notify-report` (v9), so their emails now carry finding 107's footer link
colour. Before the deploy, the only difference from the repo was that colour.
Afterwards, the live source downloaded back equal to `HEAD`, `verify_jwt` is still
on, and calls that send no mail reached both functions' own code. How to deploy:
`gotchas.md` → "Supabase and RPCs". No email was sent, so the new footer has not
been seen in an inbox.

Before that (2026-10-18 to 10-21): audit passes fixed findings 102–112
(`4895f32`, `e95e397`); details are in the audit plan's findings log. The six
auth email templates were pushed 2026-10-20 and read back equal to the repo. All
six simulators run `e95e397`. No other prod data changed: `post_reactions`
is still 1 row, and `ldonald234`'s newest edit is still 2026-10-17.

Still not seen: the offline banner (real device). The "~ this goes public ~" dialog
(finding 95) needs a public profile with a chapter; `ldonald234`'s page is
private, and `retrodemo` is never a fixture.

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

- **Blocker: Apple Developer Program enrollment** (0 signing identities,
  checked 2026-09-17). Needs your Apple ID and a paid enrollment.
- **Supabase pauses when idle** (found `INACTIVE` 2026-09-15). Check before any
  device session; keep it active through App Review.
- iOS deployment target 16.4 (the CSS needs it).
- **CI green, 409 tests across 49 files.** `npm run check` = CI.
- Pushing to `main` deploys the site (Cloudflare Workers build — it failed once
  during a Cloudflare incident on 2026-09-30; a later push fixed it).

## Prod state worth knowing (checked by query)

- Migrations through `20261017000000` are applied (pasted by you). 8 auth users,
  8 profiles, 8/8 terms accepted, none unconfirmed (2026-10-18).
- `get_blocked_users` (`20261017000000`): SECURITY DEFINER, authenticated only;
  returns names only while the blocked page is public, because a post's owner can
  read reactors' ids. Any new "show another user's name" needs the same gate.
- Helper EXECUTE (`20261008000000`): `recent_reaction_count` and
  `recent_post_count` — authenticated only, and since `20261016000000` they
  count only the caller (`p_user = auth.uid()`); `is_blocked_pair` —
  service_role only (nothing calls it; the reactions policy checks blocks inline).
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

- **See first-run setup in the native app** — only a brand-new account shows it.
  Sign up with a `nonoabc2345+…@gmail.com` address on the SE or 17; on step 1 try
  "emma van dyke" (should say "that name isn't allowed here").
- **Device checks not yet done:** single "session expired" message — logging
  out elsewhere no longer expires a session (log out is local now), so revoke
  the device's session server-side instead (delete its `auth.sessions` row: a
  prod write, ask), then relaunch; a username rename (should lock 30 days; old
  name "taken" at sign-up).
- Left as is: finding 52 (SE feed slot); SE max-text composer can scroll the
  field away. Ban not implemented (restore finding 43's sentence only if built).
- Never exercised: YouTube playback (the card renders — `retrodemo`'s "my first
  entry!!" on the Pro Max, 2026-10-14), a long feed.

## Waiting for you

- Apple enrollment. Prod writes (SQL, dashboard switches) — you paste/flip, the
  agent verifies read-only; email template pushes work from here (with your OK).
- Real-device only: offline banner, and finding 82 (background >1h, Airplane
  Mode, reopen — no "session expired").
- Signing in: an agent cannot authenticate; sign in and say which account.

## Accounts

| Account                                          | Use                                                                             |
| ------------------------------------------------ | ------------------------------------------------------------------------------- |
| `ldonald234`                                     | **Test data.** cottage-core, 2 entries incl. the overflow fixture — keep it     |
| `ldonald0234`                                    | **Admin — the only one.** emo-dark, reaches `ModerationView`                    |
| `retrodemo` (`appreview@retrowaveblog.com`)      | App Review demo, 3 public entries, emo-dark. **Never a fixture**                |
| `codex-qa-24e3a82f`                              | Public page, classic-xanga (light public fixture)                               |
| `blankslate`, `ldonald234_xanga`                 | 1 entry each (2026-10-18) — no longer `EmptyState` fixtures                     |
| `rainbowpudding` (`nonoabc2345@gmail.com`)       | Zero posts, display name "Yes"; **screenshot 06** account. Don't post from it   |
| `rainbowpudding1` (`nonoabc2345+hook@gmail.com`) | Zero posts, display name "Yes" — the one empty account free to use as a fixture |

Gmail `+` addresses reach the same inbox and count as new accounts.

## Simulators

All six on `e95e397` (`index-C-o8bFwP.js`, installed 2026-10-21); left booted
that day. The current build (`d6b9afc`, `index-DakSLtuU.js`) differs only by the
unused CSS above, so no reinstall was needed. Sessions live in `UserDefaults` and survive
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
