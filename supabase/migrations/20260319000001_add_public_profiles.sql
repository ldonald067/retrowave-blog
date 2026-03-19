-- Add shareable public profiles.
-- Opt-in: profiles.is_public defaults to false.
-- New RPC get_public_profile returns profile + posts for public profiles.
-- Visitors can view but must sign up to react (existing RLS handles reactions).

-- ── Step 1: Add is_public column ─────────────────────────────────────────────

ALTER TABLE public.profiles ADD COLUMN is_public boolean NOT NULL DEFAULT false;

-- ── Step 2: Create public profile RPC ────────────────────────────────────────
-- Returns profile info + public posts as a jsonb blob.
-- SECURITY DEFINER so anonymous callers can read.
-- Returns NULL if profile doesn't exist or isn't public.

CREATE OR REPLACE FUNCTION public.get_public_profile(
  p_username text
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_profile_id uuid;
  v_result jsonb;
BEGIN
  -- Find the public profile by username
  SELECT id INTO v_profile_id
  FROM public.profiles
  WHERE username = p_username
    AND is_public = true;

  IF v_profile_id IS NULL THEN
    RETURN NULL;
  END IF;

  -- Build the result: profile info + posts with reactions
  SELECT jsonb_build_object(
    'profile', jsonb_build_object(
      'username', pr.username,
      'display_name', pr.display_name,
      'bio', pr.bio,
      'avatar_url', pr.avatar_url,
      'theme', pr.theme,
      'current_mood', pr.current_mood,
      'current_music', pr.current_music,
      'created_at', pr.created_at
    ),
    'posts', COALESCE((
      SELECT jsonb_agg(post_row ORDER BY post_row->>'created_at' DESC)
      FROM (
        SELECT jsonb_build_object(
          'id', p.id,
          'title', p.title,
          'content', LEFT(p.content, 500),
          'author', p.author,
          'chapter', p.chapter,
          'mood', p.mood,
          'music', p.music,
          'is_private', p.is_private,
          'created_at', p.created_at,
          'content_truncated', (char_length(p.content) > 500),
          'reactions', COALESCE((
            SELECT jsonb_object_agg(reaction_type, cnt)
            FROM (
              SELECT reaction_type, COUNT(*) AS cnt
              FROM public.post_reactions r
              WHERE r.post_id = p.id
              GROUP BY reaction_type
            ) sub
          ), '{}'::jsonb)
        ) AS post_row
        FROM public.posts p
        WHERE p.user_id = v_profile_id
          AND p.is_private = false
        ORDER BY p.created_at DESC
        LIMIT 50
      ) sub
    ), '[]'::jsonb)
  ) INTO v_result
  FROM public.profiles pr
  WHERE pr.id = v_profile_id;

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_public_profile(text)
  TO anon, authenticated;

-- ── Step 3: Index for efficient public profile lookup ────────────────────────

CREATE INDEX IF NOT EXISTS idx_profiles_username_public
  ON public.profiles (username)
  WHERE is_public = true;

NOTIFY pgrst, 'reload schema';
