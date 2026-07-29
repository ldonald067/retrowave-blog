-- Follow-ups from the second adversarial review (3 Codex reviewers, 2026-07-29).
-- Every item here is a defect in code written EARLIER TODAY, not pre-existing.
--
-- 1. Blocking was cosmetic — get_public_profile never consulted user_blocks, so
--    after blocking, reopening #/u/name returned the whole profile again.
-- 2. Chapter-privacy normalization did not survive Unicode whitespace. Verified
--    against this database: lower(btrim('Therapy' || U+00A0)) <> 'therapy',
--    while JavaScript's .trim() DOES strip U+00A0. The UI therefore showed a
--    chapter as locked while the RPC published its entries.
-- 3. report_public_post checked only posts.is_private, so an entry hidden by an
--    unpublished profile or a private chapter was still reportable — which also
--    confirmed to a stranger that the concealed entry exists.
-- 4. The report rate limits counted rows and then inserted in separate steps, so
--    concurrent callers all passed the check before any of them committed.
-- 5. handle_new_user resolved username collisions with check-then-insert, which
--    races: two concurrent signups both see the name free, and the loser's
--    auth.users insert rolls back.

-- ── 1. Shared normalization ───────────────────────────────────────────
--
-- Mirrors JavaScript's \s exactly (see src/utils/chapterPrivacy.ts): collapse
-- every Unicode space form to a single ASCII space, trim, casefold. Both sides
-- must agree or the padlock stops reflecting real visibility.

CREATE OR REPLACE FUNCTION public.normalize_chapter(p_chapter text)
RETURNS text
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
SET search_path = public, pg_temp
AS $$
  SELECT lower(btrim(regexp_replace(
    COALESCE(p_chapter, ''),
    '[\s\u00A0\u1680\u2000-\u200A\u2028\u2029\u202F\u205F\u3000\uFEFF]+',
    ' ',
    'g'
  )));
$$;

COMMENT ON FUNCTION public.normalize_chapter(text) IS
  'Canonical chapter name for privacy comparisons. MUST stay in step with '
  'normalizeChapter() in src/utils/chapterPrivacy.ts.';

-- ── 2. Single source of truth for "is this post externally visible" ───
--
-- Previously three places decided this independently: get_public_profile,
-- report_public_post, and the client. They disagreed. Now they share this.

CREATE OR REPLACE FUNCTION public.is_post_publicly_visible(p_post_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.posts p
    JOIN public.profiles pr ON pr.id = p.user_id
    WHERE p.id = p_post_id
      AND p.is_private = false
      AND pr.is_public = true
      AND NOT EXISTS (
        SELECT 1
        FROM unnest(COALESCE(pr.private_chapters, ARRAY[]::text[])) AS pc
        WHERE public.normalize_chapter(pc) <> ''
          AND public.normalize_chapter(pc) = public.normalize_chapter(p.chapter)
      )
  );
$$;

