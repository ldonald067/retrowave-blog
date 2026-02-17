# Retrowave Blog

A minimal, self-running blog platform with Xanga/LiveJournal nostalgia. Built with React 19, TypeScript, Tailwind CSS 4, and Supabase.

## Features

- **Magic Link & Password Auth** - Email authentication with optional password
- **Age Verification** - COPPA compliant (13+ only)
- **User Profiles** - Display names, bios, avatars, mood & music
- **8 Themes** - Classic Xanga, Emo Dark, Scene Kid, MySpace Blue, Y2K Cyber, Cottage Core, Grunge, Pastel Goth
- **Emoji Reactions** - React to posts with various emojis
- **YouTube Integration** - Paste links to show thumbnails
- **Rich Post Creation** - Mood tracking and music integration

## Quick Setup

### 1. Install Dependencies
```bash
npm install
```

### 2. Set Up Supabase

1. Create a Supabase project at https://supabase.com
2. Run the SQL migrations in `supabase/migrations/` in order
3. Enable Email provider in Authentication settings

### 3. Configure Environment

Create `.env.local`:
```
VITE_SUPABASE_URL=your-project-url
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### 4. Run
```bash
npm run dev
```

## Project Structure

```
src/
├── components/     # React components
│   ├── ui/        # Reusable UI components (Button, Input, etc.)
│   ├── Header.tsx
│   ├── Sidebar.tsx
│   ├── PostCard.tsx
│   ├── PostModal.tsx
│   ├── ProfileModal.tsx
│   └── ...
├── hooks/          # Custom React hooks
│   ├── useAuth.ts      # Authentication
│   ├── usePosts.ts     # Post CRUD
│   ├── useLikes.ts     # Like/unlike
│   ├── useReactions.ts # Emoji reactions
│   └── useToast.ts     # Toast notifications
├── lib/            # Core utilities
│   ├── supabase.ts     # Supabase client
│   ├── themes.ts       # Theme definitions
│   ├── constants.ts    # App constants (MOODS, validation, etc.)
│   └── linkPreview.ts  # YouTube/Spotify embeds
├── types/          # TypeScript definitions
│   ├── database.ts     # Supabase table types
│   ├── post.ts
│   ├── profile.ts
│   └── ...
└── utils/          # Helper functions
    ├── formatDate.ts
    └── parseYouTube.ts
```

## Design System

### CSS Variables
All theming is done via CSS custom properties in `src/index.css` and `src/lib/themes.ts`:
- `--bg-primary`, `--bg-secondary` - Background colors
- `--text-title`, `--text-body`, `--text-muted` - Text colors
- `--accent-primary`, `--accent-secondary` - Accent colors
- `--border-primary`, `--border-accent` - Border colors
- `--button-gradient-from`, `--button-gradient-to` - Button gradients

### Theme System
Themes are applied via `data-theme` attribute on `<html>`. See `src/lib/themes.ts` for all theme definitions.

## Tech Stack

- **Frontend:** React 19 + TypeScript 5.9 + Vite 7
- **Styling:** Tailwind CSS 4 + Framer Motion
- **Backend:** Supabase (PostgreSQL + Auth)
- **Icons:** Lucide React

## Scripts

- `npm run dev` - Development server
- `npm run build` - Production build
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

## License

MIT
