-- Close a private-chapter exposure caused by exact string matching.
--
-- private_chapters is a text[] of chapter NAMES, and get_public_profile hid an
-- entry only when its chapter matched one of them exactly:
--
--     AND (p.chapter IS NULL OR NOT (p.chapter = ANY(v_private_chapters)))
--
-- Chapters are free text typed per entry — there is no chapter table and no
-- rename operation, so "renaming a chapter" means retyping the string on each
-- entry. That makes near-miss spellings routine, and every near miss silently
-- publishes:
--
--   Owner marks chapter "Therapy" private and has a PUBLIC entry inside it (the
--   chapter rule is what was hiding it). They later edit that entry and type
--   "therapy" — same chapter as far as any human is concerned. The string no
--   longer matches, so the entry appears on their public page immediately, with
--   no warning and nothing in the UI to indicate it happened.
--
-- Fix: compare case-insensitively and ignoring surrounding whitespace, so
-- "Therapy", "therapy" and " Therapy " are one chapter for privacy purposes.
-- This matches how a user thinks about chapter names.
--
-- Deliberately NOT changed: moving an entry to a genuinely different chapter
-- ("Therapy" -> "Therapy 2026") still publishes it. That is a real content move
-- and the entry's own is_private flag is the control for it — silently forcing
-- such entries private would be its own surprise. The UI should warn on that
-- transition instead.
--
-- Everything else in this function is carried over verbatim from
-- 20260501141057_add_profile_status_message.sql, which is the definition this
-- supersedes.

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

  -- Normalize once so the per-row comparison below stays cheap.
  v_private_chapters := ARRAY(
    SELECT lower(btrim(c))
    FROM unnest(COALESCE(v_private_chapters, ARRAY[]::text[])) AS c
    WHERE btrim(c) <> ''
  );

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
          -- Normalized comparison: "Therapy", "therapy" and " Therapy " are the
          -- same chapter for privacy purposes.
          AND (
            p.chapter IS NULL
            OR btrim(p.chapter) = ''
            OR NOT (lower(btrim(p.chapter)) = ANY(v_private_chapters))
          )
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
