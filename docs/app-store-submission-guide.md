# Retrowave Journal — App Store Submission Guide

Everything needed to submit v1.0 (build 1) to the App Store. Generated 2026-07-22
from a multi-agent prep pass, adversarially verified, and corrected against the
live production state.

- **Store name:** Retrowave Journal · **Home-screen name:** My Journal
- **Bundle ID:** `com.retrowave.journal` · **Version:** 1.0 (1)
- **iPhone-only, portrait.** · **Live web app:** https://retrowaveblog.com

---

## ✅ Already done for you (in code / backend)

- App icon **alpha channel stripped** (App Store rejects icons with transparency). Now opaque 1024×1024.
- `TARGETED_DEVICE_FAMILY = "1"` (iPhone-only), portrait-locked, iPad orientation key removed.
- Bundle ID, version/build, launch screen, deep-link URL scheme, `ITSAppUsesNonExemptEncryption = NO`, deployment target (iOS 15) — all correct.
- **Reviewer demo account created** (pre-confirmed, age-verified, 3 public sample entries). Credentials in Part 5.
- **Support page** live (App Store requires a support URL): https://retrowaveblog.com/support
- Privacy + Terms pages live and current.

## 👤 What only you can do (needs your Apple ID / GUI)

1. Set the signing **Team** in Xcode and archive/upload the build.
2. Create the app record + fill the listing in **App Store Connect** (all copy below is paste-ready).
3. Capture/upload **screenshots** (plan in Part 6 — I can drive the simulator capture for you on request).

---

## Part 1 — Xcode: sign, archive, upload

Prereq: confirm your **Apple Developer Program** enrollment is active for the Apple ID you'll sign with.

```bash
cd ~/Desktop/retrowave-blog
npm run build && npx cap sync ios      # bundle latest web build + plugins
npx cap open ios                        # opens App.xcworkspace in Xcode
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
Remember 2005? Blinking cursors, glittery text, a song playing on every page, and a little box online where you could just... be yourself. Retrowave Journal brings that feeling back — a private place to write down your life, your way.

WRITE JUST FOR YOU
Your entries are private by default. This is your diary, not a feed to perform for. Log what happened, how you felt, and what song was stuck in your head. Nobody reads it unless you decide to share.

SET THE MOOD
Give every entry its own little vibe. Pick a mood from a huge emoji list, note the song you're currently listening to, and drop in a YouTube music embed so your soundtrack plays right where you wrote it.

MAKE IT YOURS
Choose from 8 hand-made themes — soft pastels, moody dark scene looks, cottage softness, neon y2k, grunge, and more. Turn on glitter text and sparkly cursor trails. Decorate your corner of the internet exactly the way you remember doing it.

SHARE ONLY IF YOU WANT
Keep everything locked to yourself, or opt in to a public profile page and let friends read the entries you choose to make public. Leave emoji reactions on posts. It's your call, every single time.

SAFE BY DESIGN
- Private by default — sharing is always opt-in
- Block anyone you don't want to hear from
- Report content in a tap
- Automatic content filtering helps keep things kind
- 13+ only, with an age check when you sign up
- No ads. No trackers. No third-party analytics. We never sell your data.

WE COLLECT THE BARE MINIMUM
Just your email to sign in and your birth year to confirm you're old enough — and your birth year is never shown to anyone. That's it. Your journal belongs to you.

Pull up a chair, put on a song, and start writing. Your 2005 diary is waiting. ✨

Privacy Policy: https://retrowaveblog.com/privacy
Terms of Use: https://retrowaveblog.com/terms
Questions? support@retrowaveblog.com
```

**Keywords (≤100, no spaces):**
`mood,y2k,glitter,2005,notebook,daily,feelings,writing,scene,emo,nostalgia,sparkle,memories,secret`

**What's New (v1.0):**

