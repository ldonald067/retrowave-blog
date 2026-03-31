# Architecture & Integration

## Supabase Patterns
- Query builders return `PromiseLike` — always wrap: `await withRetry(async () => supabase.from(...).select(...))`
- `ModerationResult` type intentionally duplicated between `moderation.ts` and Deno edge function (can't share Vite imports).
- SECURITY DEFINER functions with `SET search_path = public, pg_temp` need fully-qualified `auth.users` references.
- PostgREST parses `jsonb` SQL return values into structured TypeScript objects automatically.
- `get_posts_result` composite type must be dropped and recreated when adding columns (can't ALTER TYPE ADD ATTRIBUTE with dependent functions).

## Auth & Security
- `requireAuth()` returns discriminated union — use `auth.user!` after error check.
- `useReactions` in-flight guard only prevents sequential duplicates. 400ms cooldown is the real rapid-tap protection.
- `tos_accepted` defaults to `false` in trigger. `set_age_verification()` RPC is the only legitimate path.
- All hooks use `toUserMessage()` — no raw error.message leaks. 27 error patterns + fallback in errors.ts.

## Features
- Public profiles: `is_public` boolean, `get_public_profile(username)` RPC, hash routing `#/u/username`.
- Visitors see read-only journal with owner's theme. Must sign up to react.
- No comments, no followers, no discovery feed — zero moderation overhead.
- 6 emoji styles fill 2x3 grid: native, fluent, twemoji, openmoji, blob, noto.
- Chapters: nullable `chapter` column on posts (100 chars max), `get_user_chapters()` RPC, client-side filtering.

## Icons
- **pepicons** (Pop! variant) for functional UI icons. Only 11 imported by name for tree-shaking.
- **react-old-icons** for decorative Win98 accents. External network dependency (GitHub `.webp`).
- When adding a pepicon: add named import to `Pepicon.tsx` and entry to `usedIcons` map.

## Performance
- Main bundle: 3,130 KB → 672 KB (-78%) by tree-shaking pepicons.
- `filteredPosts` and `looseCount` memoized with `useMemo` in App.tsx.
