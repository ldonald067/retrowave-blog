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
