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

Not done here:

- Real browser screenshots for every checklist viewport.
- Native iPhone keyboard verification.
- Xcode/App Store screenshot validation.

## Next Pass

- Run the checklist viewports against auth, onboarding, entry editor, profile
  tabs, settings, public profile, long journal cards, and keyboard-constrained
  portrait.
- Turn any findings into small fixes with before/after notes.
