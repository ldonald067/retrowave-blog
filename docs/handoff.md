# Handoff — current state

**This is a living document. Overwrite it; do not append.** State, open work and
pointers only — lessons live in `.claude/docs/gotchas.md`, history in
`docs/audit/ui-audit-plan.md`. Keep it short: every session reads it.

Last rewritten 2026-10-16, at the commit after `07857c9` (code `0242c82`). Mood
art is on hold (your call, 2026-09-30) — don't raise it.

---

## Keep sessions lean — you are hitting usage limits

You reported (2026-10-07) that a new chat starts around **300k tokens of cache**
and limits arrive too soon. Every session:

- Read this file, then **only the `gotchas.md` section** for the area you touch
  (grep the heading) — not the whole file. Grep the audit plan; never read it whole.
- Screenshots at `scale: 0.4`–`0.5`, and prefer `read_page`/`get_page_text`.
  One simulator unless the task is about a specific width.
  The simulator screenshot has no scale option (full size every time) and taps
  render a beat late: tap, screenshot, and screenshot once more only if unchanged.
- No subagents. Don't re-verify what this file says is verified.
- Finish one task per chat; hand off and start fresh rather than running long.

## Next

Done 2026-10-08 → 14: your two calls (log out is device-only; signup heading
"start ur journal", `6a766cf`, proven on the SE by `auth.sessions`); migration
`20261008000000` (pasted, verified by query, `6821019`); store screenshots
`02`–`05` recaptured on the Pro Max as `retrodemo`. 2026-10-15/16: you rotated
`retrodemo`'s password (via "forgot ur password?"; it now lives only in App Store
Connect and your password manager, `440b78d`); the desktop sidebar's per-chapter
lock toggle is gone so counts line up (`e5d5d68`, measured in the dev server);
private chapters wear 🤫 (🔒 is private entries only) and phones change a
chapter's privacy with a "🤫 private | 📖 public" pair under its name instead
of the one-tap button (`e435aaf`, seen on the 17e, not tapped). Brand names are
out of the store shots: you edited `retrodemo`'s "theme appreciation post" to
"switched 2 the classic theme" (SQL, 2026-10-16), the themes "Classic Xanga" and
"MySpace Blue · Tom would be proud" are now "Classic Glitter" and "Top 8 Blue ·
Top 8 approved" (display names only, `8114e55`), and 01, 02 and 05 are recaptured.
The app's own "xanga" copy is gone too (intro, empty state, footer badge → "y2k
revival", `c0fd392`). 06 is recaptured as `rainbowpudding` (display name "Yes" —
your placeholder for now; a store shot reads "Hi, Yes!", so recapture if you
rename it). All six store shots are now free of brand names. `/adversarial-review`
of everything since 09-30: findings 95–99 fixed (`0242c82`) — un-hiding a
chapter on a public profile now asks first; migration `20261016000000` pasted
and verified by you. The duplicate `profiles.username` unique constraint is gone
(`profiles_username_key` dropped, migration `20261016010000`, pasted by you and
verified by query, `07857c9`).

Recommended order: nothing is queued. What's left is the Apple enrollment and
the device checks below and under "Open work, smaller".

Not yet seen on a device from 89–94 (colour swaps, contrast computed): active
reaction count, sidebar active chapter (bar + bold), "~ unblock ~", public-page
pending notice, a song title without a YouTube link, offline banner, age screen.
Also not seen on a device: the "~ this goes public ~" dialog (finding 95) —
it needs a public profile with a chapter; `ldonald234`'s page is private, and
`retrodemo` is never a fixture. The pair itself was tapped there and reverted.

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
  entry!!" on the Pro Max, 2026-10-14), a long feed, block from a public profile.

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

All six on `0242c82` (`index-Bej0gr39.js`, installed 2026-10-16). Sessions live in
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
