# Execution Queue

> **Format**: Numbered priority list. One agent session = One task execution. Work from top to bottom.

## 1. Phase 5: Finance + Ledger + Leak Detector (OR UI Polish)
- **What to build**: Build out the initial UI and functionality for the Phase 5 business ledger or execute a deep UI polish pass over existing views.
- **Action**: Assess whether to pursue rigorous UI polish over the existing `/journal`, `/analytics`, and `/prop` screens, or build the new features for `/ledger`.

## 2. Execute DB Push and Seed Data
- **What to build**: Push the Drizzle schema to Supabase and execute the seed script to insert foundational data (instruments, sessions, prop templates).
- **Files to touch**:
  - `src/lib/db/seed.ts`
- **Definition of Done**:
  - Schema is pushed to the database.
  - Script successfully executes against the local/remote DB without constraint errors.
  - Querying instruments from the API returns data.

## 3. Add Inngest Background Jobs for Imports
- **What to build**: The Import Pipeline is merged, but currently processes files synchronously in the API route. Convert this to an Inngest background job.
- **Files to touch**:
  - `src/app/api/import/route.ts` (Trigger Inngest instead of awaiting runImport)
  - `src/inngest/functions/process-import.ts` (Move runImport logic here)
- **Definition of Done**:
  - Uploading a CSV triggers an Inngest background job.
  - The UI polls or receives a webhook when complete.
  - `docs/status/import.md` updated.

---

## ✅ Completed Tasks
- [x] Fix `public.users` Sync Blocker (Migration run in Supabase SQL Editor and trigger attached)
- [x] Build Trades Journal UI (Phase 2)
- [x] Build Analytics Lab UI (Phase 3)
- [x] Build Prop Firm HQ UI (Phase 4)
