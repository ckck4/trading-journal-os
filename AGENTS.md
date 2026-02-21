# Trading Journal OS — Universal Agent Rulebook

> **CRITICAL**: This is the universal rulebook for any AI agent (Claude Code, Roo, Gemini, etc.) working on this project. Read this file completely before writing any code.

## 1. Project Identity
**What we're building**: A professional-grade, configurability-first trading journal OS for futures day traders.
**Stack**: Next.js 16 (App Router), TypeScript, Supabase (Postgres + RLS), Drizzle ORM, Inngest, Zustand, TanStack Query, Tailwind CSS v4, shadcn/ui.
**Architecture**: Single worktree (all work in one branch).
**Core Philosophy**: Cohesive OS integration (no silos), everything configurable. Futures only (Tradeovate FILLS CSV). No "cost of mistakes" features. Default Prop Firm: LucidFlex 50K.

## 2. File Reading Order (Onboarding)
For any new agent session, you MUST read these files in order before doing anything:
1. `AGENTS.md` (This file)
2. `CLAUDE.md` (General project rules and gotchas)
3. `docs/PROJECT_STATE.md` (Current living snapshot of the project)
4. `TASKS.md` (Your execution queue)
5. `src/lib/db/schema.ts` (Database ground truth)
6. `ux/ui_design_bible.md` (If touching UI/frontend)

## 3. Database Rules (Critical)
- **Supabase Admin Client**: `src/lib/supabase/admin.ts` bypasses all RLS and triggers. 
  - **Rule**: Every `INSERT` using the admin client MUST explicitly include `user_id`. The `auto_set_user_id()` trigger will NOT fire for admin writes.
- **Foreign Key Chain**: `import_batches.user_id` → `users.id` must exist in `public.users`, not just `auth.users`. Always verify `public.users` existence.
- **RLS Trigger Behavior**: Triggers use `COALESCE` to set `user_id` from `auth.uid()`, but only for authenticated user requests (not admin).
- **Schema is Ground Truth**: `src/lib/db/schema.ts` defines all tables. Never invent column names. Always verify against this file.

## 4. UI Rules (Non-Negotiable)
Follow `ux/ui_design_bible.md` strictly. No exceptions without explicit permission.
- **Aesthetic**: Linear/Vercel dark aesthetic. No light mode.
- **Layout**: Bento grid dashboard, modular cards.
- **Colors**: Background `#0A0A0A`, Surface `#14171E` (or `#1A1A1A`), Accent `#3B82F6` (blue). Success `#22C55E`, Error `#EF4444`.
- **Typography**: Inter for headings/UI, JetBrains Mono for numbers/data.
- **Components**: `shadcn/ui` (new-york dark theme), Lucide React icons.
- **Animations**: Subtle, 150-300ms transitions. Skeletons for loaders.

## 5. Code Quality Standards
- **TypeScript**: Strict mode enabled. No `any` types without explicit justification.
- **Error Handling**: All async functions and API routes must use `try/catch`. DO NOT catch silently without logging or returning an error status.
- **API Routes**:
  - Authenticate via `src/lib/supabase/server.ts` -> `getUser()`.
  - Return 401 if `!user?.id`.
  - Use `admin.ts` client for all DB writes, server client for auth reads.
- **Components**: All client components need `'use client'`. No direct DB calls from client components—always go through API routes. Global filters must use the Zustand store.

## 6. Definition of Done
A task is ONLY complete when ALL of the following are true:
- [ ] Feature works end-to-end in the running browser — not just compiles.
- [ ] `npm run build` exits with 0 errors and 0 warnings.
- [ ] New `npm` dependencies are in `package.json` as direct dependencies.
- [ ] Database operations verified — query Supabase to confirm rows exist.
- [ ] No placeholder logic, stubbed handlers, or visual-only scaffolds.
- [ ] Small, focused git commit made with a clear message.
- [ ] `docs/status/<area>.md` updated with what was done.

## 7. Git Discipline
- One commit per completed, working task.
- Format: `type(scope): description` (e.g., `feat(import): add CSV parser`).
- NEVER commit broken code. NEVER commit `.env.local` or secrets.

## 8. Autonomous Error Recovery Protocol
When encountering an error (build, runtime, DB, TS), you do not need permission to fix it. Follow this strict protocol:
1. **READ** the full error message and stack trace completely.
2. **IDENTIFY** the root cause (not the symptom).
3. **FIX** it and re-run the full test immediately.
4. If attempt 1 fails → try a different approach.
5. If attempt 2 fails → **STOP**, explain what you tried and why both failed, and ask the user for guidance. Escalate immediately.

## 9. Agent Roles & Boundaries
You have strict context domains. Do not cross boundaries without explicit permission.
- **`ui` agent**: Owns `src/app/`, `src/components/`, `src/stores/`. Never touches DB schema, API internals, or import logic.
- **`import` agent**: Owns `src/lib/import/`, `src/app/api/import/`. Never touches UI/auth.
- **`api` agent**: Owns `src/app/api/` (non-import), `src/lib/` utilities.
- **`auth` agent**: Owns Auth pages and session wiring.

## 10. Common Gotchas
- Safari programmatic `.click()` ignored on `display: none` inputs → use `<label htmlFor>`.
- `public.users` ≠ `auth.users` → verify FK chain during auth/signup.
- Worktree package.json conflicts → run `npm install` after merges.
- Turbopack CSS cache stale → restart `npm run dev` after CSS package changes.

## 11. Session Discipline
- **Status Files are Memory**: At the end of every agent session, you MUST update `docs/status/<area>.md` (e.g., `docs/status/ui.md`). Summarize exactly what was changed, decisions made, problems fixed, and the exact next steps.
- **Context Management**: Start fresh sessions often (after 25-30 messages) to save quota. The files are the active memory, not the chat history. Batch questions to avoid ping-pong.
