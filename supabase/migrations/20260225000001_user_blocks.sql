-- User Blocking (Apple Guideline 1.2)
--
-- UGC apps must let users block other users. This migration adds:
--   1. user_blocks table with RLS
--   2. toggle_user_block RPC (SECURITY DEFINER)
--   3. Updates get_posts_with_reactions + get_post_by_id to exclude blocked users

-- ── Step 1: Create user_blocks table ──────────────────────────────────

CREATE TABLE public.user_blocks (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  blocker_id  uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  blocked_id  uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at  timestamptz DEFAULT now(),
  UNIQUE (blocker_id, blocked_id),
  CHECK (blocker_id != blocked_id)  -- can't block yourself
);

-- ── Step 2: RLS policies ──────────────────────────────────────────────

ALTER TABLE public.user_blocks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own blocks"
  ON public.user_blocks FOR SELECT
  USING (auth.uid() = blocker_id);

CREATE POLICY "Users can insert own blocks"
  ON public.user_blocks FOR INSERT
  WITH CHECK (auth.uid() = blocker_id);

CREATE POLICY "Users can delete own blocks"
  ON public.user_blocks FOR DELETE
  USING (auth.uid() = blocker_id);

-- ── Step 3: Indexes ───────────────────────────────────────────────────

CREATE INDEX idx_user_blocks_blocker ON public.user_blocks(blocker_id);
CREATE INDEX idx_user_blocks_blocked ON public.user_blocks(blocked_id);

-- ── Step 4: Toggle RPC ────────────────────────────────────────────────
-- SECURITY DEFINER — uses auth.uid() internally, ignores caller params.

CREATE OR REPLACE FUNCTION public.toggle_user_block(p_target_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id uuid;
  v_existing uuid;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF v_user_id = p_target_user_id THEN
    RAISE EXCEPTION 'Cannot block yourself';
  END IF;

  SELECT id INTO v_existing
  FROM public.user_blocks
  WHERE blocker_id = v_user_id AND blocked_id = p_target_user_id;

  IF v_existing IS NOT NULL THEN
    DELETE FROM public.user_blocks WHERE id = v_existing;
    RETURN jsonb_build_object('is_blocked', false);
  ELSE
    INSERT INTO public.user_blocks (blocker_id, blocked_id)
    VALUES (v_user_id, p_target_user_id);
    RETURN jsonb_build_object('is_blocked', true);
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.toggle_user_block(uuid)
  TO authenticated;

-- ── Step 5: Update feed RPC — exclude blocked users ───────────────────
-- Replaces the version from migration 009. Adds NOT EXISTS subquery.

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
    -- Apple Guideline 1.2: Hide posts from blocked users
    AND (v_user_id IS NULL OR NOT EXISTS (
      SELECT 1 FROM public.user_blocks ub
      WHERE ub.blocker_id = v_user_id AND ub.blocked_id = p.user_id
    ))
  ORDER BY p.created_at DESC
  LIMIT GREATEST(1, LEAST(p_limit, 100));
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_posts_with_reactions(timestamptz, integer, uuid)
  TO anon, authenticated;

-- ── Step 6: Update single-post RPC — exclude blocked users ────────────

CREATE OR REPLACE FUNCTION public.get_post_by_id(
  p_post_id  uuid,
  p_user_id  uuid DEFAULT NULL  -- IGNORED: kept for consistency
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
    -- Apple Guideline 1.2: Hide posts from blocked users
    AND (v_user_id IS NULL OR NOT EXISTS (
      SELECT 1 FROM public.user_blocks ub
      WHERE ub.blocker_id = v_user_id AND ub.blocked_id = p.user_id
    ))
  LIMIT 1;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_post_by_id(uuid, uuid)
  TO anon, authenticated;

NOTIFY pgrst, 'reload schema';
