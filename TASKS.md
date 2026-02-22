# Execution Queue

> **Format**: Numbered priority list. One agent session = One task execution. Work from top to bottom.

## 1. Build Trades Journal UI (Phase 2)
- **What to build**: Implement the frontend for the Trades Journal page (`/trades`). Connect the DataTables to the newly merged `trades-api` endpoints.
- **Files to touch**:
  - `src/app/(app)/trades/page.tsx`
  - `src/components/trades/` (Trade tables, drawers, etc.)
- **Definition of Done**:
  - User can view a paginated list of their reconstructed trades.
  - User can filter trades cleanly using the GlobalToolbar.
  - `docs/status/ui.md` updated.

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
