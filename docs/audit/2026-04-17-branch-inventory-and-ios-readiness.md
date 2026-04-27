# Branch Inventory And iOS Readiness

Historical snapshot date: `2026-04-17`

Original working branch: `fix/private-journal-rls-hardening`

## Current Note (2026-04-27)

Treat this file as audit history, not the current repository inventory.

- The active working branch is `prep/ios-readiness`.
- GitHub currently has open draft PR #10 for that branch.
- Local and remote branch lists are now much simpler than this snapshot
  describes.

## State On 2026-04-17

- PR #7, `Private journal audit and no-Mac tightening`, was merged into `main`.
- PR #8, `Code quality cleanup pass`, was merged into `main`.
- PR #6, `Fix profile update refresh`, was closed as superseded by PR #8.
- At the time of this pass, there were no open PRs after closing PR #6.

## Branch Inventory On 2026-04-17

- `cleanup/code-quality-pass`: merged by PR #8. Safe to archive after branch
  deletion is explicitly approved.
- `fix/intentional-public-profile`: merged by PR #7. Safe to archive after
  branch deletion is explicitly approved.
- `fix/profile-refresh-throttle`: superseded by PR #8 and PR #6 was closed.
  Safe to archive after branch deletion is explicitly approved.
- `fix/auth-state-posts`: useful behavior was reworked into PR #7 and PR #8.
  Safe to archive after branch deletion is explicitly approved.
- `fix/remove-unused-ios-permissions`: useful permission posture was already on
  `main`; camera/photo permission strings were absent.
- `fix/private-journal-privacy`: most product UX work was superseded, but its
  RLS hardening migration was still useful. This branch carried that missing
  database hardening forward with a fresh migration timestamp.

## iOS Readiness Already On Main At That Time

- GitHub CI ran lint, typecheck, tests, and production build.
- Capacitor keyboard events set a shared `--keyboard-inset` for keyboard-safe
  scroll areas.
- Safe-area CSS variables were wired into modal and form scroll surfaces.
- iOS camera/photo permission strings were not declared while the app had no
  image capture or upload feature.
- App Store privacy notes existed in `docs/app-store/privacy.md`.
- The no-Mac mobile QA checklist existed in
  `docs/audit/2026-04-17-mobile-qa-checklist.md`.
- Backend privacy smoke checks existed in `supabase/tests/privacy_smoke.sql`.

## Follow-Up Added In That Pass

- Added a fresh private-journal RLS migration that removed legacy public table
  read policies for posts, profiles, and reactions.
- Expanded backend privacy smoke checks so profile and reaction `SELECT`
  policies were explicitly checked.

## Historical Next iOS-Readiness Pass

- Run the mobile QA checklist against browser viewports before native device
  testing is available.
- Capture screenshots for the smallest portrait, common modern portrait, large
  portrait, compact landscape, and keyboard-constrained portrait cases.
- Prioritize entry editor, auth forms, profile tabs, settings, public profile,
  and long-content journal cards.
- Keep any fixes small and branch them from current `main` after the RLS
  hardening branch is merged.
