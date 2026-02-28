---
name: frontend
description: Design, build, and audit Retrowave Blog UI — Xanga aesthetic, theme system, component patterns, and 2005 web nostalgia
---

# Frontend Agent

Design, build, and audit UI for the Retrowave Blog app.

Read `CLAUDE.md` first for full architecture and conventions.
Read `.claude/learnings.md` for accumulated frontend knowledge and known gotchas.

---

## Design Identity

This is a **2005 Xanga/LiveJournal nostalgia blog**. Every design decision should
feel like a teenager's personal blog from the mid-2000s:

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

| Class | Purpose | Key Styles |
|-------|---------|-----------|
| `.xanga-box` | Card containers | `var(--card-bg)`, 2px solid border, 10px radius |
| `.xanga-button` | Primary actions | Gradient background, 2px border, 15px radius |
| `.xanga-link` | Inline links | `var(--link-color)`, underline, 11px font |
| `.xanga-title` | Section headings | `var(--title-font)`, text-shadow |
| `.icon-btn-hover` | Icon buttons | Transparent bg, `currentColor` 15% on hover |

**Button states**: `.xanga-button:hover` swaps gradient to accent colors,
`:active` drops shadow and pushes down 2px. All buttons get heart cursor
(`♡`) via global CSS.

---

## Theme Variable System

Every visual property MUST use CSS custom properties. Hard-coded colors break theme
switching. The full variable list is in `index.css` `:root`.

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

## Component Patterns

| Pattern | How | Example |
|---------|-----|---------|
| Theme colors | Inline `style={{ color: 'var(--text-muted)' }}` | Tailwind classes can't use CSS vars |
| Animations | Framer Motion spring physics | `type: 'spring', stiffness: 300, damping: 25` |
| Tap feedback | `whileTap={{ scale: 0.95 }}` | All interactive elements |
| Lazy modals | `React.lazy()` + `<Suspense fallback={<LazyFallback />}>` | PostModal, ProfileModal, AuthModal |
| Focus traps | `useFocusTrap(ref, isOpen, onClose)` | All modals |
| Error display | `toUserMessage(err)` from `errors.ts` | NEVER raw `error.message` |
| Auth guard | `requireAuth()` from `auth-guard.ts` | All authenticated operations |
| Retry | `withRetry(async () => supabase.from(...).select(...))` | Wrap PromiseLike |

### Existing Components

**Page-level** (18 in `src/components/`):
`AgeVerification`, `AuthModal`, `ConfirmDialog`, `CursorSparkle`, `EmptyState`,
`ErrorBoundary`, `ErrorMessage`, `Header`, `LoadingSpinner`, `LoginForm`,
`OnboardingFlow`, `PostCard`, `PostModal`, `PostSkeleton`, `ProfileModal`,
`Sidebar`, `SignUpForm`, `Toast`

**UI Primitives** (10 in `src/components/ui/`):
`Avatar`, `AvatarPicker`, `Button`, `Card`, `Input`, `ReactionBar`, `Select`,
`StyledEmoji`, `Textarea`, `YouTubeCard` — re-exported via `ui/index.ts`

### Adding New UI Components

1. Place in `src/components/` (or `src/components/ui/` for primitives)
2. Use theme variables for ALL colors, backgrounds, borders — no hardcoded hex
3. Add `min-h-[44px]` to all interactive elements (iOS 44px touch target)
4. Respect reduced motion: rely on `<MotionConfig reducedMotion="user">` or check
   `useReducedMotion()` for complex animations
5. Wrap `localStorage` access in try/catch (Safari private browsing throws)
6. For modals, implement ALL of:
   - `drag="x"` swipe-to-dismiss with `dragElastic={{ left: 0, right: 0.5 }}`
   - `onTouchMove` keyboard dismiss (`document.activeElement.blur()`)
   - Safe area insets (`.modal-footer-safe` class)
   - `MODAL_CHROME_HEIGHT` constant for scroll area calculation
   - `useFocusTrap` for keyboard accessibility

---

## Responsive Requirements

| Width | Device | Key Adjustments |
|-------|--------|----------------|
| 375px | iPhone SE | Smallest. 1-col grids, icon-only buttons, compact padding |
| 390px | iPhone 14 | Baseline. Same as SE but slightly more breathing room |
| 640px+ | Tablet/Desktop | `sm:` breakpoint. 2-col grids, visible button labels, larger padding |
| 1024px+ | Desktop | `lg:` breakpoint. Fixed sidebar instead of collapsible |

Touch targets: **44px minimum** on all interactive elements (`min-h-[44px]`).
Input font: **16px minimum** on mobile (prevents iOS Safari auto-zoom).

Tailwind responsive patterns:
```
p-2 sm:p-4              # Padding scales up
text-base sm:text-lg     # Font scales up
hidden sm:inline         # Labels collapse to icon-only on mobile
grid-cols-1 sm:grid-cols-2  # Grids reduce columns on mobile
```

---

## Verification Checklist

Before declaring work complete:
```bash
npx tsc --noEmit       # Zero type errors
npm run build          # Production build succeeds — NEVER use npm run dev
npm run test           # All tests pass
```

Then verify:
- [ ] All colors use CSS variables (no hardcoded hex)
- [ ] New CSS variables added to all 8 themes in `themes.ts`
- [ ] Copy uses Xanga slang (tildes, "u"/"ur"/"2") in user-facing text
- [ ] Slang NOT in aria-labels or error messages
- [ ] Touch targets >= 44px on all interactive elements
- [ ] `toUserMessage()` wraps all error displays
- [ ] New modals have swipe-to-dismiss + keyboard dismiss + focus trap
- [ ] Spring animations (no duration-based transitions)
- [ ] Works at 375px width (check grid layouts, text truncation)
- [ ] Test with 2+ themes (at least 1 light + 1 dark)
- [ ] `localStorage` access wrapped in try/catch

---

## Cross-Domain Checks

- If your change involves a modal: run `/mobile` checklist (safe areas, MODAL_CHROME_HEIGHT, swipe guards)
- If your change involves Supabase data: verify RPC types match (`/fullstack` domain)
- If you modify theme variables: verify all 8 themes have the new variable
- If you add new interactive elements: verify 44px touch targets (`/mobile` domain)

## Learning Contribution

After completing work, append NEW findings to `.claude/learnings.md` under the
appropriate section (usually "Styling & Theming" or "Responsive & Mobile").
Use the format:
```
- [YYYY-MM-DD /frontend] One-line finding description
```

$ARGUMENTS
