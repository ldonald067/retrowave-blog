---
name: frontend-design
description: Design and build distinctive Retrowave Blog UI — Xanga aesthetic, theme-aware components, retro copy style, and 2005 web nostalgia
---

# Frontend Design Agent

Design and build visually distinctive UI for the Retrowave Blog. This command
supplements the global `frontend-design` skill with project-specific aesthetic
rules, theme system constraints, and copy writing patterns.

Read `CLAUDE.md` first for architecture and conventions.
Read `.claude/learnings.md` for accumulated design knowledge.

---

## Design Identity

This is a **2005 Xanga/LiveJournal nostalgia blog**. Every design decision should
feel like a teenager's personal blog from the mid-2000s. This means:

- **Maximalist, not minimalist** — gradients, dotted borders, sparkles, tildes
- **Personal, not corporate** — Comic Sans, emoji, abbreviated internet slang
- **Fun, not functional** — cursor sparkles, animated reactions, spring physics
- **Themed, not branded** — 8 wildly different color palettes, user's choice

**Anti-patterns** (things that break the aesthetic):
- Clean sans-serif typography (Helvetica, Inter, system-ui)
- Flat design with subtle borders
- Monochrome or muted color palettes
- Professional button styles (rounded rectangles, subtle shadows)
- Corporate copy ("Submit", "Continue", "Get Started")

---

## Copy Writing Rules

All user-facing text follows internet slang conventions circa 2005:

| Instead of | Write | Where |
|-----------|-------|-------|
| "you" | "u" | Button labels, headings, descriptions |
| "your" | "ur" | Button labels, headings, descriptions |
| "to" | "2" | Button labels, headings, descriptions |
| "are" | "r" | Headings only (sparingly) |

**Decoration patterns**:
- Action labels wrapped in tildes: `~ save entry ~`, `~ edit profile ~`
- Sparkle emoji in section headings: `✨ My Journal ✨`
- Star separators between sections: `★`

**Where NOT to use slang**: `aria-label`, `aria-description`, `alt` text, error
messages from `toUserMessage()`, code comments, TypeScript identifiers.

---

## CSS Class System

Use these project classes — never invent new base classes:

| Class | Purpose | Key Styles |
|-------|---------|-----------|
| `.xanga-box` | Card containers | `var(--card-bg)`, 2px solid border, 10px radius |
| `.xanga-button` | Primary actions | Gradient background, 2px border, 15px radius |
| `.xanga-link` | Inline links | `var(--link-color)`, underline, 11px font |
| `.xanga-title` | Section headings | `var(--title-font)`, text-shadow |

**Button states**: `.xanga-button:hover` swaps gradient to accent colors,
`:active` drops shadow and pushes down 2px. All buttons get heart cursor
(`♡`) via global CSS.

---

## Theme System

8 themes defined in `src/lib/themes.ts`, applied via CSS custom properties.
**Every color, background, border, and font MUST use CSS variables.**

### Theme Palette Reference

| Theme | Vibe | Title Font | Accent |
|-------|------|-----------|--------|
| `classic-xanga` | Pink & purple pastels | Comic Sans MS | `#ff1493` deep pink |
| `emo-dark` | Black + red + tears | 'Segoe Script' | `#dc143c` crimson |
| `scene-kid` | Neon green terminal | 'Courier New' | `#00ff00` lime |
| `myspace-blue` | Classic MySpace | 'Trebuchet MS' | `#1e90ff` dodger blue |
| `y2k-cyber` | Purple/cyan cyberpunk | 'Orbitron' | `#00ffff` cyan |
| `cottage-core` | Warm earth tones | 'Georgia' | `#8b4513` saddle brown |
| `grunge` | Dark brown/amber | 'Impact' | `#cd853f` peru |
| `pastel-goth` | Black + pastel accents | 'Segoe Script' | `#dda0dd` plum |

### Variable Categories

When adding new visual elements, use these variable families:

**Backgrounds**: `--bg-primary`, `--bg-secondary`, `--card-bg`, `--modal-bg`,
`--footer-bg`, `--code-bg`, `--blockquote-bg`

**Text**: `--text-title`, `--text-body`, `--text-muted`, `--text-subtitle`,
`--code-text`, `--strong-color`, `--em-color`

