# App Store Submission — TODO Checklist

Last audited: 2026-02-24. Full-stack review of code, Apple Guidelines, and production readiness.

---

## How to Use This Doc

Work through the sections in order. **Blockers** must all be resolved before you can submit. **High Risk** items will likely cause Apple to reject your app. **Before Submit** items are code fixes you (or Claude) can do. **Post-Launch** is optional.

---

## 1. BLOCKERS — Can't Submit Without These

These are all manual steps that require a Mac, money, or Apple's website. Claude can't do them for you.

- [ ] **Enroll in Apple Developer Program** ($99/year) at [developer.apple.com](https://developer.apple.com/programs/enroll/)
- [ ] **First iOS build on a Mac** — the app has never been compiled in Xcode. Run:
  ```bash
  npm run build
  npx cap sync ios
  npx cap open ios
  ```
  Then in Xcode: select a simulator → Product → Build (Cmd+B). Fix any compiler errors.
- [ ] **Set up code signing** — in Xcode, select the project → App target → Signing & Capabilities → set your Apple Developer team. Xcode auto-creates provisioning profiles.
- [ ] **Register Bundle ID** — in [Apple Developer portal](https://developer.apple.com/account/resources/identifiers/list), register `com.retrowave.journal` as a new App ID
- [ ] **Create App Store Connect listing** at [appstoreconnect.apple.com](https://appstoreconnect.apple.com):
  - App name: **My Journal**
  - Bundle ID: `com.retrowave.journal`
  - Primary category: **Lifestyle** (or Social Networking)
  - Content rating: **17+** (required for UGC apps)
  - Privacy Policy URL: must be a public `https://` URL (see below)
- [ ] **Host privacy.html and terms.html publicly** — Apple requires `https://` URLs, not local files. Options:
  - Deploy the whole app to Vercel/Netlify (then use `https://yourapp.com/privacy.html`)
  - Or upload just those 2 files to any web host / Supabase Storage
- [ ] **Take App Store screenshots** — required sizes:
  - iPhone 6.9" (1320×2868) — iPhone 15 Pro Max simulator
  - iPhone 6.5" (1284×2778) — iPhone 14 Plus simulator
  - iPad Pro 12.9" (2048×2732) — iPad Pro simulator
  - Tip: use Xcode Simulator → File → Save Screen
- [ ] **Write app description** for the App Store listing (50-170 chars recommended)
- [ ] **Deploy the moderation edge function**:
  ```bash
  supabase functions deploy moderate-content
  supabase secrets set OPENAI_API_KEY=sk-...
  ```
  Without this, content moderation only runs client-side regex (no AI layer).
- [ ] **Create a demo account** for Apple reviewers — they need login credentials to test the app. Create a real account with a valid email, then include the email + password in App Store Connect's "App Review Information" section.

---

## 2. HIGH RISK — Apple Will Likely Reject Without These

### Code Changes Needed (Claude can do these)

- [x] **Add user blocking** (Apple Guideline 1.2) — ✅ Done in Session 18. `user_blocks` table, `toggle_user_block` RPC, feed RPCs filter blocked users, PostCard block button, ProfileModal unblock list.

- [x] **Add deep link URL scheme to Info.plist** — ✅ Done in Session 18. Added `CFBundleURLTypes` with scheme `com.retrowave.journal`. Still need to configure Supabase redirect URL to `com.retrowave.journal://` in dashboard under Auth → URL Configuration.

### Manual Steps

- [ ] **Review terms.html and privacy.html** — both are AI-generated placeholder legal text. They're mostly accurate but not lawyer-reviewed. Apple's review team reads these for UGC apps. At minimum, verify:
  - Your email address is correct throughout
  - The data handling description matches what you actually do
  - COPPA age requirement (13+) is stated
  - OpenAI moderation disclosure is present (it is)
- [ ] **Confirm BLOG_OWNER_EMAIL is correct** — currently set to `retrowave.blog.app@gmail.com` in `src/lib/constants.ts`. This email appears in:
  - Every post's "report" link (Apple requires working reporting)
  - `privacy.html` contact section
  - `terms.html` contact section
  - Make sure this email exists and you check it regularly
- [ ] **Test on a real iPhone** (or Xcode simulator with notch):
  - Safe-area padding on modals (iPhone 14+ home indicator)
  - Input zoom prevention (font-size 16px on iOS Safari)
  - Deep link auth redirect (magic link → app)
  - Haptic feedback on reactions
  - Share sheet
  - Status bar theming per app theme

---

## 3. BEFORE SUBMIT — Quick Code Fixes

These are small bugs found during the audit. Takes ~30 minutes total.

- [x] **Fix Header.tsx localStorage crash** — ✅ Done in Session 18. Added try/catch on both read (line 26) and write (line 46).

- [x] **Fix emojiStyles.ts setEmojiStyle missing try/catch** — ✅ Done in Session 18. Wrapped `localStorage.setItem()` in try/catch.

- [x] **Guard focus restore in useFocusTrap** — ✅ Already had proper guards (line 81 checks null + typeof). No fix needed.

---

## 4. POST-LAUNCH — Nice to Have

Not required for App Store approval, but improves quality.

- [ ] Add error tracking (Sentry free tier) — currently errors only go to console
- [ ] Add push notifications via `@capacitor/push-notifications` — strengthens "not just a WebView" argument if Apple rejects for Guideline 4.2
- [ ] Add accessibility testing with axe-core in CI
- [ ] Add integration tests for `usePosts` and `useReactions` hooks
- [ ] Consider VoiceOver manual testing before launch

---

## What's Already Done (No Action Needed)

These were verified during the audit and are App Store ready:

| Requirement | Status | Evidence |
|---|---|---|
| App icon (1024px PNG) | ✅ | `ios/App/App/Assets.xcassets/AppIcon.appiconset/` |
| Splash screen (3 scales) | ✅ | `ios/App/App/Assets.xcassets/Splash.imageset/` |
| PWA icons (192, 512, 180) | ✅ | `public/icon-*.png`, `public/apple-touch-icon.png` |
| Favicon | ✅ | `public/favicon.png` (32x32) |
| PWA manifest | ✅ | `public/manifest.json` (name, icons, theme) |
| Encryption declaration | ✅ | `ITSAppUsesNonExemptEncryption = NO` in Info.plist |
| Portrait-only (iPhone) | ✅ | Info.plist `UISupportedInterfaceOrientations` |
| All orientations (iPad) | ✅ | Info.plist `~ipad` variant |
| COPPA age gate | ✅ | `AgeVerification.tsx` + `set_age_verification` RPC |
| Content moderation | ✅ | Client regex + OpenAI edge function (3-layer) |
| Content reporting | ✅ | `mailto:` link on every post (Apple 1.2) |
| TOS acceptance | ✅ | Required checkbox before signup |
| No hardcoded secrets | ✅ | OpenAI key in Supabase secrets only |
| Error boundaries | ✅ | `ErrorBoundary.tsx` wraps entire app |
| Offline detection | ✅ | `useOnlineStatus` hook + offline banner |
| localStorage safety | ✅ | try/catch on all reads and writes (Header.tsx + emojiStyles.ts fixed in Session 18) |
| User blocking (Apple 1.2) | ✅ | `user_blocks` table, `toggle_user_block` RPC, feed filter, PostCard block button, ProfileModal unblock list |
| Deep link URL scheme | ✅ | `CFBundleURLTypes` in Info.plist with scheme `com.retrowave.journal` |
| Code splitting | ✅ | 5 lazy-loaded modal components |
| Capacitor plugins (7) | ✅ | Deep links, status bar, keyboard, haptics, share, browser, splash |
| No debug console.log | ✅ | Only console.warn/error in error handlers |
| TypeScript strict | ✅ | No `any` types, no @ts-ignore |
| Build passes | ✅ | `npm run build` clean, 6.84s |
| Tests pass | ✅ | 27/27 Vitest tests |

---

## Estimated Timeline

| Phase | Time | What | Status |
|-------|------|------|--------|
| ~~Code fixes (Section 3)~~ | ~~30 min~~ | ~~localStorage, focus trap~~ | ✅ Done |
| ~~User blocking (Section 2)~~ | ~~2-4 hours~~ | ~~Migration + RPC + UI~~ | ✅ Done |
| ~~Deep link URL scheme (Section 2)~~ | ~~15 min~~ | ~~Info.plist~~ | ✅ Done |
| Supabase redirect URL config | 5 min | Set `com.retrowave.journal://` in Supabase Auth settings | Pending |
| Apple Developer enrollment | 1-2 days | Account approval | Pending |
| First Xcode build + fixes | 1-2 hours | On a Mac | Pending |
| Screenshots + description | 1 hour | Xcode Simulator | Pending |
| Legal review | 1-3 days | Lawyer or self-review | Pending |
| Edge function deployment | 15 min | CLI commands | Pending |
| App Store submission | 30 min | Upload + metadata | Pending |
| Apple review | 1-3 days | Waiting period | Pending |
| **Total** | **~1 week** | Code is done — remaining is setup + waiting | |
