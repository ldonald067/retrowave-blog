-- Account Deletion RPC (Apple Guideline 5.1.1)
--
-- Apple requires apps with account creation to offer account deletion.
-- All foreign keys already use ON DELETE CASCADE, so deleting the auth.users
-- row cascades through: posts → post_reactions, post_reactions (user's own),
-- user_blocks (both directions), and profiles.
--
-- SECURITY DEFINER runs the function as the `postgres` role (the definer),
-- which has access to auth.users. The `authenticated` role cannot delete
-- from auth.users directly.

CREATE OR REPLACE FUNCTION public.delete_user_account()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id uuid;
BEGIN
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Delete the auth user. All public schema rows (posts, reactions, blocks,
  -- profile) are cleaned up automatically via ON DELETE CASCADE FKs.
  DELETE FROM auth.users WHERE id = v_user_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.delete_user_account() TO authenticated;

NOTIFY pgrst, 'reload schema';
