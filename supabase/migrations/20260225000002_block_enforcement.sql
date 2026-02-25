-- Block Enforcement Hardening (Apple Guideline 1.2)
--
-- Fixes three gaps in the blocking system:
--   1. Reactions RLS — blocked users cannot react to blocker's posts
--   2. Bidirectional feed filtering — blocked users can't see blocker's posts either
--   3. Helper function to DRY up block checks across RPCs

-- ── Step 1: Helper function to check blocks (bidirectional) ─────────

CREATE OR REPLACE FUNCTION public.is_blocked_pair(
  p_user_a uuid,
  p_user_b uuid
) RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_blocks
    WHERE (blocker_id = p_user_a AND blocked_id = p_user_b)
       OR (blocker_id = p_user_b AND blocked_id = p_user_a)
  );
$$;

-- ── Step 2: Block reactions from blocked users ──────────────────────
-- Drop the old permissive policy and replace with one that checks blocks.

DROP POLICY IF EXISTS "Users can insert own reactions" ON public.post_reactions;

CREATE POLICY "Users can insert own reactions (block-aware)"
  ON public.post_reactions FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND NOT EXISTS (
      SELECT 1 FROM public.user_blocks ub
      JOIN public.posts p ON p.id = post_id
      WHERE (ub.blocker_id = p.user_id AND ub.blocked_id = auth.uid())
         OR (ub.blocker_id = auth.uid() AND ub.blocked_id = p.user_id)
    )
  );

-- ── Step 3: Bidirectional feed filtering ────────────────────────────
-- Replace get_posts_with_reactions to hide posts in BOTH directions:
-- blocker doesn't see blocked's posts AND blocked doesn't see blocker's posts.

CREATE OR REPLACE FUNCTION public.get_posts_with_reactions(
  p_cursor   timestamptz DEFAULT NULL,
  p_limit    integer     DEFAULT 20,
  p_user_id  uuid        DEFAULT NULL
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
    -- Apple Guideline 1.2: Bidirectional block — neither party sees the other's posts
    AND (v_user_id IS NULL OR NOT public.is_blocked_pair(v_user_id, p.user_id))
  ORDER BY p.created_at DESC
  LIMIT GREATEST(1, LEAST(p_limit, 100));
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_posts_with_reactions(timestamptz, integer, uuid)
  TO anon, authenticated;

-- ── Step 4: Bidirectional single-post filtering ─────────────────────

CREATE OR REPLACE FUNCTION public.get_post_by_id(
  p_post_id  uuid,
  p_user_id  uuid DEFAULT NULL
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
    p.content,
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
    -- Apple Guideline 1.2: Bidirectional block
    AND (v_user_id IS NULL OR NOT public.is_blocked_pair(v_user_id, p.user_id))
  LIMIT 1;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_post_by_id(uuid, uuid)
  TO anon, authenticated;

GRANT EXECUTE ON FUNCTION public.is_blocked_pair(uuid, uuid)
  TO authenticated;

NOTIFY pgrst, 'reload schema';
