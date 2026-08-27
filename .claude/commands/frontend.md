---
name: frontend
description: The design system — Xanga identity, copy voice, the 8-theme variable system, CSS class vocabulary, and contrast. What the UI should look like, on web and native alike.
---

# Frontend Agent

**Scope: what the UI should look like.** Identity, voice, theme variables, class
vocabulary, contrast.

**Not this skill:** anything about behaving correctly on a phone — simulator
verification, touch targets, Dynamic Type mechanics, safe areas, App Store rules
— is `/mobile`, which owns the breakpoint table too. Runtime cost, lifecycle and
storage are `/ios`. This skill also covers the **web** app at
retrowaveblog.com, which `/mobile` does not.

Read `CLAUDE.md` first, then `.claude/docs/gotchas.md` and
`.claude/docs/theming.md`.

---

## Look at it. Every time.

Green tests are not evidence a UI change worked, and neither is a clean build.
Every visual bug in this project's history was found by looking: a toast Framer
re-centred out of position, a floating button parked over the empty state, an
accent colour failing contrast on two themes, a privacy state asserted six times
on one screen. None of it turned a test red.

- On native, screenshot it — the procedure is in `/mobile`.
- On web, `npm run dev` and look at the actual page.
- **Never judge animation in the agent's browser pane.** It reports
  `visibilityState: "hidden"` and throttles `requestAnimationFrame`, so
  transitions freeze or stutter for reasons that do not exist anywhere else.
  This has already produced phantom bug reports. Judge motion on the simulator.

---

## Design identity

A 2005 Xanga/LiveJournal nostalgia blog. Every decision should read like a
teenager's personal page from the mid-2000s.

- **Maximalist** — gradients, dotted borders, sparkles, tildes
- **Personal** — Comic Sans, emoji, abbreviated internet slang
- **Fun** — cursor sparkles, animated reactions, spring physics
- **Themed** — 8 wildly different palettes, the user's choice

**Anti-patterns:** clean sans-serif type, flat design, muted palettes, corporate
button styles, professional copy ("Submit", "Continue", "Get Started").

## Copy voice

| Instead of | Write |
| ---------- | ----- |
| you        | u     |
| your       | ur    |
| to         | 2     |

Action labels take tildes — `~ save entry ~`. Headings take sparkles —
`✨ My Journal ✨`.

**Never in:** `aria-label`, `alt`, `toUserMessage()` output, code comments. Screen
reader users and future maintainers get plain English.

---

## The theme system

**8 themes × 43 CSS variables each**, in `src/lib/themes.ts`. Every colour must
come from a variable. A hardcoded colour is invisible in the theme you wrote it
in and wrong in the other seven.

```tsx
// Tailwind cannot read CSS variables — themed colours go inline.
<span style={{ color: 'var(--text-muted)' }} />
```

Derived shades use `color-mix` rather than a new variable:

```css
background: color-mix(in srgb, var(--accent-secondary) 15%, var(--card-bg));
```

### Adding a variable

1. Default in `:root` in `src/index.css`
2. **All 8 themes** in `src/lib/themes.ts` — a missing one falls back to
   `initial` silently, which usually renders as black or transparent
3. Re-run the contrast sweep below

### Contrast: sweep it, don't eyeball it

WCAG AA is 4.5:1 for body text, 3:1 for large text. This project has shipped
failures more than once — `--accent-secondary` was 3.9:1 on emo-dark and 4.1:1 on
cottage-core while looking perfectly fine to the eye. Compute it:

```bash
python3 - <<'PY'
import re
src = open('src/lib/themes.ts').read()
def lum(h):
    h = h.lstrip('#'); r, g, b = [int(h[i:i+2], 16) / 255 for i in (0, 2, 4)]
    f = lambda c: c / 12.92 if c <= 0.03928 else ((c + 0.055) / 1.055) ** 2.4
    return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b)
def ratio(a, b):
    l1, l2 = sorted([lum(a), lum(b)], reverse=True)
    return (l1 + 0.05) / (l2 + 0.05)

FG, BG, MIN = '--text-subtitle', '--card-bg', 4.5   # <- edit these
for m in re.finditer(r"id: '([a-z0-9-]+)',", src):
    seg = src[m.end():m.end() + 4000]
    if 'variables: {' not in seg: continue
    v = dict(re.findall(r"'(--[a-z-]+)': '(#[0-9a-fA-F]{6})'",
                        seg.split('variables: {')[1].split('\n    },')[0]))
    if FG in v and BG in v:
        r = ratio(v[FG], v[BG])
        print(f"  {m.group(1):16s} {r:5.2f}{'  <-- FAILS' if r < MIN else ''}")
PY
```

Only handles hex pairs — a `color-mix()` value has to be checked in the browser.

---

## CSS vocabulary

Defined in `src/index.css`; read it before inventing anything.

`.xanga-box` `.xanga-button` `.xanga-link` `.xanga-link-caution` `.xanga-title`
`.xanga-subtitle` `.xanga-border` `.xanga-border-solid` `.xanga-auth-bg`
`.icon-btn-hover`

