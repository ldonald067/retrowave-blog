-- Add an account-backed AIM-style status line for signed-in and public profile surfaces.
-- This replaces the previous device-local status behavior stored only in browser storage.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS status_message text DEFAULT NULL;

COMMENT ON COLUMN public.profiles.status_message IS
  'Short status shown in the signed-in header/sidebar and on public profile pages.';

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_status_message_length;
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_status_message_length
  CHECK (status_message IS NULL OR char_length(status_message) <= 100);

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
  v_private_chapters text[];
  v_result jsonb;
BEGIN
  SELECT id, private_chapters INTO v_profile_id, v_private_chapters
  FROM public.profiles
  WHERE username = p_username
    AND is_public = true;

  IF v_profile_id IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT jsonb_build_object(
    'profile', jsonb_build_object(
      'username', pr.username,
      'display_name', pr.display_name,
      'bio', pr.bio,
      'avatar_url', pr.avatar_url,
      'theme', pr.theme,
      'current_mood', pr.current_mood,
      'current_music', pr.current_music,
      'status_message', pr.status_message,
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
          'content_truncated', (char_length(p.content) > 500)
        ) AS post_row
        FROM public.posts p
        WHERE p.user_id = v_profile_id
          AND p.is_private = false
          AND (p.chapter IS NULL OR NOT (p.chapter = ANY(v_private_chapters)))
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

NOTIFY pgrst, 'reload schema';
