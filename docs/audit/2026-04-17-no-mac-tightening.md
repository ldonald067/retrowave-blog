# No-Mac Tightening Checklist

Branch: `fix/intentional-public-profile`

This checklist tracks what can be tightened before real iPhone, Xcode, and App Store screenshot testing are available again. The goal is to keep the app moving toward a private, mobile-first journal while making each branch change easy to review.

## Status

- [x] 1. Add GitHub CI.
- [ ] 2. Build a no-Mac mobile QA pass.
- [ ] 3. Add focused UX regression tests.
- [ ] 4. Prepare App Store privacy documentation.
- [ ] 5. Tighten public-content review safety.
- [ ] 6. Audit accessibility and tap feel.
- [ ] 7. Reduce duplicated UI/code where it lowers risk.
- [ ] 8. Add backend privacy smoke checks.

## Work Items

### 1. GitHub CI

Status: Completed in this pass.

What changed:

- Added a GitHub Actions workflow that runs on pushes and pull requests.
- CI installs dependencies with `npm ci`.
- CI runs lint, TypeScript checking, tests, and the production build.
- Added `npm run typecheck` so CI can verify both browser source and Vite/ESLint config files explicitly.
- Updated the Vite config to use Vitest-aware typing because the explicit typecheck correctly flagged the existing `test` config key.

Validation:

- Passed locally: `npm.cmd run lint`.
- Passed locally: `npm.cmd run typecheck`.
- Passed locally: `npm.cmd test` with 205 tests.
- Passed locally: `npm.cmd run build`.
- GitHub Actions should become the source of truth after the push.

### 2. No-Mac Mobile QA Pass

Status: Not started.

Planned checks:

- Test common iPhone-sized responsive widths in a desktop browser.
- Check short viewport heights that mimic the keyboard taking over screen space.
- Capture problematic states: auth, onboarding, profile settings tabs, entry editor, public page, empty states, and long text.
- Document any layout issues with viewport size, screen, and exact reproduction steps.

### 3. Focused UX Regression Tests

Status: Not started.

Planned checks:

- New entries default to private.
- Entry privacy is visible before title/content.
- Public profile publishing requires deliberate confirmation.
- Signed-out users do not see reaction prompts.
- Signed-in users keep the account-only reaction flow.
- Public share links use the saved profile username.
- Posts clear and refetch on auth changes.

### 4. App Store Privacy Documentation

Status: Not started.

Planned checks:

- Document what data the app collects or stores: account email, journal entries, profile fields, avatar/profile URL, reactions, blocks, reports, and optional public entries.
- Document which data can become public only after an explicit user action.
- Keep privacy wording aligned with the current permission posture: no camera/photo permission copy until image capture or upload exists.
- Create a screenshot/reviewer-note checklist that leads with private journaling instead of public sharing.

### 5. Public-Content Review Safety

Status: Not started.

Planned checks:

- Review the public profile page for a lightweight report/contact path.
- Keep the safety surface proportional: public pages need review safety, but the app should not become a social feed.
- Confirm blocking/reporting language still makes sense for optional public journal pages.

### 6. Accessibility And Tap Feel

Status: Not started.

Planned checks:

- Check practical 44px-ish tap targets on mobile controls.
- Confirm dialogs, tabs, and forms have useful labels and focus behavior.
- Confirm long text cannot push controls off-screen.
- Confirm reduced-motion handling still feels calm.
- Confirm error messages appear close to the field or action that caused them.

### 7. Code Reduction And Reuse

Status: Not started.

Planned checks:

- Extract repeated modal panel, tab, and settings-section patterns only where reuse is clear.
- Centralize privacy/public-page copy so future wording changes do not scatter.
- Remove old blog/feed naming where it no longer matches the product.
- Avoid broad refactors that make review harder.

### 8. Backend Privacy Smoke Checks

Status: Not started.

Planned checks:

- Verify signed-out users cannot read private entries.
- Verify users cannot read another user account's private entries.
- Verify public profile reads expose only intentional public fields.
- Verify public journal reads depend on explicit publishing and public entry state.
- Verify migrations remove old public policy names instead of only adding replacement policies.

## Activity Log

- 2026-04-17: Started the no-Mac tightening checklist and added CI as the first completed track.
- 2026-04-17: Added explicit TypeScript checking to local scripts and CI; fixed the Vite/Vitest config typing surfaced by that new check.
