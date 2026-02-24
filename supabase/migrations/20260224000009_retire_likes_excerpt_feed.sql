-- M1+M2: Retire post_likes table + excerpt-only feed
--
-- M1: post_likes is dead code -- no UI renders likes, no frontend code
--     inserts/deletes from it. The entire like system was superseded by
--     emoji reactions (post_reactions). Remove the table and all references
--     from the feed RPC.
--
-- M2: Feed was returning full content (up to 50KB per post), but PostCard
--     only displays the first 300 characters. Switch to excerpt-only feed
--     (LEFT 500 chars) and add a single-post RPC for full content
--     (view/edit modes).

-- ── Step 1: Drop the composite type + dependent functions ───────────────
-- get_posts_result can't be altered (no ADD/DROP COLUMN for composite types).
-- CASCADE drops get_posts_with_reactions (and the security-fixed version).
DROP TYPE IF EXISTS public.get_posts_result CASCADE;

-- ── Step 2: Recreate composite type ─────────────────────────────────────
-- Removed: like_count, user_has_liked (M1)
-- Added:   content_truncated (M2)
CREATE TYPE public.get_posts_result AS (
  id                   uuid,
  user_id              uuid,
  title                text,
  content              text,
  author               text,
  excerpt              text,
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

-- ── Step 3: Recreate feed RPC ───────────────────────────────────────────
-- Changes from previous version:
--   M1: Removed two LATERAL subqueries on post_likes (like_count, user_has_liked)
--   M2: Returns LEFT(p.content, 500) instead of full content
--   M2: Returns content_truncated boolean
-- Preserves all security fixes:
--   C2: Uses auth.uid() instead of p_user_id for visibility
--   C3: GREATEST(1, LEAST(p_limit, 100)) clamping

CREATE OR REPLACE FUNCTION public.get_posts_with_reactions(
  p_cursor   timestamptz DEFAULT NULL,
  p_limit    integer     DEFAULT 20,
  p_user_id  uuid        DEFAULT NULL  -- IGNORED: kept for backward compat
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
  -- C2 FIX: Always use the authenticated caller's ID, not the parameter.
  v_user_id := auth.uid();

  RETURN QUERY
  SELECT
    p.id,
    p.user_id,
    p.title,
    LEFT(p.content, 500) AS content,
    p.author,
    p.excerpt,
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
    CASE
      WHEN v_user_id IS NULL THEN '[]'::jsonb
      ELSE COALESCE(ur.user_reactions, '[]'::jsonb)
    END AS user_reactions
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
    (p.is_private = false OR p.user_id = v_user_id)
    AND (p_cursor IS NULL OR p.created_at < p_cursor)
  ORDER BY p.created_at DESC
  LIMIT GREATEST(1, LEAST(p_limit, 100));
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_posts_with_reactions(timestamptz, integer, uuid)
  TO anon, authenticated;

-- ── Step 4: Create single-post RPC (M2) ─────────────────────────────────
-- Returns full content for view/edit modes. Reuses get_posts_result type
-- (content_truncated is always false since we return full content).
-- Same security model: auth.uid() for visibility, SECURITY DEFINER.

CREATE OR REPLACE FUNCTION public.get_post_by_id(
  p_post_id  uuid,
  p_user_id  uuid DEFAULT NULL  -- IGNORED: kept for consistency with feed RPC
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

  RETURN QUERY
  SELECT
    p.id,
    p.user_id,
    p.title,
    p.content,   -- Full content, not truncated
    p.author,
    p.excerpt,
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
    CASE
      WHEN v_user_id IS NULL THEN '[]'::jsonb
      ELSE COALESCE(ur.user_reactions, '[]'::jsonb)
    END AS user_reactions
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
    AND (p.is_private = false OR p.user_id = v_user_id)
  LIMIT 1;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_post_by_id(uuid, uuid)
  TO anon, authenticated;

-- ── Step 5: Drop post_likes table (M1) ──────────────────────────────────
-- CASCADE removes RLS policies, indexes, unique constraints, and FK refs.
-- The idx_post_likes_post_id index (from migration 003) goes with it.
DROP TABLE IF EXISTS public.post_likes CASCADE;

NOTIFY pgrst, 'reload schema';
