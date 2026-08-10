# Retrowave Journal — App Store Submission Guide

The single source of truth for shipping v1.0 to the App Store. Paste-ready
listing copy, App Privacy answers, age rating, review notes, Xcode steps, and
the screenshot plan.

- **Store name:** Retrowave Journal · **Home-screen name:** My Journal
- **Bundle ID:** `com.retrowave.journal` · **Version:** 1.0 (1)
- **iPhone-only, portrait.** · **Live web app:** https://retrowaveblog.com
- Dev machine: Xcode 26.6, Node 24, iOS 26.5 simulator, `gh` CLI, `xcode-select`
  pointed at `/Applications/Xcode.app/Contents/Developer`.

---

## Where things stand

**The web app, backend, and security surface are done and live.** Auth, email
confirmation (Resend SMTP), AI moderation, RLS, security headers, HTTPS
redirect, and the hosted legal/support pages are all verified in production.

**What remains is Apple-side only:** signing, archive/upload, the App Store
Connect listing, and one last screenshot.

Already handled in code and backend:

- App icon **alpha channel stripped** (App Store rejects icons with transparency). Opaque 1024×1024.
- `TARGETED_DEVICE_FAMILY = "1"` (iPhone-only), portrait-locked, iPad orientation key removed.
- Bundle ID, version/build, launch screen, deep-link URL scheme, `ITSAppUsesNonExemptEncryption = NO`, deployment target (iOS 15) — all correct.
- **Reviewer demo account** created, pre-confirmed, age-verified, 3 public sample entries. Credentials in Part 5.
- **Support page** live (App Store requires a support URL): https://retrowaveblog.com/support
- Privacy + Terms pages live and current.
- Cloudflare "Always Use HTTPS" enabled; http→https 301 verified, single redirect.

## What only you can do (needs your Apple ID / GUI)

1. Set the signing **Team** in Xcode and archive/upload the build.
2. Create the app record + fill the listing in **App Store Connect** (all copy below is paste-ready).
3. Upload screenshots — 5 of 6 are already captured, see Part 6.

---

## Part 1 — Xcode: sign, archive, upload

Prereq: confirm your **Apple Developer Program** enrollment is active for the Apple ID you'll sign with.

```bash
cd ~/Desktop/retrowave-blog
npm run build && npx cap sync ios      # bundle latest web build + plugins
npx cap open ios                        # opens the iOS project in Xcode
```

In Xcode:

1. Select the **App** target → **Signing & Capabilities**.
2. Check **Automatically manage signing** → choose your **Team**. Xcode registers the `com.retrowave.journal` App ID for you (no need to pre-register it in the portal).
3. Set the run destination to **Any iOS Device (arm64)** (not a simulator).
4. **Product → Archive.**
5. When the Organizer opens: **Distribute App → App Store Connect → Upload.** Export compliance is auto-skipped (the encryption flag is set).

If archive complains "Signing requires a development team," you missed step 2.

---

## Part 2 — App Store Connect listing (paste-ready)

**App Name:** `Retrowave Journal`

**Subtitle (≤30):** `Private diary with retro vibes`

**Promotional Text (≤170):**

> Pour your heart out in a private journal that feels like 2005. Set your mood, add a song, pick a glittery theme, and write just for you. Keep it private.

**Description:**

