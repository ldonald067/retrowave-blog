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

Follow `docs/development/supabase-local-setup.md` for the current local setup
flow.

Create `.env.local` with:

```env
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-publishable-key
```

`VITE_SUPABASE_ANON_KEY` is still supported as a legacy fallback if your
project has not moved to publishable keys yet.

### 3. Apply Backend Setup

- Run the SQL migrations in `supabase/migrations/`
- Enable the email auth provider in Supabase
- Deploy `supabase/functions/moderate-content` when you want hosted AI moderation

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

- `npm run dev` - development server
- `npm run build` - production build
- `npm run preview` - preview the production build
- `npm run lint` - ESLint
- `npm run typecheck` - TypeScript checks
- `npm run test` - Vitest
- `npm run format` - Prettier for source files
- `npm run supabase -- --version` - local Supabase CLI version check

## Notes

- `APP_STORE_TODO.md` tracks App Store submission work.
- `docs/audit/` contains dated audit snapshots and branch history.
- `.env.example` mirrors the current frontend Supabase environment shape.

## License

MIT
