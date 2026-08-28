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
| Auth — sign up            | [x]       | [x]         | `cc3fed1` — form moved onto --card-bg     |
| Auth — sign in            | [x]       | [x]         | Link tiers deliberate and documented      |
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

- [x] `ModerationView` queue rendered and audited — `6b34d0d`
- [ ] hide entry / dismiss — **not exercised**: both act on real prod moderation data, and dismissing consumes the only open report

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

- [ ] **Photograph a 100-char chapter truncating in `PublicPostCard`.** Finding
      21 is fixed with the `min-w-0` + `max-w-[14rem]` + `truncate` combination
      already proven on the entry detail in `1266721`, but it is verified at
      code level only — none of the three public accounts has a chapter long
      enough, and the overflow fixture lives on an account whose page is not
      public. Needs a long-chapter public entry to photograph.

- [ ] **Photograph the truncated filter pill.** Finding 12 (a 100-char chapter
      forcing the whole document into horizontal scroll) is verified by the page
      no longer shifting plus the code change — not by a screenshot of the pill
      itself truncating, because the tap toggled the filter off rather than on.
      Apply the chapter filter and capture it.

## Phase 7c — Hierarchy sweep — **complete except `EmptyState`**

All eight rows below are done bar `EmptyState`, which needs a zero-post account.
`ModerationView` is reachable any time the admin account is signed in: deep-link
`#/report/<any well-formed uuid>`, because `focusReportId` only highlights a row
and the queue loads from `admin_list_reports` independently.


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
| `PublicProfileView`        | [x]       | [x]     | findings 20-24; 2 deferred                   |
| `ProfileModal`             | [x]       | [x]     | `b09d127` — findings 25, 26; all three tabs   |
| `SettingsModal`            | [x]       | [x]     | No findings — icons already correct          |
| `ModerationView`           | [x]       | [x]     | `6b34d0d` — findings 32, 33                  |
| `LoginForm` / `SignUpForm` | [x]       | [x]     | `cc3fed1` — findings 30, 31                  |
| `EmptyState`               | [ ]       | [ ]     | **Blocked** — needs a zero-post account      |
| `Sidebar`                  | [x]       | [x]     | `5728fa2` — findings 28, 29. **Not desktop-only** |

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

| 20  | MED  | Public profile  | Entry chapter `--accent-primary` on the card header gradient — 2.38:1 classic-xanga, 3.13 myspace-blue, 3.20 cottage-core, 4.31 grunge. Not a control here, so it takes the `name` treatment: italic `--text-subtitle`, 4.51 worst case | Fixed `abe31f8` |
| 21  | MED  | Public profile  | Entry chapter had no `min-w-0`/`max-w`/`truncate` — a 100-char chapter overflows the card header. Same class as 11, never applied here. `gap-y-0.5` also collapsed the band's rows once it wrapped | Fixed `abe31f8` |
| 22  | MED  | Public profile  | No middle tier: 18px title over 14px body over 12px chrome, with the body on a bare `text-sm` that is on neither the scanning nor the reading step. Now `.prose-reading` + `text-xl` | Fixed `abe31f8` |
| 23  | MED  | Public profile  | The marquee used `.marquee`, **a class defined nowhere in `index.css`** — so on the app's most visitor-facing screen it never scrolled, never clipped, and wrapped onto two static lines. `Header` uses `.marquee-banner`/`.marquee-banner-inner` correctly | Fixed `abe31f8` |
| 24  | MED  | Public profile  | Action row at `gap-2` put a bold underlined caution link 8px beneath a filled primary button, on three wrapped rows | Fixed `abe31f8` |