```
Remember 2005? Blinking cursors, glittery text, a song playing on every page, and a little box online where you could just... be yourself. Retrowave Journal brings that feeling back. It's a private place to write down your life, your way.

WRITE JUST FOR YOU
Your entries are private by default. This is your diary, not a feed to perform for. Log what happened, how you felt, and what song was stuck in your head. Nobody reads it unless you decide to share.

SET THE MOOD
Give every entry its own little vibe. Pick a mood from a huge emoji list, note the song you're currently listening to, and drop in a YouTube music embed so your soundtrack plays right where you wrote it.

MAKE IT YOURS
Choose from 8 hand-made themes: soft pastels, moody dark scene looks, cottage softness, neon y2k, grunge, and more. Turn on glitter text and sparkly cursor trails. Decorate your corner of the internet exactly the way you remember doing it.

SHARE ONLY IF YOU WANT
Keep everything locked to yourself, or opt in to a public profile page and let friends read the entries you choose to make public. Leave emoji reactions on posts. It's your call, every single time.

SAFE BY DESIGN
- Private by default, so sharing is always opt-in
- Block anyone you don't want to hear from
- Report content in a tap
- Automatic content filtering helps keep things kind
- 13+ only, with an age check when you sign up
- No ads. No trackers. No third-party analytics. We never sell your data.

WE COLLECT THE BARE MINIMUM
Just your email to sign in and your birth year to confirm you're old enough, and your birth year is never shown to anyone. That's it. Your journal belongs to you.

Pull up a chair, put on a song, and start writing. Your 2005 diary is waiting. ✨

Privacy Policy: https://retrowaveblog.com/privacy
Terms of Use: https://retrowaveblog.com/terms
Questions? support@retrowaveblog.com
```

**Keywords (≤100, no spaces):**
`mood,y2k,glitter,2005,notebook,daily,feelings,writing,scene,emo,nostalgia,sparkle,memories,secret`

**What's New (v1.0):**

> Welcome to Retrowave Journal 1.0! ✨ Your private little corner of 2005 is officially open. Start a journal, set your mood, add a song, and pick from 8 dreamy themes with glitter and sparkle cursors. Everything's private by default, so share only what you want. Thanks for being here. More themes and surprises coming soon. 💕

**Category:** Primary **Lifestyle**, Secondary **Social Networking**.

**URLs:** Support `https://retrowaveblog.com/support` · Marketing `https://retrowaveblog.com` · Privacy `https://retrowaveblog.com/privacy`

_Keyword hygiene: no trademarks (Xanga/MySpace/etc. stay out of all public metadata even though internal theme ids use them), no "teen/kids" language, no title-word repetition, no unverifiable superlatives._

---

## Part 3 — App Privacy questionnaire

**"Do you collect data?"** → Yes. **"Used to track users?"** → **No**, for every type (no IDFA, no ATT, no ad/analytics SDKs).

**Declare these 4 — all Linked to identity, none used for tracking, purpose = App Functionality:**

| Apple type                            | Notes                                                                                                                         |
| ------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| Contact Info → **Email Address**      | account auth / confirmation / password reset / support                                                                        |
| Identifiers → **User ID**             | the account UUID (`profiles.id`)                                                                                              |
| User Content → **Other User Content** | journal entries + profile fields + emoji reactions. Check _only_ "Other User Content" — NOT Photos/Videos, Audio, or Gameplay |
| Other Data → **Other Data Types**     | birth year, for age verification only, never shown publicly                                                                   |

**Mark NOT collected:** Name, Phone, Address; Health; Financial; Location; Sensitive Info; Contacts; Photos/Videos (avatars are DiceBear illustrations, not device photos); Audio; Browsing/Search History; Device ID; Purchases; Usage Data; Diagnostics.

