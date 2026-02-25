---
name: mobile
description: Audit iOS/Capacitor integration for Apple App Store compliance and native UX quality
---

# Mobile Agent

Audit and improve iOS/Capacitor integration for the Retrowave Blog app. Focus on Apple App Store compliance and native UX quality.

Read `CLAUDE.md` first — it documents all implemented patterns, what's done, and what's still pending.

## Audit Areas

### 1. Apple App Store Guidelines

Check compliance with key guidelines:

- **1.2 (User Generated Content)**: Verify ALL of: reporting mechanism (mailto link in PostCard), content moderation (3-layer: regex + OpenAI + fail-open), age gate (COPPA 13+), and bidirectional user blocking (`user_blocks` table + `is_blocked_pair()`)
- **4.2 (Minimum Functionality)**: App must NOT be a "thin wrapper". Verify native features: haptics (`hapticImpact()`), share sheet, deep links, status bar control, swipe gestures, cursor sparkles
- **5.1.1 (Data Collection)**: Verify account deletion RPC (`delete_user_account`) is wired to Delete Account button in ProfileModal. Verify data export RPC (`export_user_data`) is wired to Export Data button
- **5.1.2 (Data Use and Sharing)**: Check `public/privacy.html` and `public/terms.html` exist. Note: these are AI-generated and not lawyer-reviewed — flag as reminder

### 2. iOS UX Patterns

Verify these patterns are implemented correctly:

| Pattern | Where | Implementation Details |
|---------|-------|----------------------|
| Safe area insets (top) | Header.tsx | `paddingTop: 'max(0.5rem, env(safe-area-inset-top))'` — covers Dynamic Island |
| Safe area insets (bottom) | Modals, footers | `.modal-footer-safe` and `.safe-area-bottom` CSS classes |
| Swipe-to-dismiss | PostModal, ProfileModal | `drag="x"` + `dragConstraints={{ left: 0, right: 0 }}` + `dragElastic={{ left: 0, right: 0.5 }}` + `onDragEnd` with `info.offset.x > 80` threshold |
| Keyboard dismiss | Scrollable modal content | `onTouchMove={() => { if (document.activeElement instanceof HTMLElement) document.activeElement.blur(); }}` |
| Haptic feedback | Block, delete, post, update | `hapticImpact()` from `src/lib/capacitor.ts` (ImpactStyle.Light) |
| Touch targets | All interactive elements | Minimum 44px (`min-h-[44px]`) |
| Input zoom fix | Text inputs on mobile | `font-size: 16px !important` at mobile breakpoint in `index.css` |

**Known gotcha**: Swipe-to-dismiss must check guards before closing — PostModal checks `!saving`, ProfileModal checks `!isInitialSetup && !saving`. Don't allow swipe during save operations.

**Known gotcha**: `MODAL_CHROME_HEIGHT` is 140 in PostModal and 180 in ProfileModal. On iPhone SE (667px screen), this may leave too little scroll area. This is a known pending item.

### 3. Capacitor Configuration

Review `capacitor.config.ts` for:
- `Keyboard.resize: 'body'` (prevents modal push-up on keyboard open)
- `SplashScreen.launchAutoHide: false` (hidden manually in `initCapacitor()`)
- `server.allowNavigation` includes `*.supabase.co`
- Platform guards in `src/lib/capacitor.ts` — ALL Capacitor calls gated by `Capacitor.isNativePlatform()`, no-ops on web

**Known gotcha**: `capacitor.ts` uses dynamic imports (`await import(...)`) for Capacitor plugins. Don't flag missing top-level imports — they're intentionally lazy-loaded.

### 4. Accessibility

- Reduced motion: `<MotionConfig reducedMotion="user">` in App.tsx + CSS `prefers-reduced-motion` + per-component `useReducedMotion()`
- `aria-label` on all icon-only buttons (Home, Profile, New Entry, Block, Report)
- `aria-pressed` on reaction buttons in ReactionBar
- Focus traps in modals via `useFocusTrap` hook
- iOS smoothing: `-webkit-font-smoothing: antialiased`, `-webkit-tap-highlight-color: transparent`

### 5. Dark Theme Contrast (WCAG AA)

For each dark theme in `src/lib/themes.ts`, verify `--text-muted` meets 4.5:1 contrast ratio against `--bg-primary`:

| Theme | `--text-muted` | `--bg-primary` | Status |
|-------|---------------|----------------|--------|
| emo-dark | `#858585` | `#1a1a1a` | Fixed (was `#606060`) |
| scene-kid | `#00bb00` | `#001a00` | Fixed (was `#00ff0080` — alpha!) |
| grunge | `#a09078` | `#1a1510` | Fixed (was `#6a5a48`) |

**Known gotcha**: Never use alpha-channel colors for text (`#rrggbbaa`) — they fail contrast checks unpredictably against varying backgrounds. Use solid colors only.

### 6. Image Error Fallbacks

Verify graceful degradation when CDN/network fails:
- **Avatar**: Primary image → DiceBear CDN (`api.dicebear.com/7.x/bottts/svg`) → User icon placeholder (lucide-react `User` icon)
- **YouTubeCard**: Thumbnail → YouTube icon placeholder (lucide-react `Youtube` icon in styled div)

Both use `onError` + `useState` to track failure states. Avatar has a triple-fallback chain (two `onError` transitions).

### 7. Build Verification

```bash
npm run build          # Web build must succeed — NEVER use npm run dev
# npx cap sync         # Only on macOS with Xcode
```

## Output Format

Present findings grouped by severity:

**CRITICAL** (App Store rejection risk):
- ...

**HIGH** (Poor UX on iOS):
- ...

**MEDIUM** (Polish):
- ...

Reference the known gotchas above to avoid repeating false alarms.

$ARGUMENTS
