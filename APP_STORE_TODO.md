# App Store Submission Handoff

Last updated: 2026-07-09.

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
- 2026-07-09 signed-in QA pass (local dev frontend against the LIVE hosted
  Supabase backend, real owner account): entry delete ✓ (survives reload),
  reaction persistence ✓ (survives reload), short-height portrait `390 x 500`
  ✓ (no horizontal overflow; entry modal fits with save button reachable and
  83px tall). Sign-in error handling, age-verification gate, session
  persistence across reloads, and profile-theme loading also verified.
- The only QA gap left is re-running these flows on the production web host
  once it exists — the flows themselves are proven against the real backend.

## Best Next Moves

(2026-07-13: site is LIVE at https://retrowaveblog.com (+ www, + workers.dev
alias), auto-deploying from main. Email confirmation + password auth enabled;
anonymous sign-ins disabled; ghost accounts purged.)

1. Enroll in the Apple Developer Program ($99/yr — takes a day or two, start
   first).
2. DONE 2026-07-13: retrowaveblog.com bought (Cloudflare Registrar) and
   attached to the Worker via wrangler.jsonc routes.
3. DONE 2026-07-15: Resend SMTP live and the full signup chain verified
   end-to-end on the hosted backend. Signups are UNBLOCKED.
4. In Supabase URL Configuration: Site URL →
   https://retrowaveblog.com;
   Redirect URLs → add the web host and `com.retrowave.journal://`.
5. DONE 2026-07-15 (API-level). Optional: repeat once in the browser on
   retrowaveblog.com after fixing Site URL (was still localhost:5174 —
   confirmation links redirected wrong; verify Redirect URLs saved too).
6. DONE 2026-07-15: OPENAI_API_KEY set; moderation verified live.
7. Then App Store metadata, screenshots (simulator ready), and the reviewer
   account (create pre-confirmed via admin API so it skips email).

## Still Blocking Submission

### Hosted/App Setup

- [x] Restore or replace the frontend web host (2026-07-12: deployed to
      Cloudflare Workers at https://retrowave-blog.ldonald234.workers.dev —
      auto-deploys from main, build variables verified baked into the
      bundle).
- [ ] Configure the Supabase auth redirect URL for
      `com.retrowave.journal://`.
- [x] Configure custom SMTP in Supabase (2026-07-15: Resend wired via
      verified retrowaveblog.com domain; full chain verified live — signup →
      confirmation email → confirm → sign in. Rate limits raised).
- [x] Deploy the `moderate-content` edge function (deployed 2026-07-09 via
      linked CLI).
- [x] Set `OPENAI_API_KEY` in Supabase secrets (2026-07-15: verified live —
      clean/harmful/blocked-URL all return correct verdicts with checked:true;
      $5 OpenAI credit unblocked the 429s, auto-recharge off).
- [x] Host `privacy.html` and `terms.html` at public `https://` URLs
      (2026-07-12: live at /privacy and /terms on the workers.dev host).
- [ ] Review `terms.html` and `privacy.html` for legal accuracy and real contact
      info.
- [ ] Confirm `BLOG_OWNER_EMAIL` is correct and actively monitored.

### Apple/Mac Work

- [ ] Enroll in the Apple Developer Program.
- [x] Build the iOS app on a Mac in Xcode for the first time (2026-07-09:
      simulator build succeeded, app boots on iPhone 17 Pro / iOS 26.5).
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