Processors (your side, not tracking): Supabase/AWS, Cloudflare, Resend, OpenAI (moderation), DiceBear (avatar image). Account deletion + data export exist in-app (satisfies Apple's deletion requirement).

---

## Part 4 — Age Rating questionnaire

All content questions (violence, profanity, sexual, horror, drugs, gambling, etc.) → **None**.

Capability/context:

- Unrestricted Web Access → **No** (WKWebView of own domain; YouTube is embedded music only, no browser/address bar)
- Gambling / Contests → **No**
- **User-Generated Content → Yes** (answer honestly — entries, public profiles, reactions)
- Moderated with report + block? → **Yes** (see Guideline 1.2 below)
- Age gate → **Yes, 13+**
- **Made for Kids → No** (do not enroll in Kids Category)

**Target rating: 12+** (aligns with the 13+ gate; Apple may push higher for public UGC — 12+ is the defensible answer given the safeguards + private-by-default design).

**Guideline 1.2 (UGC safety) — all four present:**

1. **Filter** — client + server slur/hate regex + adult-URL/domain blocklists, **plus live OpenAI moderation** on every **public** entry (the `moderate-content` edge function; the API key is set and verified active in production). Private entries are deliberately not sent to OpenAI — they have no audience to protect, and shipping a user's diary to a third party for no benefit would contradict the privacy promise in the listing.
2. **Report** — an in-app report dialog on every public entry (5 reason categories + optional detail) writes a durable row to `content_reports` via the `report_public_post` RPC, and confirms to the user. Works signed-out, since a public page is reachable from a shared link. A database webhook fires the `notify-report` edge function, which emails support@retrowaveblog.com so the queue is not left unread.
3. **Block** — a `block @username` control on the public profile page, via the `block_user_by_username` RPC. Blocked authors' content is excluded from the feed RPCs.
4. **Policy + action** — Terms/Privacy published and reachable in-app via SFSafariViewController; solo operator reviews `content_reports` and removes content / bans accounts.

**Report queue operations.** Reports land in `public.content_reports` (`status` = `open` → `actioned` / `dismissed`). RLS is enabled with **no policies**, so the table is unreadable via the API.

The operator gets an email per report carrying the entry title, an excerpt, the author's and reporter's usernames, and how many reports the entry has — enough to judge it without opening anything. The email links to an in-app moderation queue (`#/report/<id>`), which lists open reports with **hide entry** (sets `is_private`, reversible) and **dismiss**.

That link carries no authority: the screen only renders for a profile with `is_admin`, and `admin_list_reports` / `admin_resolve_report` are revoked from `anon` and re-check `is_admin()` server-side. Admin is held by the owner account only — **never the `appreview@` demo account**, since App Review signs into it.

Dashboard fallback if you ever need it:

```sql
select id, reason, details, created_at from public.content_reports where status = 'open' order by created_at;
```

---

## Part 5 — App Review notes (paste into the reviewer box)

```
Retrowave Journal is a private, 2005-nostalgia personal journaling app. It's a
Capacitor/WKWebView wrapper around our web app (https://retrowaveblog.com) with a
Supabase backend.

SIGN IN (demo account, already confirmed & age-verified, log in immediately):
  Email:    appreview@retrowaveblog.com
  Password: AppReview!2026rw
On the auth screen tap "Sign In" (not Sign Up), enter the above, tap sign in.
Email confirmation is enabled for real users, but this demo account is already
confirmed, so no inbox access is needed. The account has 3 public sample entries.

WHAT IT IS: Users write journal entries, PRIVATE BY DEFAULT (only the author sees
them). A user may optionally opt in to a public profile and make individual entries
public. Emoji reactions on public entries. No ads, no analytics, no external browser.

CREATE AN ENTRY: after signing in, tap "new entry" → add title/body, optionally set
mood, music (YouTube link), chapter → save. Default is PRIVATE (padlock shows
"make public").

MAKE PUBLIC: in the editor, tap "🔓 make public" before saving.

UGC SAFETY (Guideline 1.2): FILTER = automated moderation on every public entry
(client + server slur/hate + adult-URL blocklist, plus OpenAI moderation via a
Supabase edge function). REPORT = a report dialog on every public entry writes a
durable record, and a database webhook emails support@retrowaveblog.com so it is
seen promptly. BLOCK = a "block @username" control on the public profile page hides
that author's content. Policy: Terms https://retrowaveblog.com/terms, Privacy
https://retrowaveblog.com/privacy. We monitor the report queue and remove content /
ban accounts as needed.

AGE GATE: signup collects birth year and blocks under-13 (COPPA). Birth year is
used only for age verification and is never shown publicly.

SUPPORT: support@retrowaveblog.com  ·  https://retrowaveblog.com/support
```

_Keep the demo account (`appreview@retrowaveblog.com`) alive until the app is approved._

---

## Part 6 — Screenshots (iPhone 6.9")

**Five of six are already captured** in `store-assets/screenshots/`:
`01-themes`, `02-feed`, `03-composer`, `04-signup`, `05-public-profile`.
Only **06 — empty-journal first run** is missing.

- **Capture device:** iPhone 17 Pro Max simulator (UDID `296A830B-AE5D-4123-9A94-5E676FEAD090`) — the 6.9" device. _Do NOT use iPhone 17 Pro (6.3", wrong size)._
- **Count:** 1 min, 10 max — ship **6**.
- Clean status bar before capturing: `xcrun simctl status_bar <UDID> override --time "9:41" --batteryLevel 100 --cellularBars 4 --wifiBars 3`
- Capture: `xcrun simctl io <UDID> screenshot store-assets/screenshots/NN-name.png`

