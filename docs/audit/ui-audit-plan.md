# UI audit — phases, division of labour, coverage

A full pass over every surface and journey, run as `/frontend` and `/mobile`
together. This file is the checklist and the record: tick a cell only when that
surface has been **looked at on the simulator** under that lens.

---

## How the two skills divide

They are not different screens. They are **two questions asked of the same
screenshot**, and a surface is not done until both have been asked.

|           | `/frontend` — _what should it look like_                                  | `/mobile` — _does it work on the device_               |
| --------- | ------------------------------------------------------------------------- | ------------------------------------------------------ |
| Colour    | every value from a token; contrast ≥4.5 on the surface it actually paints | —                                                      |
| Hierarchy | tiers by shape and accent area; is the primary action loudest             | does the hierarchy survive at 375pt with labels hidden |
| Copy      | voice (`u`, `ur`, `2`, tildes); plain English in `aria-label`             | does it truncate or wrap badly at 375pt                |
| Layout    | rhythm, redundancy, does information earn its space                       | 44pt targets, safe areas, keyboard, Dynamic Type       |
| Motion    | on-brand press/hover, spring not duration                                 | does it hold on device, not in the browser pane        |
| Platform  | —                                                                         | App Store guidelines, native bridge, offline           |

**Ordering rule:** `/mobile` first on any surface with input, because a keyboard
or a safe area can move everything and invalidate a `/frontend` judgement made
on a static screenshot. `/frontend` first where the surface is read-only.

**Escalation rule:** a `/frontend` finding that only appears at one width is a
`/mobile` finding. A `/mobile` finding whose fix is a colour or a tier is a
`/frontend` finding. File it where the fix lives, not where it was spotted.

---

## Phase 0 — Rig

- [x] Simulator boots, `content_size` read and recorded for restoration
- [x] Status bar pinned to 9:41
- [x] Current build installed and signed in
- [ ] Simulator.app open for real-keyboard tests (`ConnectHardwareKeyboard false`)

## Phase 1 — Token sweep (no device needed)

- [x] Every text-on-surface pairing × 8 themes, including the auth gradient
- [x] Both chapter-chip badge states
- [x] Composited/translucent values re-checked against their real backdrop
- [x] No hardcoded hex or `rgba()` in components
- [x] All 43 vars present in all 8 themes; no orphans

**Result:** 3 failures found and fixed (`d683a7a`). Sweep is clean.

## Phase 2 — Signed-out journey

| Surface                   | `/mobile` | `/frontend` | Notes                                     |
| ------------------------- | --------- | ----------- | ----------------------------------------- |
| Onboarding, 4 slides      | [x]       | [x]         | Also at max Dynamic Type                  |
| Auth — sign up            | [x]       | [ ]         | Re-check links after the `#c2185b` change |
| Auth — sign in            | [x]       | [ ]         | Same                                      |
| Age verification          | [ ]       | [ ]         | Never rendered                            |
| Public profile as visitor | [x]       | [x]         |                                           |
| Report dialog (anonymous) | [ ]       | [ ]         | Never rendered                            |

## Phase 3 — First run

- [ ] Signup → confirmation screen → age gate → empty journal → first entry
- [ ] Empty state with and without the floating button
- [ ] `NewPasswordModal` via a recovery link

## Phase 4 — Core loop

| Surface                          | `/mobile` | `/frontend` | Notes                       |
| -------------------------------- | --------- | ----------- | --------------------------- |
| Feed with entries                | [x]       | [x]         | classic + emo-dark          |
| Composer                         | [x]       | [x]         | keyboard up, draft autosave |
| Composer preview                 | [x]       | [x]         | markdown verified           |
| Entry detail                     | [x]       | [x]         |                             |
| Entry edit + ⋮ menu              | [x]       | [x]         |                             |
| Delete confirm (`ConfirmDialog`) | [ ]       | [ ]         | Never rendered              |
| Chapter chips + filter           | [x]       | [x]         |                             |
| Reactions (`ReactionBar`)        | [ ]       | [ ]         | Never exercised             |
| YouTube card                     | [ ]       | [ ]         | Never exercised             |
| Long entry / many entries        | [ ]       | [ ]         | Only ever 1 short entry     |

## Phase 5 — Identity and settings

| Surface                         | `/mobile` | `/frontend` | Notes                   |
| ------------------------------- | --------- | ----------- | ----------------------- |
| Profile modal — profile tab     | [x]       | [x]         |                         |
| Profile modal — vibe tab        | [x]       | [ ]         | theme picker            |
| Profile modal — public page tab | [ ]       | [ ]         | `PublicPageSettings`    |
| Avatar picker                   | [ ]       | [ ]         |                         |
| Settings                        | [x]       | [x]         | emo-dark                |
| Export data                     | [ ]       | [ ]         | writes a file on device |
| Delete account confirm          | [ ]       | [ ]         | **do not confirm**      |

## Phase 6 — Public and social

- [ ] Publish a page, view it signed out, view it as another account
- [ ] Report an entry end to end
- [ ] Block from a public profile
- [ ] Private chapter excluded from the public page

## Phase 7 — Moderation

- [ ] `ModerationView` queue, hide entry, dismiss — **needs the admin account**

## Phase 8 — Adverse states

- [ ] Offline banner (device or Network Link Conditioner, not the simulator)
- [ ] `ErrorMessage` / `ErrorBoundary`
- [ ] `LoadingSpinner`, `PostSkeleton`
- [ ] `Toast` — success and error, caught within 2.5s
- [ ] Rapid taps on reactions (cooldown)
- [ ] Session expiry message

## Phase 9 — Accessibility

- [x] Dynamic Type at `accessibility-extra-extra-extra-large` — onboarding
- [ ] Same across feed, composer, settings, profile
- [ ] Reduce Motion on
- [ ] Focus traps in every modal
- [ ] `aria-label` present and in plain English on all icon-only controls

## Phase 10 — Theme sweep

Render one dense screen (feed with an entry) in each theme and look.

- [x] classic-xanga
- [x] emo-dark
- [x] scene-kid — title measured 14.3:1 at its brightest stops; legible
- [ ] myspace-blue
- [ ] y2k-cyber
- [x] cottage-core — headings measured 8.04 / 7.28
- [ ] grunge
- [ ] pastel-goth

---

## Findings log

Severity per `/mobile`: **CRITICAL** rejection risk or dead feature ·
**HIGH** broken on a device · **MEDIUM** polish.

| #   | Sev  | Surface         | Finding                                                             | Status          |
| --- | ---- | --------------- | ------------------------------------------------------------------- | --------------- |
| 1   | MED  | Chapter chips   | Active badge 3.61:1 on the default theme                            | Fixed `df02d73` |
| 2   | MED  | Auth screen     | `--link-color` 4.11:1 on the classic gradient, 4.14 on cottage-core | Fixed `d683a7a` |
| 3   | MED  | Links, emo-dark | `--link-hover` darker than resting on a dark theme, 3.69:1          | Fixed `d683a7a` |
| 4   | MED  | Chapter chips   | Inactive badge 4.47:1 on emo-dark                                   | Fixed `d683a7a` |
| 5   | MED  | Header nav      | Home/Profile/New Entry identical, labels hidden on mobile           | Fixed `52d94df` |
| 6   | MED  | App-wide        | 71 of 96 buttons had no pressed state                               | Fixed `52d94df` |
| 7   | HIGH | App-wide        | 8 `:hover` rules unguarded; marquee pause latched on tap            | Fixed `47ff34d` |
