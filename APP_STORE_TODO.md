# App Store Submission Handoff

Last updated: 2026-07-05.

This is the practical handoff version, not a compliance doc.

- The app is in decent shape for iPhone/App Store prep.
- The "no Mac" constraint is RESOLVED as of 2026-07-05: development now runs on
  a Mac with Xcode 26.6, Node 24, the gh CLI (authed), and the TypeScript
  language server. Remaining Mac work is actionable, not blocked.
- Still genuinely blocked: the hosted signed-in mobile QA pass, until the
  frontend Supabase host is restored or replaced after the 2026-04-26 NXDOMAIN
  failure.
- I am intentionally not freezing exact build times or test counts here. Re-run
  the final branch or CI right before submission and record whatever is current
  then.

## Where Things Stand

- 2026-07-05 code-health pass on `main`: fixed double-encoded emoji (mojibake)
  across Sidebar/Header/ProfileModal/PublicProfileView, fixed a ChapterChips
  hook-order crash on first-chapter creation, enabled TypeScript linting
  (previously lint checked nothing) and cleared all findings — lint, tsc,
  build, and the full test suite are green.
- The no-Mac mobile hardening work from `prep/ios-readiness` is merged into
  `main`.
- Safe-area, keyboard-space, narrow-width, and public-page viewport fixes were
  already audited in `docs/audit/2026-04-17-ios-readiness-pass.md`.
- The latest UX pass also tightened first-run setup, public-link entry,
  archive browsing, account-backed status, native sharing, and calmer draft
  recovery/saving language without needing a visual redesign.
- The remaining hosted signed-in QA still needs entry delete.
- The remaining hosted signed-in QA still needs signed-in reaction persistence.
- The remaining hosted signed-in QA still needs a short-height portrait pass
  around `390 x 500`.

## Best Next Moves

1. Enroll in the Apple Developer Program ($99/yr — takes a day or two, start
   first).
2. Download an iOS simulator runtime (`xcodebuild -downloadPlatform iOS` —
   none installed yet).
3. Create `.env` from `.env.example` with live Supabase credentials, then do
   the first real build: `npm run build && npx cap sync ios && npx cap open
ios` (see `/release` skill).
4. Restore or replace the frontend Supabase host used for hosted QA, then
   re-run the remaining signed-in mobile pass with the QA account/session.
5. After that, finish the App Store metadata, screenshots, and reviewer
   account.

## Still Blocking Submission

### Hosted/App Setup

- [ ] Restore or replace the frontend Supabase host so hosted signed-in QA can
      run again.
- [ ] Configure the Supabase auth redirect URL for
      `com.retrowave.journal://`.
- [ ] Deploy the `moderate-content` edge function.
- [ ] Set `OPENAI_API_KEY` in Supabase secrets for the hosted moderation path.
- [ ] Host `privacy.html` and `terms.html` at public `https://` URLs.
- [ ] Review `terms.html` and `privacy.html` for legal accuracy and real contact
      info.
- [ ] Confirm `BLOG_OWNER_EMAIL` is correct and actively monitored.

### Apple/Mac Work

- [ ] Enroll in the Apple Developer Program.
- [ ] Build the iOS app on a Mac in Xcode for the first time.
- [ ] Set up code signing in Xcode.
- [ ] Register bundle ID `com.retrowave.journal`.
- [ ] Create the App Store Connect listing.
- [ ] Capture App Store screenshots on Apple simulators/devices.
- [ ] Write the App Store description.
- [ ] Create a real reviewer/demo account for Apple.

## What Already Looks Good

- [x] User blocking exists for App Review Guideline 1.2 concerns.
- [x] Deep link URL scheme is already in `Info.plist`.
- [x] Entry creation is private by default and makes privacy state visible.
- [x] Profile status and public-sharing behavior now feel account-backed instead
      of device-fake.
- [x] Public profile pages stay read-only for signed-out visitors.
- [x] Browser storage failures are handled defensively in user-facing flows.
- [x] Focus restoration guards exist in `useFocusTrap`.
- [x] Mobile touch-target and narrow-width fixes from the no-Mac passes are on
      `prep/ios-readiness`.

## Real-Device Checks Still Worth Doing

- [ ] Test on a real iPhone or Apple simulator for safe areas, deep links,
      haptics, share sheet, status bar theming, and Safari/WebKit behavior.
- [ ] Verify the remaining hosted signed-in flows once the frontend Supabase
      host works again.
- [ ] Re-run the no-Mac mobile QA checklist after any further
      auth/public-profile/mobile changes.

## Before You Actually Submit

- [ ] Re-run `npm run lint`, `npm run typecheck`, `npm run test`, and
      `npm run build` on the final submission branch.
- [ ] Confirm the latest branch still matches the notes in the iOS readiness
      audit and this handoff doc.
- [ ] Make sure the reviewer/demo account is real, documented, and working.

## Useful Evidence Pointers

- `ios/App/App/Assets.xcassets/` for app icon and splash assets.
- `public/manifest.json` and `public/` icon assets for the web install surface.
- `Info.plist` for `ITSAppUsesNonExemptEncryption = NO` and deep-link URL
  scheme wiring.
- `AgeVerification.tsx` and `set_age_verification` for the COPPA gate.
- `ErrorBoundary.tsx` and `useOnlineStatus` for crash/offline handling.
- `docs/audit/2026-04-17-ios-readiness-pass.md` for the no-Mac viewport and
  hosted-QA history.

## Later, Not A Launch Blocker

- [ ] Add error tracking.
- [ ] Add accessibility testing in CI.
- [ ] Add deeper integration coverage for auth/posts/reactions/public-profile
      flows.
- [ ] Consider VoiceOver manual testing before launch.
- [ ] Add push notifications later only if the product actually needs them.