**Size check before uploading.** The captured files are **1320 × 2868** (iPhone 17 Pro Max native). Earlier notes in this guide said 1290 × 2796, which is the older 6.9" size. Both have been valid 6.9" sizes at different points — confirm which App Store Connect accepts when you upload, and re-capture on a 1290 × 2796 device only if it rejects them. Do not assume.

**Shot list (order sells the fantasy → proves it's real → privacy hook):**

1. Theme picker (Edit profile → "vibe" tab) with all 8 themes — _"8 vibes. pick ur whole personality."_
2. Populated feed with entries + moods + reactions (use a vivid theme) — _"ur diary. moods, music & lil emoji reactions."_
3. New-entry composer (mood + music + theme) — _"write it down. drop a song. set the mood. ♡"_
4. Signup "Create Your Xanga" screen with the 13+ age gate — _"make ur xanga in 2 mins (13+, we card u)."_
5. Public profile page in a chosen theme — _"go public when u want. or stay secret. ur rules."_
6. Empty-journal first run — _"a blank page, just for u. private by default."_

Captions are optional and must be baked into the image (App Store Connect has no caption field). Raw screenshots are valid to ship.

---

## Before you submit

- [ ] Re-run `npx tsc --noEmit && npm run build && npm run test` and `npm run lint` on the submission commit.
- [ ] Confirm the reviewer demo account still signs in and still has its public entries.
- [ ] Bump `MARKETING_VERSION` / `CURRENT_PROJECT_VERSION` if this is not the first upload — the build number must increase on every upload.

## Remaining human checklist

- [ ] Confirm Apple Developer Program enrollment is active.
- [ ] Capture screenshot 06 (empty-journal first run).
- [ ] Xcode: set Team, archive, upload (Part 1).
- [ ] App Store Connect: create the app record (name "Retrowave Journal"), paste Parts 2–4.
- [ ] Upload screenshots (Part 6).
- [ ] Paste App Review notes (Part 5); confirm the demo account works.
- [ ] Submit for review.

---

## Evidence pointers

- `ios/App/App/Assets.xcassets/` — app icon and splash assets.
- `public/manifest.json` and `public/` icons — the web install surface.
- `Info.plist` — `ITSAppUsesNonExemptEncryption = NO` and deep-link URL scheme.
- `AgeVerification.tsx` and `set_age_verification` — the COPPA gate.
- `ErrorBoundary.tsx` and `useOnlineStatus` — crash/offline handling.
- `docs/audit/backend-privacy-smoke-checks.md` — privacy smoke checks to run
  before shipping privacy-sensitive changes.

## After launch, not blockers

- [ ] Add error tracking.
- [ ] Add accessibility testing in CI.
- [ ] Deeper integration coverage for auth/posts/reactions/public-profile flows.
- [ ] VoiceOver manual testing.
- [ ] Push notifications only if the product actually needs them.
