---
name: mobile
description: Audit iPhone responsiveness, iOS/Capacitor integration, and Apple App Store compliance
---

# Mobile Agent

Audit and improve the Retrowave Blog app for iPhone responsiveness and iOS native
quality. Covers three concerns: responsive layout across iPhone sizes, Capacitor
native integration, and App Store compliance.

Read `CLAUDE.md` first for architecture and conventions.
Read `.claude/learnings.md` for accumulated mobile knowledge and known false positives.

---

## Phase 1: iPhone Responsiveness Audit

### Screen Size Matrix

Test layouts against these device dimensions (logical pixels):

| Device | Width | Height | Key Concern |
|--------|-------|--------|-------------|
| iPhone SE (3rd gen) | 375 | 667 | Smallest active iPhone. Modal scroll area is tight. |
| iPhone 14 / 15 | 390 | 844 | Most common. Baseline target. |
| iPhone 14 Plus / 15 Plus | 428 | 926 | Large phone. Check grid layouts don't over-stretch. |
| iPhone 15 Pro Max | 430 | 932 | Largest. Check max-width containers. |

For each device, verify:
- Modal scroll area is usable (see Modal Height Calculations below)
- Grid layouts (`grid-cols-2`, `sm:grid-cols-2`) don't create cramped cells
- Touch targets meet 44px minimum (`min-h-[44px]`, `min-w-[44px]`)
- Text remains readable (no truncation that hides meaning)
- No horizontal overflow or unexpected scrolling

### Viewport Units

Current state: The app uses `vh` for modal heights (`90vh`, `95vh`).

| Unit | Behavior | Support |
|------|----------|---------|
| `vh` | Fixed to initial viewport (includes URL bar on iOS Safari) | Universal |
| `dvh` | Dynamic — changes as URL bar collapses/expands | ~95% (2026) |
| `svh` | Smallest possible viewport (URL bar fully expanded) | ~95% (2026) |

**Current approach is safe**: `90vh` is conservative enough that the URL bar
difference doesn't cause issues. Switching to `dvh` would add ~45px on iPhone 14
when URL bar collapses but is unnecessary unless modal space proves insufficient.

If viewport changes are ever needed, the safe migration pattern is:
```css
max-height: min(90vh, 90dvh); /* dvh where supported, vh fallback */
```

**Rule**: Never use `100vh` or `100dvh` for full-screen layouts — always leave room
for browser chrome. The app correctly uses `95vh` on mobile, `90vh` on desktop
(`max-h-[95vh] sm:max-h-[90vh]`).

### Modal Height Calculations

Modals use `MODAL_CHROME_HEIGHT` to compute scrollable content area:

```
scrollableHeight = viewportHeight * multiplier - MODAL_CHROME_HEIGHT
```

Mobile uses 95vh (`max-h-[95vh]`), desktop uses 90vh (`sm:max-h-[90vh]`).

| Modal | Chrome Height | SE (667px, 95vh) | iPhone 14 (844px, 95vh) | Pro Max (932px, 95vh) |
|-------|--------------|------------------|------------------------|-----------------------|
| PostModal | 140px | **493px** | 662px | 745px |
| ProfileModal | 180px | **453px** | 622px | 705px |

**iPhone SE concern**: ProfileModal's 453px must hold: avatar (~200px), display name
(~80px), bio (~120px), mood (~70px), music (~70px), theme picker (~200px), emoji
picker (~150px), blocked users (variable), account actions (~120px). Total ~1010px
in 453px. Scrolling works but requires significant scrolling.

**If adjustments are needed**:
1. Reduce `MODAL_CHROME_HEIGHT` by compressing header/footer padding at mobile
2. Collapse optional sections (hide preview by default on small screens)
3. Use accordion sections to reduce visible content

### Responsive Breakpoints

| Breakpoint | Mechanism | What Changes |
|------------|-----------|-------------|
| 480px | `@media (max-width: 480px)` in `index.css` | Font sizes shrink, input zoom fix, custom cursor disabled |
| 640px | Tailwind `sm:` | Padding increases (`p-2` → `p-4`), button labels shown (`hidden sm:inline`), grid adds columns |
| 1024px | Tailwind `lg:` | Sidebar: collapsible accordion → fixed sidebar |

