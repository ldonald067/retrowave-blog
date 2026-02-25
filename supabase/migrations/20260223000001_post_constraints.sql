-- Server-side CHECK constraints for posts table.
-- These enforce data integrity beyond what HTML form maxLength can do.
-- Limits must match src/lib/validation.ts POST_LIMITS.

-- Title: 1–200 characters
ALTER TABLE public.posts
  DROP CONSTRAINT IF EXISTS posts_title_length_check;
ALTER TABLE public.posts
  ADD CONSTRAINT posts_title_length_check
  CHECK (char_length(title) >= 1 AND char_length(title) <= 200);

-- Content: 1–50000 characters
ALTER TABLE public.posts
  DROP CONSTRAINT IF EXISTS posts_content_length_check;
ALTER TABLE public.posts
  ADD CONSTRAINT posts_content_length_check
  CHECK (char_length(content) >= 1 AND char_length(content) <= 50000);

-- Author: max 50 chars when provided
ALTER TABLE public.posts
  DROP CONSTRAINT IF EXISTS posts_author_length_check;
ALTER TABLE public.posts
  ADD CONSTRAINT posts_author_length_check
  CHECK (author IS NULL OR char_length(author) <= 50);

-- Mood: max 100 chars
ALTER TABLE public.posts
  DROP CONSTRAINT IF EXISTS posts_mood_length_check;
ALTER TABLE public.posts
  ADD CONSTRAINT posts_mood_length_check
  CHECK (mood IS NULL OR char_length(mood) <= 100);

-- Music: max 200 chars
ALTER TABLE public.posts
  DROP CONSTRAINT IF EXISTS posts_music_length_check;
ALTER TABLE public.posts
  ADD CONSTRAINT posts_music_length_check
  CHECK (music IS NULL OR char_length(music) <= 200);

-- embedded_links: must be a JSON array when present
ALTER TABLE public.posts
  DROP CONSTRAINT IF EXISTS posts_embedded_links_is_array;
ALTER TABLE public.posts
  ADD CONSTRAINT posts_embedded_links_is_array
  CHECK (
    embedded_links IS NULL
    -- L10 FIX: Use jsonb_typeof for a jsonb column (was json_typeof with cast)
    OR jsonb_typeof(embedded_links) = 'array'
  );

NOTIFY pgrst, 'reload schema';
