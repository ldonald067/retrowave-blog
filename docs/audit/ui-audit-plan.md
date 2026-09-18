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

**Standing questions for every surface** — the reasoning is in `/frontend`:
does the scale have a middle tier; does each style (bold, italic, underline)
encode one kind consistently; is it cramped; is anything grey that should carry
accent.

---

## Phase 0 — Rig

- [x] Simulator boots, `content_size` read and recorded for restoration
- [x] Status bar pinned to 9:41
- [x] Current build installed and signed in
- [x] Simulator.app open for real-keyboard tests (`ConnectHardwareKeyboard false`) —
      done 2026-08-17, when the composer was verified with the full software keyboard

## Phase 1 — Token sweep (no device needed)

- [x] Every text-on-surface pairing × 8 themes, including the auth gradient
- [x] Both chapter-chip badge states
- [x] Composited/translucent values re-checked against their real backdrop
- [x] No hardcoded hex or `rgba()` in components
- [x] Every variable present in all 8 themes; no orphans (43 then, 44 since
      `--title-font-bold-stroke`)

**Result:** 3 failures found and fixed (`d683a7a`). Sweep is clean.

## Phase 2 — Signed-out journey

| Surface                   | `/mobile` | `/frontend` | Notes                                       |
| ------------------------- | --------- | ----------- | ------------------------------------------- |
| Onboarding, 4 slides      | [x]       | [x]         | Also at max Dynamic Type; SE 45–49          |
| Auth — sign up            | [x]       | [x]         | `cc3fed1` — form moved onto --card-bg       |
| Auth — sign in            | [x]       | [x]         | Control tiers settled; no grey (2026-09-16) |
| Age verification          | [ ]       | [ ]         | Never rendered                              |
| Public profile as visitor | [x]       | [x]         | Also on the SE                              |
| Report dialog             | [x]       | [x]         | Rendered + submitted; finding 43            |

## Phase 3 — First run

- [x] Signup → confirmation email → age gate → empty journal → first entry — SE, 2026-09-18, by the owner on the re-created `nonoabc2345`; the entry was public and `moderate-content` logged `POST 200` from the app
- [ ] Empty state with and without the floating button
- [ ] `NewPasswordModal` via a recovery link

## Phase 4 — Core loop

| Surface                          | `/mobile` | `/frontend` | Notes                                                                                         |
| -------------------------------- | --------- | ----------- | --------------------------------------------------------------------------------------------- |
| Feed with entries                | [x]       | [x]         | classic + emo-dark; SE; feed end clearance 59                                                 |
| Composer                         | [x]       | [x]         | keyboard up, draft autosave; SE at max text (51)                                              |
| Composer preview                 | [x]       | [x]         | markdown verified                                                                             |
| Entry detail                     | [x]       | [x]         |                                                                                               |
| Entry edit + ⋮ menu              | [x]       | [x]         |                                                                                               |
| Delete confirm (`ConfirmDialog`) | [ ]       | [ ]         | Never rendered for delete (the rename confirm was)                                            |
| Chapter chips + filter           | [x]       | [x]         |                                                                                               |
| Reactions (`ReactionBar`)        | [x]       | [ ]         | Exercised on device for finding 36 — insert, relaunch, delete. Not yet looked at as a surface |
| YouTube card                     | [ ]       | [ ]         | Never exercised                                                                               |
| Long entry / many entries        | [ ]       | [ ]         | Only short entries and the overflow fixture; never a long feed                                |

## Phase 5 — Identity and settings

| Surface                         | `/mobile` | `/frontend` | Notes                                                         |
| ------------------------------- | --------- | ----------- | ------------------------------------------------------------- |
| Profile modal — profile tab     | [x]       | [x]         |                                                               |
| Profile modal — vibe tab        | [x]       | [x]         | theme picker; `/frontend` via Phase 7c                        |
| Profile modal — public page tab | [x]       | [x]         | `PublicPageSettings`; finding 27; SE, voice fixed (55)        |
| Avatar picker                   | [ ]       | [ ]         |                                                               |
| Settings                        | [x]       | [x]         | emo-dark; SE                                                  |
| Export data                     | [x]       | [x]         | SE, 2026-09-18: share sheet, JSON matched prod, cache cleared |
| Delete account confirm          | [x]       | [x]         | SE, 2026-09-18, `nonoabc2345` deleted with approval — 60, 61  |