> Welcome to Retrowave Journal 1.0! ✨ Your private little corner of 2005 is officially open. Start a journal, set your mood, add a song, and pick from 8 dreamy themes with glitter and sparkle cursors. Everything's private by default — share only what you want. Thanks for being here. More themes and surprises coming soon. 💕

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

1. **Filter** — client + server slur/hate regex + adult-URL/domain blocklists, **plus live OpenAI moderation** on every entry (the `moderate-content` edge function; the API key is set and verified active in production).
2. **Report** — a report button on every public post emails support@retrowaveblog.com with the post title + ID.
3. **Block** — a block button on every post hides that author's content.
4. **Policy + action** — Terms/Privacy published; solo operator monitors support@ and removes content / bans accounts.

---

## Part 5 — App Review notes (paste into the reviewer box)

```
Retrowave Journal is a private, 2005-nostalgia personal journaling app. It's a
Capacitor/WKWebView wrapper around our web app (https://retrowaveblog.com) with a
Supabase backend.

SIGN IN (demo account — already confirmed & age-verified, log in immediately):
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

UGC SAFETY (Guideline 1.2): FILTER = automated moderation on every entry (client +
server slur/hate + adult-URL blocklist, plus OpenAI moderation via a Supabase edge
function). REPORT = a report button on every post emails support@retrowaveblog.com
with the post title + ID. BLOCK = a block button hides that author. Policy: Terms
https://retrowaveblog.com/terms, Privacy https://retrowaveblog.com/privacy. We
monitor support@retrowaveblog.com and remove content / ban accounts as needed.

AGE GATE: signup collects birth year and blocks under-13 (COPPA). Birth year is
used only for age verification and is never shown publicly.

SUPPORT: support@retrowaveblog.com  ·  https://retrowaveblog.com/support
```

_Keep the demo account (`appreview@retrowaveblog.com`) alive until the app is approved._

---

## Part 6 — Screenshots (iPhone 6.9")

- **Required size:** 1290 × 2796 px, portrait, PNG/JPEG, no alpha, no device frame.
- **Capture device:** iPhone 17 Pro Max simulator (UDID `296A830B-AE5D-4123-9A94-5E676FEAD090`) — the only installed 6.9" device. _Do NOT use iPhone 17 Pro (6.3", wrong size)._
- **Count:** 1 min, 10 max — ship **6**.
- Clean status bar before capturing: `xcrun simctl status_bar <UDID> override --time "9:41" --batteryLevel 100 --cellularBars 4 --wifiBars 3`
- Capture: `xcrun simctl io <UDID> screenshot store-assets/screenshots/NN-name.png`

**Shot list (order sells the fantasy → proves it's real → privacy hook):**

1. Theme picker (Edit profile → "vibe" tab) with all 8 themes — _"8 vibes. pick ur whole personality."_
2. Populated feed with entries + moods + reactions (use a vivid theme) — _"ur diary. moods, music & lil emoji reactions."_
3. New-entry composer (mood + music + theme) — _"write it down. drop a song. set the mood. ♡"_
4. Signup "Create Your Xanga" screen with the 13+ age gate — _"make ur xanga in 2 mins (13+, we card u)."_
5. Public profile page in a chosen theme — _"go public when u want. or stay secret. ur rules."_
6. Empty-journal first run — _"a blank page, just for u. private by default."_

Captions are optional and must be baked into the image (App Store Connect has no caption field). Raw screenshots are valid to ship.

---

## Remaining human checklist

- [ ] Confirm Apple Developer Program enrollment is active.
- [ ] Xcode: set Team, archive, upload (Part 1).
- [ ] App Store Connect: create the app record (name "Retrowave Journal"), paste Parts 2–4.
- [ ] Upload screenshots (Part 6) — ask me to drive the simulator capture if you want.
- [ ] Paste App Review notes (Part 5); confirm the demo account works.
- [ ] Cloudflare: enable "Always Use HTTPS" (from the earlier checklist).
- [ ] Submit for review.
