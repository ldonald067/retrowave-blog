# iOS Readiness Pass

Branch: `prep/ios-readiness`

This branch shifts from broad cleanup into focused no-Mac iPhone preparation.
The first pass targets issues that can be tightened without Xcode or a physical
iPhone.

## Pass 1: Safe Areas, Keyboard Space, And Narrow Widths

Changed:

- App metadata now disables automatic phone/date/email/address detection and
  uses ASCII social/title text to avoid encoding noise.
- Standalone privacy and terms pages use `viewport-fit=cover`, theme color,
  safe-area padding, and private-journal wording.
- Shared modal overlays now scroll within safe areas instead of always
  hard-centering content into notch/home-indicator/keyboard space.
- Shared modal panels use a keyboard-aware `100dvh` max height.
- Profile settings scroll height now accounts for safe areas and keyboard
  inset.
- Confirm dialogs stack full-width actions on small screens.
- Toasts have a constrained viewport width and can wrap long messages.
- View-entry modal titles can wrap without pushing the close button off-screen.

## Pass 2: Short Viewports And Public Page Edges

Changed:

- Auth content now keeps safe-area bottom padding even when the keyboard is not
  open.
- Onboarding and age verification scroll from the top on narrow/short
  viewports, then center again on roomier screens.
- Public profile loading, not-found, and main pages respect safe-area top and
  bottom padding.
- `min-h-screen` is normalized to `100dvh` so full-height fallback/public pages
  track the dynamic mobile viewport more closely.
- Post and profile modals no longer carry old hard `95vh`/`90vh` caps; the
  shared safe modal panel rule owns viewport sizing.

## Pass 3: App Shell And Visual Viewport

Changed:

- Full-screen loading and app states now keep content inside top and bottom
  safe-area padding without reacting to keyboard-height changes behind modals.
- Lazy modal fallbacks no longer force a nested full-height loading screen; the
  overlay owns the viewport and the spinner stays centered inside it.
- The error boundary uses the same safe scrolling overlay rules as modals so a
  crash card can still be reached on short screens.
- The virtualized journal list now measures against `visualViewport` when
  available and recalculates on orientation, visual viewport resize, and visual
  viewport scroll events.

Not done here:

- Real browser screenshots for every checklist viewport.
- Native iPhone keyboard verification.
- Xcode/App Store screenshot validation.

## Next Pass

- Run the checklist viewports against auth, onboarding, entry editor, profile
  tabs, settings, public profile, long journal cards, and keyboard-constrained
  portrait.
- Turn any findings into small fixes with before/after notes.
