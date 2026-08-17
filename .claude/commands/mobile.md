# Mobile Agent

Audit and improve the app for iPhone responsiveness and iOS native quality.

Read `CLAUDE.md`, then `.claude/docs/gotchas.md` (Mobile & iOS + iOS layout
sections) and `.claude/docs/false-positives.md` before filing anything.

**The one rule that matters most here:** a finding about native behaviour is not
verified until it has been seen on the simulator. `initCapacitor()` returns early
off native, so `--keyboard-inset` is permanently `0px` in jsdom and in the
browser — the whole class of bug this skill exists to catch is invisible to the
test suite by construction. See `prove-it-works` in the review principles.

---

## Phase 1 — Verify on the simulator first

Do this before reading code. Half of what looks wrong in source is already
handled, and half of what looks fine is broken on device.

```bash
UDID=296A830B-AE5D-4123-9A94-5E676FEAD090   # iPhone 17 Pro Max, the 6.9" store device
xcrun simctl boot $UDID
npm run build && npx cap sync ios
```

Build with the iOS simulator build tool, install, launch, and attach the panel.
Then drive the states that only exist on device:

| What to exercise                              | Why source cannot tell you                                       |
| --------------------------------------------- | ---------------------------------------------------------------- |
| Composer + profile modal with the keyboard up | `--keyboard-inset` is 0 everywhere else                          |
| Dynamic Type at the accessibility sizes       | iOS does not scale WKWebView text; only `dynamic-type.ts` does   |
| Reduce Motion on                              | CSS + `MotionConfig` + `lib/motion.ts` are three separate layers |
| A deep link arriving while the app runs       | `detectSessionInUrl` has already run by then                     |

CLI levers, all of which need the app relaunched afterwards (it only re-reads on
foreground) and all of which must be **restored when done**:

```bash
xcrun simctl ui $UDID content_size accessibility-extra-extra-extra-large  # NOTE: underscore
xcrun simctl spawn $UDID defaults write com.apple.Accessibility ReduceMotionEnabled -bool true
xcrun simctl status_bar $UDID override --time "9:41" --batteryLevel 100 --cellularBars 4 --wifiBars 3
xcrun simctl openurl $UDID "com.retrowave.journal://#error=access_denied&error_code=otp_expired"
```

Read the current value first (`content_size` with no argument) and put it back.
The hyphenated `content-size` prints usage and exits 117 without doing anything.

**Verification traps that cost real time:**

- The simulator's **hardware keyboard** setting suppresses the software keyboard,
  so keyboard-open geometry cannot be screenshotted while it is on (⇧⌘K).
- The **browser pane cannot verify anything behind `AnimatePresence`**. Its tab
  reports `visibilityState: "hidden"`, so rAF is throttled and animations freeze
  mid-flight — an entrance stalls at partial opacity and `mode="wait"` never
  completes its swap, which renders as a convincing phantom bug.
  `read_page` reporting `Viewport: 0x0` is the giveaway.
- A toast auto-dismisses in 2.5s. Trigger and capture in one shell command
  (`xcrun simctl io … screenshot`) rather than round-tripping.

---

## Phase 2 — Responsiveness

| Device            | Width | Why it is in the list                             |
| ----------------- | ----- | ------------------------------------------------- |
| iPhone SE         | 375pt | Smallest supported. Stress test for modal scroll. |
| iPhone 15/16      | 390pt | Most common.                                      |
| iPhone 17 Pro Max | 440pt | The device the App Store screenshots ship from.   |

### Rules

- Touch targets **44pt minimum**: `min-h-[44px] lg:min-h-0`. Never a bare
  `min-h-[36px]` — but check before filing: `min-h-[44px] lg:min-h-[36px]` is
  correct, and a small `<input>` inside a `min-h-[44px]` row with a clickable
  `flex-1` label is also correct.
- Input font: **`max(1rem, 16px)`**, never a flat `16px`. Below 16px iOS Safari
  auto-zooms on focus; an absolute unit does not follow the root scaling that
  carries Dynamic Type, which froze every field while its label grew.