**Layout behavior below each breakpoint**:
- Below `lg:`: Sidebar collapses to summary bar, main content goes full-width
- Below `sm:`: Padding shrinks, button labels hidden (icon-only), grids collapse
  to fewer columns
- Below 480px: Custom CSS for fonts, cursors, input zoom prevention

### Grid Layout Verification

Check these specific grid layouts at 375px and 390px:

| Component | Layout | Behavior |
|-----------|--------|----------|
| PostModal | `grid grid-cols-1 sm:grid-cols-2 gap-3` | 1 col on mobile, 2 on sm+ (author + mood fields) |
| ProfileModal themes | `grid grid-cols-2 gap-2 sm:gap-3` | Always 2 cols (tight at 375px — ~180px per cell) |
| ProfileModal emoji | `grid grid-cols-2 sm:grid-cols-3 gap-2` | 2 cols mobile, 3 on sm+ |
| AvatarPicker | `grid grid-cols-4 sm:grid-cols-5` | 4 cols mobile, 5 on sm+ |

### Virtualized List Performance

The feed uses `@tanstack/react-virtual`:
- `estimateSize: 280px` per post (approximate, measured after render)
- `overscan: 3` items beyond visible area
- Container: `maxHeight: calc(100vh - 200px)` (200px = Header height)

**Mobile concerns**:
- Touch scrolling momentum via `-webkit-overflow-scrolling: touch` (global)
- `estimateSize` is approximate — virtualizer measures actual heights after render
- The 200px Header height is a magic number. If Header layout changes, this breaks.
- On slow iPhones, avoid layout thrash in PostCard during scroll (all styles use
  CSS variables, no JS-computed layouts)

### Portrait-Only Orientation

`ios/App/App/Info.plist` locks to portrait:
```xml
<key>UISupportedInterfaceOrientations</key>
<array><string>UIInterfaceOrientationPortrait</string></array>
```

Verify no landscape-specific CSS exists that would be unreachable.

### Touch Interaction Patterns

| Pattern | Implementation | Where |
|---------|---------------|-------|
| Swipe-to-dismiss | `drag="x"` + `dragElastic={{ left: 0, right: 0.5 }}` + `offset.x > 80` | PostModal, ProfileModal |
| Keyboard dismiss | `onTouchMove` → `document.activeElement.blur()` | Modal scroll areas |
| Haptic feedback | `hapticImpact()` (ImpactStyle.Light) | Block, delete, post, update |
| Tap feedback | `whileTap={{ scale: 0.95-0.98 }}` | Buttons via Framer Motion |
| Long press | Not implemented | N/A |
| Pull to refresh | Not implemented | Would need virtualizer integration |

**Known gotcha**: Swipe-to-dismiss checks guards before closing — PostModal checks
`!saving`, ProfileModal checks `!isInitialSetup && !saving`. Never allow swipe
during save operations.

---

## Phase 2: Apple App Store Compliance

### App Store Guidelines

- **1.2 (UGC)**: Verify ALL of: reporting mechanism (mailto in PostCard), content
  moderation (3-layer: regex + OpenAI + fail-open), age gate (COPPA 13+),
  bidirectional user blocking (`user_blocks` + `is_blocked_pair()`)
- **4.2 (Minimum Functionality)**: NOT a thin wrapper — verify native features:
  haptics, share sheet, deep links, status bar, swipe gestures, cursor sparkles
- **5.1.1 (Data Collection)**: Account deletion (`delete_user_account` RPC → Delete
  Account button in ProfileModal). Data export (`export_user_data` RPC → Export
  Data button in ProfileModal)
- **5.1.2 (Data Use)**: Check `public/privacy.html` and `public/terms.html` exist.
  Note: AI-generated, not lawyer-reviewed — flag as reminder.

### iOS UX Patterns