## Phase 6 — Public and social

- [ ] Publish a page, view it signed out, view it as another account
- [ ] Report an entry end to end — the dialog was submitted (Phase 2) and both
      moderation actions ran on real reports (Phase 7), but the `notify-report`
      email has not been confirmed received as part of one run
- [ ] Block from a public profile
- [ ] Private chapter excluded from the public page — **verified against prod's
      `get_public_profile` on 2026-09-16** (0 entries served, then 1 after the
      rename), but not yet looked at as a signed-out visitor on the simulator

## Phase 7 — Moderation — **complete**

- [x] `ModerationView` queue rendered and audited — `6b34d0d`
- [x] **dismiss** — end to end on a real report, `325afd0`; the component
      remounted and `admin_list_reports` returned zero rows from prod
- [x] Empty state `~ nothing to review ~`
- [x] **hide entry** — end to end: report → `actioned`, the entry's
      `is_private` → true, retrodemo's public count 3 → 2, finding 34's footnote
      correctly absent. The entry was restored to public so retrodemo keeps
      three; the report stays `actioned` as the record

`ModerationView` is reachable whenever the admin account is signed in: deep-link
`#/report/<any well-formed uuid>` — `focusReportId` only highlights a row.

## Phase 7b — Overflow: what a legal maximum does to the layout

Every field below is a value the app **accepts**, so each is reachable by a real
user. The question is never "does it wrap" but **what gets pushed off,
truncated, or overlapped when it does.** Truncation is only acceptable where the
full value is reachable somewhere else.

| Field    | Limit                  | Where it renders                                                   |
| -------- | ---------------------- | ------------------------------------------------------------------ |
| title    | 200 chars              | feed card, entry detail header, edit header, public page, og:title |
| content  | 50,000 chars           | feed excerpt (truncated at 300), entry detail, preview             |
| chapter  | 100 chars              | chip, filter pill, metadata row, sidebar, chapter detail bar       |
| author   | 50 chars               | feed footer, metadata row                                          |
| mood     | 100 chars              | feed card, sidebar, profile                                        |
| status   | 100 chars              | header row, sidebar, public profile                                |
| music    | 200 chars              | feed card, YouTube card fallback, profile                          |
| username | per `USERNAME_PATTERN` | header, profile card, public URL, block button label               |

- [x] Title at 200 — feed card, detail header (edit header still to do)
- [x] Chapter at 100 — chip, metadata row and filter pill truncate; chip row
      scrolls horizontally. Filter pill photographed (finding 12)
- [ ] Author at 50 — feed footer
- [x] A single unbroken token — body copy wraps in card, detail and textarea
- [x] Status at 100 — public profile, 440pt: two lines, full width, no overflow.
      Set on the QA account and reverted; the limit is a live `CHECK` constraint
      confirmed against prod
- [ ] Long values at max Dynamic Type
- [ ] **Photograph a 100-char chapter truncating in `PublicPostCard`** (finding 21) — fixed with the pattern proven in `1266721`, verified in code only; no
      public account has a chapter that long

## Phase 7c — Hierarchy sweep — **complete**

The system settled on the entry detail, applied surface by surface with a
screenshot each — not a find-and-replace, because three of the four attempts on
that modal were wrong in a way only a screenshot showed. The system itself is in
`/frontend`.

| Surface                    | Looked at | Applied | Notes                                             |
| -------------------------- | --------- | ------- | ------------------------------------------------- |
| `PostCard`                 | [x]       | [x]     | `74c20b7` — findings 18, 19                       |
| `PublicProfileView`        | [x]       | [x]     | findings 20–24; 2 deferred                        |
| `ProfileModal`             | [x]       | [x]     | `b09d127` — findings 25, 26; all three tabs       |
| `SettingsModal`            | [x]       | [x]     | No findings — icons already correct               |
| `ModerationView`           | [x]       | [x]     | `6b34d0d` — findings 32, 33                       |
| `LoginForm` / `SignUpForm` | [x]       | [x]     | `cc3fed1` — findings 30, 31                       |
| `EmptyState`               | [x]       | [x]     | No findings — clean                               |
| `Sidebar`                  | [x]       | [x]     | `5728fa2` — findings 28, 29. **Not desktop-only** |

