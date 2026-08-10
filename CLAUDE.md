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

**Green tests are not proof the feature works.** Several suites mock the very
thing under test — `PostModal.test.tsx` mocks `useFocusTrap`, which is why a bug
that made the composer unusable (one keystroke stole focus) shipped with 239
tests passing. For anything a user touches, YOU MUST verify on the iOS simulator
(`/mobile`, `/release`) or against prod, and show the evidence.

## Stack

React 19 + TypeScript 5.9 + Vite 7 + Tailwind CSS 4 + Framer Motion + Supabase (PostgreSQL + Auth + Edge Functions). Capacitor 8 for iOS. No Express/Node server.

## Layout

```
src/components/    # PostCard, Header, Sidebar, ChapterChips, modals, ui/
src/hooks/         # useAuth, usePosts, useReactions, useBlocks, useChapters, useToast, useFocusTrap, useOnlineStatus
src/lib/           # supabase, auth-guard, errors, retry, validation, cache, moderation, themes, capacitor, celebrations
src/types/         # post, profile, database
supabase/          # migrations/ + functions/ (moderate-content, notify-report)
ios/               # Capacitor iOS app
.claude/           # learnings.md, commands/ (skills)
```

## Production (read before touching the database)

**`supabase db push` does not work here.** The hosted Postgres refuses the CLI's
login-role creation, so migrations are applied by pasting SQL into the dashboard
SQL editor. A migration existing in `supabase/migrations/` therefore does NOT
mean it is live.

**NEVER trust the migration files as a description of prod.** The
`supabase_migrations.schema_migrations` table holds 1 row out of 40+ — it was
never populated, because everything was applied by hand. On 2026-08-01 this made
profile editing fail for every user in production (`PGRST204`: the app sent
`status_message`, a column whose migration had never been applied) while the repo
looked completely correct.

**YOU MUST verify schema claims by querying prod**, not by reading migrations:

```bash
TOKEN=$(security find-generic-password -s "Supabase CLI" -a supabase -w)   # not base64-wrapped
curl -s -X POST "https://api.supabase.com/v1/projects/$(cat supabase/.temp/project-ref)/database/query" \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"query":"select column_name from information_schema.columns where table_name='"'"'profiles'"'"';"}'
```

Prod also carries columns that exist in no migration (`birthdate`, `about`,
`terms_accepted_date`) — see `20260729010000_capture_undocumented_prod_state.sql`.
Dashboard-created state (Database Webhooks) is recorded in migrations too; it is
config that would otherwise be invisible to the repo.

## Data Flow

`App.tsx` → hooks → `requireAuth()` → `withRetry(async () => supabase.rpc(...))` → `toUserMessage(error)` on failure. Auth gates, post CRUD, chapter filtering, and modals all live in App.tsx.

## Skills

| Skill        | When to use                                               |
| ------------ | --------------------------------------------------------- |
| `/frontend`  | Theming, components, CSS, Xanga aesthetic, responsive     |
| `/feature`   | Supabase RPCs, hooks, auth patterns, error handling       |
| `/fullstack` | Audit: RPC types, RLS policies, shared data contracts     |
| `/mobile`    | iOS, Capacitor, App Store compliance, touch targets       |
| `/migration` | SQL migrations, syncing database.ts + validation.ts       |
| `/test`      | Vitest mock patterns, Supabase chain mocking              |
| `/preflight` | Pre-commit: tsc + build + tests, diagnose failures        |
| `/release`   | iOS build, Capacitor sync, App Store submission checklist |

## Key Docs (Progressive Disclosure)

CLAUDE.md is the always-loaded layer. Deeper context lives in topic-specific docs — load only what's relevant.

| Layer | File                              | When to read                                                   |
| ----- | --------------------------------- | -------------------------------------------------------------- |
| State | `docs/handoff.md`                 | **Start a new session here** — current state, open work, traps |
| Index | `.claude/learnings.md`            | Routes to topic docs                                           |
| Topic | `.claude/docs/gotchas.md`         | Before any code change                                         |
| Topic | `.claude/docs/data-contracts.md`  | Changing field limits or adding columns                        |
| Topic | `.claude/docs/theming.md`         | CSS variables, contrast, responsive                            |
| Topic | `.claude/docs/architecture.md`    | Supabase RPCs, auth, icons, performance                        |
| Topic | `.claude/docs/false-positives.md` | Before flagging audit issues                                   |
| Skill | `.claude/commands/*.md`           | Auto-loaded by `/skill` commands                               |
| Code  | `src/lib/validation.ts`           | Field limits (POST_LIMITS, PROFILE_LIMITS)                     |
| Code  | `src/lib/themes.ts`               | 8 theme definitions (42 CSS vars each)                         |

# Compact instructions

When compacting, preserve: the current task and its remaining steps, files
changed this session, verification status (lint/tsc/build/tests), and any
App Store submission checklist progress. Drop verbose tool output.
