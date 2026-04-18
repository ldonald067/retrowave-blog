# No-Mac Mobile QA Checklist

Branch: `prep/ios-readiness`

Use this checklist while a real iPhone and Xcode are unavailable. It does not replace device testing, but it catches the obvious mobile failures before App Store work starts.

## Viewports

- [ ] 320 x 568: older/small iPhone width.
- [ ] 375 x 667: compact iPhone height.
- [ ] 390 x 844: common modern iPhone size.
- [ ] 430 x 932: larger iPhone size.
- [ ] 667 x 375: compact landscape.
- [ ] 844 x 390: modern landscape.
- [ ] 390 x 500: keyboard-constrained portrait approximation.

## Screens

- [ ] Onboarding first slide.
- [ ] Sign in and sign up forms.
- [ ] Age verification.
- [ ] Empty journal state.
- [ ] Journal list with long titles, long chapters, mood, music, and reactions.
- [ ] Chapter filter banner and mobile chapter chips.
- [ ] New-entry editor.
- [ ] Edit-entry editor with preview.
- [ ] Entry privacy control.
- [ ] Profile settings: profile tab.
- [ ] Profile settings: vibe tab.
- [ ] Profile settings: public page tab.
- [ ] Profile settings: safety tab.
- [ ] Public profile with no entries.
- [ ] Public profile with long display name, bio, chapter, and entry content.
- [ ] Toasts, offline banner, and error states.

## Pass Criteria

- No horizontal page scroll.
- No clipped primary actions.
- Fixed modal footers clear the safe area and keyboard-height approximation.
- Touch targets are comfortable enough for thumb use.
- Text wraps without hiding neighboring controls.
- Public/private state is visible before saving an entry.
- Public page controls do not read like a feed or social network.
- Signed-out public pages do not ask visitors to react.

## Findings Log

Record each issue with viewport, screen, steps, and a screenshot if available.

- 2026-04-17: Checklist created. First manual/automated viewport pass still pending.
- 2026-04-17: Started targeted iOS-readiness cleanup from current `main`.
  Covered app/legal-page viewport metadata, safe-area modal overlays,
  keyboard-aware profile modal scrolling, wrapping toasts, stacked confirm
  dialog actions, and long view-entry titles.
- 2026-04-17: Continued the short-viewport pass. Auth, onboarding, age
  verification, public profile states, and modal viewport caps now lean on
  dynamic viewport and safe-area rules instead of older static `vh` assumptions.
- 2026-04-17: Continued app-shell iOS readiness. Loading/error states now keep
  safe-area padding, lazy fallbacks avoid nested full-screen spinners, and the
  virtualized journal list reacts to mobile visual viewport changes. Recovery
  and public-profile fallback actions now stack on narrow screens.
- 2026-04-18: Added the real hosted Supabase frontend env locally using ignored
  `.env` values. Ran a first unauthenticated viewport smoke against onboarding
  at the checklist sizes. Found and tightened narrow-width onboarding clipping
  with explicit panel and copy wrapping rules. Signed-in journal screens still
  need a QA account/session before this checklist can be marked complete.
