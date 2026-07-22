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
- [2026-07-09 /frontend] Text on `--button-gradient-*` backgrounds must use `--button-text` (like `.xanga-button` does), never `--text-title` — text-title on button fills is as low as 1.03:1 (y2k-cyber). Found on AuthModal active tab.

## [2026-07-22 review-fixes] Contrast pass — all 8 themes AA-clean
- Ran a computed-ratio audit over every text/bg pairing in actual render contexts. Fixes: grunge `--button-text` #c9a86c→#f0e0c0 (buttons+tab were 3.07:1); classic `--text-muted` #666→#444 and `--text-subtitle` #9932cc→#6d1b96 (header-banner text); classic `--selection-bg`→#d6157e; emo-dark `--text-subtitle`→#cc55cc, `--accent-primary`→#ee4060, `--strong`/`--em`→#ee4060/#cc55cc; myspace `--selection-bg`→#0d6cb0; y2k `--text-muted`→#9a9ab0; cottage/grunge `--text-subtitle` darkened/lightened for header.
- Form labels (Input/Select/Textarea/AvatarPicker) now use `--accent-primary` not `--text-title` — text-title only guarantees 3:1, fails at 12px. accent-primary passes 4.5:1 on card/modal in every theme.
- ConfirmDialog confirm button now fills with `--button-gradient` + `--button-text` (was `--accent-secondary` bg + `--button-text`, which equal each other in grunge → invisible).
- The `.glitter-text` app title is a multi-color gradient fill with drop-shadow — treated as a decorative exemption; flat-color contrast measurement doesn't reflect its rendering.
- `:root` fallback palette synced to classic-xanga so the pre-hydration flash matches and passes.
