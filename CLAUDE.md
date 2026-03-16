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
src/components/    # UI components (PostCard, Header, Sidebar, modals incl. SettingsModal, ui/ primitives)
src/hooks/         # useAuth, usePosts, useReactions, useBlocks, useChapters, useToast, useFocusTrap, useOnlineStatus, useYouTubeInfo
src/lib/           # supabase, auth-guard, errors, retry, validation, cache, moderation, themes, emojiStyles, capacitor, constants, celebrations
src/types/         # post, profile, database, link-preview
src/utils/         # formatDate, parseYouTube
supabase/          # 29 SQL migrations + moderate-content edge function
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

Optional free-text grouping for journal entries. No separate table — just a `chapter` column on `posts`.

- **DB**: nullable `text`, CHECK ≤100 chars, partial index `(user_id, chapter) WHERE chapter IS NOT NULL`
- **RPCs**: `get_user_chapters()` returns `{chapter, post_count, latest_post}[]` for autocomplete/sidebar
- **Hook**: `useChapters()` fetches chapter list. `usePosts` doesn't filter server-side; chapter filtering is client-side in App.tsx
- **UI**: PostModal has a combo-input with autocomplete dropdown. PostCard shows `📖 chapter` badge (clickable → filters feed). Sidebar shows chapter nav list
- **Validation**: `quickContentCheck()` moderation on chapter names, same as usernames

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
- `useChapters` hook makes an RPC call on mount. It's used inside PostModal (lazy-loaded), so it only fires when composing/editing a post. The Sidebar chapter list comes from App-level state.
- Chapter filtering is client-side (`posts.filter()`). This works for a solo journal but would need server-side `WHERE chapter = $1` for multi-user or large datasets.
