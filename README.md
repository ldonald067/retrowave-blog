# Retrowave Blog

A private-first journal app with Xanga/LiveJournal nostalgia. Built with
React 19, TypeScript 5.9, Vite 7, Tailwind CSS 4, Supabase, and Capacitor.

## Features

- Magic link and password auth
- COPPA age verification
- Private-by-default journal entries with chapters, mood, music, and YouTube cards
- Optional public profile pages with read-only public journals
- User blocking, emoji reactions, themes, offline handling, and mobile-safe modal flows

## Quick Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Supabase

Copy `.env.example` to `.env.local` and fill in (details in
`docs/development/supabase-local-setup.md`):

```env
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-publishable-key
```

`VITE_SUPABASE_ANON_KEY` is still supported as a legacy fallback if your
project has not moved to publishable keys yet.

### 3. Backend

The hosted project already runs the backend. `supabase db push` does not work on
it, so schema changes are applied by hand — and `supabase/migrations/` is a
statement of intent, not a description of production. Read `CLAUDE.md` before
touching the database.

### 4. Run The App

```bash
npm run dev
```

## Project Structure

- `src/components` UI building blocks and feature components
- `src/hooks` auth, posts, reactions, blocks, chapters, and public-profile hooks
- `src/lib` Supabase client, validation, moderation, theming, retry, and caching helpers
- `docs` setup notes and audit history
- `supabase` migrations, edge functions, local config, and SQL smoke tests

## Scripts

- `npm run check` - everything CI runs: lint, format check, typecheck, tests, build
- `npm run dev` - development server
- `npm run build` - production build
- `npm run preview` - preview the production build
- `npm run lint` - ESLint
- `npm run format` / `npm run format:check` - Prettier
- `npm run typecheck` - TypeScript (app + `vite.config.ts`)
- `npm run test` - Vitest
- `npm run supabase -- --version` - local Supabase CLI version check

## Notes

- `docs/app-store-submission-guide.md` is the single source of truth for App
  Store submission — status, listing copy, privacy answers, and what's left.
- `docs/audit/backend-privacy-smoke-checks.md` describes how to run
  `supabase/tests/privacy_smoke.sql` before shipping privacy-sensitive changes.
- `docs/supabase-snippet-archive/` is a historical record of SQL actually run
  against production. Read-only — see its README before touching the database.
- `.env.example` mirrors the current frontend Supabase environment shape.
- `docs/handoff.md` is the current state of the project; `CLAUDE.md` is the
  working guide.

## License

MIT
