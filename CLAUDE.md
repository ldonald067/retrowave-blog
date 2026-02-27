# Retrowave Blog

## Product Philosophy

Bare-bones Xanga/LiveJournal nostalgia blog. Solo operator, zero overhead.

**Not building (by design):** comments, search/filter, follow system, admin dashboard, analytics, notifications, DMs, tags/categories, RSS.

Keep moderation minimal — client-side regex only. No heavy AI moderation pipeline.
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

## Tech Stack

React 19 + TypeScript 5.9 + Vite 7 + Tailwind CSS 4 + Framer Motion + Supabase (PostgreSQL + Auth + Edge Functions). Capacitor 8 for iOS wrapper.

No Express/Node server. Entire backend is Supabase (PostgREST + GoTrue + RLS + Deno edge functions).

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

## Key Patterns

- **Auth**: Magic link OTP + COPPA age gate (13+). Use `requireAuth()` from `auth-guard.ts`.
- **Errors**: Never expose raw Supabase errors. Always use `toUserMessage()` from `errors.ts`. Appends offline hint when `navigator.onLine` is false.
- **Retry**: `withRetry()` with exponential backoff. Wrap Supabase calls with `async` (PromiseLike quirk).
- **Constants**: Shared values in `constants.ts` — `SWIPE_DISMISS_THRESHOLD`, `MOOD_SELECT_OPTIONS`, `POST_LIMITS` re-exports.
- **Validation**: `validation.ts` mirrors DB CHECK constraints — keep `POST_LIMITS`/`PROFILE_LIMITS` in sync with SQL.
- **Feed**: Cursor-based pagination via `get_posts_with_reactions` RPC (20/page, excerpt-only 500 chars).
- **Reactions**: Optimistic UI with in-flight guard + 400ms cooldown. Emoji set: `['❤️','🔥','😂','😢','✨','👀']`.
- **Themes**: 8 retro themes via CSS custom properties (`var(--accent-primary)`, etc.). Stored in `profiles.theme`.
- **Styling**: `.xanga-box`, `.xanga-button`, `.xanga-link`, `.xanga-title`. All components use CSS vars. Touch targets ≥ 44px.

## Testing

64 tests across 10 files (Vitest + @testing-library/react + jsdom). All 8 hooks have tests.

Mock pattern: `vi.mock('../../lib/supabase', () => ({ supabase: { ... } }))` — all mock variables inside factory (hoisting). Use `mockReturnThis()` for Supabase chainable builders, `as never` for type coercion on mock returns.

## Gotchas

- `is_admin` is trigger-protected — API updates silently fail. Need SECURITY DEFINER function.
- COPPA fields are trigger-protected — only `set_age_verification` RPC can set them.
- `noUncheckedIndexedAccess` enabled — array indexing returns `T | undefined`.
- Supabase query builders return `PromiseLike` not `Promise` — always wrap with `async` in `withRetry()`.
- `requireAuth()` returns discriminated union but TypeScript can't narrow through `if (auth.error)` — use `auth.user!` after the guard (safe, union guarantees non-null).
- Path aliases: `@/*` catch-all, plus `@components/*`, `@hooks/*`, `@utils/*`, `@lib/*`.
- All `localStorage` access wrapped in try/catch (Safari private browsing throws).
- `devSignUp` uses anonymous auth, gated behind `import.meta.env.DEV`.
