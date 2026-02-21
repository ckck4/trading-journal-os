# Trading Journal OS — Living Project Snapshot

> **Purpose**: A concise, living snapshot of the project for agent context bounding. Update manually as phases complete.

## 1. Current Phase & Status

- [ ] **Phase 0: Foundation** — ⚠️ IN PROGRESS
- [ ] **Phase 1: Import Engine** — 🚫 NOT STARTED
- [ ] **Phase 2: Trade Journal** — 🚫 NOT STARTED
- [ ] **Phase 3: Analytics Lab + Grading** — 🚫 NOT STARTED
- [ ] **Phase 4: Command Center + Prop Firm HQ** — 🚫 NOT STARTED
- [ ] **Phase 5: Finance + Ledger + Leak Detector** — 🚫 NOT STARTED
- [ ] **Phase 6: Strategies + Routines + Goals** — 🚫 NOT STARTED
- [ ] **Phase 7: AI Coach + Polish** — 🚫 NOT STARTED
- [ ] **Phase 8: Testing + Launch** — 🚫 NOT STARTED

## 2. Detailed Progress Breakdown

### Complete ✅
- **Next.js 16 Foundation**: Scaffolding with App Router, TypeScript, Tailwind CSS v4.
- **Database Schema**: All 26 tables cleanly defined in Drizzle (`src/lib/db/schema.ts`).
- **Database Security**: RLS migration generated (`supabase/migrations/20260217015800_rls_policies.sql`) with `auto_set_user_id()` trigger mapped to all necessary tables.
- **Supabase Clients**: Browser, Server, Admin, and Middleware successfully configured.
- **Agent Guidelines**: `AGENTS.md`, `CLAUDE.md`, `.claude/agents/`, `.agent/rules/`, and `.agent/workflows/` created. All major spec documentation is written.
- **Inngest Setup**: Client initialized, base API route configured with a hello-world function.

### In Progress ⚠️ (Phase 0 Foundation)
- Supabase local dev pushes / pushing DB schema to Supabase.
- Building auth pages (`/login`, `/register`).
- Initializing `shadcn/ui`, `globals.css` with dark theme tokens, and updating root layout.
- AppShell (Sidebar, Toolbars) and GlobalContext (Zustand, nuqs).
- Seed data creation for instruments (MNQ, MES, MGC), sessions, and the LucidFlex 50K prop template.
- Creating the `screenshots` storage bucket.
- Creating placeholder routes for the full Information Architecture.

### Not Started 🚫
- All features in Phases 1 through 8. No import parsing, no analytics, no strategy workflows, no prop evaluation engines.

## 3. Current Known Bugs & Blockers
- **Blocker (Gate 0)**: The import pipeline is blocked. `import_batches` row insertion fails due to an FK constraint on users. Specifically, `user_id` does not exist in `public.users` when a user signs up.
- **Required Fix**: Run a SQL migration to sync `auth.users` to `public.users` via a Supabase Auth trigger for all new user signups.

## 4. Key Architectural Decisions
- **Single Worktree**: All work happens in one main branch with strict directory boundaries per agent mapping.
- **AI Agent OS Setup**: 4 heavily specialized agent profiles defined (`api`, `auth`, `import`, `ui`). The assistant uses these context files to onboard cold. All agents refer to `AGENTS.md` and `CLAUDE.md`.
- **Tech Stack**: Next.js 16 (Turbopack), Drizzle ORM, Supabase Auth + Postgres 15+ (RLS mandatory), Tailwind CSS v4, `shadcn/ui`.
- **Trading Engine**: Tradeovate FILLS CSV act as the absolute source of truth. Features flat-to-flat deduplication and precise trade reconstruction.
- **Security**: Service role client (`admin.ts`) bypasses RLS entirely, requiring manual injection of `user_id` into queries. RLS is strictly enabled.

## 5. Database State
- **Schema**: 26 tables are fully mapped in `schema.ts`.
- **Primary Keys**: Valid `uuid` default random for all core tables. Timestamps utilize `timestamptz`.
- **Migrations**: `20260217015800_rls_policies.sql` handles all security policies and owner checks.
- **Missing Elements**: The Drizzle schema has not yet been populated with data, nor pushed to production/local Supabase. `public.users` is not synced.

## 6. Last Verified Working State
- **State**: Gate 0 is partially functionally complete. Route middleware correctly blocks unauthenticated users and redirects to `/login` (which currently throws a 404 because it hasn't been built). Inngest endpoint successfully resolves the test function. Drizzle schema successfully compiles and passes typechecks.

## 7. Next Task
- **Task**: Fix the `public.users` sync blocker by adding a Supabase Auth database trigger to insert new signups into `public.users`. Following that, execute the remaining Phase 0 UI foundation setup (Auth Pages, AppShell, `shadcn/ui`, `globals.css`).