**Accents**: `--accent-primary`, `--accent-secondary`, `--link-color`, `--link-hover`

**Borders**: `--border-primary`, `--border-accent`, `--code-border`, `--blockquote-border`

**Gradients**: `--header-gradient-from/via/to`, `--button-gradient-from/to`,
`--bg-gradient-from/via/to`

**Font**: `--title-font` (body font is system stack, not themed)

### Adding a New CSS Variable

1. Add default in `:root` block in `src/index.css`
2. Add to ALL 8 theme definitions in `src/lib/themes.ts` (30+ vars each)
3. Test every theme — missing vars silently fall back to `initial` (invisible)

### Derived Colors

Use `color-mix()` for hover states and subtle backgrounds:
```css
background: color-mix(in srgb, var(--accent-secondary) 15%, var(--card-bg));
```

Never use alpha-channel hex (`#rrggbbaa`) for text — fails WCAG unpredictably.

---

## Animation Patterns

All animations use **Framer Motion spring physics**, not CSS transitions:

```tsx
// Standard spring for UI elements
type: 'spring', stiffness: 300, damping: 25

// Tap feedback on all interactive elements
whileTap={{ scale: 0.95 }}

// Entrance animations
initial={{ opacity: 0, y: 20 }}
animate={{ opacity: 1, y: 0 }}
```

**Reduced motion**: The app wraps everything in `<MotionConfig reducedMotion="user">`.
For complex animations, also check `useReducedMotion()`.

Cursor sparkle effect (`CursorSparkle.tsx`) renders animated particles at cursor
position. Disabled below 480px (mobile) and when `prefers-reduced-motion` is set.

---

## Modal Design Pattern

All modals follow this structure:

1. **Backdrop**: Semi-transparent overlay with blur
2. **Container**: `.xanga-box` with `max-h-[95vh] sm:max-h-[90vh]`
3. **Header**: Title + close button (44px touch target)
4. **Scrollable body**: `overflow-y: auto` with calculated max height
5. **Footer**: `.modal-footer-safe` with `env(safe-area-inset-bottom)` padding

**Required behaviors**:
- `drag="x"` swipe-to-dismiss (right only, elastic)
- `onTouchMove` keyboard dismiss
- `useFocusTrap` for keyboard accessibility
- `React.lazy()` + `<Suspense>` for code splitting

---

## Responsive Design

| Width | Device | Key Adjustments |
|-------|--------|----------------|
| 375px | iPhone SE | Smallest. 1-col grids, icon-only buttons, compact padding |
| 390px | iPhone 14 | Baseline. Same as SE but slightly more breathing room |
| 640px+ | Tablet/Desktop | `sm:` breakpoint. 2-col grids, visible button labels, larger padding |
| 1024px+ | Desktop | `lg:` breakpoint. Fixed sidebar instead of collapsible |

Touch targets: **44px minimum** on all interactive elements (`min-h-[44px]`).
Input font: **16px minimum** on mobile (prevents iOS Safari auto-zoom).

---

## Verification Checklist

```bash
npx tsc --noEmit && npm run build && npm run test
```

- [ ] All colors use CSS variables (no hardcoded hex)
- [ ] New CSS variables added to all 8 themes in `themes.ts`
- [ ] Copy uses Xanga slang (tildes, "u"/"ur"/"2") in user-facing text
- [ ] Slang NOT in aria-labels or error messages
- [ ] Touch targets >= 44px
- [ ] Spring animations (no duration-based transitions)
- [ ] Works at 375px width
- [ ] Test with 2+ themes (at least 1 light + 1 dark)

## Cross-Domain Checks

- If new components added: `/mobile` audit (safe areas, touch targets)
- If new modals added: `/mobile` audit (MODAL_CHROME_HEIGHT, swipe guards)
- If data-bound UI: `/fullstack` audit (RPC types match)
- If theme vars changed: `/frontend` audit (all 8 themes updated)

## Learning Contribution

After completing work, append NEW findings to `.claude/learnings.md` under
"Styling & Theming". Use the format:
```
- [YYYY-MM-DD /frontend-design] One-line finding description
```

$ARGUMENTS