## Phase 8 — Adverse states — as complete as this rig allows

- [x] `ErrorMessage` — seen after a simulator reboot; recovery worked
- [x] `PostSkeleton` / `SidebarSkeleton` — captured; mirrors the real layout.
      Only visible during the splash crossfade, so colours not judged in isolation
- [x] `Toast` **error** — caught on device from a real failure; produced finding 35
- [~] `Toast` **success** — not photographed. Same component and positioning;
  only icon, colour and duration differ. Verified by reading
- [ ] `LoadingSpinner` in isolation — the native splash covers it
- [~] Rapid taps on reactions — **inconclusive.** The 400ms cooldown is a silent
  no-op by design, so two back-to-back taps netting zero fit both "both landed"
  and "neither landed", and tap timing is not controllable here. Code-verified
- [ ] Session expiry — fires only when a token _refresh_ fails; needs a session
      revoked from the Supabase dashboard
- [ ] Offline banner — needs a real device in Airplane Mode

## Phase 9 — Accessibility — **complete**

- [x] Dynamic Type at `accessibility-extra-extra-extra-large` — onboarding
- [x] Same across **feed, composer, settings, profile** at 440pt — nothing
      truncates, modal footers keep one row, the profile tabs fit, and
      `[data-text-scaled]` drops the title's ✨. At 375pt the composer footer
      wraps by design (finding 51)
- [x] Reduce Motion actually enabled — two frames 2s apart byte-identical;
      produced finding 37
- [x] Focus traps in every modal — `AuthModal`, `ConfirmDialog`, `PostModal`,
      `NewPasswordModal`, `ProfileModal`, `ReportDialog`, `SettingsModal`, plus
      `OnboardingFlow`
- [x] `aria-label` on every icon-only control, in plain English with no voice

## Phase 10 — Theme sweep — **complete**

One dense screen (feed with an entry) in each theme.

- [x] classic-xanga — finding 38
- [x] emo-dark
- [x] scene-kid — title 14.3:1 at its brightest stops
- [x] myspace-blue — finding 39. First reported clean because the sweep used the
      3:1 large-text bar; a phone's title needs 4.5
- [x] y2k-cyber — 7.70. The silver primary buttons are deliberate
- [x] cottage-core — headings 8.04 / 7.28
- [x] grunge — 5.82
- [x] pastel-goth — 7.82

## Phase 11 — iPhone SE (375 × 667pt) — **complete**

2026-09-16/17, time-boxed on request (small phones are a shrinking share).

- [x] Signed out: intro, sign-in with keyboard, public profile as a visitor,
      report dialog (opened and cancelled; prod confirmed no report). Findings 45–49
- [x] Signed in as `ldonald234`, including max Dynamic Type: entry view with the
      overflow fixture, composer with keyboard, Settings, all three profile tabs,
      `ConfirmDialog`. Findings 50–56

---

## Findings log

Severity per `/mobile`: **CRITICAL** rejection risk or dead feature ·
**HIGH** broken on a device · **MEDIUM** polish. Numbers 40–42 were never
assigned.

**59 findings, all fixed except 52** (left as is on purpose).