### Link tiers — not every link is the same link

One colour for every clickable thing gives a screen no hierarchy. Three tiers:

| Tier      | Use                      | Treatment                                                       |
| --------- | ------------------------ | --------------------------------------------------------------- |
| Primary   | the main action          | `.xanga-button`, solid accent fill                              |
| Secondary | supporting action        | `.xanga-button-ghost`, accent text, dotted border, no fill      |
| Tertiary  | incidental               | bare accent icon or text, no border, no fill                    |
| Link      | ordinary navigation      | `.xanga-link`, `var(--link-color)`                              |
| Caution   | destructive or reporting | `.xanga-link-caution`, `var(--link-caution)`, bold + underlined |

**Hierarchy is carried by how much accent an element deploys, never by draining
the accent out of it.** A quieter tier means less fill and less border — not
grey. `--text-muted` is body copy, not a way to say "less important": muted
palettes are on the anti-pattern list at the top of this file, and reaching for
grey to signal subordination is the corporate-design reflex this app exists to
avoid. Every tier above sits at 4.82:1 or better on `--card-bg`.

A row of same-shaped buttons in the same colour also reads as one
undifferentiated group however the icons differ — Home, Profile and New Entry
were all `.xanga-button`, and on mobile the labels are hidden, so the nav was
three interchangeable magenta squares.

### Hierarchy needs a middle tier

The most common failure here is not too little contrast — it is a scale with
only two steps. One big heading and then everything else at roughly the same
small size reads as flat no matter how the small things are coloured.

The entry detail had a 20–24px title, **13px** body copy and 12px metadata: the
thing the person actually wrote carried no more weight than the byline beside
it. Adding colour and weight to the metadata made it worse, because four items
each asking for attention is the _absence_ of hierarchy, not a version of it.

Aim for **one not-so-big thing, something medium, then the small stuff**:

| Tier     | Where                         | Size            |
| -------- | ----------------------------- | --------------- |
| Heading  | title                         | `text-xl`/`2xl` |
| Reading  | entry body — `.prose-reading` | `1rem`          |
| Scanning | feed excerpts — `.prose`      | `0.8125rem`     |
| Chrome   | metadata, counts, hints       | `text-xs`       |

A feed excerpt stays small on purpose — a list is for scanning, a detail view is
for reading. Those are different jobs and should not share a size.

**Size separates tiers; weight and slant separate things inside one.** Once a
band is clearly subordinate by size, bold, italic and underline are the right
tools within it — they differentiate without pulling rank, because they do not
change how loud the band is relative to the content.

The rule is that each treatment must **encode a kind**, consistently:

| Treatment | Means                       | Example                      |
| --------- | --------------------------- | ---------------------------- |
| regular   | plain context               | the date, the byline         |
| **bold**  | a status or state           | `private` / `public`         |
| _italic_  | the name of a thing         | a chapter name, a song title |
| underline | a link — nothing else, ever | `.xanga-link`                |

Applied without a rule, weight inside a band is noise; applied consistently it
is what makes the band scannable. What does _not_ work is reaching for a second
size or a darker colour inside a band that is already the right size — that is
how four facts end up each demanding attention, which is the absence of
hierarchy rather than a version of it.

**Colour should encode the same kinds, not a fourth system.** Use it — a band
that varies only in weight is doing hierarchy with one hand. But map it onto the
kinds above so the signals reinforce each other and a reader learns one system
rather than three:

| Kind    | Weight  | Slant  | Colour                                                                   |
| ------- | ------- | ------ | ------------------------------------------------------------------------ |
| context | regular | roman  | `--text-muted`                                                           |
| status  | bold    | roman  | `--text-body`, or `--accent-primary` when it is the state worth noticing |
| name    | regular | italic | `--text-subtitle`                                                        |

`--text-muted`, `--text-body`, `--text-subtitle` and `--accent-primary` all
clear 4.5:1 on `--card-bg` across the eight themes — worst case 4.82. Sweep
again if you reach for anything else, and remember a colour verified on one
surface is not verified on another: the same accent that passes on `--card-bg`
measured 2.38 on a modal header gradient.

### Space is a material — use it

A cramped layout is a defect, not a neutral choice. The instinct to pack things
tightly comes from treating space as waste; it is the thing that makes a group
read as a group and a control read as separate from the text above it.

- **A modal is bounded real estate — spend it.** It already limits itself to a
  panel, so there is no reason to crowd inside that panel. Between a heading and
  the actions under it, `mt-8` reads as a deliberate break; `mt-3` reads as the
  buttons being part of the paragraph.
- **Give related controls room from each other.** Two buttons at `gap-2` read as
  one segmented control. At `gap-4` they read as two choices.
- **Check the gap on the screenshot, not in the class name.** `gap-2` looks
  generous in source and cramped at 440pt.

Where a screen genuinely has too much to fit, the fix is to remove something —
see the privacy state that was asserted six times in the editor — not to tighten
the spacing until it all squeezes in.

### Hover and press

Both are handled globally in `index.css`; a new button needs nothing added.

