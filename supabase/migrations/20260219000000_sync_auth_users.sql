-- ============================================================
-- Migration: sync auth.users → public.users
-- Timestamp: 20260219000000
--
-- Root cause: import_batches.user_id has a FK to public.users.id
-- but Supabase Auth only writes to auth.users. The pipeline uses
-- the service-role client (bypasses RLS) so it hits the FK directly.
--
-- Fix:
--   1. Trigger: after any new signup in auth.users, auto-insert a
--      matching row in public.users.
--   2. Backfill: sync all existing auth users that have no row in
--      public.users yet.
-- ============================================================

-- ── 1. Trigger function ─────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.users (id, email, display_name, password_hash)
  VALUES (
    NEW.id,
    NEW.email,
    -- derive display_name from email prefix; user can rename in Settings
    COALESCE(
      NEW.raw_user_meta_data->>'display_name',
      NEW.raw_user_meta_data->>'full_name',
      split_part(NEW.email, '@', 1)
    ),
    -- password_hash: auth is handled by Supabase Auth; placeholder here
    ''
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$;

-- ── 2. Trigger on auth.users ────────────────────────────────────────────────
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_auth_user();

-- ── 3. One-time backfill: existing auth users ───────────────────────────────
-- Inserts any auth user who doesn't yet have a public.users row.
-- ON CONFLICT DO NOTHING is safe to re-run.
INSERT INTO public.users (id, email, display_name, password_hash)
SELECT
  au.id,
  au.email,
  COALESCE(
    au.raw_user_meta_data->>'display_name',
    au.raw_user_meta_data->>'full_name',
    split_part(au.email, '@', 1)
  ),
  ''
FROM auth.users au
WHERE NOT EXISTS (
  SELECT 1 FROM public.users pu WHERE pu.id = au.id
)
ON CONFLICT (id) DO NOTHING;
