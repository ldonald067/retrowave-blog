-- Working report + block path for App Review Guideline 1.2.
--
-- Before this migration:
--   REPORT — every "report entry" control was a mailto: link. On an iPhone with
--            no Mail account configured (a simulator, or any reviewer who never
--            set one up) the tap did nothing at all: no record, no confirmation.
--            Nothing was ever persisted, so there was no report queue to answer.
--   BLOCK  — the only block control lived in PostCard, gated on !isOwner. The
--            feed RPC was later narrowed to a personal diary (own posts only),
--            so that button could never render. The public profile page — the
--            one place you actually encounter another person's content — had no
--            block affordance at all.
--
-- This adds a durable reports table plus two SECURITY DEFINER entry points.
-- Both are callable from the public profile page, which is the only surface
-- where a user sees content that is not their own.

-- ── Step 1: content_reports table ─────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.content_reports (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id          uuid NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  reported_user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  -- Nullable on purpose: a signed-out visitor viewing a shared public link must
  -- still be able to flag content. ON DELETE SET NULL so deleting a reporter's
  -- account never destroys the report itself.
  reporter_id      uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  reason           text NOT NULL,
  details          text,
  status           text NOT NULL DEFAULT 'open',
  created_at       timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT content_reports_reason_check
    CHECK (reason IN ('harassment', 'adult', 'violence', 'spam', 'other')),
  CONSTRAINT content_reports_status_check
    CHECK (status IN ('open', 'reviewed', 'actioned', 'dismissed')),
  CONSTRAINT content_reports_details_length
    CHECK (details IS NULL OR char_length(details) <= 1000)
);

CREATE INDEX IF NOT EXISTS idx_content_reports_status_created
  ON public.content_reports(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_content_reports_post
  ON public.content_reports(post_id);

-- ── Step 2: RLS — nobody reads or writes this table directly ──────────
--
-- RLS is enabled with NO policies, so PostgREST callers (anon and authenticated)
-- can neither read nor insert. The only way in is report_public_post() below,
-- which is SECURITY DEFINER and therefore bypasses RLS. This is deliberate:
-- it keeps the report queue private and forces every insert through validation
-- and rate limiting. The operator reviews reports via the Supabase dashboard
-- (service role), which also bypasses RLS.

ALTER TABLE public.content_reports ENABLE ROW LEVEL SECURITY;

-- ── Step 3: report_public_post ────────────────────────────────────────

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
  v_is_priv  boolean;
BEGIN
  IF p_reason IS NULL OR p_reason NOT IN ('harassment','adult','violence','spam','other') THEN
    RAISE EXCEPTION 'Invalid report reason';
  END IF;

  -- Only publicly visible content can be reported. This also stops the RPC
  -- being used to probe whether an arbitrary post id exists.
  SELECT user_id, is_private INTO v_owner, v_is_priv
  FROM public.posts
  WHERE id = p_post_id;

  IF v_owner IS NULL OR v_is_priv THEN
    RAISE EXCEPTION 'Entry not found';
  END IF;

  -- Rate limit A: a signed-in reporter gets 20/hour.
  IF v_reporter IS NOT NULL THEN
    IF (
      SELECT count(*) FROM public.content_reports
      WHERE reporter_id = v_reporter AND created_at > now() - interval '1 hour'
    ) >= 20 THEN
      RAISE EXCEPTION 'Too many reports — please try again later';
    END IF;
  END IF;

  -- Rate limit B: bounds total rows per post per hour. Anonymous reporters
  -- cannot be attributed, so this is what keeps the queue from being flooded
  -- via a shared public link.
  IF (
    SELECT count(*) FROM public.content_reports
    WHERE post_id = p_post_id AND created_at > now() - interval '1 hour'
  ) >= 50 THEN
    RAISE EXCEPTION 'Too many reports — please try again later';
  END IF;

  INSERT INTO public.content_reports (post_id, reported_user_id, reporter_id, reason, details)
  VALUES (p_post_id, v_owner, v_reporter, p_reason, NULLIF(btrim(COALESCE(p_details, '')), ''));

  RETURN jsonb_build_object('reported', true);
END;
$$;

-- Anonymous viewers of a shared public link must be able to report.
GRANT EXECUTE ON FUNCTION public.report_public_post(uuid, text, text) TO anon, authenticated;

-- ── Step 4: block_user_by_username ────────────────────────────────────
--
-- get_public_profile deliberately does not expose the owner's user id, so the
-- client cannot call toggle_user_block(uuid) from a public page. This resolves
-- the username server-side, keeping the id private while still allowing a block.

CREATE OR REPLACE FUNCTION public.block_user_by_username(p_username text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id   uuid := auth.uid();
  v_target_id uuid;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT id INTO v_target_id
  FROM public.profiles
  WHERE username = p_username;

  IF v_target_id IS NULL THEN
    RAISE EXCEPTION 'User not found';
  END IF;

  IF v_target_id = v_user_id THEN
    RAISE EXCEPTION 'Cannot block yourself';
  END IF;

  INSERT INTO public.user_blocks (blocker_id, blocked_id)
  VALUES (v_user_id, v_target_id)
  ON CONFLICT (blocker_id, blocked_id) DO NOTHING;

  RETURN jsonb_build_object('is_blocked', true);
END;
$$;

GRANT EXECUTE ON FUNCTION public.block_user_by_username(text) TO authenticated;

NOTIFY pgrst, 'reload schema';
