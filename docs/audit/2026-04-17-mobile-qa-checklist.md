# No-Mac Mobile QA Checklist

Branch: `fix/intentional-public-profile`

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