| Pattern | Where | Implementation |
|---------|-------|---------------|
| Safe area (top) | Header.tsx | `paddingTop: 'max(0.5rem, env(safe-area-inset-top))'` for Dynamic Island |
| Safe area (bottom) | Modal footers | `.modal-footer-safe` class: `padding-bottom: calc(0.75rem + env(safe-area-inset-bottom))` |
| Swipe-to-dismiss | PostModal, ProfileModal | `drag="x"` with `dragConstraints`, `dragElastic`, `onDragEnd` |
| Keyboard dismiss | Modal scroll areas | `onTouchMove` → `blur()` handler |
| Haptic feedback | Block, delete, post, update | `hapticImpact()` from `capacitor.ts` |
| Touch targets | All interactive elements | 44px minimum (`min-h-[44px]`) |
| Input zoom fix | Inputs on mobile | `font-size: 16px !important` at 480px breakpoint |

### Capacitor Configuration

**App identity**: `com.retrowave.journal` / "My Journal" / `webDir: 'dist'`

Review `capacitor.config.ts` for:
- `Keyboard.resize: 'body'` (prevents modal push-up)
- `SplashScreen.launchAutoHide: false` (manual hide in `initCapacitor()`)
- `server.allowNavigation` includes `*.supabase.co`
- `ios.contentInset: 'automatic'` + `ios.preferredContentMode: 'mobile'`
- All Capacitor calls in `capacitor.ts` guarded by `Capacitor.isNativePlatform()`

**Known gotcha**: `capacitor.ts` uses dynamic `await import(...)` for plugins.
Don't flag missing top-level imports — they're intentionally lazy-loaded.

### Component Count Reference

When auditing, expect 18 page-level components in `src/components/` and 10 UI
primitives in `src/components/ui/`. If counts differ, new components were added
and need mobile audit (touch targets, safe areas, responsive grids).

### Accessibility

- Reduced motion: `<MotionConfig reducedMotion="user">` + CSS `prefers-reduced-motion`
  + per-component `useReducedMotion()`
- `aria-label` on all icon-only buttons
- `aria-pressed` on reaction toggle buttons
- Focus traps in modals via `useFocusTrap` hook

### Dark Theme Contrast (WCAG AA)

Verify `--text-muted` meets 4.5:1 ratio against `--bg-primary` for dark themes:

| Theme | `--text-muted` | `--bg-primary` | Status |
|-------|---------------|----------------|--------|
| emo-dark | `#858585` | `#1a1a1a` | Fixed (was `#606060`) |
| scene-kid | `#00bb00` | `#001a00` | Fixed (was `#00ff0080` — alpha!) |
| grunge | `#a09078` | `#1a1510` | Fixed (was `#6a5a48`) |

**Rule**: Never use alpha-channel colors for text. Use solid hex only.

### Image Error Fallbacks

- **Avatar**: Primary → DiceBear CDN → User icon placeholder (triple-fallback chain)
- **YouTubeCard**: Thumbnail → YouTube icon placeholder div

Both use `onError` + `useState` to track failure states.

---

## Phase 3: Build Verification

```bash
npm run build          # NEVER use npm run dev — crashes the environment
npx tsc --noEmit       # Zero type errors
# npx cap sync         # Only on macOS with Xcode
```

---

## Cross-Domain Checks

Before completing your audit:
- Check if responsive findings affect `/frontend` domain (theme rendering at
  different sizes, grid layouts with theme-specific content)
- Check if Capacitor integration changes need `/fullstack` verification (new RPC
  calls from native contexts)
- Check if any new patterns should be shared with `/feature` (e.g., new modal
  height calculation methodology)

## Learning Contribution

After completing your audit, append NEW findings to `.claude/learnings.md` under
the appropriate section. Use the format:
```
- [YYYY-MM-DD /mobile] One-line finding description
```

Only add genuinely new findings. Don't repeat what's already documented.

## Output Format

**CRITICAL** (App Store rejection risk):
- ...

**HIGH** (Poor UX on specific iPhone sizes):
- ...

**MEDIUM** (Polish):
- ...

Reference `.claude/learnings.md` false positives to avoid repeating dismissed findings.

$ARGUMENTS
