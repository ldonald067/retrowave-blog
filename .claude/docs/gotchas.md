# Gotchas

Non-obvious behaviors and footguns. Read before making changes in these areas.

## TypeScript
- `noUncheckedIndexedAccess` enabled — array indexing returns `T | undefined`.
- Supabase query builders return `PromiseLike` not `Promise` — wrap with `async` in `withRetry()`.
- `requireAuth()` discriminated union doesn't narrow — use `auth.user!` after the error check.
- Path aliases: `@/*`, `@components/*`, `@hooks/*`, `@utils/*`, `@lib/*`.

## Mobile & iOS
- Touch targets: `min-h-[44px] lg:min-h-0` (or `lg:min-h-[36px]`). Never bare `min-h-[36px]` — fails Apple HIG.
- `ESTIMATED_POST_HEIGHT` (380px) must match real PostCard height or virtualizer overlaps.
- WCAG AA: `--accent-primary` must hit 4.5:1 on `--card-bg`. `--text-title` only needs 3:1 (large text).
- Input `font-size: 16px !important` at mobile breakpoint prevents iOS Safari auto-zoom. NEVER set input font below 16px on mobile.
- [2026-07-05 /mobile] RESOLVED: Mojibake (double-encoded UTF-8, cp1252 round-trip) in Sidebar, Header, ProfileModal, PublicProfileView — from Windows-era edits (`npm.cmd` in audit logs). Two waves fixed 2026-07-05: 10× 4-byte emoji (`ðŸ..`) and 20× 3-byte chars (`â..`: ✨ ♥ ☆ ⏮▶⏸⏹⏭, em-dashes). If editing on Windows again, keep files UTF-8 and grep `ðŸ\|â\|Ã\|Â` before committing.
- [2026-07-05 /mobile] RESOLVED: ChapterChips.tsx conditional hook (early return before `useMemo`) crashed on first-chapter creation. Fixed 2026-07-05; regression test added ("survives the 0 → 1 chapters transition").
- [2026-07-05 /mobile] `npm run lint` covered NOTHING until 2026-07-05 — eslint.config.js only matched `**/*.{js,jsx}` but all source is `.ts/.tsx`. Now fixed (typescript-eslint added); all findings triaged 2026-07-05 and rules run at full recommended strictness (0 problems). Keep it that way.
- [2026-07-05 /mobile] For "reset/sync state when a prop changes" use the guarded adjust-during-render pattern (prev-value in useState, compare, set) — passes react-hooks v7 compiler rules and avoids a stale paint. Don't reintroduce reset-effects; see Avatar.tsx / Header.tsx / ProfileModal.tsx for house examples.
- [2026-07-05 /mobile] react-hooks v7 compiler rules (set-state-in-effect, immutability, refs, …) report ONE bail-out per component at a time — fixing one can surface more on the next lint run. Keep re-running lint until stable.
- [2026-07-05 /mobile] Sidebar chapter privacy toggle uses bare `min-h-[36px]` (Sidebar.tsx:345) — below 44px HIG on mobile; adjacent chapter button correctly uses `min-h-[44px] lg:min-h-[36px]`.

## UI Conventions
- Settings (gear) and Profile (avatar) are separate modals. Don't merge.
- Toast: minimal centered pills. Error messages use `~` tildes. Never raw error strings.
- Auth forms use inline field errors (not toasts) — App-level `<Toast>` isn't mounted during auth.
- Keyboard shortcut: Ctrl+N / Cmd+N opens new post modal.
- PostModal ⋮ menu (top-right header): contains privacy toggle (🔒/🔓) and delete entry. Footer is just cancel + save + privacy badge.

## Data & Environment
- `is_admin` and COPPA fields are trigger-protected — need SECURITY DEFINER RPCs.
- All `localStorage` access in try/catch (Safari private browsing throws).
- `react-old-icons` fetches `.webp` from GitHub at runtime — won't render offline.
- `.env` is gitignored. Copy `.env.example` → `.env` on each machine.
- `useChapters` called once in App.tsx — don't add a second call (duplicate RPCs).

## Chapters
- Optional `chapter` column on `posts` (no separate table). `get_user_chapters()` RPC. Client-side filtering.
- Mobile: `ChapterChips` horizontal swipe row. Desktop: vertical list in sidebar.
- `refetchChapters()` called on post create, edit, delete, and block to keep counts in sync.
- "Loose entries" filter (`__loose__` sentinel) shows posts with no chapter. 🍃 icon.
- Chapter privacy: `private_chapters` text[] on profiles. Toggle via 🔒 button. Post-level `is_private` works independently — two privacy layers.
- [2026-07-09 /release] `supabase migration list` fails without SUPABASE_DB_PASSWORD (CLI login-role creation hits permission denied on hosted project) — verify remote schema via REST probes with the publishable key instead.