| #   | Sev      | Surface                  | Finding                                                                                                                                                                                                                                            | Status                                                 |
| --- | -------- | ------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------ |
| 1   | MED      | Chapter chips            | Active badge 3.61:1 on the default theme                                                                                                                                                                                                           | Fixed `df02d73`                                        |
| 2   | MED      | Auth screen              | `--link-color` 4.11:1 on the classic gradient, 4.14 on cottage-core                                                                                                                                                                                | Fixed `d683a7a`                                        |
| 3   | MED      | Links, emo-dark          | `--link-hover` darker than resting on a dark theme, 3.69:1                                                                                                                                                                                         | Fixed `d683a7a`                                        |
| 4   | MED      | Chapter chips            | Inactive badge 4.47:1 on emo-dark                                                                                                                                                                                                                  | Fixed `d683a7a`                                        |
| 5   | MED      | Header nav               | Home/Profile/New Entry identical, labels hidden on mobile                                                                                                                                                                                          | Fixed `52d94df`                                        |
| 6   | MED      | App-wide                 | 71 of 96 buttons had no pressed state                                                                                                                                                                                                              | Fixed `52d94df`                                        |
| 7   | HIGH     | App-wide                 | 8 `:hover` rules unguarded; marquee pause latched on tap                                                                                                                                                                                           | Fixed `47ff34d`                                        |
| 8   | MED      | Entry detail             | Chapter dressed as a filter chip — inert control in a real control's costume                                                                                                                                                                       | Fixed `c6c6696`                                        |
| 9   | HIGH     | Feed card                | `line-clamp-2` defeated by `flex` on the same element; a 200-char title ran 5 lines past the card padding                                                                                                                                          | Fixed `1266721`                                        |
| 10  | MED      | Entry detail             | A 200-char title squeezed `~ edit entry ~` into a 3-line, one-word column; header now stacked                                                                                                                                                      | Fixed `1266721` / `b7e67de`                            |
| 11  | MED      | Entry detail             | 100-char chapter ran off the right edge with no ellipsis — flex item without `min-w-0` — pushing date and author out of view                                                                                                                       | Fixed `1266721`                                        |
| 12  | HIGH     | Filter pill              | `chapter: <name>` had no width constraint and forced the **whole document** into horizontal scroll, clipping header, journal title and every card                                                                                                  | Fixed `b7e67de`                                        |
| 13  | MED      | App-wide                 | `.xanga-button-ghost` labels `--accent-primary`: 2.38:1 on a modal header gradient (3.20 cottage-core, 3.93 myspace-blue, 4.31 grunge). Now paints `--card-bg` beneath                                                                             | Fixed `b7e67de`                                        |
| 14  | MED      | Entry detail             | Action row hard left under the title at `gap-2` — read as one segmented control continuing the text block                                                                                                                                          | Fixed `3b0a718` / `8767deb`                            |
| 15  | MED      | Entry detail             | No middle tier: 20–24px title, 13px `.prose` body, 12px metadata — the entry read no louder than its byline. `.prose-reading` added                                                                                                                | Fixed `95aa9bb`                                        |
| 16  | MED      | Entry detail             | Four metadata facts at one size, weight and colour joined by `·`; separators orphaned onto a new line when the chapter wrapped                                                                                                                     | Fixed `83be72e`, refined `fca81c5` `4e8f90b` `4fa4c95` |
| 17  | MED      | Entry detail             | Corner sparkles were `✨`, which ignores `color` — the intended tint did nothing, pale gold on a cream band. Now `✦`                                                                                                                               | Fixed `1342690`                                        |
| 18  | MED      | Feed card                | Chapter is genuinely tappable but painted `--accent-primary` on the header gradient (2.38 classic-xanga, 3.13 myspace-blue, 3.20 cottage-core) with `hover:underline` as its only affordance on a platform without hover                           | Fixed `74c20b7`                                        |
| 19  | MED      | Feed card                | `📅` carried a dead `color: var(--accent-primary)` (emoji ignore colour); byline semibold in accent made the least consequential fact the loudest in the footer                                                                                    | Fixed `74c20b7`                                        |
| 20  | MED      | Public profile           | Entry chapter `--accent-primary` on the card header gradient — 2.38 classic-xanga, 3.13 myspace-blue, 3.20 cottage-core, 4.31 grunge. Not a control here, so it takes the `name` treatment: italic `--text-subtitle`, 4.51 worst case              | Fixed `abe31f8`                                        |
| 21  | MED      | Public profile           | Entry chapter had no `min-w-0`/`max-w`/`truncate` — a 100-char chapter overflows the card header. Same class as 11. `gap-y-0.5` also collapsed the band's rows once it wrapped                                                                     | Fixed `abe31f8`                                        |
| 22  | MED      | Public profile           | No middle tier: 18px title over 14px body over 12px chrome, with the body on neither the scanning nor the reading step. Now `.prose-reading` + `text-xl`                                                                                           | Fixed `abe31f8`                                        |
| 23  | MED      | Public profile           | The marquee used `.marquee`, **a class defined nowhere in `index.css`** — on the most visitor-facing screen it never scrolled or clipped and wrapped onto two static lines                                                                         | Fixed `abe31f8`                                        |
| 24  | MED      | Public profile           | Action row at `gap-2` put a bold underlined caution link 8px beneath a filled primary button, on three wrapped rows                                                                                                                                | Fixed `abe31f8`                                        |
| 25  | MED      | ProfileModal             | Eleven section headings rendered three ways — retro icons, Pepicons, bare. Pepicons mark controls, so these were the control system doing a section's job                                                                                          | Fixed `b09d127`                                        |
| 26  | MED      | ProfileModal             | `status message` and `emoji style` carried the _same_ stars glyph, so the icon encoded nothing                                                                                                                                                     | Fixed `b09d127`                                        |
| 27  | MED      | Public page tab          | `private by default` rendered as a bordered, rounded, filled, bold span a thumb's width above a real button — an inert status dressed as a control, third time after finding 8 and the public profile's stat pills                                 | Fixed `b09d127`                                        |
| 28  | MED      | Sidebar                  | Expanded, the summary row repeated the card beneath it — the identity three times in the top third, permanently for anyone who expands once (it persists)                                                                                          | Fixed `5728fa2`                                        |
| 29  | MED      | Sidebar                  | `About Me`, `Stats`, `📖 Chapters`, `Current Mood:`, `Entries:` in Title Case against ~14 lowercase headings elsewhere                                                                                                                             | Fixed `5728fa2`                                        |
| 30  | MED      | Auth screen              | `Input`'s label is `--accent-primary` and the form sat bare on the auth gradient: **4.11 classic-xanga, 4.14 cottage-core** — finding 2's numbers, which `d683a7a` fixed for `--link-color` only. Form now sits on `--card-bg` (4.82 worst)        | Fixed `cc3fed1`                                        |
| 31  | MED      | Auth screen              | Header read `Welcome Back` directly above a heading reading `~ welcome back ~`; both tabs Title Case too                                                                                                                                           | Fixed `cc3fed1`                                        |
| 32  | MED      | ModerationView           | Date was `toLocaleDateString()` — so the open report read `8/10/2026`: 8 October in most of the world, 10 August in the US                                                                                                                         | Fixed `6b34d0d`                                        |
| 33  | MED      | ModerationView           | No middle tier: below a text-xl heading everything was `text-xs` except one `text-sm` line, the reported entry included                                                                                                                            | Fixed `6b34d0d`                                        |
| 34  | MED      | ModerationView           | With the queue empty, the "hiding an entry makes it private" footnote sat under `~ nothing to review ~`, explaining an action the screen no longer offered                                                                                         | Fixed `325afd0`                                        |
| 35  | MED      | Toast / feed             | Toast and the floating `new entry` button were bottom-anchored ~0.5rem apart, so the toast (z-100, pointer events on) swallowed taps aimed at the button for the 5s an error toast lasts                                                           | Fixed `b9832aa`                                        |
| 36  | **HIGH** | Reactions                | **Reactions never worked.** `42P17` infinite recursion — the INSERT policy rate-limited by selecting from the table it guards. Count moved into a `SECURITY DEFINER` function                                                                      | Fixed, applied to prod                                 |
| 37  | MED      | App-wide                 | `MotionConfig reducedMotion="user"` sat inside the main return, so `AuthModal`, `PublicProfileView`, `ModerationView` and `AgeVerification` (early returns) ignored Reduce Motion — including the first screen a user sees                         | Fixed `7270da9`                                        |
| 38  | **HIGH** | Feed card, classic-xanga | `.xanga-title` (`#e5007c`) on the header gradient: **2.20:1**. A phone renders it at 18px bold, under WCAG's 18.66px cutoff, so the bar is **4.5:1**                                                                                               | Fixed `df7aee1`                                        |
| 39  | **HIGH** | Feed card, myspace-blue  | Same pairing, **4.00:1** — missed by a Phase 10 sweep run against 3:1. Title lightened, since it is a dark theme                                                                                                                                   | Fixed `df7aee1`                                        |
| 43  | MED      | ReportDialog             | The confirmation promised "...**and can ban repeat offenders**" — prod has no ban. A promise the product cannot keep, in copy App Review reads                                                                                                     | Fixed `96af7a4`                                        |
| 44  | MED      | Public profile           | The card was a 96pt avatar beside a 400pt column — a third of it an empty strip, and the mood/music panel squeezed to ~230pt. Identity row now holds name and handle only; everything else is full width                                           | Fixed `a2c1df1`                                        |
| 45  | **HIGH** | App-wide, every iPhone   | Content scrolled under the transparent status bar — an entry's date drawn over "9:41". Now a blur-only `body::before` strip, pixel-identical at rest                                                                                               | Fixed `09dc20e`                                        |
| 46  | MED      | Public profile, feed     | Two footers said "powered by YourJournal"; now Retrowave Journal                                                                                                                                                                                   | Fixed `09dc20e`                                        |
| 47  | MED      | Dialogs                  | `ConfirmDialog` and `ReportDialog` cancel buttons were `--text-muted`, against the no-grey rule. Now `.xanga-button-ghost`                                                                                                                         | Fixed `09dc20e`                                        |
| 48  | MED      | Intro, short screens     | Slide 4's empty-journal preview started ~100pt below the fold with nothing saying it scrolled. The intro compacts below 700pt of height                                                                                                            | Fixed `09dc20e`                                        |
| 49  | MED      | Intro + age gate, SE     | Header flush against the SE's 20pt status bar. `.safe-area-top` now adds room on home-button iPhones only                                                                                                                                          | Fixed `09dc20e`                                        |
| 50  | **HIGH** | Feed                     | The floating "new entry" button vanished after signing in until the app restarted — `showAuthModal` was never cleared once a user was present                                                                                                      | Fixed `ffb85b5`, confirmed on device 2026-09-17        |
| 51  | **HIGH** | Composer, SE             | Footer buttons clipped at both edges at max Dynamic Type on 375pt. The row wraps now                                                                                                                                                               | Fixed `ffb85b5`                                        |
| 52  | MED      | Feed, SE                 | The feed reads through a ~105pt slot at rest, because it is its own scroll container below a tall header                                                                                                                                           | **Not fixed, on purpose** — see the handoff            |
| 53  | MED      | Feed, SE                 | "find old entries" broke mid-word at max text because the count beside it would not shrink. The row wraps now                                                                                                                                      | Fixed `ffb85b5`                                        |
| 54  | MED      | App-wide                 | `font-bold` in the title font rendered regular on classic-xanga at 29 more sites. All now `.title-bold`                                                                                                                                            | Fixed `ffb85b5`                                        |
| 55  | MED      | Public page tab          | The tab and its publish dialog did not use the voice                                                                                                                                                                                               | Fixed `ffb85b5`                                        |
| 56  | MED      | `ConfirmDialog`          | Wrapped titles orphaned their closing `~`; now `text-wrap: balance`                                                                                                                                                                                | Fixed `ffb85b5`                                        |
| 57  | MED      | Sidebar                  | "current mood:" and the mood sat on two rows; now one row that wraps                                                                                                                                                                               | Fixed `c0c1a15`                                        |
| 58  | MED      | Feed search card         | The collapsed "find old entries" card always rendered its empty filter-chip container, adding 12pt of dead margin                                                                                                                                  | Fixed `c0c1a15`                                        |
| 59  | MED      | Feed                     | The floating "new entry" button could sit over the last post's reactions with nothing left to scroll — the feed's own box never got the page's clearance. Previously dismissed; your screenshots showed it. Feed now ends in `.feed-fab-clearance` | Fixed `d1dbacb` / `fbb4840`                            |

