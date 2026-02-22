-- ============================================================
-- Migration: sync auth.users → public.users
-- Timestamp: 20260220000000
--
-- Note: public.users requires display_name and password_hash to be NOT NULL,
-- so they are included here alongside id, email, and created_at.
-- ============================================================

-- 1. Trigger function
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.users (id, email, display_name, password_hash, created_at)
  VALUES (
    NEW.id,
    NEW.email,
    -- Derive display_name since it is NOT NULL
    COALESCE(
      NEW.raw_user_meta_data->>'display_name',
      NEW.raw_user_meta_data->>'full_name',
      split_part(NEW.email, '@', 1)
    ),
    -- Provide empty placeholder for password_hash since it is handled by Supabase Auth but NOT NULL in schema
    '',
    NEW.created_at
  )
  ON CONFLICT (id) DO NOTHING;
  
  RETURN NEW;
END;
$$;

-- 2. Trigger on auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_auth_user();

-- 3. One-time backfill
INSERT INTO public.users (id, email, display_name, password_hash, created_at)
SELECT
  id,
  email,
  COALESCE(
    raw_user_meta_data->>'display_name',
    raw_user_meta_data->>'full_name',
    split_part(email, '@', 1)
  ),
  '',
  created_at
FROM auth.users
ON CONFLICT (id) DO NOTHING;
