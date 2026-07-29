-- ARCHIVED Supabase dashboard SQL snippet
-- Name:    Fix RLS Age Verification Policy
-- Saved:   2026-01-26
-- Snippet: 81f9be60-84ce-4586-8565-316bd1d0e404
--
-- Archived from the Supabase SQL Editor on 2026-07-29. For months this project
-- applied schema changes by pasting into the dashboard (CLI db push is blocked),
-- so these snippets are the primary record of some production state. Kept here
-- so that record survives independently of the dashboard.
--
-- NOT a migration. Nothing here runs automatically. Do not add to
-- supabase/migrations/ without reviewing against current prod state.

-- ============================================
-- FIX RLS POLICY FOR AGE VERIFICATION
-- ============================================
-- The "Enforce minimum age requirement" policy has NULL qual
-- This needs to be fixed
-- ============================================

-- STEP 1: Drop the broken policy
DROP POLICY IF EXISTS "Enforce minimum age requirement" ON public.profiles;

-- STEP 2: Recreate the policy with proper WITH CHECK
-- Note: FOR INSERT policies use WITH CHECK, not USING
CREATE POLICY "Enforce minimum age requirement"
  ON public.profiles
  FOR INSERT
  WITH CHECK (
    birth_year IS NULL OR
    (EXTRACT(YEAR FROM CURRENT_DATE) - birth_year) >= 13
  );

-- STEP 3: Verify the policy was created correctly
SELECT
  policyname,
  cmd,
  CASE
    WHEN qual IS NULL THEN 'NULL ⚠️'
    ELSE 'HAS VALUE ✅'
  END as qual_status,
  CASE
    WHEN with_check IS NULL THEN 'NULL ⚠️'
    ELSE 'HAS VALUE ✅'
  END as with_check_status
FROM pg_policies
WHERE tablename = 'profiles'
AND policyname = 'Enforce minimum age requirement';

-- ============================================
-- DEBUGGING: Check all RLS policies on profiles
-- ============================================

SELECT
  policyname,
  cmd,
  roles,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'profiles'
ORDER BY policyname;
