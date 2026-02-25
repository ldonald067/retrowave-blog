-- Data Export RPC (GDPR Article 15 / Apple Privacy)
--
-- Returns all user data as a single JSON blob:
-- { profile: {...}, posts: [...], reactions: [...], blocks: [...] }
--
-- The frontend downloads this as a .json file.

CREATE OR REPLACE FUNCTION public.export_user_data()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id uuid;
  v_profile jsonb;
  v_posts jsonb;
  v_reactions jsonb;
  v_blocks jsonb;
BEGIN
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Profile
  SELECT to_jsonb(p) INTO v_profile
  FROM public.profiles p
  WHERE p.id = v_user_id;

  -- Posts (full content, ordered by date)
  SELECT COALESCE(jsonb_agg(
    to_jsonb(p) ORDER BY p.created_at DESC
  ), '[]'::jsonb) INTO v_posts
  FROM public.posts p
  WHERE p.user_id = v_user_id;

  -- Reactions the user has made
  SELECT COALESCE(jsonb_agg(
    to_jsonb(r) ORDER BY r.created_at DESC
  ), '[]'::jsonb) INTO v_reactions
  FROM public.post_reactions r
  WHERE r.user_id = v_user_id;

  -- Users the user has blocked (not who blocked them — that's private to the blocker)
  SELECT COALESCE(jsonb_agg(
    to_jsonb(b) ORDER BY b.created_at DESC
  ), '[]'::jsonb) INTO v_blocks
  FROM public.user_blocks b
  WHERE b.blocker_id = v_user_id;

  RETURN jsonb_build_object(
    'profile', COALESCE(v_profile, '{}'::jsonb),
    'posts', v_posts,
    'reactions', v_reactions,
    'blocks', v_blocks
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.export_user_data() TO authenticated;

NOTIFY pgrst, 'reload schema';
