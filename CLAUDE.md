# Retrowave Blog

Xanga/LiveJournal nostalgia blog. Solo operator, zero overhead. If a feature requires ongoing moderation, storage costs, or maintenance — don't build it.

**IMPORTANT:** Before starting any task, check `.claude/learnings.md` for the relevant topic doc and read it. Use the right `/skill` for the domain (see table below).

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
supabase/          # 32 migrations + moderate-content edge function
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
| `/release` | iOS build, Capacitor sync, App Store submission checklist |

## Key Docs (Progressive Disclosure)

CLAUDE.md is the always-loaded layer. Deeper context lives in topic-specific docs — load only what's relevant.

| Layer | File | When to read |
|-------|------|-------------|
| Index | `.claude/learnings.md` | Start here — routes to topic docs |
| Topic | `.claude/docs/gotchas.md` | Before any code change |
| Topic | `.claude/docs/data-contracts.md` | Changing field limits or adding columns |
| Topic | `.claude/docs/theming.md` | CSS variables, contrast, responsive |
| Topic | `.claude/docs/architecture.md` | Supabase RPCs, auth, icons, performance |
| Topic | `.claude/docs/false-positives.md` | Before flagging audit issues |
| Skill | `.claude/commands/*.md` | Auto-loaded by `/skill` commands |
| Code | `src/lib/validation.ts` | Field limits (POST_LIMITS, PROFILE_LIMITS) |
| Code | `src/lib/themes.ts` | 8 theme definitions (42 CSS vars each) |

# Compact instructions

When compacting, preserve: the current task and its remaining steps, files
changed this session, verification status (lint/tsc/build/tests), and any
App Store submission checklist progress. Drop verbose tool output.
