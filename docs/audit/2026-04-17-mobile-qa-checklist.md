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

## Lightweight Chrome/Code Pass - 2026-04-18

This pass used Chrome on Windows because it is the most useful local browser
available for quick responsive checks. It is not a substitute for Safari,
Capacitor, Xcode, or a real iPhone.

Covered:

- Headless Chrome boot smoke at `320 x 568`, `390 x 844`, and `844 x 390`.
  The app mounted and rendered expected diary/auth/onboarding text at each
  size.
- Code/static scan for old fixed viewport assumptions, modal safe-area helpers,
  keyboard-safe scroll containers, narrow fixed widths, reaction prompts, and
  public/private wording.
- Unauthenticated startup, onboarding, auth, and age-verification paths by code
  review.
- Entry editor mobile risks by code review, including the visible entry privacy
  control before title/content.
- Profile settings tabs by code review, including the mobile horizontal tab row
  and keyboard-safe content area.
- Public profile read-only positioning by code review. Signed-out public pages
  still do not expose reaction prompts.

Found:

- No new obvious mobile layout bug in this lightweight pass.
- The earlier real-env smoke had already found narrow onboarding clipping; that
  was fixed in the previous pass with explicit panel width and wrapping rules.

Still not covered by this lightweight pass:

- Signed-in hosted Supabase flows. Most of this was covered in the later
  signed-in pass below.
- iOS Safari/WebKit keyboard behavior, text zoom, momentum scrolling, and
  native safe-area/status-bar behavior.
- App Store screenshot review on real device sizes.

## Signed-In Hosted Supabase Pass - 2026-04-18

This pass used a disposable hosted Supabase QA account and Chrome mobile
emulation at `390 x 844`. The session was preloaded after password auth was
verified directly against Supabase, so the app UI coverage starts from an
authenticated session rather than a manual login tap.

Verified:

- Password auth succeeds for the disposable QA account.
- Signed-in app shell renders with no horizontal page overflow at `390 x 844`.
- A new entry can be created through the mobile editor and starts private.
- Entry privacy is visible in the editor before title/content.
- The created entry saved to hosted Supabase with `is_private = true`.
- The owner edit flow can update that entry and switch it to public.
- The edited entry saved to hosted Supabase with `is_private = false`.
- Profile display name can be edited through the mobile profile modal.
- Public profile publishing can be confirmed and saved through the mobile
  profile modal.
- `get_public_profile` returns data for the QA profile after publishing.

Found and fixed:

- Header settings/logout icon buttons were only about 24 CSS pixels wide on
  mobile. They now keep a 44px minimum hit area.
- Profile display name, bio, and current-music fields were visually grouped by
  headings but lacked direct accessible names. They now have explicit
  `aria-label` values.
- Chrome warned that `apple-mobile-web-app-capable` is deprecated without the
  modern companion meta tag. `mobile-web-app-capable` was added.

Still not covered:

- Manual DOM click-through of the login form. Password auth itself was verified,
  but the Chrome automation used a preloaded confirmed session for the signed-in
  app journey.
- Entry delete.
- Signed-in reaction tap/persistence.
- Real iOS Safari/WebKit keyboard behavior, text zoom, momentum scrolling, and
  native safe-area/status-bar behavior.
- App Store screenshot review on real device sizes.

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
- 2026-04-18: Ran a lightweight Chrome/code pass instead of pretending Windows
  can certify an iPhone app. Chrome booted the app at `320 x 568`, `390 x 844`,
  and `844 x 390`; static review covered safe areas, keyboard-aware containers,
  entry privacy placement, profile tabs, and signed-out public page reactions.
  No new obvious fix was found. The remaining checklist work needs a signed-in
  QA account/session and later real iPhone/WebKit testing.
- 2026-04-18: Created a disposable hosted Supabase QA account and ran the
  signed-in mobile journey at `390 x 844`. Verified private entry create,
  privacy edit to public, profile edit, public page publish, and public profile
  RPC state against hosted Supabase. Fixed the issues found during that pass:
  narrow header icon hit areas, missing accessible names on profile fields, and
  Chrome's deprecated mobile-web-app meta warning.
- 2026-04-26: Attempted the remaining hosted signed-in checks for entry delete,
  signed-in reaction persistence, and a `390 x 500` keyboard-constrained
  portrait pass. Blocked before app QA because the configured hosted Supabase
  hostname `vzrdnyvoxvjlmymnhbjv.supabase.co` returned NXDOMAIN from this
  machine. These remaining checks now depend on restoring that hosted project
  URL or replacing the frontend Supabase URL with the current project host.
