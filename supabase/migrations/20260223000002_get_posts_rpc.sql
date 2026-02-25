-- Paginated feed of posts with reactions pre-aggregated.
-- Replaces the two-query waterfall in usePosts.ts (N+1 fix).
--
-- CALLING CONVENTION (frontend):
--   supabase.rpc('get_posts_with_reactions', {
--     p_cursor:  '2026-02-23T10:00:00Z' | null,  -- ISO timestamp of last post
--     p_limit:   20,
--     p_user_id: 'uuid-string' | null,
--   })
--
-- CURSOR STRATEGY:
--   First page: p_cursor = NULL
--   Next page:  p_cursor = posts[posts.length - 1].created_at

-- Step 1: Create composite return type
DO $$ BEGIN
  CREATE TYPE public.get_posts_result AS (
    id            uuid,
    user_id       uuid,
    title         text,
    content       text,
    author        text,
    excerpt       text,
    mood          text,
    music         text,
    embedded_links jsonb,
    has_media     boolean,
    is_private    boolean,
    created_at    timestamptz,
    updated_at    timestamptz,
    profile_display_name text,
    profile_avatar_url   text,
    like_count    bigint,
    user_has_liked boolean,
    reactions     jsonb,
    user_reactions jsonb
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Step 2: Create the RPC function
CREATE OR REPLACE FUNCTION public.get_posts_with_reactions(
  p_cursor   timestamptz DEFAULT NULL,
  p_limit    integer     DEFAULT 20,
  p_user_id  uuid        DEFAULT NULL
)
RETURNS SETOF public.get_posts_result
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
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
      WHEN p_user_id IS NULL THEN false
      ELSE COALESCE(ul.user_has_liked, false)
    END AS user_has_liked,
    COALESCE(rc.reactions, '{}'::jsonb) AS reactions,
    CASE
      WHEN p_user_id IS NULL THEN '[]'::jsonb
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
    WHERE pl.post_id = p.id AND pl.user_id = p_user_id
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
    WHERE r.post_id = p.id AND r.user_id = p_user_id
  ) ur ON true
  WHERE
    (p.is_private = false OR p.user_id = p_user_id)
    AND (p_cursor IS NULL OR p.created_at < p_cursor)
  ORDER BY p.created_at DESC
  LIMIT LEAST(p_limit, 100);
$$;

-- Step 3: Grant access
GRANT EXECUTE ON FUNCTION public.get_posts_with_reactions(timestamptz, integer, uuid)
  TO anon, authenticated;

NOTIFY pgrst, 'reload schema';