- Text sizes: named Tailwind scale first, arbitrary **rem** where no named step
  fits (`text-[0.6875rem]`). Never arbitrary **px** on anything text-bearing —
  Tailwind emits it literally and it ignores root scaling.
- Nothing text-bearing below **11px**.
- `100dvh` is fine; the modal system already accounts for browser chrome.

### Breakpoints

480px (custom CSS in `index.css`), 640px `sm:`, 1024px `lg:` (sidebar becomes
fixed). Note the gap the responsive foundation still has: a 430–440pt phone sits
above the 480px "phone" rules and below every `sm:`, so it receives neither on
some surfaces. Worth a finding only with a concrete victim.

### Modals

Owned by `.modal-overlay-safe` (pads by the keyboard inset) and
`.modal-panel-safe` (subtracts it). **These two are not a double-count** — they
agree by construction. Nothing inside the panel may apply the inset again; it was
applied at four levels once and the composer's textarea collapsed to zero height.

A modal frame must be `flex flex-col` with a `flex-1 min-h-0` body, or it cannot
absorb the shortening and its footer is clipped out of the `overflow-hidden`
panel. Copy PostModal / ProfileModal for any new one.

### Touch patterns

| Pattern          | Implementation                                                     |
| ---------------- | ------------------------------------------------------------------ |
| Swipe-to-dismiss | `drag="x"` + `SWIPE_DISMISS_THRESHOLD` (80, in `lib/constants.ts`) |
| Haptics          | `hapticImpact()` from `lib/capacitor.ts`                           |
| Tap feedback     | `whileTap={{ scale: 0.95 }}`                                       |

Swipe guards: never during save (`!saving`), never during initial profile setup.

---

## Phase 3 — App Store compliance

| Guideline               | Requirement                               | Where it lives                                                                                                                                    |
| ----------------------- | ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1.2 (UGC)               | Reporting, moderation, age gate, blocking | `reportPublicPost()` → `content_reports` row → webhook → `notify-report` → Resend, plus an in-app moderation queue; COPPA 13+ gate; `user_blocks` |
| 4.2 (Min functionality) | Not a thin wrapper                        | Haptics, share sheet, deep links, status bar, swipe gestures                                                                                      |
| 5.1.1 (Data)            | Account deletion + export                 | `delete_user_account` / `export_user_data` RPCs                                                                                                   |
| 5.1.2 (Privacy)         | Policy + terms                            | `public/privacy.html`, `public/terms.html`                                                                                                        |

**Reporting must write a row, never open a `mailto:`.** A `mailto:` anchor is a
silent no-op in the WKWebView on any device without a configured Mail account —
no record, no confirmation, nothing for App Review to observe. This is the exact
failure mode `reporting.ts` was rewritten to remove.

### iOS integration facts

- Keyboard resize mode is **`none`** (`KeyboardResize.None`, and `resize: 'none'`
  in `capacitor.config.ts`). The app positions itself against `--keyboard-inset`;
  letting WKWebView resize instead fights it.
- `contentInset: 'never'` is load-bearing — the app pads for the notch itself via
  `env(safe-area-inset-*)` + `viewport-fit=cover`.
- Safe areas have **one owner per edge**: the shell applies the inset, descendants
  use ordinary spacing. Two elements applying the same `env()` for the same reason
  is the bug, not the pattern.
- Capacitor plugins are **statically imported** in `lib/capacitor.ts`. Every native
  call is guarded by `isNativePlatform`.
- Keyboard listeners register through `requiredNative`, which logs on failure.
  `nativeOnly` swallows errors and is correct only for optional flourishes.
- Portrait-only in `Info.plist` is deliberate and Apple-sanctioned.

### Visual hierarchy — look at the screenshot, not just the rules

The measurable checks above pass on screens that still read badly. Take a
screenshot of each state and ask:

