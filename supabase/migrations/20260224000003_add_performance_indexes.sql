-- M8 FIX: Add indexes for pagination and ownership queries.
--
-- get_posts_with_reactions uses ORDER BY created_at DESC and
-- WHERE p.created_at < p_cursor for cursor pagination. Without
-- an index this is a full sequential scan on every page load —
-- especially costly on mobile (iPhone) where network latency
-- already compounds any server-side delay.
--
-- posts.user_id is used for ownership checks in RLS policies
-- and the private-post filter in the RPC function.

CREATE INDEX IF NOT EXISTS idx_posts_created_at
  ON public.posts (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_posts_user_id
  ON public.posts (user_id);

-- post_reactions is joined per-post in the RPC. Index the FK
-- so the lateral subquery doesn't full-scan reactions.
CREATE INDEX IF NOT EXISTS idx_post_reactions_post_id
  ON public.post_reactions (post_id);

-- post_likes is aggregated per-post in the RPC.
CREATE INDEX IF NOT EXISTS idx_post_likes_post_id
  ON public.post_likes (post_id);
