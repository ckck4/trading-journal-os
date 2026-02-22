# Trading Journal OS — Living Project Snapshot

> **Purpose**: A concise, living snapshot of the project for agent context bounding. Update manually as phases complete.

## 1. Current Phase & Status

- [x] **Phase 0: Foundation** — ✅ COMPLETE
- [x] **Phase 1: Import Engine** — ✅ COMPLETE
- [x] **Phase 1.5: UI Shell & Auth** — ✅ COMPLETE
- [ ] **Phase 2: Trade Journal** — ⚠️ IN PROGRESS (API merged, UI pending)
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
- **Database Security**: RLS migration generated with `auto_set_user_id()` trigger.
- **Supabase Clients**: Browser, Server, Admin, and Middleware successfully configured.
- **Agent Guidelines**: `AGENTS.md`, `CLAUDE.md`, `.claude/agents/`, `.agent/rules/`, and `.agent/workflows/` created. All major spec documentation is written.
- **Auth UI**: `<RegisterForm>`, `<LoginForm>`, and `(auth)` layouts completed.
- **UI Shell**: GlobalToolbar, Sidebar, layout contexts, and shadcn/ui integration finished.
- **Import Pipeline**: CSV parsing, deduplication, account/instrument resolution, trade reconstruction, and API routes successfully merged into main.
- **Trades API**: Base API scaffolding for retrieving trades and P&L merged into main.

### In Progress ⚠️ 
- **Trades UI**: The backend API for trades is present, but the frontend DataTables and views inside `src/app/trades/` need to be built and wired up.

### Not Started 🚫
- All features in Phases 3 through 8. No analytics, no strategy workflows, no prop evaluation engines.

## 3. Current Known Bugs & Blockers
- None active.

## 4. Key Architectural Decisions
- **Single Worktree**: All work happens in one main branch (`main`) with strict directory boundaries per agent mapping. Feature branches (`feat/auth`, `feat/ui-shell`, `feat/import-pipeline`, `feat/trades-api`) have been permanently consolidated.
- **AI Agent OS Setup**: 4 heavily specialized agent profiles defined (`api`, `auth`, `import`, `ui`). The assistant uses these context files to onboard cold. All agents refer to `AGENTS.md` and `CLAUDE.md`.
- **Tech Stack**: Next.js 16 (Turbopack), Drizzle ORM, Supabase Auth + Postgres 15+ (RLS mandatory), Tailwind CSS v4, `shadcn/ui`.
- **Trading Engine**: Tradeovate FILLS CSV act as the absolute source of truth. Features flat-to-flat deduplication and precise trade reconstruction.
- **Security**: Service role client (`admin.ts`) bypasses RLS entirely, requiring manual injection of `user_id` into queries. RLS is strictly enabled.

## 5. Database State
- **Schema**: 26 tables are fully mapped in `schema.ts`.
- **Primary Keys**: Valid `uuid` default random for all core tables. Timestamps utilize `timestamptz`.
- **Missing Elements**: The Drizzle schema has not yet been populated with data, nor pushed to production/local Supabase. `public.users` is not synced.

## 6. Last Verified Working State
- **State**: The `main` branch successfully compiles (`npm run build`). All dependencies from isolated branches have been resolved cleanly in `package.json`.

## 7. Next Task
- **Task**: Build the UI for the Trades Journal (Phase 2). Connect the DataTables to the newly merged `trades-api` endpoints.
