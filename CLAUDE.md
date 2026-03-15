# Retrowave Blog

Bare-bones Xanga/LiveJournal nostalgia blog. Solo operator, zero overhead.

**Not building (by design):** comments, search/filter, follow system, admin dashboard, analytics, notifications, DMs, tags/categories, RSS.

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

## Environment

Copy `.env.example` → `.env`:
```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

## Project Layout

```
src/components/    # UI components (PostCard, Header, Sidebar, modals, ui/ primitives)
src/hooks/         # useAuth, usePosts, useReactions, useBlocks, useToast, useFocusTrap, useOnlineStatus, useYouTubeInfo
src/lib/           # supabase, auth-guard, errors, retry, validation, cache, moderation, themes, emojiStyles, capacitor, constants
src/types/         # post, profile, database, link-preview
src/utils/         # formatDate, parseYouTube
supabase/          # 24 SQL migrations + moderate-content edge function
ios/               # Capacitor iOS app
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

## Gotchas

- `is_admin` and COPPA fields are trigger-protected — need SECURITY DEFINER RPCs to modify.
- `noUncheckedIndexedAccess` enabled — array indexing returns `T | undefined`.
- Supabase query builders return `PromiseLike` not `Promise` — wrap with `async` in `withRetry()`.
- `requireAuth()` discriminated union doesn't narrow — use `auth.user!` after the error check.
- Path aliases: `@/*`, `@components/*`, `@hooks/*`, `@utils/*`, `@lib/*`.
- All `localStorage` access wrapped in try/catch (Safari private browsing throws).
