-- Add optional chapter field to posts for grouping journal entries.
-- Chapters are free-text labels — no separate table, no management overhead.
-- Users type a chapter name when creating/editing a post, or leave it blank.
--
-- Changes:
--   1. Add nullable `chapter` column to posts with length constraint
--   2. Add chapter attribute to get_posts_result composite type
--   3. Recreate both RPCs to include chapter in SELECT
--   4. Add get_user_chapters RPC for chapter autocomplete/browsing
--   5. Index for efficient chapter filtering and grouping

-- ── Step 1: Add column ──────────────────────────────────────────────────────

ALTER TABLE public.posts ADD COLUMN chapter text;
ALTER TABLE public.posts ADD CONSTRAINT posts_chapter_length
  CHECK (char_length(chapter) <= 100);

-- ── Step 2: Recreate composite type with chapter ────────────────────────────

-- Must drop functions first (they depend on the type)
DROP FUNCTION IF EXISTS public.get_posts_with_reactions(timestamptz, integer);
DROP FUNCTION IF EXISTS public.get_post_by_id(uuid);

DROP TYPE IF EXISTS public.get_posts_result CASCADE;

CREATE TYPE public.get_posts_result AS (
  id                   uuid,
  user_id              uuid,
  title                text,
  content              text,
  author               text,
  chapter              text,
  mood                 text,
  music                text,
  embedded_links       jsonb,
  has_media            boolean,
  is_private           boolean,
  created_at           timestamptz,
  updated_at           timestamptz,
  profile_display_name text,
  profile_avatar_url   text,
  content_truncated    boolean,
  reactions            jsonb,
  user_reactions       jsonb
);

-- ── Step 3: Recreate get_posts_with_reactions with chapter ───────────────────

CREATE OR REPLACE FUNCTION public.get_posts_with_reactions(
  p_cursor   timestamptz DEFAULT NULL,
  p_limit    integer     DEFAULT 20
)
RETURNS SETOF public.get_posts_result
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id uuid;
BEGIN
  v_user_id := auth.uid();

  -- Personal diary: only return the current user's own posts
  IF v_user_id IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    p.id,
    p.user_id,
    p.title,
    LEFT(p.content, 500) AS content,
    p.author,
    p.chapter,
    p.mood,
    p.music,
    p.embedded_links::jsonb,
    p.has_media,
    p.is_private,
    p.created_at,
    p.updated_at,
    pr.display_name AS profile_display_name,
    pr.avatar_url   AS profile_avatar_url,
    char_length(p.content) > 500 AS content_truncated,
    COALESCE(rc.reactions, '{}'::jsonb) AS reactions,
    COALESCE(ur.user_reactions, '[]'::jsonb) AS user_reactions
  FROM public.posts p
  LEFT JOIN public.profiles pr ON pr.id = p.user_id
  LEFT JOIN LATERAL (
    SELECT jsonb_object_agg(reaction_type, cnt) AS reactions
    FROM (
      SELECT reaction_type, COUNT(*) AS cnt
      FROM public.post_reactions r
      WHERE r.post_id = p.id
      GROUP BY reaction_type
    ) sub
  ) rc ON true
  LEFT JOIN LATERAL (
    SELECT jsonb_agg(reaction_type) AS user_reactions
    FROM public.post_reactions r
    WHERE r.post_id = p.id AND r.user_id = v_user_id
  ) ur ON true
  WHERE
    p.user_id = v_user_id
    AND (p_cursor IS NULL OR p.created_at < p_cursor)
  ORDER BY p.created_at DESC
  LIMIT GREATEST(1, LEAST(p_limit, 100));
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_posts_with_reactions(timestamptz, integer)
  TO anon, authenticated;

-- ── Step 4: Recreate get_post_by_id with chapter ────────────────────────────

CREATE OR REPLACE FUNCTION public.get_post_by_id(
  p_post_id  uuid
)
RETURNS SETOF public.get_posts_result
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id uuid;
BEGIN
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    p.id,
    p.user_id,
    p.title,
    p.content,
    p.author,
    p.chapter,
    p.mood,
    p.music,
    p.embedded_links::jsonb,
    p.has_media,
    p.is_private,
    p.created_at,
    p.updated_at,
    pr.display_name AS profile_display_name,
    pr.avatar_url   AS profile_avatar_url,
    false AS content_truncated,
    COALESCE(rc.reactions, '{}'::jsonb) AS reactions,
    COALESCE(ur.user_reactions, '[]'::jsonb) AS user_reactions
  FROM public.posts p
  LEFT JOIN public.profiles pr ON pr.id = p.user_id
  LEFT JOIN LATERAL (
    SELECT jsonb_object_agg(reaction_type, cnt) AS reactions
    FROM (
      SELECT reaction_type, COUNT(*) AS cnt
      FROM public.post_reactions r
      WHERE r.post_id = p.id
      GROUP BY reaction_type
    ) sub
  ) rc ON true
  LEFT JOIN LATERAL (
    SELECT jsonb_agg(reaction_type) AS user_reactions
    FROM public.post_reactions r
    WHERE r.post_id = p.id AND r.user_id = v_user_id
  ) ur ON true
  WHERE
    p.id = p_post_id
    AND p.user_id = v_user_id
  LIMIT 1;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_post_by_id(uuid)
  TO anon, authenticated;

-- ── Step 5: Chapter listing RPC for autocomplete/browsing ───────────────────

CREATE OR REPLACE FUNCTION public.get_user_chapters()
RETURNS TABLE(chapter text, post_count bigint, latest_post timestamptz)
LANGUAGE sql
STABLE
SECURITY INVOKER
AS $$
  SELECT p.chapter, COUNT(*) AS post_count, MAX(p.created_at) AS latest_post
  FROM public.posts p
  WHERE p.user_id = auth.uid()
    AND p.chapter IS NOT NULL
    AND p.chapter <> ''
  GROUP BY p.chapter
  ORDER BY MAX(p.created_at) DESC;
$$;

GRANT EXECUTE ON FUNCTION public.get_user_chapters()
  TO authenticated;

-- ── Step 6: Index for chapter filtering ─────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_posts_user_chapter
  ON public.posts (user_id, chapter)
  WHERE chapter IS NOT NULL;

NOTIFY pgrst, 'reload schema';
