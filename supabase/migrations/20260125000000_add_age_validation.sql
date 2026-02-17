-- Add server-side age validation for COPPA compliance
-- This prevents users under 13 from creating accounts even if they bypass client-side checks

-- Step 1: Add birth_year column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'profiles'
    AND column_name = 'birth_year'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN birth_year INTEGER;
  END IF;
END $$;

-- Step 2: Update handle_new_user function to populate birth_year
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name, birth_year, age_verified, tos_accepted)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)),
    COALESCE((new.raw_user_meta_data->>'birth_year')::integer, NULL),
    COALESCE((new.raw_user_meta_data->>'age_verified')::boolean, false),
    COALESCE((new.raw_user_meta_data->>'tos_accepted')::boolean, false)
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp;

-- Step 3: Add check constraint (only applies to new rows where birth_year is not null)
ALTER TABLE public.profiles
DROP CONSTRAINT IF EXISTS age_verification_check;

ALTER TABLE public.profiles
ADD CONSTRAINT age_verification_check
CHECK (
  birth_year IS NULL OR (EXTRACT(YEAR FROM CURRENT_DATE) - birth_year) >= 13
);

-- Step 4: Add RLS policy to enforce age requirement on inserts
DROP POLICY IF EXISTS "Enforce minimum age requirement" ON public.profiles;

CREATE POLICY "Enforce minimum age requirement"
  ON public.profiles
  FOR INSERT
  WITH CHECK (
    birth_year IS NULL OR (EXTRACT(YEAR FROM CURRENT_DATE) - birth_year) >= 13
  );

-- Step 5: Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_profiles_birth_year
  ON public.profiles(birth_year);

-- Step 6: Add comment explaining the constraint
COMMENT ON CONSTRAINT age_verification_check ON public.profiles IS
  'COPPA compliance: Ensures users are at least 13 years old based on birth year. NULL allowed for existing users.';
