-- Cleanup: remove dead excerpt column and unused p_user_id parameter
--
-- 1. excerpt: column exists in posts table and get_posts_result composite type,
--    selected by both RPCs, but never used by the frontend. Dead weight.
-- 2. p_user_id: both feed RPCs now use auth.uid() exclusively (diary mode).
--    The parameter was kept for backward compat but nothing passes it meaningfully.
--
-- Changes:
--   - Drop and recreate get_posts_result WITHOUT excerpt field
--   - Recreate get_posts_with_reactions with only (p_cursor, p_limit) params
--   - Recreate get_post_by_id with only (p_post_id) param
--   - Drop excerpt column from posts table

-- ── Step 1: Drop old functions (must happen before type drop) ──────────────

DROP FUNCTION IF EXISTS public.get_posts_with_reactions(timestamptz, integer, uuid);
DROP FUNCTION IF EXISTS public.get_post_by_id(uuid, uuid);

-- ── Step 2: Recreate composite type without excerpt ────────────────────────

DROP TYPE IF EXISTS public.get_posts_result CASCADE;

CREATE TYPE public.get_posts_result AS (
  id                   uuid,
  user_id              uuid,
  title                text,
  content              text,
  author               text,
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

-- ── Step 3: Recreate get_posts_with_reactions WITHOUT p_user_id ────────────

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

-- ── Step 4: Recreate get_post_by_id WITHOUT p_user_id ──────────────────────

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

-- ── Step 5: Drop dead excerpt column from posts table ──────────────────────

ALTER TABLE public.posts DROP COLUMN IF EXISTS excerpt;

NOTIFY pgrst, 'reload schema';
