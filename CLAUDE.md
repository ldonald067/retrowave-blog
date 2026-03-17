# Retrowave Blog

Bare-bones Xanga/LiveJournal nostalgia blog. Solo operator, zero overhead.

**Not building (by design):** comments, search/filter, follow system, admin dashboard, analytics, notifications, DMs, RSS.

Chapters are the one exception to "no tags/categories" — they're personal labels (only the author sees/uses them), free-text (no predefined list to manage), and optional (zero empty-state complexity).

If a feature requires ongoing moderation, storage costs, or maintenance → don't build it.

## Commands

```bash
npm run dev            # Vite dev server (port 5174)
npm run build          # Production build
npm run preview        # Preview production build
npm run lint           # ESLint
npm run test           # Vitest (run once)
npm run test:watch     # Vitest (watch mode)
npm run test -- src/hooks/__tests__/useAuth.test.ts  # Single file
npm run format         # Prettier (singleQuote, printWidth: 100)
npx tsc --noEmit       # Type check
```

## Stack

React 19 + TypeScript 5.9 + Vite 7 + Tailwind CSS 4 + Framer Motion + Supabase (PostgreSQL + Auth + Edge Functions). Capacitor 8 for iOS wrapper. No Express/Node server.

Icons: pepicons (Pop! variant, SVG strings) for functional UI + react-old-icons (Win98 `.webp` images from GitHub) for decorative accents. Wrapper: `src/components/ui/Pepicon.tsx`.

## Environment

Copy `.env.example` → `.env`:
```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

## Project Layout

```
src/components/    # UI components (PostCard, Header, Sidebar, ChapterChips, modals incl. SettingsModal, ui/ primitives)
src/hooks/         # useAuth, usePosts, useReactions, useBlocks, useChapters, useToast, useFocusTrap, useOnlineStatus, useYouTubeInfo
src/lib/           # supabase, auth-guard, errors, retry, validation, cache, moderation, themes, emojiStyles, capacitor, constants, celebrations
src/types/         # post, profile, database, link-preview
src/utils/         # formatDate, parseYouTube
supabase/          # 30 SQL migrations + moderate-content edge function
ios/               # Capacitor iOS app
.claude/           # launch.json (dev server), learnings.md, skills (commands/)
```

## Workflow

Run `npx tsc --noEmit && npm run build && npm run test` before committing. Always commit and push after completing each change.

## Skills

Use the right skill for the task. Each skill contains full domain context — patterns, checklists, and gotchas specific to that area.

| Skill | When to use |
|-------|-------------|
| `/frontend` | UI: theming, components, CSS, Xanga aesthetic, copy, responsive |
| `/feature` | Backend wiring: Supabase RPCs, hooks, auth patterns, error handling |
| `/fullstack` | Audit: RPC type alignment, RLS policies, shared data contracts |
| `/mobile` | iOS: Capacitor, App Store compliance, touch targets, safe areas |
| `/migration` | SQL: new tables/columns/RPCs, syncing database.ts + validation.ts |
| `/test` | Tests: Vitest mock patterns, Supabase chain mocking, hook testing |
| `/preflight` | Pre-commit: runs tsc + build + tests, diagnoses failures |

Cross-cutting knowledge lives in `.claude/learnings.md` — all skills read it.

## Shared Data Contracts

Keep these in sync when changing limits or adding fields:

| Data | Frontend | Backend |
|------|----------|---------|
| Post field limits | `validation.ts` `POST_LIMITS` | `20260223000001_post_constraints.sql` |
| Profile field limits | `validation.ts` `PROFILE_LIMITS` | `20260224000004` + `20260224000008` |
| Chapter max length | `validation.ts` `POST_LIMITS.chapter` (100) | `20260315000004` CHECK constraint |
| Reaction emoji set | `ReactionBar.tsx` `REACTION_EMOJIS` | `20260224000004` CHECK constraint |
| Password policy | `validation.ts` `PASSWORD_MIN_LENGTH` (8) | `config.toml` `minimum_password_length` |
| Username format | `validation.ts` `USERNAME_PATTERN` | `20260315000002` CHECK constraint |
| Moderation lists | `moderation.ts` `BLOCKED_PATTERNS` | `edge fn moderate-content` |

## Chapters

Optional free-text grouping — just a `chapter` column on `posts`, no separate table. Autocomplete from existing chapters via `get_user_chapters()` RPC. Client-side filtering in App.tsx.

- **Mobile**: horizontal swipeable chip row (`ChapterChips`) pinned above the feed, always visible. Scroll-snap, fade edges, ARIA tablist.
- **Desktop**: vertical list in sidebar (unchanged).
- `refetchChapters()` called on post create, edit, delete, and block to keep counts in sync.

See `.claude/learnings.md` for implementation details.

## Gotchas

- `is_admin` and COPPA fields are trigger-protected — need SECURITY DEFINER RPCs to modify.
- `noUncheckedIndexedAccess` enabled — array indexing returns `T | undefined`.
- Supabase query builders return `PromiseLike` not `Promise` — wrap with `async` in `withRetry()`.
- `requireAuth()` discriminated union doesn't narrow — use `auth.user!` after the error check.
- Path aliases: `@/*`, `@components/*`, `@hooks/*`, `@utils/*`, `@lib/*`.
- All `localStorage` access wrapped in try/catch (Safari private browsing throws).
- `react-old-icons` fetches `.webp` from GitHub at runtime — icons won't render offline. `pepicons` SVGs are bundled (no network needed).
- `.env` is gitignored. Copy `.env.example` → `.env` on each new machine and fill in Supabase credentials.
- Settings (⚙️ gear icon → SettingsModal: export data + delete account) and Profile (👤 → ProfileModal: avatar, name, bio, theme, emoji style) are separate modals. Don't merge them.
- 6 emoji styles: native, fluent, twemoji, openmoji, blob, noto. Fills 2×3 grid. CDN URLs in `emojiStyles.ts`.
- Auth forms use inline field errors (not toasts) — `useToast()` is per-instance local state, and App-level `<Toast>` isn't mounted during the auth early-return.
- `useChapters` is called once in App.tsx — chapters passed as props to Sidebar and PostModal. Don't add a second call (causes duplicate RPC fetches).
- Mobile touch targets: `min-h-[44px] lg:min-h-0` (or `lg:min-h-[36px]`). Never use bare `min-h-[36px]` — fails Apple HIG. The `lg:` breakpoint (1024px) matches sidebar fixed/collapsible switch.
- Toast notifications are minimal centered pills (not boxed). Error messages use `~` tildes for the retro vibe. Keep messages short — no raw error details.
- `ESTIMATED_POST_HEIGHT` (380px) in App.tsx must be close to real PostCard height to avoid virtualizer overlap on initial render. If PostCard layout changes significantly, re-measure and update.
- WCAG AA contrast: `--accent-primary` must hit 4.5:1 on `--card-bg` for each theme. `--text-title` only needs 3:1 (large text). Verified for all 8 themes.
- Keyboard shortcut: Ctrl+N / Cmd+N opens new post modal (guarded by auth, no modal open, not in input).
- `sharePost` removed from capacitor.ts — share feature not currently available. `SHARE_SNIPPET_MAX` removed from constants.ts.
