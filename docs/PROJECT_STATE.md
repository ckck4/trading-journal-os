# Trading Journal OS — Living Project Snapshot

> **Purpose**: A concise, living snapshot of the project for agent context bounding. Update manually as phases complete.

## Current Phase / Objective
We have completed and verified Phases **0-4**. A full QA debug pass was executed and all identified issues across the application (imports, layouts, widgets, API calculations, interactions) have been comprehensively resolved.

**Known Issues**: None.

**Next Immediate Focus**:
- [ ] **Phase 5: Finance + Ledger + Leak Detector** — 🚫 NOT STARTED
- [ ] **Phase 6: Strategies + Routines + Goals** — 🚫 NOT STARTED
- [ ] **Phase 7: AI Coach + Polish** — 🚫 NOT STARTED
- [ ] **Phase 8: Testing + Launch** — 🚫 NOT STARTED

## 1. Detailed Progress Breakdown

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
- All features in Phases 5 through 8. No finance ledger, leak detector, strategy workflows, or AI coach.

## 3. Current Known Bugs & Blockers
- **Empty States**: Command Center and Analytics show empty states until the user selects an account in the global toolbar. This is expected behavior, not a bug, but should be noted for UI polish.

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
- **Task**: Phase 5 (Finance + Ledger + Leak Detector) OR UI Polish pass before continuing with new features.
