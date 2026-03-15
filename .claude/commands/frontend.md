---
name: frontend
description: Design, build, and audit Retrowave Blog UI — Xanga aesthetic, theme system, component patterns, and 2005 web nostalgia
---

# Frontend Agent

Design, build, and audit UI for the Retrowave Blog app.

Read `CLAUDE.md` first. Read `.claude/learnings.md` for known gotchas.

---

## Design Identity

This is a **2005 Xanga/LiveJournal nostalgia blog**. Every decision should feel
like a teenager's personal blog from the mid-2000s:

- **Maximalist** — gradients, dotted borders, sparkles, tildes
- **Personal** — Comic Sans, emoji, abbreviated internet slang
- **Fun** — cursor sparkles, animated reactions, spring physics
- **Themed** — 8 wildly different color palettes, user's choice

**Anti-patterns**: clean sans-serif type, flat design, muted palettes, corporate
button styles, professional copy ("Submit", "Continue", "Get Started").

---

## Copy Rules

| Instead of | Write | Where |
|-----------|-------|-------|
| "you" | "u" | Buttons, headings, descriptions |
| "your" | "ur" | Buttons, headings, descriptions |
| "to" | "2" | Buttons, headings, descriptions |

Wrap action labels in tildes: `~ save entry ~`. Sparkle emoji in headings: `✨ My Journal ✨`.

**Where NOT to use slang**: `aria-label`, `alt` text, `toUserMessage()` output, code comments.

---

## Styling

### CSS Classes
Read `src/index.css` for full definitions. Key classes:
`.xanga-box`, `.xanga-button`, `.xanga-link`, `.xanga-title`, `.icon-btn-hover`

### Theme Variables
All colors MUST use CSS custom properties — hardcoded colors break theme switching.
Read `src/lib/themes.ts` for the 8 theme definitions (30+ vars each).

Key variable groups: `--bg-*`, `--text-*`, `--accent-*`, `--border-*`,
`--header-gradient-*`, `--button-gradient-*`, `--title-font`.

For derived colors use `color-mix()`:
```css
background: color-mix(in srgb, var(--accent-secondary) 15%, var(--card-bg));
```

### Adding a New CSS Variable
1. Add default in `:root` in `src/index.css`
2. Add to ALL 8 themes in `src/lib/themes.ts`
3. Test every theme — missing vars silently fall back to `initial`

---

## Component Patterns

| Pattern | How |
|---------|-----|
| Theme colors | Inline `style={{ color: 'var(--text-muted)' }}` (Tailwind can't use CSS vars) |
| Animations | Framer Motion spring: `type: 'spring', stiffness: 300, damping: 25` |
| Tap feedback | `whileTap={{ scale: 0.95 }}` on all interactive elements |
| Lazy modals | `React.lazy()` + `<Suspense fallback={<LazyFallback />}>` |
| Focus traps | `useFocusTrap(ref, isOpen, onClose)` on all modals |
| Errors | `toUserMessage(err)` — NEVER raw `error.message` |

### New Modals Must Have
- `drag="x"` swipe-to-dismiss with `SWIPE_DISMISS_THRESHOLD`
- `onTouchMove` keyboard dismiss (`document.activeElement.blur()`)
- Safe area insets (`.modal-footer-safe`)
- `useFocusTrap` for accessibility

---

## Responsive

| Width | Device | Key Rule |
|-------|--------|----------|
| 375px | iPhone SE | 1-col grids, icon-only buttons, compact padding |
| 640px+ | Tablet | `sm:` — 2-col grids, visible labels, larger padding |
| 1024px+ | Desktop | `lg:` — fixed sidebar |

Touch targets: **44px minimum**. Input font: **16px minimum** on mobile (prevents iOS zoom).

---

## Checklist

- [ ] All colors use CSS variables
- [ ] New CSS vars added to all 8 themes
- [ ] Copy uses Xanga slang (not in aria-labels)
- [ ] Touch targets >= 44px
- [ ] Spring animations (no duration-based)
- [ ] Works at 375px width
- [ ] Tested with 2+ themes (light + dark)
- [ ] `localStorage` in try/catch
- [ ] Build passes: `npx tsc --noEmit && npm run build && npm run test`

---

## Cross-Domain

- Modals → `/mobile` (safe areas, swipe guards)
- Supabase data → `/fullstack` (RPC types)
- New theme vars → test all 8 themes

## Learnings

Append findings to `.claude/learnings.md`:
```
- [YYYY-MM-DD /frontend] One-line finding
```

$ARGUMENTS
