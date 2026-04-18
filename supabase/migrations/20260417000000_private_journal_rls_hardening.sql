-- Private journal RLS hardening.
-- Direct table reads stay owner-scoped; optional public sharing stays behind
-- the narrow get_public_profile RPC.

ALTER TABLE public.posts
  ALTER COLUMN is_private SET DEFAULT true;

DROP POLICY IF EXISTS "Anyone can read public posts" ON public.posts;
DROP POLICY IF EXISTS "Public posts are viewable by everyone" ON public.posts;
DROP POLICY IF EXISTS "Users can view own posts" ON public.posts;

CREATE POLICY "Users can view own posts"
  ON public.posts FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Anyone can read profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;

CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "Anyone can read reactions" ON public.post_reactions;
DROP POLICY IF EXISTS "Users can read own or own-post reactions" ON public.post_reactions;

CREATE POLICY "Users can read own or own-post reactions"
  ON public.post_reactions FOR SELECT
  USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1
      FROM public.posts p
      WHERE p.id = post_id
        AND p.user_id = auth.uid()
    )
  );

NOTIFY pgrst, 'reload schema';
