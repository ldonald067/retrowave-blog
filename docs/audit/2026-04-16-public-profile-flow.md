# Public Profile Flow

Branch: `fix/intentional-public-profile`

## Scope

- Keep optional public profiles for the Xanga-style publishing path.
- Make publishing deliberate instead of a casual settings toggle.
- Use one shared public-profile URL builder across profile settings and sidebar links.
- Remove public-page reaction prompts and public reaction counts so reactions stay account-only.

## Mobile UX Pass

- Public page actions are full-width on mobile and split into two columns only on wider screens.
- Public URLs wrap instead of truncating, so users can verify the destination before copying.
- Publishing has a confirmation dialog and a pending-save notice.
- Sidebar share links now use `profile.username`, not the email local-part.
- Profile settings now use tabs so mobile users are not dropped into one long mixed-purpose settings scroll.
- Entry privacy is now visible in the entry editor body instead of living only in the more menu.
- New entries now default to private, with public still available as an explicit editor choice.
- Mobile overflow risks were tightened for the header, chapter filter banner, post cards, sidebar profile text, public profile text, and onboarding first paint.
- The Vite build now splits React, icons, Capacitor, utilities, motion, markdown, and Supabase into named vendor chunks so the main bundle stays below the warning threshold.

## Mobile UX Audit Notes

- Fixed here: publishing is an explicit action with confirmation, not a casual switch.
- Fixed here: nested confirmation dialogs stop click bubbling so cancelling the dialog does not close the profile modal behind it.
- Fixed here: profile settings are split into profile, vibe, public page, and safety tabs.
- Fixed here: entry privacy has a visible private/public control before the title/content fields.
- Fixed here: onboarding no longer starts the first slide from an off-screen/hidden animation state.
- Still worth watching: signed-in reactions are intentionally kept as account-only lightweight interaction, but the product tone should stay journal-first.
- Still worth testing on device: iPhone keyboard behavior in the entry editor, profile tabs with real long profile data, and public pages with very long titles/bios.

## Verification

- Passed: `npm.cmd run lint`.
- Passed: `npm.cmd test` with 205 tests.
- Passed: `npm.cmd run build`; no Vite chunk-size warning remains.
- Fixed: mocked `useChapters` RPC stderr and mocked `PostCard` `whileTap` stderr no longer appear in the full test run.
