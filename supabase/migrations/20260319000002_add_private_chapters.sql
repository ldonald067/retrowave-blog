-- Add private_chapters array to profiles.
-- Chapters listed here are hidden from the public profile.
-- Individual post-level is_private still works independently.

-- ── Step 1: Add private_chapters column ─────────────────────────────────────

ALTER TABLE public.profiles
  ADD COLUMN private_chapters text[] NOT NULL DEFAULT '{}';

-- ── Step 2: Update get_public_profile to filter out private chapters ────────
-- Drop and recreate to update the WHERE clause.

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
  -- Find the public profile by username
  SELECT id, private_chapters INTO v_profile_id, v_private_chapters
  FROM public.profiles
  WHERE username = p_username
    AND is_public = true;

  IF v_profile_id IS NULL THEN
    RETURN NULL;
  END IF;

  -- Build the result: profile info + posts with reactions
  -- Filter out: is_private posts AND posts in private chapters
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

-- ── Step 3: Protect private_chapters from direct PostgREST manipulation ─────
-- Add to existing trigger that protects age_verified/tos_accepted/birth_year.
-- Actually, private_chapters is user-editable (like theme), so no trigger needed.

NOTIFY pgrst, 'reload schema';