| 60 | **CRITICAL** | Account deletion | **Deleting an account failed for every user.** Prod's `profiles_id_fkey` was NO ACTION though the migrations declare CASCADE, so `delete_user_account` raised 23503 and rolled back. Guideline 5.1.1 | Fixed `58275a8`, applied to prod, verified by deleting `nonoabc2345` |
| 61 | MED | Account deletion | A successful deletion ended on "~ ur session expired, sign in again ~" beside the farewell — the modal signed out directly, which `useAuth` reads as an expired session. A failure showed "references a record that does not exist" | Fixed `abacd08`, seen on the SE 2026-09-18 |
| 62 | MED | Outline buttons | Six dotted-outline buttons labelled in `--text-body`: Settings export and close, both cancels, dismiss, unpublish. Now `.xanga-button-ghost` | Fixed `4aed4fb` |

Findings 45–62 lifted the count from 41 to 59 (numbers 40–42 unassigned).

### Findings 38 and 39 — card titles on the header gradient

Fixed by moving the token, per your call — `#e5007c` → `#7d1a4d` on
classic-xanga (4.77 gradient / 9.87 card-bg) and `#3399ff` → `#66b2ff` on
myspace-blue, a dark theme, so lighter (5.25 / 8.31). **All eight themes now
clear 4.5 on both surfaces; worst value anywhere is 4.53.** Only the title text
moved; the accent still fills chips, buttons, borders and the FAB.

