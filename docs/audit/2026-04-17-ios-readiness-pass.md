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
- Recovery and public-profile fallback actions stack on narrow screens instead
  of competing for horizontal space.

## Pass 4: Real Supabase Env And First Viewport Smoke

Changed:

- Local ignored `.env` now uses the hosted Supabase project URL and publishable
  key so the app can render against the real project during no-Mac QA.
- The Supabase browser client accepts the current
  `VITE_SUPABASE_PUBLISHABLE_KEY` name while keeping the legacy
  `VITE_SUPABASE_ANON_KEY` fallback.
- `@supabase/supabase-js` was refreshed through npm.
- The first unauthenticated viewport smoke found the onboarding intro could
  let long decorative/copy text exceed narrow iPhone widths.
- Onboarding now uses an explicit mobile panel width and wrapping helpers for
  its intro content.

Not done here:

- Real browser screenshots for every checklist viewport.
- Signed-in mobile QA with a seeded/test journal account.
- Native iPhone keyboard verification.
- Xcode/App Store screenshot validation.

## Pass 5: Lightweight Chrome/Code Mobile Check

Checked:

- Chrome headless booted the app at `320 x 568`, `390 x 844`, and `844 x 390`
  and rendered expected diary/auth/onboarding text.
- Static review did not find a return of the old hard `95vh`/`90vh` modal caps
  or unsafe full-height assumptions outside the shared dynamic viewport rules.
- Onboarding, auth, age verification, entry editor, profile tabs, and public
  profile code paths still use the safe-area/keyboard-aware containers added in
  the earlier passes.
- Entry privacy remains visible in the editor body before title/content.
- Signed-out public pages remain read-only and do not ask visitors to react.

Not done here:

- Full visual approval for every checklist viewport.
- Signed-in mobile QA with real journal entries and hosted Supabase writes.
- Safari/WebKit behavior, native keyboard movement, or App Store screenshots.

## Pass 6: Signed-In Hosted Supabase Mobile Check

Checked:

- Created a disposable hosted Supabase QA account.
- Verified password auth directly against the hosted project.
- Ran the authenticated app shell in Chrome mobile emulation at `390 x 844`
  with the confirmed session preloaded.
- Created a private entry through the mobile editor and confirmed the hosted
  row saved with `is_private = true`.
- Edited the entry through the owner modal, switched it public, and confirmed
  the hosted row saved with `is_private = false`.
- Edited the profile display name through the mobile profile modal.
- Confirmed and saved public profile publishing through the mobile profile
  modal.
- Confirmed `get_public_profile` returns data after publishing.

Fixed:

- Header settings/logout controls now keep a 44px minimum width on mobile.
- Profile display name, bio, and current-music fields now have explicit
  accessible names.
- `mobile-web-app-capable` was added alongside the legacy Apple standalone meta
  tag to clear Chrome's warning.

Not done here:

- Manual login-form click-through inside the browser. Password auth was
  verified directly; the signed-in UI journey used a preloaded confirmed
  session.
- Entry delete and signed-in reaction persistence.
- Safari/WebKit behavior, native keyboard movement, or App Store screenshots.
- On 2026-04-26, a follow-up hosted QA pass for delete/reactions/short-height
  portrait was blocked because the configured hosted Supabase hostname
  `vzrdnyvoxvjlmymnhbjv.supabase.co` returned NXDOMAIN.

## Post-Pass Follow-Up - 2026-04-27

Changed:

- Fixed a cross-user profile cooldown edge case so rapid account switches do
  not reuse the previous user's profile/theme state.
- Scoped composer draft restore/save to the active user instead of a single
  global browser-storage key.
- Made chapter loading follow auth state so signed-out startup does not leave
  chapter data empty after a later login.
- Hardened public-profile loading so thrown Supabase/network failures resolve
  cleanly instead of leaving the page on an endless spinner.
- Refreshed stale repo docs: README setup/env guidance, App Store checklist
  evidence wording, and the older branch-inventory note so it reads as
  historical context instead of current state.

## UX Polish Follow-Up - 2026-05-01

Changed:

- Shared public profile links now bypass the intro/onboarding path and land
  directly on the intended public journal.
- First-run setup now focuses on the essentials first, then hands the user
  straight into writing the first entry instead of splitting setup across a
  separate intro plus a denser profile modal.
- Owner entry clicks now open the normal read view first, with editing kept as
  an explicit follow-up action.
- AIM-style profile status is now account-backed instead of device-local, so it
  follows the user across browsers/devices once the migration is applied.
- Archive browsing now keeps practical filters and sort choice sticky, shows
  active filter chips, and explains empty states in plain language.
- Composer save/publish feedback is more specific about private vs public
  posting, and local draft recovery/autosave copy is clearer.
- Public profile pages now set page metadata from the viewed profile and expose
  cleaner guest actions for browsing home or starting a journal.

Validation:

- `npm.cmd run typecheck`
- `npm.cmd run lint`
- `npm.cmd test` with 227 passing tests
- `npm.cmd run build`

## Next Pass

- Restore or replace the hosted Supabase frontend URL so the signed-in hosted
  QA pass can run again.
- Then use the QA account/session to cover the remaining signed-in flows:
  delete, reactions, and a keyboard-constrained portrait pass.
- Turn any findings into small fixes with before/after notes.
