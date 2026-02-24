-- Fix C2: Private post exposure via caller-supplied p_user_id
-- Fix C3: Negative p_limit bypasses the 100-row cap
--
-- C2: The old function trusted the caller-supplied p_user_id, allowing any
--     user to read another user's private posts by passing their UUID.
--     Now p_user_id is IGNORED — the function uses auth.uid() internally.
--     The parameter is kept for backward compatibility (the frontend still
--     passes it), but it has no effect.
--
-- C3: LEAST(-1, 100) = -1, which PostgreSQL treats as LIMIT ALL.
--     Now uses GREATEST(1, LEAST(p_limit, 100)) to clamp to 1..100.
--
-- NOTE: This function is SECURITY DEFINER (bypasses RLS). The WHERE clause
-- manually enforces visibility rules. If RLS on 'posts' changes, update
-- the WHERE clause here too.

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
  -- For anonymous callers, auth.uid() returns NULL -> only public posts visible.
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
    COALESCE(lk.like_count, 0) AS like_count,
    CASE
      WHEN v_user_id IS NULL THEN false
      ELSE COALESCE(ul.user_has_liked, false)
    END AS user_has_liked,
    COALESCE(rc.reactions, '{}'::jsonb) AS reactions,
    CASE
      WHEN v_user_id IS NULL THEN '[]'::jsonb
      ELSE COALESCE(ur.user_reactions, '[]'::jsonb)
    END AS user_reactions
  FROM public.posts p
  LEFT JOIN public.profiles pr ON pr.id = p.user_id
  LEFT JOIN LATERAL (
    SELECT COUNT(*) AS like_count
    FROM public.post_likes pl
    WHERE pl.post_id = p.id
  ) lk ON true
  LEFT JOIN LATERAL (
    SELECT true AS user_has_liked
    FROM public.post_likes pl
    WHERE pl.post_id = p.id AND pl.user_id = v_user_id
    LIMIT 1
  ) ul ON true
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
  -- C3 FIX: Clamp limit to 1..100 (negative values no longer bypass the cap)
  LIMIT GREATEST(1, LEAST(p_limit, 100));
END;
$$;

-- Re-grant access (idempotent)
GRANT EXECUTE ON FUNCTION public.get_posts_with_reactions(timestamptz, integer, uuid)
  TO anon, authenticated;

NOTIFY pgrst, 'reload schema';
