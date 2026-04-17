# Code Quality Pass

Branch: `cleanup/code-quality-pass`

Base: current `main` after the private-journal audit branch was merged.

This branch starts the main-code cleanup from the current app instead of cleaning old side-branch code. The first pass keeps the scope narrow: preserve the useful fixes, avoid pulling stale UI changes, and remove obvious audit-label noise around the files being changed.

## Status

- [x] Rework the profile refresh fix.
- [x] Inspect the stronger auth-state branch and bring over the parts still worth keeping.
- [x] Start cleanup in the touched hooks and tests.
- [x] Validate locally.
- [ ] Push branch to GitHub.

## What Came Over

### Profile refresh

The useful part from `fix/profile-refresh-throttle` was reworked instead of cherry-picked.

`updateProfile` now updates the row, asks Supabase to return the saved profile, and applies that returned row to local state immediately. That avoids the old path where `updateProfile` saved successfully, then called `fetchProfile`, and the profile fetch cooldown could hide the new values for a couple seconds.

Also tightened:

- Successful profile fetches now clear `profileError`.
- Successful profile creation now clears `profileError`.
- Successful profile updates now reapply the saved theme from the returned row.

### Post auth state

The useful part from `fix/auth-state-posts` was brought over and tightened for current `main`.

`usePosts` is now explicitly auth-scoped: it accepts `currentUserId: string | null` and no longer falls back to reading a session internally. That keeps auth ownership in `useAuth`/`App`, and makes the journal behavior easier to reason about.

Behavior now covered:

- Signed out: clear posts, stop loading, skip Supabase RPCs.
- Sign in after signed out: load the user's posts.
- Sign out after loading posts: clear the prior user's entries immediately.
- Switch users: invalidate cached pages and ignore stale async results from the previous user.
- Fetch a single post only while a user is still active.

## Cleanup Started

The first cleanup pass removed audit-coded comments like `T3`, `F1 FIX`, and `H3 FIX` from the touched hooks and tests. The behavior stayed, but the code now reads more like product code and less like a patch log.

Small cleanup included:

- Centralized post reaction normalization in `normalizePost`.
- Removed the unused internal session fallback from `usePosts`.
- Removed the unused `userIdRef`.
- Replaced noisy test comments and mojibake reaction strings with readable ASCII fixtures.

## Not Brought Over

- The old `fix/private-journal-privacy` branch was not applied because the newer merged branch already has more intentional public-profile and privacy UX work.
- Old branches were left alone. No branch deletion in this pass.

## Validation

Passed locally:

- `npm.cmd run lint`
- `npm.cmd run typecheck`
- `npm.cmd test` with 214 passing tests
- `npm.cmd run build`

Notes:

- `npm.cmd test` and `npm.cmd run build` both hit the known Windows sandbox `spawn EPERM` error first, then passed when rerun with approval.
- The previous large chunk warning did not appear in this build. The largest emitted chunks were `vendor-icons` at about 332 KB and `index` at about 298 KB.

## Next Cleanup Candidates

- Continue removing audit-label comments in nearby files, especially where comments are tracking old review IDs instead of explaining code.
- Look at modal/form duplication after the hook cleanup is stable.
- Investigate the existing large bundle warning with targeted lazy loading rather than random splitting.
- Keep public-profile language intentional: optional share page, not a feed.
