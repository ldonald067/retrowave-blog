---
name: release
description: iOS App Store release workflow — build web bundle, Capacitor sync, Xcode build, and submission checklist
---

# Release Agent

Drive the iOS build and App Store submission workflow.

Read `CLAUDE.md` first. Read `docs/app-store-submission-guide.md` for the live
submission checklist — it is the single source of truth for what still blocks
release, and holds the paste-ready listing copy, App Privacy answers, age
rating, review notes, and screenshot plan. Update it as items complete.

---

## Phase 1: Prerequisites (verify before building)

| Check                            | Command                              | Fix if missing                                      |
| -------------------------------- | ------------------------------------ | --------------------------------------------------- |
| Node                             | `node --version`                     | `brew install node`                                 |
| Xcode                            | `xcodebuild -version`                | Install from App Store                              |
| iOS simulator runtime            | `xcrun simctl runtime list`          | `xcodebuild -downloadPlatform iOS`                  |
| `.env.local` with Supabase creds | file exists (do NOT read or edit it) | Copy `.env.example` → `.env.local`, user fills keys |
| Dependencies                     | `node_modules/` exists               | `npm install`                                       |

## Phase 2: Build & Sync

```bash
npx tsc --noEmit && npm run build && npm run test   # full pipeline first
npx cap sync ios                                     # copy dist/ + plugins into ios/
npx cap open ios                                     # open Xcode (user drives GUI)
```

- `npx cap sync ios` must re-run after ANY web code change before an iOS build.
- The iOS project uses Swift Package Manager (`CapApp-SPM`) — no CocoaPods, and
  **no `.xcworkspace`**. `xcodebuild -workspace App.xcworkspace` fails with
  "does not exist"; always pass `-project ios/App/App.xcodeproj`.
- Read the installed simulators before choosing a destination — the names move
  with each Xcode release, and a stale `name=` fails the build:

```bash
xcrun simctl list devices available | grep iPhone
```

- Simulator build, targeting a booted device by UDID so the name cannot go
  stale, and writing DerivedData somewhere you can find the `.app`:

```bash
xcodebuild -project ios/App/App.xcodeproj -scheme App -configuration Debug \
  -sdk iphonesimulator -destination "id=$(xcrun simctl list devices booted -j \
  | python3 -c 'import json,sys;print(next(d["udid"] for v in json.load(sys.stdin)["devices"].values() for d in v))')" \
  -derivedDataPath ios/DerivedData build
```

- The installable bundle lands at
  `ios/DerivedData/Build/Products/Debug-iphonesimulator/App.app`. `DerivedData`
  is already in `ios/.gitignore`; the repo root `build/` is **not**, so do not
  redirect it there.
- Install and launch it without the Xcode GUI:

```bash
xcrun simctl install booted ios/DerivedData/Build/Products/Debug-iphonesimulator/App.app && xcrun simctl launch booted com.retrowave.journal
```

## Phase 3: Versioning

- Bump `MARKETING_VERSION` (user-facing, e.g. 1.0 → 1.1) and `CURRENT_PROJECT_VERSION` (build number, must increase every upload) in `ios/App/App.xcodeproj/project.pbxproj`.
- Keep `package.json` version in sync with `MARKETING_VERSION`.

## Phase 4: Submission checklist

Work from `docs/app-store-submission-guide.md`. The recurring gates:

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

Append findings to the relevant `.claude/docs/*.md` topic doc:

```
- [YYYY-MM-DD /release] One-line finding
```

$ARGUMENTS
