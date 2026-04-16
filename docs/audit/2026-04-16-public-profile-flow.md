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

## Mobile UX Audit Notes

- Fixed here: publishing is an explicit action with confirmation, not a casual switch.
- Fixed here: nested confirmation dialogs stop click bubbling so cancelling the dialog does not close the profile modal behind it.
- Still worth tackling: profile settings are long on mobile; style/profile/publishing could become separate sections if the modal starts feeling heavy.
- Still worth tackling: entry privacy is hidden in the entry more menu; if public pages stay, the editor should make private/public status more visible before posting.
- Still worth tackling: the signed-in app still has reaction mechanics that may feel more social than journal-first.

## Verification

- Passed: `npm.cmd run lint`.
- Passed: `npm.cmd test` with 204 tests.
- Passed: `npm.cmd run build`.
- Known existing noise remains: Vite large chunk warning, mocked `useChapters` RPC stderr, and mocked `PostCard` `whileTap` stderr.