- **Every `:hover` rule must sit inside `@media (hover: hover) and (pointer: fine)`.**
  Without it iOS applies hover on tap and leaves it applied — the control stays
  lit until you touch something else, which reads as stuck rather than as
  feedback.
- **Press feedback is global and blooms, it does not dim.** `button`,
  `[role="button"]` and `a` get `filter: saturate(1.6) brightness(1.08)` plus
  `transform: scale(0.96)` on `:active`; bare controls also wash in an 18%
  accent fill. Fading a control out on press is the generic
  component-library reflex and reads as the control leaving — on a maximalist
  page the press should be the loudest that control ever gets.
- **Why `filter` and not `color`/`background`:** nearly every button here is
  coloured by an inline `style` from a theme variable, and inline beats a
  stylesheet. Filter and transform are set by neither, so one rule reaches all 96. Saturation also preserves meaning — a caution link gets more amber rather
  than turning into the accent.
- `whileTap={{ scale: 0.95 }}` is still worth adding to significant controls,
  but it is no longer the only thing standing between a button and silence.
  71 of 96 buttons had neither before this was made global.

`--link-caution` is amber (`#b45309` light / `#ffb347` dark) and clears 4.5:1 on
all 8 themes. Use it for delete and report, never for ordinary navigation.

### Motion

- Framer springs, not durations: `{ type: 'spring', stiffness: 300, damping: 25 }`
- `whileTap={{ scale: 0.95 }}` on interactive elements
- Reduce Motion is already handled on **both** sides, and a new animation needs
  nothing added for it:
  - `MotionConfig reducedMotion="user"` covers everything Framer drives.
  - `index.css` has a global `@media (prefers-reduced-motion: reduce)` block
    that neutralises `animation-duration`, `animation-iteration-count` and
    `transition-duration` on `*` with `!important`.

  Writing a per-animation `prefers-reduced-motion` rule is redundant. Add one
  only when an animation must be _replaced_ rather than stopped — see
  `.marquee-banner-inner`, which needs `animation: none` because a
  near-zero-duration marquee still jumps.

Existing keyframes worth reusing before writing a new one: `sparkle`,
`float-gentle`, `rainbow-border`, `blink`, `glitter-sweep`, `sparkle-trail`,
`marquee-scroll`, `float-up-fade`, `cursor-blink`, `sparkle-burst-out`,
`emoji-fall`.

### Text that scales

`[data-text-scaled]` is set on `<html>` when iOS Dynamic Type is enlarged. Use it
to drop decoration that would otherwise push content off-screen — the site
title's ✨, an oversized hero — never to shrink the words themselves.

---

## Component patterns

| Pattern       | How                                                                                             |
| ------------- | ----------------------------------------------------------------------------------------------- |
| Themed colour | inline `style={{ color: 'var(--text-muted)' }}`                                                 |
| Lazy views    | `React.lazy()` + `<Suspense fallback={<LazyFallback />}>` (defined in `App.tsx`)                |
| Focus trap    | `useFocusTrap(containerRef, active, onEscape?)`                                                 |
| Errors        | `toUserMessage(err)` — never a raw `error.message`                                              |
| Markdown      | `ui/MarkdownContent` — importing `react-markdown` directly puts 120 KB back on the startup path |

### New modals

- `drag="x"` swipe dismiss with `SWIPE_DISMISS_THRESHOLD`
- `onTouchMove` blurs the focused field so the keyboard drops
- `useFocusTrap`
- Safe-area classes: `.modal-panel-safe`, `.modal-overlay-safe`,
  `.modal-footer-safe`, `.keyboard-safe-pad`, `.keyboard-safe-scroll`,
  `.safe-area-bottom`, `.page-safe-bottom`. **Several are declared inside an
  `@supports (padding-bottom: env(safe-area-inset-bottom))` block**, so they are
  indented and a line-anchored `grep '^\.modal-footer-safe'` reports them as
  missing. Search without the anchor before concluding a class does not exist —
  this file previously claimed `.modal-footer-safe` was undefined on exactly
  that mistake.
- `--keyboard-inset` carries the iOS keyboard height; the panel shortens rather
  than the content clipping

---

## Gate

```bash
npx tsc --noEmit && npm run build && npm run test && npm run lint
```

Then the part the gate cannot do:

- [ ] Looked at it — screenshot on device, or the running page on web
- [ ] Checked in **2+ themes, one light and one dark**
- [ ] Contrast sweep re-run if any colour variable changed
- [ ] New variables added to all 8 themes
- [ ] Copy uses the voice — and does not, in aria-labels
- [ ] CSS animations wrapped for `prefers-reduced-motion`

## Cross-domain

Device layout, touch, Dynamic Type, safe areas, breakpoints → `/mobile`.
Cold start, lifecycle, storage → `/ios`. RPC and data shape → `/fullstack`.

## Learnings

Append to the relevant topic doc under `.claude/docs/` (usually `gotchas.md` or
`theming.md`):

```
- [YYYY-MM-DD /frontend] One-line finding
```

$ARGUMENTS
