-- Profiles SELECT lockdown (applied to prod 2026-07-18 via SQL editor).
--
-- Context: a full security review found the profiles table world-readable by
-- anonymous REST callers — every profile row (username, bio, mood, music,
-- birth_year, is_admin, etc.) was returned to unauthenticated requests. The
-- 20260417 hardening migration had never been deployed, AND prod carried an
-- extra permissive SELECT policy (not in the repo, created via the dashboard)
-- that a name-specific DROP would miss. This drops EVERY select policy on
-- profiles then reinstates the owner-only rule. Public sharing stays behind
-- the SECURITY DEFINER get_public_profile RPC, unaffected.
--
-- Idempotent and safe: touches only SELECT policies; INSERT/UPDATE policies
-- and the COPPA age trigger are cmd-specific and left intact.

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE pol record;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'profiles' AND cmd = 'SELECT'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.profiles', pol.policyname);
  END LOOP;
END $$;

CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

NOTIFY pgrst, 'reload schema';
