# Theming & Styling

## Theme System
- All 8 themes define 42 CSS variables in `themes.ts`. When adding a new variable, add it to ALL 8 themes AND `:root` defaults in `index.css`. Missing variables silently fall back to `initial`.
- Never use alpha-channel hex colors (`#rrggbbaa`) for text — fails WCAG AA unpredictably.
- `color-mix(in srgb, ...)` for derived colors (hover states, subtle backgrounds). Prefer over hardcoded intermediate colors.
- Minimum readable text: 12px (`text-xs`). Decorative pixel badges: 11px. Winamp/sparkle: exempt (`aria-hidden`).

## Contrast Values (WCAG AA)
- Dark theme `--text-muted` minimums (4.5:1 on `--card-bg`): emo-dark `#858585`, scene-kid `#00bb00`, grunge `#b8a890`, pastel-goth `#b0a0c0`.
- `--accent-primary` values: Classic Xanga `#d6157e`, Cottage Core `#617544`, MySpace Blue `#1188dd`, Grunge `#a89070`.
- `--text-title` only needs 3:1 (large text at text-lg+).
- Grunge theme: `--text-body` `#c0b098`, `--button-gradient-from` `#5a5040`. All pass 4.5:1 on `#242018`.

## Responsive Breakpoints
- 480px: only custom CSS breakpoint (in `index.css`). Everything else uses Tailwind `sm:` (640px) and `lg:` (1024px).
- Nav labels show at `lg:` (1024px), not `sm:` — three labeled buttons overflow at tablet widths.
- Sidebar switches from collapsible to fixed at `lg:`.
- Modals use `max-h-[95vh] sm:max-h-[90vh]` — 95% on mobile, 90% on desktop. Intentional.
- Tablet 640-1023px is the known awkward zone — functional but not polished.
