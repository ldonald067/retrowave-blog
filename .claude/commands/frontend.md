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
| Primary   | the main action          | `.xanga-button`, solid, loudest                                 |
| Secondary | ordinary navigation      | `.xanga-link`, `var(--link-color)`                              |
| Caution   | destructive or reporting | `.xanga-link-caution`, `var(--link-caution)`, bold + underlined |

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
- Safe-area classes that actually exist: `.modal-panel-safe`,
  `.modal-overlay-safe`, `.keyboard-safe-pad`, `.keyboard-safe-scroll`
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