Both findings nearly shipped a still-failing value: a candidate was costed at
4.17 against 3:1, two paragraphs after establishing the bar was 4.5, and the
Phase 10 sweep also used 3:1. **State the threshold once, then compare against
that number every time.**

### Finding 36 — reactions never worked

    42P17: infinite recursion detected in policy for relation "post_reactions"

Caught by temporarily replacing `toUserMessage` with the raw error — the generic
toast is what hid this for two months. The INSERT policy counted the caller's
recent rows in the table it guards, so evaluating it re-entered the table's
SELECT policy; Postgres raised and no insert ever landed. Fixed in
`20260901000000_fix_post_reactions_policy_recursion.sql`: the count moved into a
`SECURITY DEFINER` function that takes the user id as an argument, so it cannot
count another user. Verified end to end on device.

Ruled out on the way, so nobody re-walks them: the ownership clause, the block
check, the rate limit genuinely tripping, the emoji `CHECK` (codepoint-identical,
`❤️` is `U+2764 U+FE0F` on both sides), column drift, a duplicate key.

### Cold-launch deep link — `0a3db5c`

Recorded for the **method**. `getLaunchUrl()` is async and set the hash between
the initial render reading it and the `hashchange` listener attaching; retrying
the same URL then hit `routeDeepLink`'s identical-hash bail. Isolated with
`#/u/<name>`, which shares the router and listener but needs no auth, so a
failure could only be the mechanism. Four results, one explanation: cold fails;
warm same hash fails; warm different hash works; cold works after the fix. One
run was contaminated (the app had been signed out) and was discarded, not
counted.