| 25  | MED  | ProfileModal    | Eleven section headings rendered three ways — seven 20px retro icons, three 14px Pepicons, two bare. Retro icons mark sections here and Pepicons mark controls, so these were the control system doing a section's job | Fixed `b09d127` |
| 26  | MED  | ProfileModal    | `status message` and `emoji style` carried the *same* stars glyph, so the icon encoded nothing | Fixed `b09d127` |
| 27  | MED  | Public page tab | `private by default` rendered as a bordered, rounded, filled, bold span a thumb's width above a real button — third occurrence of an inert status dressed as a control, after finding 8 and the public profile's stat pills | Fixed `b09d127` |
| 28  | MED  | Sidebar         | Expanded, the summary row repeats the card beneath it — same avatar, name and @username, with `Hi, <name>!` above that: the identity three times in the top third. Persists in localStorage, so permanent for anyone who expands once | Fixed `5728fa2` |
| 29  | MED  | Sidebar         | `About Me`, `Stats`, `📖 Chapters`, `Current Mood:`, `Entries:` in Title Case against ~14 lowercase headings elsewhere — and ProfileModal labels the same field `about me` | Fixed `5728fa2` |

| 30  | MED  | Auth screen     | `Input`'s label is `--accent-primary`, and the form sat bare on the auth gradient: **4.11:1 classic-xanga, 4.14 cottage-core** — the same numbers as finding 2, which `d683a7a` fixed by changing `--link-color` only. Form now sits on `--card-bg` (4.82 worst) | Fixed `cc3fed1` |
| 31  | MED  | Auth screen     | Header read `Welcome Back` directly above a heading reading `~ welcome back ~`; both tabs Title Case too | Fixed `cc3fed1` |

| 32  | MED  | ModerationView  | Date was `toLocaleDateString()` — the only use in the app — so the open report read `8/10/2026`: 8 October in most of the world, 10 August in the US | Fixed `6b34d0d` |
| 33  | MED  | ModerationView  | No middle tier: below a text-xl heading everything was `text-xs` except one `text-sm` line, the reported entry included — the evidence set at chrome size | Fixed `6b34d0d` |

**33 findings, all fixed.** Four contrast failures (1–4), three overflow bugs
from a single maximum-length entry (9–11), one document-breaking layout bug
(12), and the entry-detail/feed-card hierarchy set (14–19).

## Blocked — cannot be reached from this session

| Surface                    | Needs                                                                 |
| -------------------------- | --------------------------------------------------------------------- |
| `EmptyState`               | Sign-in as a zero-post account. `EmptyState` renders only at `posts.length === 0`; a chapter filter with no matches renders the archive-empty branch instead, not this component. `blankslate` exists but needs its password |
| `ModerationView` actions   | A decision, not access: `~ hide entry ~` and `~ dismiss ~` act on real production data, and dismissing consumes the only open report. The screen itself is audited |
| Sidebar stats labels       | ≥1024px. `hidden lg:block`, and the phone is 440pt — the finding 29 fix there is verified by reading, not photographed |

## Deferred — seen on this pass, not filed as findings

| Surface        | Observation                                                                 | Why deferred                                                        |
| -------------- | --------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| Public profile | `~ report entry ~` gets its own full-width footer bar on every card, bold and underlined — on a stranger's page it is the loudest control, repeated once per entry | Guideline 1.2 compliance control. Its prominence is a `/mobile` call, not a `/frontend` one, and it is not worth re-tiering a reporting affordance for style alone right before submission |
| Feed           | The floating `new entry` button sits over the last reaction in a card's reaction bar at rest. Whether that actually blocks the control is a touch-target question for `/mobile`, and Phase 4 still has `ReactionBar` unexercised |
| Public profile | `start your own journal` appears twice — once in the profile card, once in the footer CTA card. On a one-entry page they are a screen apart and read as the same ask twice | Removing a conversion CTA is a product decision, not a hierarchy fix |

## Dismissed — looked at, deliberately not filed

Recorded so they are not re-raised.

| Surface                | Impression                          | Why dismissed                                                              |
| ---------------------- | ----------------------------------- | -------------------------------------------------------------------------- |
| scene-kid title        | Looked muddy                        | Measured **14.3:1** at its brightest stops. The muddiness is `.xanga-title`'s retro text-shadow doing its job |
| cottage-core headings  | Looked muddy                        | Measured **8.04** and **7.28**                                             |
| Entry detail metadata  | "The metadata colours are wrong"    | My own misdiagnosis. The flatness was a missing size tier — 13px body copy that could not outrank 12px chrome — not colour. Fixing colour first (`83be72e`) had to be partly reversed in `95aa9bb`. Measure and check the scale before reaching for a third grey |
