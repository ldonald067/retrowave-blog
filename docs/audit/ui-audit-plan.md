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

**Standing question for every surface: does the scale have a middle?** One big
heading and everything else at roughly one small size reads as flat however it
is coloured. The content a person came for should sit between the heading and
the chrome. Adding emphasis inside a metadata band is not a substitute — four
items each asking for attention is the absence of hierarchy.

**Style is a hierarchy tool, not decoration.** Once a band is subordinate by
size, bold / italic / underline differentiate inside it without pulling rank.
Each must encode a kind and do so consistently: regular for context, bold for a
status, italic for the name of a thing, underline for links and nothing else.
Reaching instead for a second size or a darker colour inside a correctly-sized
band is what makes four facts each demand attention.

**Standing question for every surface: is it cramped?** Space is a material
here, not leftover. A modal is already bounded, so crowding inside it wins
nothing — a heading and the actions beneath it need a real break between them,
and two buttons need enough gap to read as two choices rather than one
segmented control. Judge it on the screenshot; `gap-2` looks generous in source
and tight at 440pt. Where a screen truly cannot fit, remove something rather
than tightening until it squeezes in.

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

## Phase 7b — Overflow: what a legal maximum does to the layout

Cross-cutting, not a surface. Every field below is a value the app **accepts**,
so every one of these is a state a real user can reach — not an edge case. The
question is never "does it wrap" but **what gets pushed off, truncated, or
overlapped when it does.**

| Field    | Limit                  | Where it renders                                                   |
| -------- | ---------------------- | ------------------------------------------------------------------ |
| title    | 200 chars              | feed card, entry detail header, edit header, public page, og:title |
| content  | 50,000 chars           | feed excerpt (truncated at 300), entry detail, preview             |
| chapter  | 100 chars              | chip, filter pill, metadata row, sidebar, chapter detail bar       |
| author   | 50 chars               | feed footer, metadata row                                          |
| mood     | 100 chars              | feed card, sidebar, profile                                        |
| music    | 200 chars              | feed card, YouTube card fallback, profile                          |
| username | per `USERNAME_PATTERN` | header, profile card, public URL, block button label               |

For each: does it **truncate with an ellipsis**, **wrap**, or **overflow**?
Truncation is only acceptable where the full value is reachable somewhere else.

- [x] Title at 200 — feed card, detail header (edit header still to do)
- [x] Chapter at 100 — chip truncates, metadata row truncates, chip row scrolls horizontally
- [ ] Author at 50 — feed footer
- [x] A single unbroken token — body copy wraps correctly in card, detail and textarea
- [ ] Long values at max Dynamic Type, where they wrap to many more lines

## Carried over — re-confirm next pass

- [ ] **Photograph the truncated filter pill.** Finding 12 (a 100-char chapter
      forcing the whole document into horizontal scroll) is verified by the page
      no longer shifting plus the code change — not by a screenshot of the pill
      itself truncating, because the tap toggled the filter off rather than on.
      Apply the chapter filter and capture it.

## Phase 7c — Hierarchy sweep

Apply the system settled on the entry detail to every other surface. **Surface
by surface with a screenshot each, not a find-and-replace** — the whole lesson
from that modal was that the right fix depended on looking at the specific
screen, and three of the four attempts there were wrong in a way only a
screenshot showed.

The system:

1. **Three size tiers** — heading, reading (`.prose-reading`), chrome (`text-xs`).
   Check first whether the surface has a middle at all.
2. **Style encodes kind** — regular/context, bold/status, italic/name,
   underline/link only.
3. **Colour maps to the same kinds** — `--text-muted`, `--text-body` or
   `--accent-primary`, `--text-subtitle`. Re-measure on the surface it paints on.
4. **Space is a material** — a real break between groups, a row gap that survives
   wrapping.

