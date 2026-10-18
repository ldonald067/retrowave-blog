# Handoff — current state

**This is a living document. Overwrite it; do not append.** State, open work and
pointers only — lessons live in `.claude/docs/gotchas.md`, history in
`docs/audit/ui-audit-plan.md`. Keep it short: every session reads it.

Last rewritten 2026-10-18, at the commit after `885b15d` (code `885b15d`). Mood
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

Done 2026-10-18: findings 100–101 fixed (`885b15d`). The safety tab names each
blocked person (display name, then @username) through a new SECURITY DEFINER
RPC, `get_blocked_users` — migration `20261017000000`, pasted by you, verified by
query (anon cannot call it). It withholds the name while the blocked page is
private, so blocking an id read off a reaction cannot reveal a private journal's
name; the row then says "someone w/ a private page" with the block date. The
block confirm now says "undo this later in edit profile, under safety". Seen on
the 17e: the copy, then one approved block of `codex-qa-24e3a82f` listed as
"Codex QA Profile 95101 / @codex-qa-24e3a82f", unblocked, re-diffed (0 blocks).
The "private page" fallback is covered by a component test only.

Done 2026-10-17: the 89–93 device checks (reaction count, pending notice on
cottage-core and emo-dark, "~ unblock ~", linkless song title, age screen) and
block from a public profile. The only lasting prod change from those tests:
"First day back on here" has `updated_at` 2026-10-17.

Earlier state still true: all six store shots are brand-free; 06 is
`rainbowpudding`, whose display name "Yes" is your placeholder — a store shot
reads "Hi, Yes!", so recapture if you rename it. `retrodemo`'s password lives
only in App Store Connect and your password manager.

Recommended order: nothing is queued. What's left is the Apple enrollment and
the checks below and under "Open work, smaller".

Still not seen: the sidebar's active chapter — that list is `hidden lg:block`,
so no iPhone shows it; check it in the dev server at 1024pt+ once you are signed
in there. The offline banner (real device). The "~ this goes public ~" dialog
(finding 95) needs a public profile with a chapter; `ldonald234`'s page is
private, and `retrodemo` is never a fixture.

## Where the project is

Web app and backend are done and live at https://retrowaveblog.com. **What
remains is Apple-side only** — signing, archive/upload, App Store Connect;
`docs/app-store-submission-guide.md` is the source of truth.

- **Blocker: Apple Developer Program enrollment** (0 signing identities,
  checked 2026-09-17). Needs your Apple ID and a paid enrollment.
- **Supabase pauses when idle** (found `INACTIVE` 2026-09-15). Check before any
  device session; keep it active through App Review.
- iOS deployment target 16.4 (the CSS needs it).
- **CI green, 408 tests across 48 files.** `npm run check` = CI.
- Pushing to `main` deploys the site (Cloudflare Workers build — it failed once
  during a Cloudflare incident on 2026-09-30; a later push fixed it).

## Prod state worth knowing (checked by query)

- Migrations through `20261016010000` are applied (pasted by you). 8 auth users,
  7 profiles, 7/7 terms accepted.
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
  until abuse or volume. Six templates live and equal to the repo
  (`node supabase/templates/build.mjs --push`).
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
  agent verifies read-only; email template pushes work from here.
- Real-device only: offline banner, and finding 82 (background >1h, Airplane
  Mode, reopen — no "session expired").
- Signing in: an agent cannot authenticate; sign in and say which account.

## Accounts

| Account                                         | Use                                                                           |
| ----------------------------------------------- | ----------------------------------------------------------------------------- |
| `ldonald234`                                    | **Test data.** cottage-core, 2 entries incl. the overflow fixture — keep it   |
| `ldonald0234`                                   | **Admin — the only one.** emo-dark, reaches `ModerationView`                  |
| `retrodemo` (`appreview@retrowaveblog.com`)     | App Review demo, 3 public entries, emo-dark. **Never a fixture**              |
| `codex-qa-24e3a82f`                             | Public page, classic-xanga (light public fixture)                             |
| `blankslate`, `ldonald234_xanga`                | Zero posts — `EmptyState`                                                     |
| `rainbowpudding` (`nonoabc2345+hook@gmail.com`) | Zero posts, display name "Yes"; **screenshot 06** account. Don't post from it |
| `nonoabc2345@gmail.com`                         | Unconfirmed since 2026-09-19; holds no username                               |

Gmail `+` addresses reach the same inbox and count as new accounts.

## Simulators

All six on `885b15d` (`index-CULEUWR-.js`, installed 2026-10-18). Sessions live in
`UserDefaults` and survive reboots and in-place installs; simulators shut down
between sessions, so boot first and re-check the installed build.

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
  ("Always Allow" stops it repeating per query).
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
