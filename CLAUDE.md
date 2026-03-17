# Retrowave Blog

Xanga/LiveJournal nostalgia blog. Solo operator, zero overhead. If a feature requires ongoing moderation, storage costs, or maintenance — don't build it.

**IMPORTANT:** Before starting any task, read `.claude/learnings.md` for gotchas, data contracts, and known false positives. Use the right `/skill` for the domain (see table below).

## Commands

```bash
npm run build          # Production build
npm run test           # Vitest (run once)
npx tsc --noEmit       # Type check
npm run dev            # Vite dev server (port 5174)
npm run lint           # ESLint
npm run format         # Prettier (singleQuote, printWidth: 100)
```

Run `npx tsc --noEmit && npm run build && npm run test` before committing.

## Stack

React 19 + TypeScript 5.9 + Vite 7 + Tailwind CSS 4 + Framer Motion + Supabase (PostgreSQL + Auth + Edge Functions). Capacitor 8 for iOS. No Express/Node server.

## Layout

```
src/components/    # PostCard, Header, Sidebar, ChapterChips, modals, ui/
src/hooks/         # useAuth, usePosts, useReactions, useBlocks, useChapters, useToast, useFocusTrap, useOnlineStatus
src/lib/           # supabase, auth-guard, errors, retry, validation, cache, moderation, themes, capacitor, celebrations
src/types/         # post, profile, database
supabase/          # 30 migrations + moderate-content edge function
ios/               # Capacitor iOS app
.claude/           # learnings.md, commands/ (skills)
```

## Data Flow

`App.tsx` → hooks → `requireAuth()` → `withRetry(async () => supabase.rpc(...))` → `toUserMessage(error)` on failure. Auth gates, post CRUD, chapter filtering, and modals all live in App.tsx.

## Skills

| Skill | When to use |
|-------|-------------|
| `/frontend` | Theming, components, CSS, Xanga aesthetic, responsive |
| `/feature` | Supabase RPCs, hooks, auth patterns, error handling |
| `/fullstack` | Audit: RPC types, RLS policies, shared data contracts |
| `/mobile` | iOS, Capacitor, App Store compliance, touch targets |
| `/migration` | SQL migrations, syncing database.ts + validation.ts |
| `/test` | Vitest mock patterns, Supabase chain mocking |
| `/preflight` | Pre-commit: tsc + build + tests, diagnose failures |

## Key Docs

| File | Contains |
|------|----------|
| `.claude/learnings.md` | Gotchas, data contracts, false positives, architecture notes |
| `.claude/commands/*.md` | Deep domain context per skill (patterns, checklists, code examples) |
| `src/lib/validation.ts` | All field limits (POST_LIMITS, PROFILE_LIMITS) |
| `src/lib/themes.ts` | 8 theme definitions (30+ CSS vars each) |