---

## Dismissed — looked at, deliberately not filed

| Surface                             | Impression                         | Why dismissed                                                                                                                                                                                                                              |
| ----------------------------------- | ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| scene-kid title                     | Looked muddy                       | Measured **14.3:1** at its brightest stops. The muddiness is `.xanga-title`'s retro text-shadow doing its job                                                                                                                              |
| cottage-core headings               | Looked muddy                       | Measured **8.04** and **7.28**                                                                                                                                                                                                             |
| `EmptyState` date                   | `toLocaleDateString('en-US', ...)` | Looks like finding 32 and is not: this is the diary-page header, where the long form is the point and pinned `en-US` makes it unambiguous. Do **not** convert it to `formatDate`                                                           |
| Entry detail metadata               | "The metadata colours are wrong"   | A misdiagnosis. The flatness was a missing size tier, not colour; fixing colour first (`83be72e`) had to be partly reversed in `95aa9bb`                                                                                                   |
| `AgeVerification`                   | No focus trap, no `role="dialog"`  | It is a top-level early return with nothing behind it for focus to escape to. A trap would be redundant and `dialog` semantically wrong                                                                                                    |
| Floating button over a card at rest | Covers a sixth reaction mid-feed   | A scroll moves it, and at max Dynamic Type the bar wraps clear. The one place scrolling could not free it — the **last** post — was finding 59. The toast overlap was filed (35) because a transient that steals taps cannot be moved away |

## Deferred — seen, not filed

| Surface        | Observation                                                                                                     | Why deferred                                                                                                |
| -------------- | --------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| Public profile | `~ report entry ~` gets its own full-width footer bar on every card — on a stranger's page, the loudest control | A Guideline 1.2 compliance control; not worth re-tiering a reporting affordance for style before submission |
| Public profile | `start your own journal` appears twice — in the profile card and the footer CTA card                            | Removing a conversion CTA is a product decision, not a hierarchy fix                                        |

## Blocked — cannot be reached from this session

| Surface              | Needs                                                                                             |
| -------------------- | ------------------------------------------------------------------------------------------------- |
| Sidebar stats labels | ≥1024px (`hidden lg:block`); the phone is 440pt, so finding 29's fix there is verified by reading |
