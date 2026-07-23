# App Store Submission Handoff

Last updated: 2026-07-22.

This is the practical handoff version, not a compliance doc.

**➡️ The master runbook for the Apple submission is
[docs/app-store-submission-guide.md](docs/app-store-submission-guide.md)** —
paste-ready listing copy, App Privacy answers, age rating, review notes with
the live demo account, Xcode steps, and the screenshot plan. Start there.

- The whole web + backend + security surface is DONE and live. What remains is
  Apple-side (Xcode signing/archive/upload + App Store Connect listing) plus
  capturing screenshots.
- Live at https://retrowaveblog.com (custom domain, iPhone-only build). Auth,
  email confirmation (Resend SMTP), AI moderation, RLS, security headers,
  HTTPS redirect, and hosted legal/support pages are all verified in prod.
- Dev runs on a Mac with Xcode 26.6, Node 24, iOS 26.5 simulator, gh CLI.

## Session 2026-07-22 (what changed most recently)

- **Full multi-agent review** run and fixed: closed a CRITICAL RLS leak
  (anonymous could read all profiles — fixed via SQL editor, verified 0 rows
  to anon for profiles/posts/reactions), plus contrast (all 8 themes now AA),
  a post-truncation data-loss guard, duplicate-`useAuth` refactor
  (`lib/auth-actions.ts`), a11y fixes, and security headers (`public/_headers`:
  CSP/HSTS/etc., verified non-breaking live).
- **HTTP→HTTPS** "Always Use HTTPS" enabled in Cloudflare; redirect verified.
- **App Store prep:** app icon alpha channel stripped (was a silent-rejection
  blocker); device family set to iPhone-only; reviewer demo account created
  (`appreview@retrowaveblog.com` / `AppReview!2026rw`, pre-confirmed,
  age-verified, 3 public seed entries); Support page added
  (retrowaveblog.com/support); the submission guide written.
- Legal/support pages redesigned to the app aesthetic and de-dashed; app's
  5 user-facing em-dashes removed too.
- Store name decided: **"Retrowave Journal"** (home-screen name stays
  "My Journal"). Category: Lifestyle / Social Networking. Target rating 12+.

## Remaining to submit (all Apple-side)

1. Run `sudo xcode-select -s /Applications/Xcode.app/Contents/Developer` (needs
   the user's password) so the simulator control tool can drive tap/type — then
   capture the remaining 5 App Store screenshots (plan in the guide, Part 6).
   The signup screenshot is already captured; iPhone-only build compiles + runs.
2. Confirm Apple Developer Program enrollment is active.
3. Xcode: set signing Team → archive → upload (guide Part 1).
4. App Store Connect: create the app record ("Retrowave Journal"), paste the
   listing copy / App Privacy / age rating / review notes (guide Parts 2–5),
   upload screenshots, submit.

## Prior context (pre-2026-07-22)

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
4. DONE 2026-07-15: Site URL + redirect URLs configured and verified.
5. DONE 2026-07-15: full signup chain verified (signup → confirmation email
   → confirm → sign in) against the hosted backend.
6. DONE 2026-07-15: OPENAI_API_KEY set; moderation verified live.
7. Then App Store metadata, screenshots (simulator ready), and the reviewer
   account (create pre-confirmed via admin API so it skips email).

## Still Blocking Submission

### Hosted/App Setup

- [x] Restore or replace the frontend web host (2026-07-12: deployed to
      Cloudflare Workers at https://retrowave-blog.ldonald234.workers.dev —
      auto-deploys from main, build variables verified baked into the
      bundle).
- [x] Cloudflare "Always Use HTTPS" enabled (2026-07-22: http→https 301
      verified, single redirect, no loop). HSTS (2yr, preload) via
      public/\_headers. Security headers (CSP/X-Frame/etc.) live + non-breaking.
- [x] Configure Supabase auth URLs (2026-07-15: Site URL →
      https://retrowaveblog.com, redirect URLs include the web host and
      `com.retrowave.journal://` — verified via admin generate_link).
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
- [x] Review + redesign `privacy`/`terms`/`support` pages (2026-07-22: on-brand
      restyle, contact = support@retrowaveblog.com, DiceBear added to processor
      list, de-dashed, links verified live). A lawyer's eye is still worthwhile
      but content is accurate to the app.
- [x] Confirm `BLOG_OWNER_EMAIL` (2026-07-15: switched to
      support@retrowaveblog.com; Cloudflare Email Routing forwards to the
      owner's Gmail — verified with a live forwarded test email).

### Apple/Mac Work

- [ ] Confirm Apple Developer Program enrollment is active.
- [x] Build the iOS app on a Mac in Xcode (2026-07-09 first build; 2026-07-22
      iPhone-only build compiles + launches on iPhone 17 Pro Max sim).
- [x] Icon App-Store-ready (2026-07-22: alpha channel stripped — was a silent
      ITMS-90717 rejection risk).
- [x] Bundle ID `com.retrowave.journal` set everywhere (auto-registers in
      Xcode on Team select; no manual portal step needed).
- [x] Write the App Store description + all listing metadata (in the guide).
- [x] Create the reviewer/demo account (appreview@retrowaveblog.com /
      AppReview!2026rw — pre-confirmed, age-verified, 3 public seed entries).
- [ ] Set up code signing in Xcode (select Team — needs the Apple ID).
- [ ] Capture the remaining 5 screenshots (needs `sudo xcode-select` first).
- [ ] Create the App Store Connect app record + submit (paste from the guide).

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
