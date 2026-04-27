# App Store Submission - TODO Checklist

Last reviewed: 2026-04-27.

This checklist mixes long-lived App Store work with point-in-time audit notes.
Reconfirm exact counts such as test totals, lazy-loaded component counts, and
build timing from the current branch or CI before submission.

Current no-Mac blocker:

- The remaining hosted signed-in mobile QA depends on restoring or replacing the
  frontend Supabase host after the 2026-04-26 NXDOMAIN failure documented in
  `docs/audit/2026-04-17-ios-readiness-pass.md`.

## How To Use This Doc

Work through the sections in order.

- **Blockers** must all be resolved before submission.
- **High Risk** items are likely rejection points.
- **Before Submit** items are smaller code or checklist confirmations.
- **Post-Launch** is optional.

## 1. Blockers

These are manual steps that still require Apple tooling, hosted setup, or
public URLs.

- [ ] Enroll in the Apple Developer Program.
- [ ] Build the iOS app on a Mac in Xcode for the first time.
- [ ] Set up code signing in Xcode.
- [ ] Register bundle ID `com.retrowave.journal`.
- [ ] Create the App Store Connect listing.
- [ ] Host `privacy.html` and `terms.html` at public `https://` URLs.
- [ ] Capture App Store screenshots on Apple simulators/devices.
- [ ] Write the App Store description.
- [ ] Deploy the `moderate-content` edge function and set `OPENAI_API_KEY` in Supabase secrets.
- [ ] Create a real reviewer/demo account for Apple.

## 2. High Risk

### Code/Product Work Already Done

- [x] User blocking for Guideline 1.2.
- [x] Deep link URL scheme added to `Info.plist`.
- [x] Private-by-default entry flow with visible privacy controls.
- [x] Public profile pages stay read-only for signed-out visitors.

### Manual Follow-Up Still Needed

- [ ] Configure the Supabase auth redirect URL for `com.retrowave.journal://`.
- [ ] Review `terms.html` and `privacy.html` for legal accuracy and real contact info.
- [ ] Confirm `BLOG_OWNER_EMAIL` is correct and actively monitored.
- [ ] Test on a real iPhone or Apple simulator for safe areas, deep links, haptics, share sheet, status bar theming, and Safari/WebKit behavior.
- [ ] Finish the remaining hosted signed-in mobile QA once the frontend Supabase host works again:
  - entry delete
  - signed-in reaction persistence
  - short-height portrait pass around `390 x 500`

## 3. Before Submit

- [x] Browser storage access is guarded in user-facing flows so private browsing or quota failures degrade gracefully.
- [x] Focus restoration guards exist in `useFocusTrap`.
- [x] Mobile touch targets and narrow-width fixes from the no-Mac passes are on the `prep/ios-readiness` branch.
- [ ] Re-run `npm run lint`, `npm run typecheck`, `npm run test`, and `npm run build` on the final submission branch.
- [ ] Re-run the no-Mac mobile QA checklist after any further auth/public-profile/mobile changes.

## 4. Post-Launch

- [ ] Add error tracking.
- [ ] Add push notifications if the product needs them later.
- [ ] Add accessibility testing in CI.
- [ ] Add deeper integration coverage for auth/posts/reactions/public-profile flows.
- [ ] Consider VoiceOver manual testing before launch.

## What Is Already In Place

| Requirement | Status | Evidence |
|---|---|---|
| App icon and splash assets | Yes | `ios/App/App/Assets.xcassets/` |
| PWA icons and manifest | Yes | `public/` assets and `public/manifest.json` |
| Encryption declaration | Yes | `ITSAppUsesNonExemptEncryption = NO` in `Info.plist` |
| COPPA age gate | Yes | `AgeVerification.tsx` plus `set_age_verification` RPC |
| Content moderation layers | Yes | local checks plus hosted edge-function path |
| Content reporting | Yes | report mailto links on entries/public pages |
| Error boundary | Yes | `ErrorBoundary.tsx` |
| Offline detection | Yes | `useOnlineStatus` plus offline banner |
| Browser storage safeguards | Yes | user-facing localStorage access is wrapped defensively |
| User blocking | Yes | `user_blocks`, block RPC, UI actions, feed filtering |
| Deep link URL scheme | Yes | `CFBundleURLTypes` in `Info.plist` |
| Code splitting | Yes | auth, onboarding, modal, and public-profile flows are lazy-loaded |
| Capacitor plugins | Yes | app/browser/haptics/ios/keyboard/share/splash-screen/status-bar |
| TypeScript strict mode | Yes | `tsconfig.json` enables `strict` and related safety flags |
| Build status | Yes | current branch build passes; verify the latest local run or CI for exact timing |
| Test status | Yes | current branch test suite passes; verify the latest local run or CI for the exact count |

## Estimated Remaining Work

| Phase | Time | Notes |
|---|---|---|
| Supabase redirect URL config | minutes | Dashboard-only task |
| Apple Developer enrollment | 1-2 days | depends on Apple approval |
| First Xcode build and fixes | 1-2 hours | Mac required |
| Screenshots and App Store copy | about 1 hour | Apple simulator/device required |
| Legal review | 1-3 days | depends on reviewer |
| Edge function deploy | minutes | Supabase CLI/dashboard |
| Submission and Apple review | several days | includes review wait time |
