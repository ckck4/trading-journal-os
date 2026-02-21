# Execution Queue

> **Format**: Numbered priority list. One agent session = One task execution. Work from top to bottom.

## 1. Fix `public.users` Sync Blocker 
- **What to build**: Resolve the foreign key error on user creation (blocking the import engine) by syncing `auth.users` to `public.users`. Write a Supabase database migration to add an auth hook trigger that automatically inserts new signups into `public.users`.
- **Files to touch**: 
  - `supabase/migrations/` (create new timestamped SQL migration file)
  - `src/lib/db/schema.ts` (ensure `users` table matches expected payload if necessary)
- **Definition of Done**: 
  - Migration script is created and valid.
  - A new user signup creates a row in BOTH `auth.users` and `public.users`.
  - Database operations verified via a Supabase query explicitly confirming row insertion.
  - `docs/status/auth.md` updated.

## 2. Generate Application Seed Data
- **What to build**: Create a database seed script to insert foundational data required for the OS to run. This includes 3 primary instruments (MNQ, MES, MGC), 3 core sessions (Asia, London, NY), and 1 LucidFlex 50K prop template.
- **Files to touch**:
  - `supabase/seed.sql` OR a custom TS seed script in `src/lib/db/seed.ts`
  - `package.json` (add a `db:seed` script if using TS)
- **Definition of Done**:
  - Script successfully executes against the local/remote DB without constraint errors.
  - Querying instruments, sessions, and prop_templates yields the expected rows.
  - `docs/status/api.md` updated.

## 3. Build Auth Pages (`/login` & `/register`)
- **What to build**: Implement user authentication pages using Supabase Auth (Email + Password) following the dark `#0A0A0A` aesthetic documented in the design bible.
- **Files to touch**:
  - `src/app/login/page.tsx`
  - `src/app/register/page.tsx`
  - Auth client utilities or components if necessary in `src/components/`
- **Definition of Done**:
  - User can register an account securely.
  - User can log in and gets routed to `/dashboard`.
  - Unauthenticated users remain redirected to `/login` natively.
  - `docs/status/auth.md` updated.

## 4. Initialize `shadcn/ui` & Global Design Tokens
- **What to build**: Set up the UI component library in accordance with the strict ux design bible guidelines. Install dependencies, configure Tailwind to use the required `Inter` and `JetBrains Mono` fonts, and align the `#0A0A0A` base / `#3B82F6` accent theme.
- **Files to touch**:
  - `components.json` (shadcn config scaffold)
  - `tailwind.config.ts` (or `globals.css` using PostCSS capabilities)
  - `src/app/globals.css`
  - `src/app/layout.tsx` (apply fonts correctly)
- **Definition of Done**:
  - `shadcn/ui` components can be generated without errors.
  - Base Next.js font configs are replaced.
  - Application strictly adheres to the dark mode palette with no layout shift.
  - `docs/status/ui.md` updated.

## 5. Build AppShell & Application Placeholder Pages
- **What to build**: Implement the main layout shell mapping the Information Architecture. Create a Sidebar covering all 29 nav items with Lucide icons, a top toolbar (account selector, date picker, filters), and wrap the main UI with global Zustand & nuqs state providers.
- **Files to touch**:
  - `src/components/layout/AppShell.tsx` (or similar)
  - `src/app/layout.tsx` (implement core context providers)
  - Layout placeholder pages across directories (e.g. `src/app/dashboard/`, `src/app/trades/`, `src/app/analytics/`)
  - `src/stores/filters.ts` (Zustand store skeleton for global filtering)
- **Definition of Done**:
  - Sidebar and Topbar render seamlessly with standard dummy elements.
  - App state routing synchronizes properly with the URL parameters.
  - `docs/status/ui.md` updated.

## 6. Build Initial Import Pipeline / CSV Upload
- **What to build**: The first stage of Phase 1 — Create the `multipart/form-data` API endpoint to accept Tradeovate CSV files, hash/dedupe the file, and gracefully create rows in the `import_batches` database table.
- **Files to touch**:
  - `src/app/api/import/route.ts`
  - `src/lib/import/csv-parser.ts` (or relevant mapping util)
- **Definition of Done**:
  - Uploading a mock CSV strictly parses the structure, succeeding by hitting `import_batches`.
  - API endpoint returns correct typescript response code without hanging.
  - `docs/status/import.md` updated.