- **Do two controls that do different things look identical?** Sign-in had
  "~ or use a magic link ~" and "~ forgot ur password? ~" stacked in the same
  link style. One is another way to do what you came for; the other is what you
  reach for when that failed. Rendered as peers they read as a list of equal
  options and you have to read both to find the one you want. Rank them: keep
  the primary alternative styled as a link, make the fallback quieter and set it
  apart.
- **Is anything offering the same action twice?** The empty journal had "write
  ur first entry" in the card _and_ a floating "new entry" button — on a phone
  the floating one lands on top of the card it duplicates. A desktop layout can
  absorb that; 390pt cannot.
- **Does a fixed-position element cover content?** Anything `fixed` with a
  `bottom` is a candidate — FABs, toasts, banners. Check it against the shortest
  screen, not the tallest.
- **Does anything look tappable that isn't — or tappable that is?** This theme
  makes it easy to get wrong: `--link-color`, `--text-title` and
  `--accent-primary` are all the same red family, so colour alone says "text",
  not "control". The signals that actually carry are the **underline** on
  `.xanga-link` and the **solid fill** on `.xanga-button`. A bordered, filled,
  rounded span has neither and still reads as a chip — the public profile had
  two of those sitting inches from real controls, saying "3 public entries" and
  "writing since 2026", tappable-looking and inert. Anything with border +
  radius + background is a control or should stop dressing like one.
- **Does this information earn its space on a 390pt screen?** Ask what decision
  it supports. A count you can confirm by scrolling two inches, or a year that
  reads the same on every profile in the app, is not free — it occupies the
  region right below the identity, which is the most valuable space on the page.
  Static facts belong in plain text; the pill treatment should be reserved for
  things you can act on.
- **Is the emphasis where the task is?** The retro maximalism is the product and
  is not the target here — the question is whether the one thing a person came
  to do is the loudest thing on the screen.

These are judgement calls, so a finding needs a screenshot and a sentence about
which decision the reader is being asked to make. "Looks cluttered" is not one.

### Accessibility

`<MotionConfig reducedMotion="user">` (App.tsx) covers framer; the
`prefers-reduced-motion` block in `index.css` covers all 12 `@keyframes`;
`prefersReducedMotion()` in `lib/motion.ts` covers hand-built DOM. **All three
exist — do not file Reduce Motion as missing.** Also: `aria-label` on icon-only
buttons, `aria-pressed` on toggles, focus traps via `useFocusTrap`, and no
alpha-channel colours for text on dark themes.

Not yet present: Associated Domains / `apple-app-site-association`, so Password
AutoFill cannot associate the app with `retrowaveblog.com` and email links cannot
be universal links. Both are blocked on Apple Developer enrolment.

---

## Phase 4 — Gate

```bash
npx tsc --noEmit && npm run lint && npm run build && npm run test
```

Watch the test **count**, not just red/green — CI silently ran 241 of 265 for over
a week. Never leave `npm run dev` running as evidence of anything native.

---

## Output

**CRITICAL** — App Store rejection risk, or a user-facing feature that does
nothing on device.
**HIGH** — Broken or unusable on a specific iPhone.
**MEDIUM** — Polish.

Each finding needs a file:line, a concrete failure (device + state → wrong
result), and how it was verified. If it was only read, say so.

Check `.claude/docs/false-positives.md` first. Standing dismissals include:
`Style.Dark` on dark themes (the enum names the background), the overlay/panel
inset pair, ~43.3px touch targets measured through a Framer transform, the Winamp
transport buttons, `w-full` buttons, portrait-only, and Reduce Motion.

## Cross-domain

Touch targets / CSS → `/frontend`. New Capacitor plugins → `/feature`. RPC types
behind mobile UI → `/fullstack`. New modals → `/frontend`.

## Learnings

Append to the relevant topic doc under `.claude/docs/` (usually `gotchas.md`),
not to `learnings.md` — that file is a routing index only:

```
- [YYYY-MM-DD /mobile] One-line finding
```
