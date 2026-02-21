# TRADING JOURNAL OS — Agent Operating System

> This file is the single source of truth for all agents working on this project.
> Read it fully before writing a single line of code. No exceptions.

---

## 1. Project Identity

**What we're building**: A professional-grade trading journal OS for futures day traders.
**Stack**: Next.js 16 (App Router) · TypeScript · Supabase (Postgres + RLS) · Drizzle ORM · Inngest · Zustand · TanStack Query · Tailwind CSS v4 · shadcn/ui
**Single worktree**: All work happens in one branch. No worktree separation.
**Spec location**: All feature specs live in `docs/`, `plan/`, `ux/`, `analytics/`, `import/`, `api/`, `architecture/`

---

## 2. Before You Write Any Code

Every agent, every session, every task — read these first:

```
docs/PROJECT_STATE.md        ← current state of the project
plan/03_build_sequence_checklist.md  ← what phase we're in
ux/ui_design_bible.md        ← non-negotiable UI rules
src/lib/db/schema.ts         ← database schema (ground truth)
```

Then read the spec file most relevant to your task.
**Never assume. Always read first.**

---

## 3. Agent Roles & Boundaries

| Agent | Owns | Never Touches |
|-------|------|---------------|
| `ui` | All files in `src/app/`, `src/components/`, `src/stores/` | `src/lib/db/`, `src/lib/import/`, `src/app/api/` internals |
| `import` | `src/lib/import/`, `src/app/api/import/` | UI components, auth files |
| `api` | `src/app/api/` (non-import), `src/lib/` utilities | UI components |
| `auth` | Auth pages, session utilities | Import pipeline, UI shell |

**If a task requires touching another agent's files**, stop and flag it. Do not cross boundaries without explicit instruction.

---

## 4. Definition of Done

**A task is ONLY complete when ALL of the following are true:**

- [ ] Feature works end-to-end in the running browser — not just compiles
- [ ] `npm run build` exits with 0 errors and 0 warnings
- [ ] All new `npm` dependencies are in `package.json` as direct dependencies (not just transitive)
- [ ] Database operations verified — query Supabase to confirm rows exist
- [ ] No placeholder logic, stubbed handlers, or visual-only scaffolds
- [ ] Small, focused git commit made with a clear message
- [ ] `docs/status/<area>.md` updated with what was done

**Do not report a task as done until every checkbox above is true.**
If you cannot verify browser behavior directly, use `curl` to verify the API and state so explicitly.

---

## 5. Autonomous Error Recovery

When you hit any error — build error, runtime error, database error, type error — follow this protocol:

```
1. READ the full error message and stack trace completely
2. IDENTIFY the root cause (not the symptom)
3. FIX it and re-run the full test immediately
4. If fix attempt 1 fails → try a different approach
5. If fix attempt 2 fails → stop, explain what you tried and why both failed, ask for guidance
```

**You do not need permission to fix errors encountered along the way.**
Never patch symptoms. Find and fix the actual root cause.
After each fix, re-run the full test to catch cascading errors.

---

## 6. Database Rules (Critical)

### Admin Client Bypasses RLS Triggers
The `src/lib/supabase/admin.ts` service-role client **bypasses all RLS policies**.
This means the `auto_set_user_id()` trigger does NOT fire for admin client writes.

**Rule**: Every INSERT using the admin client MUST explicitly include `user_id` in the insert object.

```typescript
// ✅ CORRECT
await adminClient.from('trades').insert({ user_id: userId, ... })

// ❌ WRONG — user_id will be null
await adminClient.from('trades').insert({ ... })
```

### Foreign Key Chain
`import_batches.user_id` → `users.id` → must exist in `public.users`, not just `auth.users`.
Always verify the user exists in `public.users` before inserting child records.

### Drizzle Schema is Ground Truth
`src/lib/db/schema.ts` defines all tables. Do not invent column names.
When in doubt, read the schema file.

### Migration Files
New DB changes go in `supabase/migrations/` with timestamp prefix: `YYYYMMDDHHMMSS_description.sql`
Never modify existing migration files.

---

## 7. UI Rules (Non-Negotiable)

Source of truth: `ux/ui_design_bible.md`

```
Background:  #0A0A0A (near black)
Surface:     #14171E
Border:      #2A2F3E
Accent:      #3B82F6 (blue) — not indigo, not purple
Success:     #22C55E
Error:       #EF4444
Font:        Inter (UI) + JetBrains Mono (numbers/code)
Animation:   150–300ms transitions, no jarring motion
Layout:      Bento grid, dark first, no light mode
```

Components: Use shadcn/ui (new-york style, dark theme).
Icons: Lucide React only.
Never hardcode colors inline — use CSS variables from `globals.css`.

---

## 8. Code Quality Standards

### TypeScript
- Strict mode is enabled — no `any` types without explicit justification
- All async functions must handle errors with try/catch
- All API routes must return typed responses

