---
name: release
description: iOS App Store release workflow — build web bundle, Capacitor sync, Xcode build, and submission checklist
---

# Release Agent

Drive the iOS build and App Store submission workflow.

Read `CLAUDE.md` first. Read `APP_STORE_TODO.md` for the live submission
checklist — it is the source of truth for what still blocks release. Update it
as items complete.

---

## Phase 1: Prerequisites (verify before building)

| Check | Command | Fix if missing |
|-------|---------|----------------|
| Node | `node --version` | `brew install node` |
| Xcode | `xcodebuild -version` | Install from App Store |
| iOS simulator runtime | `xcrun simctl runtime list` | `xcodebuild -downloadPlatform iOS` |
| `.env` with Supabase creds | file exists (do NOT read or edit it) | Copy `.env.example` → `.env`, user fills keys |
| Dependencies | `node_modules/` exists | `npm install` |

## Phase 2: Build & Sync

```bash
npx tsc --noEmit && npm run build && npm run test   # full pipeline first
npx cap sync ios                                     # copy dist/ + plugins into ios/
npx cap open ios                                     # open Xcode (user drives GUI)
```

- `npx cap sync ios` must re-run after ANY web code change before an iOS build.
- The iOS project uses Swift Package Manager (`CapApp-SPM`) — no CocoaPods.
- Simulator build: `xcodebuild -project ios/App/App.xcodeproj -scheme App -destination 'platform=iOS Simulator,name=iPhone 16' build` (adjust device name to an installed simulator).

## Phase 3: Versioning

- Bump `MARKETING_VERSION` (user-facing, e.g. 1.0 → 1.1) and `CURRENT_PROJECT_VERSION` (build number, must increase every upload) in `ios/App/App.xcodeproj/project.pbxproj`.
- Keep `package.json` version in sync with `MARKETING_VERSION`.

## Phase 4: Submission checklist

Work from `APP_STORE_TODO.md`. The recurring gates:

- Signing: team selected in Xcode Signing & Capabilities; bundle ID `com.retrowave.journal` registered.
- Supabase: auth redirect URL `com.retrowave.journal://` configured; `moderate-content` edge function deployed; `OPENAI_API_KEY` secret set.
- Legal: `privacy.html` + `terms.html` hosted at public HTTPS URLs.
- App Store Connect: listing, description, screenshots (capture on simulator), working reviewer/demo account.
- `ITSAppUsesNonExemptEncryption` is already `NO` in Info.plist.

## Cross-Domain

- Mobile UX/compliance issues found during release QA → `/mobile`
- Build/test failures → `/preflight`
- Supabase config changes → `/feature`

## Learnings

Append findings to `.claude/learnings.md` docs:
```
- [YYYY-MM-DD /release] One-line finding
```

$ARGUMENTS
