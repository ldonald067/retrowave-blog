-- Rate Limiting via RLS Policies
--
-- Posts:     max 10 per hour per user
-- Reactions: max 60 per minute per user
--
-- These are server-side limits that cannot be bypassed by direct API callers.
-- The client-side 400ms cooldown on reactions is a UX nicety; this is the
-- security enforcement layer.

-- ── Posts: 10/hour rate limit ─────────────────────────────────────────────

-- Add a rate-limiting INSERT policy. The existing "Users can create own posts"
-- policy checks auth.uid() = user_id. We add a separate policy for the rate
-- limit — PostgreSQL RLS requires ALL policies to pass (permissive policies
-- are OR'd, but restrictive policies are AND'd). Use RESTRICTIVE so this
-- check is always enforced alongside the ownership check.

CREATE POLICY "Rate limit post creation"
  ON public.posts
  AS RESTRICTIVE
  FOR INSERT
  WITH CHECK (
    (
      SELECT count(*)
      FROM public.posts
      WHERE user_id = auth.uid()
        AND created_at > now() - interval '1 hour'
    ) < 10
  );

-- ── Reactions: 60/minute rate limit ───────────────────────────────────────

-- Replace the existing block-aware INSERT policy with one that also enforces
-- the rate limit. We combine both checks into a single policy.

DROP POLICY IF EXISTS "Users can insert own reactions (block-aware)" ON public.post_reactions;

CREATE POLICY "Users can insert own reactions (block-aware, rate-limited)"
  ON public.post_reactions FOR INSERT
  WITH CHECK (
    -- Ownership check
    auth.uid() = user_id
    -- Block check: cannot react to posts from/by blocked users
    AND NOT EXISTS (
      SELECT 1 FROM public.user_blocks ub
      JOIN public.posts p ON p.id = post_id
      WHERE (ub.blocker_id = p.user_id AND ub.blocked_id = auth.uid())
         OR (ub.blocker_id = auth.uid() AND ub.blocked_id = p.user_id)
    )
    -- Rate limit: max 60 reactions per minute
    AND (
      SELECT count(*)
      FROM public.post_reactions
      WHERE user_id = auth.uid()
        AND created_at > now() - interval '1 minute'
    ) < 60
  );

NOTIFY pgrst, 'reload schema';