### API Routes
- Always authenticate via `src/lib/supabase/server.ts` → `getUser()`
- Always check `if (!user?.id)` → return 401 immediately
- Use admin client (`src/lib/supabase/admin.ts`) for all DB writes
- Use server client for auth reads only

### Components
- All client components must have `'use client'` directive
- No direct DB calls from client components — always go through API routes
- Zustand store (`src/stores/filters.ts`) is the single source of truth for global filters

### Error Handling
```typescript
// Every API route must follow this pattern:
try {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  // ... business logic
} catch (error) {
  console.error('[route-name] error:', error)
  return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
}
```

---

## 9. Git Discipline

- One commit per completed, working task
- Commit format: `type(scope): description`
  - `feat(import): add CSV parser`
  - `fix(modal): wire file picker to input ref`
  - `chore(deps): add clsx tailwind-merge`
- Never commit broken code
- Never commit `.env.local` or any secrets
- Commit message must describe what changed and why, not just "fix bug"

---

## 10. Build & Verification Protocol

After every significant change:

```bash
# 1. Type check
npx tsc --noEmit

# 2. Build check  
npm run build

# 3. If touching DB — verify in Supabase
# Run a SELECT query to confirm rows were inserted/updated correctly

# 4. If touching API — verify with curl
curl -X POST http://localhost:3000/api/your-route \
  -H "Content-Type: application/json" \
  -d '{"test": true}'
```

Fix ALL errors before proceeding. Do not move to the next task with a broken build.

---

## 11. Common Gotchas (Learn From History)

| Gotcha | Rule |
|--------|------|
| `display: none` inputs ignore programmatic `.click()` in Safari | Use `<label htmlFor>` instead |
| Admin client bypasses RLS triggers | Always set `user_id` explicitly on every insert |
| `public.users` ≠ `auth.users` | User must exist in both — check FK chain |
| Worktree package.json conflicts | Run `npm install` after any merge |
| Transitive deps not in package.json | `npm install --save <package>` for every import |
| Turbopack CSS cache stale | Stop and restart `npm run dev` after CSS package changes |
| `auto_set_user_id` trigger overwrites | Trigger uses `COALESCE` — but admin writes must still set it explicitly |

---

## 12. Progress Tracking

After completing each task, update the relevant status file:

```
docs/status/ui.md       ← UI agent progress
docs/status/import.md   ← Import agent progress  
docs/status/api.md      ← API agent progress
docs/status/auth.md     ← Auth agent progress
```

Format:
```markdown
## [DATE] - [Task Name]
**Status**: Complete ✅ / In Progress ⚠️ / Blocked ❌
**What was done**: ...
**Verified by**: build ✅ | browser ✅ | curl ✅ | DB query ✅
**Next**: ...
```

---

## 13. Current Phase

> **Update this section manually as phases complete.**

- [x] Phase 0: Foundation (AppShell, Auth, Placeholder Pages)
- [ ] Phase 1: Import Pipeline ← **CURRENT**
- [ ] Phase 2: Trade Journal
- [ ] Phase 3: Analytics Lab + Grading
- [ ] Phase 4: Command Center + Prop Firm HQ
- [ ] Phase 5: Finance + Ledger + Leak Detector
- [ ] Phase 6: Strategies + Routines + Goals
- [ ] Phase 7: AI Coach + Polish
- [ ] Phase 8: Testing + Launch

**Current blocker**: Import pipeline — `import_batches` insert failing due to FK constraint (`user_id` not present in `public.users`). Fix: run SQL to sync `auth.users` → `public.users` and add auth trigger for new signups.

---

## 14. When In Doubt

1. Read the spec file for the feature you're building
2. Check `docs/PROJECT_STATE.md` for current status
3. Look at existing working code for patterns to follow
4. Ask rather than assume — a wrong assumption costs more to fix than asking costs

**The goal is working software, not fast software. Do it right the first time.**

---

## 15. Context & Session Management

This is a long-running project. Manage token usage efficiently:

**How limits work**
Claude re-reads entire chat history on every message — long threads 
burn quota exponentially. Fresh sessions reading from files are cheap.
The files are the memory. The chat is disposable.

**Start of every session**
1. Read CLAUDE.md
2. Read docs/PROJECT_STATE.md  
3. Read docs/status/<area>.md for your domain
Never assume context from a previous session — always read first.

**During a session**
- Keep sessions to 25-30 messages before starting fresh
- Don't start complex new tasks near the end of a session
- Batch related questions into single messages

**End of every session — mandatory before closing**
Run this before ending any session:
"Summarize this session in 200 words: what was changed, decisions made, 
problems solved, and exact next steps. Paste into docs/status/<area>.md"

**Goal**: Status files are the memory. Every session starts cold from 
files alone, never from chat history.