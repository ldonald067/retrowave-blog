---
name: frontend
description: Frontend design and implementation following Retrowave Blog's Xanga aesthetic, theme system, and component patterns
---

# Frontend Agent

Implement or review frontend features for the Retrowave Blog app. This command
supplements the global `frontend-design` skill with project-specific patterns.

Read `CLAUDE.md` first for full architecture and conventions.
Read `.claude/learnings.md` for accumulated frontend knowledge and known gotchas.

---

## Project-Specific Design System

### Xanga Aesthetic Rules

This is NOT a modern SaaS app. It's aggressively 2005. Follow these rules:

1. **Typography**: Use `var(--title-font)` for headings. Default is Comic Sans MS.
   Every theme has its own title font — never hardcode a font family.
2. **Borders**: `border-2 border-dotted` with `var(--border-primary)`. Not solid,
   not thin. Dotted. Always.
3. **Decoration**: Tildes around action labels (`~ save entry ~`, `~ edit profile ~`).
   Sparkle emoji in headings (`✨ My Journal ✨`). Use "u" instead of "you", "2"
   instead of "to", "ur" instead of "your" in user-facing copy. NOT in code
   comments, aria-labels, or technical text.
4. **Cards**: `.xanga-box` class for all card-like containers.
5. **Buttons**: `.xanga-button` for primary actions. Custom styled with gradients.
6. **Links**: `.xanga-link` for inline text links.
7. **Headers**: Gradient background using `var(--header-gradient-from/via/to)`.

### Theme Variable System

Every visual property MUST use CSS custom properties. Hard-coded colors break theme
switching. The full variable list is in `index.css` `:root`.

**Critical variables**:
- Backgrounds: `--bg-primary`, `--bg-secondary`, `--card-bg`, `--modal-bg`
- Text: `--text-title`, `--text-body`, `--text-muted`, `--text-subtitle`
- Accents: `--accent-primary`, `--accent-secondary`
- Borders: `--border-primary`, `--border-accent`
- Font: `--title-font`
- Header gradients: `--header-gradient-from`, `--header-gradient-via`, `--header-gradient-to`

**When adding a new CSS variable**:
1. Add default value in `:root` block in `src/index.css`
2. Add to ALL 8 theme definitions in `src/lib/themes.ts`
3. Missing variables silently fall back to `initial` — creates invisible text or
   transparent backgrounds. Test all themes.

**`color-mix()` pattern**: Use `color-mix(in srgb, var(--accent-secondary) 15%, var(--card-bg))`
for derived colors. Supported in all target browsers. Prefer over hardcoded intermediates.

### Component Patterns

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

### Responsive Requirements

Every UI change must work at these widths:
- **375px** — iPhone SE (smallest target)
- **390px** — iPhone 14 (most common)
- **430px** — iPhone 15 Pro Max (largest)
- **1024px+** — Desktop with fixed sidebar

Use these Tailwind responsive patterns:
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

Then verify manually:
- [ ] All colors use theme variables (no hardcoded hex)
- [ ] Touch targets >= 44px on all interactive elements
- [ ] `toUserMessage()` wraps all error displays
- [ ] New modals have swipe-to-dismiss + keyboard dismiss + focus trap
- [ ] Works at 375px width (check grid layouts, text truncation)
- [ ] Test with at least 2 different themes (light + dark)
- [ ] `localStorage` access wrapped in try/catch
- [ ] Framer Motion animations use spring physics (not duration-based)

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
