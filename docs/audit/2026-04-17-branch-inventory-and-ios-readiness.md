# Branch Inventory And iOS Readiness

Branch: `fix/private-journal-rls-hardening`

This pass followed the merge of PR #8 into `main`. The goal was to separate old
branch clutter from work that still helps prepare the iPhone app for real Xcode
and device testing.

## Current Main

- PR #7, `Private journal audit and no-Mac tightening`, is merged into `main`.
- PR #8, `Code quality cleanup pass`, is merged into `main`.
- PR #6, `Fix profile update refresh`, was closed as superseded by PR #8.
- There are no open PRs after closing PR #6.

## Branch Inventory

- `cleanup/code-quality-pass`: merged by PR #8. Safe to archive after branch
  deletion is explicitly approved.
- `fix/intentional-public-profile`: merged by PR #7. Safe to archive after
  branch deletion is explicitly approved.
- `fix/profile-refresh-throttle`: superseded by PR #8 and PR #6 is closed.
  Safe to archive after branch deletion is explicitly approved.
- `fix/auth-state-posts`: useful behavior was reworked into PR #7 and PR #8.
  Safe to archive after branch deletion is explicitly approved.
- `fix/remove-unused-ios-permissions`: useful permission posture is already on
  `main`; camera/photo permission strings are absent.
- `fix/private-journal-privacy`: most product UX work was superseded, but its
  RLS hardening migration was still useful. This branch carries that missing
  database hardening forward with a fresh migration timestamp.

## iOS Readiness Already On Main

- GitHub CI runs lint, typecheck, tests, and production build.
- Capacitor keyboard events set a shared `--keyboard-inset` for keyboard-safe
  scroll areas.
- Safe-area CSS variables are wired into modal and form scroll surfaces.
- iOS camera/photo permission strings are not declared while the app has no
  image capture or upload feature.
- App Store privacy notes exist in `docs/app-store/privacy.md`.
- No-Mac mobile QA checklist exists in
  `docs/audit/2026-04-17-mobile-qa-checklist.md`.
- Backend privacy smoke checks exist in `supabase/tests/privacy_smoke.sql`.

## Follow-Up Added Here

- Added a fresh private-journal RLS migration that removes legacy public table
  read policies for posts, profiles, and reactions.
- Expanded backend privacy smoke checks so profile and reaction SELECT policies
  are explicitly checked.

## Next iOS-Readiness Pass

- Run the mobile QA checklist against browser viewports before any native device
  testing is available.
- Capture screenshots for the smallest portrait, common modern portrait, large
  portrait, compact landscape, and keyboard-constrained portrait cases.
- Prioritize entry editor, auth forms, profile tabs, settings, public profile,
  and long-content journal cards.
- Keep any fixes small and branch them from current `main` after this RLS
  hardening branch is merged.
