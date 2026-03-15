-- Sanitize default username in handle_new_user trigger.
-- Replace non-alphanumeric characters (like dots in email local parts)
-- with underscores so the username passes the format constraint.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
  v_raw_username text;
  v_email_local text;
  v_safe_username text;
  v_safe_display text;
  v_fallback text;
BEGIN
  v_raw_username := NEW.raw_user_meta_data->>'username';
  v_email_local := NULLIF(split_part(COALESCE(NEW.email, ''), '@', 1), '');
  v_fallback := 'user_' || substring(NEW.id::text, 1, 8);

  -- Sanitize username: only allow [a-zA-Z0-9_-]
  v_safe_username := regexp_replace(
    COALESCE(v_raw_username, v_email_local, v_fallback),
    '[^a-zA-Z0-9_-]', '_', 'g'
  );

  -- Display name can contain any characters — no sanitization needed
  v_safe_display := COALESCE(
    NEW.raw_user_meta_data->>'display_name',
    v_email_local,
    v_fallback
  );

  INSERT INTO public.profiles (
    id,
    username,
    display_name,
    birth_year,
    age_verified,
    tos_accepted
  )
  VALUES (
    NEW.id,
    v_safe_username,
    v_safe_display,
    COALESCE((NEW.raw_user_meta_data->>'birth_year')::integer, NULL),
    -- SECURITY: Do NOT trust age_verified from metadata. Derive from birth_year.
    CASE
      WHEN (NEW.raw_user_meta_data->>'birth_year') IS NOT NULL
        AND (EXTRACT(YEAR FROM CURRENT_DATE) - (NEW.raw_user_meta_data->>'birth_year')::integer) >= 13
      THEN true
      ELSE false
    END,
    COALESCE((NEW.raw_user_meta_data->>'tos_accepted')::boolean, false)
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

NOTIFY pgrst, 'reload schema';
