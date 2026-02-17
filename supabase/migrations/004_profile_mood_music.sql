-- Add mood and music columns to profiles
-- These allow users to update their current mood/music independently from posts

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS current_mood TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS current_music TEXT DEFAULT NULL;

-- Add comments
COMMENT ON COLUMN public.profiles.current_mood IS 'User current mood displayed on sidebar';
COMMENT ON COLUMN public.profiles.current_music IS 'What the user is currently listening to';