| Surface                    | Looked at | Applied | Notes                                        |
| -------------------------- | --------- | ------- | -------------------------------------------- |
| `PostCard`                 | [x]       | [x]     | `74c20b7` — findings 18, 19                  |
| `PublicProfileView`        | [ ]       | [ ]     | Visitor-facing; stat pills flagged earlier   |
| `ProfileModal`             | [ ]       | [ ]     | Three tabs                                   |
| `SettingsModal`            | [ ]       | [ ]     | Also revisit the reserved-but-unused height  |
| `ModerationView`           | [ ]       | [ ]     | Needs the admin account                      |
| `LoginForm` / `SignUpForm` | [ ]       | [ ]     | Link tiers already partly done               |
| `EmptyState`               | [ ]       | [ ]     |                                              |
| `Sidebar`                  | [ ]       | [ ]     | Desktop only                                 |

## Phase 8 — Adverse states

- [ ] Offline banner (device or Network Link Conditioner, not the simulator)
- [x] `ErrorMessage` — seen after a simulator reboot: 🥴 hero, bold `error:` label, muted message, full-width `~ try again ~`. Hierarchy reads correctly; recovery worked
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
| 8   | MED  | Entry detail    | Chapter dressed as a filter chip — inert control in a real control's costume | Fixed `c6c6696` |
| 9   | HIGH | Feed card       | `line-clamp-2` defeated by `flex` on the same element; a 200-char title ran 5 lines past the card padding | Fixed `1266721` |
| 10  | MED  | Entry detail    | A 200-char title squeezed `~ edit entry ~` into a 3-line, one-word column; header now stacked | Fixed `1266721` / `b7e67de` |
| 11  | MED  | Entry detail    | 100-char chapter ran off the right edge with no ellipsis — flex item without `min-w-0` — pushing date and author out of view | Fixed `1266721` |
| 12  | HIGH | Filter pill     | `chapter: <name>` had no width constraint and forced the **whole document** into horizontal scroll, clipping header, journal title and every card | Fixed `b7e67de` |
| 13  | MED  | App-wide        | `.xanga-button-ghost` labels `--accent-primary`: 2.38:1 on a modal header gradient (3.20 cottage-core, 3.93 myspace-blue, 4.31 grunge). Now paints `--card-bg` beneath | Fixed `b7e67de` |
| 14  | MED  | Entry detail    | Action row hard left under the title at `gap-2` — read as one segmented control continuing the text block | Fixed `3b0a718` / `8767deb` |
| 15  | MED  | Entry detail    | No middle tier: 20–24px title, 13px `.prose` body, 12px metadata — the entry read no louder than its byline. `.prose-reading` added | Fixed `95aa9bb` |
| 16  | MED  | Entry detail    | Four metadata facts at one size, weight and colour joined by `·`; separators orphaned onto a new line when the chapter wrapped | Fixed `83be72e`, refined `fca81c5` `4e8f90b` `4fa4c95` |
| 17  | MED  | Entry detail    | Corner sparkles were `✨`, which ignores `color` — the intended tint did nothing, pale gold on a cream band. Now `✦` | Fixed `1342690` |
| 18  | MED  | Feed card       | Chapter is genuinely tappable but painted `--accent-primary` on the header gradient (2.38 classic-xanga, 3.13 myspace-blue, 3.20 cottage-core) with `hover:underline` as its only affordance on a platform without hover | Fixed `74c20b7` |
| 19  | MED  | Feed card       | `📅` carried a dead `color: var(--accent-primary)` (emoji ignore colour); byline semibold in accent made the least consequential fact the loudest in the footer | Fixed `74c20b7` |

**19 findings, all fixed.** Four contrast failures (1–4), three overflow bugs
from a single maximum-length entry (9–11), one document-breaking layout bug
(12), and the entry-detail/feed-card hierarchy set (14–19).

## Dismissed — looked at, deliberately not filed

Recorded so they are not re-raised.

| Surface                | Impression                          | Why dismissed                                                              |
| ---------------------- | ----------------------------------- | -------------------------------------------------------------------------- |
| scene-kid title        | Looked muddy                        | Measured **14.3:1** at its brightest stops. The muddiness is `.xanga-title`'s retro text-shadow doing its job |
| cottage-core headings  | Looked muddy                        | Measured **8.04** and **7.28**                                             |
| Entry detail metadata  | "The metadata colours are wrong"    | My own misdiagnosis. The flatness was a missing size tier — 13px body copy that could not outrank 12px chrome — not colour. Fixing colour first (`83be72e`) had to be partly reversed in `95aa9bb`. Measure and check the scale before reaching for a third grey |