-- ── 3. get_public_profile: honour blocks + Unicode-safe chapter match ──

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

  -- Blocking must actually hide content. Without this the block control was
  -- cosmetic: the button flipped to "blocked" but reopening the same URL
  -- returned the full profile.
  IF auth.uid() IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.user_blocks
    WHERE blocker_id = auth.uid() AND blocked_id = v_profile_id
  ) THEN
    RETURN NULL;
  END IF;

  -- Normalize once, Unicode-aware.
  v_private_chapters := ARRAY(
    SELECT public.normalize_chapter(c)
    FROM unnest(COALESCE(v_private_chapters, ARRAY[]::text[])) AS c
    WHERE public.normalize_chapter(c) <> ''
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
          AND NOT (public.normalize_chapter(p.chapter) = ANY(v_private_chapters))
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

-- ── 4. report_public_post: real visibility check + atomic quota ───────

CREATE OR REPLACE FUNCTION public.report_public_post(
  p_post_id uuid,
  p_reason  text,
  p_details text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_reporter uuid := auth.uid();
  v_owner    uuid;
BEGIN
  IF p_reason IS NULL OR p_reason NOT IN ('harassment','adult','violence','spam','other') THEN
    RAISE EXCEPTION 'Invalid report reason';
  END IF;

  -- Use the same predicate the public page uses, so an entry hidden by an
  -- unpublished profile or a private chapter is not reportable — and the RPC
  -- cannot be used to confirm that a concealed entry still exists.
  IF NOT public.is_post_publicly_visible(p_post_id) THEN
    RAISE EXCEPTION 'Entry not found';
  END IF;

  SELECT user_id INTO v_owner FROM public.posts WHERE id = p_post_id;

  -- Serialize per-post quota enforcement. Counting and inserting were separate
  -- statements, so concurrent callers all observed a below-limit count before
  -- any of them committed and the cap did not hold.
  PERFORM pg_advisory_xact_lock(hashtext('report:' || p_post_id::text));

  IF v_reporter IS NOT NULL THEN
    IF (
      SELECT count(*) FROM public.content_reports
      WHERE reporter_id = v_reporter AND created_at > now() - interval '1 hour'
    ) >= 20 THEN
      RAISE EXCEPTION 'Too many reports — please try again later';
    END IF;
  END IF;

  -- A signed-in reporter may only file once per post per day. This is what stops
  -- the per-post cap being weaponised: previously an anonymous attacker could
  -- burn the 50/hour budget on a genuinely abusive post and lock every honest
  -- visitor out of reporting it.
  IF v_reporter IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.content_reports
    WHERE post_id = p_post_id
      AND reporter_id = v_reporter
      AND created_at > now() - interval '1 day'
  ) THEN
    -- Idempotent: report already on file, so report again is a no-op success.
    RETURN jsonb_build_object('reported', true, 'duplicate', true);
  END IF;

  -- Anonymous submissions get a much smaller per-post budget than signed-in
  -- ones, and hitting it must never block an authenticated reporter.
  IF v_reporter IS NULL AND (
    SELECT count(*) FROM public.content_reports
    WHERE post_id = p_post_id
      AND reporter_id IS NULL
      AND created_at > now() - interval '1 hour'
  ) >= 10 THEN
    RAISE EXCEPTION 'Too many reports — please try again later';
  END IF;

  INSERT INTO public.content_reports (post_id, reported_user_id, reporter_id, reason, details)
  VALUES (p_post_id, v_owner, v_reporter, p_reason, NULLIF(btrim(COALESCE(p_details, '')), ''));

  RETURN jsonb_build_object('reported', true);
END;
$$;

GRANT EXECUTE ON FUNCTION public.report_public_post(uuid, text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.normalize_chapter(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_post_publicly_visible(uuid) TO anon, authenticated;

-- ── 5. handle_new_user: insert-and-catch instead of check-then-insert ──

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_email_local text;
  v_fallback    text;
  v_base        text;
  v_display     text;
  v_birth_year  integer := COALESCE((NEW.raw_user_meta_data->>'birth_year')::integer, NULL);
  v_age_ok      boolean;
BEGIN
  v_email_local := NULLIF(split_part(COALESCE(NEW.email, ''), '@', 1), '');
  v_fallback    := 'user_' || substring(NEW.id::text, 1, 8);

  v_base := left(
    regexp_replace(
      COALESCE(NEW.raw_user_meta_data->>'username', v_email_local, v_fallback),
      '[^a-zA-Z0-9_-]', '_', 'g'
    ),
    41
  );
  IF v_base IS NULL OR v_base = '' THEN
    v_base := v_fallback;
  END IF;

  v_display := left(COALESCE(NEW.raw_user_meta_data->>'display_name', v_email_local, v_fallback), 50);

  v_age_ok := v_birth_year IS NOT NULL
    AND (EXTRACT(YEAR FROM CURRENT_DATE) - v_birth_year) >= 13;

  -- Try the natural name, then fall back to a uuid-suffixed one. Checking
  -- availability first was racy: two concurrent signups sharing an email local
  -- part both saw the name free, and the loser's auth.users insert rolled back.
  BEGIN
    INSERT INTO public.profiles (id, username, display_name, birth_year, age_verified, tos_accepted)
    VALUES (NEW.id, v_base, v_display, v_birth_year, v_age_ok, false)
    ON CONFLICT (id) DO NOTHING;
  EXCEPTION WHEN unique_violation THEN
    BEGIN
      INSERT INTO public.profiles (id, username, display_name, birth_year, age_verified, tos_accepted)
      VALUES (NEW.id, left(v_base, 41) || '_' || substring(NEW.id::text, 1, 8),
              v_display, v_birth_year, v_age_ok, false)
      ON CONFLICT (id) DO NOTHING;
    EXCEPTION WHEN unique_violation THEN
      -- Effectively unreachable (the uuid prefix would have to collide), but a
      -- signup must never fail outright because of name generation.
      INSERT INTO public.profiles (id, username, display_name, birth_year, age_verified, tos_accepted)
      VALUES (NEW.id, 'user_' || replace(NEW.id::text, '-', ''),
              v_display, v_birth_year, v_age_ok, false)
      ON CONFLICT (id) DO NOTHING;
    END;
  END;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

NOTIFY pgrst, 'reload schema';
