-- H5 FIX: Constrain reaction_type to the canonical emoji set.
-- The frontend defines REACTION_EMOJIS in ReactionBar.tsx as:
--   ['❤️', '🔥', '😂', '😢', '✨', '👀']
-- Without this CHECK, any authenticated user calling PostgREST
-- directly could store arbitrary strings, corrupting reaction counts.

ALTER TABLE public.post_reactions
  DROP CONSTRAINT IF EXISTS post_reactions_reaction_type_check;
ALTER TABLE public.post_reactions
  ADD CONSTRAINT post_reactions_reaction_type_check
  CHECK (reaction_type IN ('❤️', '🔥', '😂', '😢', '✨', '👀'));


-- M3 FIX: Add length constraints on profile fields.
-- These match PROFILE_LIMITS in src/lib/validation.ts (added in F3 fix).
-- Without DB constraints, anyone calling the REST API directly
-- could store unbounded strings.
--
-- IMPORTANT: Keep these in sync with PROFILE_LIMITS in validation.ts.
--   display_name: 50, bio: 500, current_mood: 100,
--   current_music: 200, username: 50

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_display_name_length;
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_display_name_length
  CHECK (display_name IS NULL OR char_length(display_name) <= 50);

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_bio_length;
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_bio_length
  CHECK (bio IS NULL OR char_length(bio) <= 500);

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_current_mood_length;
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_current_mood_length
  CHECK (current_mood IS NULL OR char_length(current_mood) <= 100);

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_current_music_length;
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_current_music_length
  CHECK (current_music IS NULL OR char_length(current_music) <= 200);

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_username_length;
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_username_length
  CHECK (username IS NULL OR char_length(username) <= 50);
