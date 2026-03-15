---
name: mobile
description: Audit iPhone responsiveness, iOS/Capacitor integration, and Apple App Store compliance
---

# Mobile Agent

Audit and improve the app for iPhone responsiveness and iOS native quality.

Read `CLAUDE.md` first. Read `.claude/learnings.md` for known gotchas (especially
"Responsive & Mobile" section — has verified modal heights, breakpoint details, etc.).

---

## Phase 1: iPhone Responsiveness

### Screen Sizes

| Device | Width | Concern |
|--------|-------|---------|
| iPhone SE | 375px | Smallest. Modal scroll tight. Baseline stress test. |
| iPhone 14/15 | 390px | Most common. Baseline target. |
| iPhone 15 Pro Max | 430px | Largest. Check max-width containers. |

### Key Rules
- Touch targets: **44px minimum** (`min-h-[44px]`)
- Input font: **16px minimum** on mobile (prevents iOS Safari auto-zoom)
- Never use `100vh`/`100dvh` for full-screen — leave room for browser chrome
- Modals: `max-h-[95vh]` mobile, `max-h-[90vh]` desktop

### Breakpoints
- 480px: Custom CSS in `index.css` (font sizes, input zoom fix, cursor disabled)
- 640px (`sm:`): Padding increases, button labels shown, grids add columns
- 1024px (`lg:`): Sidebar switches from collapsible to fixed

### Modal Height
Modals use `MODAL_CHROME_HEIGHT` to compute scrollable area:
- PostModal: 140px chrome → ~493px scroll on SE
- ProfileModal: 180px chrome → ~453px scroll on SE

### Touch Patterns
| Pattern | Implementation |
|---------|---------------|
| Swipe-to-dismiss | `drag="x"` + `SWIPE_DISMISS_THRESHOLD` (80px) |
| Keyboard dismiss | `onTouchMove` → `document.activeElement.blur()` |
| Haptics | `hapticImpact()` from `capacitor.ts` |
| Tap feedback | `whileTap={{ scale: 0.95 }}` |

Swipe guards: never allow during save (`!saving`), never during initial setup.

---

## Phase 2: App Store Compliance

| Guideline | Requirement | Implementation |
|-----------|-------------|---------------|
| 1.2 (UGC) | Reporting, moderation, age gate, blocking | mailto report, 3-layer moderation, COPPA 13+, `user_blocks` |
| 4.2 (Min Functionality) | Not a thin wrapper | Haptics, share sheet, deep links, status bar, swipe gestures |
| 5.1.1 (Data) | Account deletion + data export | `delete_user_account` + `export_user_data` RPCs |
| 5.1.2 (Privacy) | Privacy policy + terms | `public/privacy.html` + `public/terms.html` |

### iOS UX Patterns
| Pattern | Where |
|---------|-------|
| Safe area (top) | Header: `paddingTop: max(0.5rem, env(safe-area-inset-top))` |
| Safe area (bottom) | Modal footers: `.modal-footer-safe` class |
| Keyboard resize | `Keyboard.resize: 'body'` in capacitor config |
| Splash screen | Manual hide via `initCapacitor()` |

### Capacitor
- App: `com.retrowave.journal` / "My Journal"
- Portrait-only (locked in Info.plist)
- All Capacitor calls guarded by `Capacitor.isNativePlatform()`
- Plugins lazy-loaded via dynamic `await import()`

### Accessibility
- `<MotionConfig reducedMotion="user">` + CSS `prefers-reduced-motion`
- `aria-label` on icon-only buttons, `aria-pressed` on reaction toggles
- Focus traps in modals via `useFocusTrap`
- Dark theme contrast: never use alpha-channel colors for text

---

## Phase 3: Build

```bash
npm run build          # NEVER npm run dev
npx tsc --noEmit
```

## Output Format

**CRITICAL** (App Store rejection risk): ...
**HIGH** (Poor UX on specific iPhones): ...
**MEDIUM** (Polish): ...

Reference `.claude/learnings.md` false positives to avoid repeating dismissed findings.

## Learnings

Append findings to `.claude/learnings.md`:
```
- [YYYY-MM-DD /mobile] One-line finding
```

$ARGUMENTS
