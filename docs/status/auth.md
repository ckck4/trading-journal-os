# Auth Status

## Latest Updates

- **Fix public.users sync blocker**: 
  - Created migration `20260220000000_sync_auth_public_users.sql` to synchronize `auth.users` to `public.users` via a Postgres trigger.
  - Included a backfill query to ensure any existing users in `auth.users` without a corresponding row in `public.users` are synced across.
  - Included required NOT NULL columns (`display_name`, `password_hash`) to satisfy `public.users` Drizzle schema constraints.
