# Import Pipeline — Status

**Branch**: feat/import-pipeline
**Last updated**: 2026-02-18

---

## Phase 1 — Complete ✅

| Task | File | Status |
|------|------|--------|
| 1 — CSV Parser + Column Mapper | `src/lib/import/parse-csv.ts` | ✅ Done |
| 2 — Fill Deduplication | `src/lib/import/dedupe.ts` | ✅ Done |
| 3 — Account Resolution | `src/lib/import/resolve-account.ts` | ✅ Done |
| 4 — Instrument Resolution | `src/lib/import/resolve-instrument.ts` | ✅ Done |
| 5 — Trade Reconstruction | `src/lib/import/reconstruct-trades.ts` | ✅ Done |
| 6 — Import Orchestrator | `src/lib/import/run-import.ts` | ✅ Done |
| 7 — API Route | `src/app/api/import/route.ts` | ✅ Done |
| 8 — Import Modal + Toolbar | `src/components/import/import-modal.tsx` | ✅ Done |

---

## Key Design Decisions

### CSV Parsing (`parse-csv.ts`)
- Uses Papaparse with `header: true`
- `COLUMN_MAP` constant maps internal field names → CSV column headers (swappable per broker)
- Filters rows where `_active !== "true"` (skips cancelled fills)
- Uses `_timestamp` column (ISO UTC) for `fill_time` — more precise than display `Timestamp`
- Uses `_tradeDate` column for `trading_day` (already `YYYY-MM-DD`)
- Side values trimmed + uppercased (CSV has leading space: " Buy" → "BUY")

### Deduplication (`dedupe.ts`)
- SHA-256 of: `user_id | raw_fill_id | fill_time | side | quantity | price`
- DB unique constraint `(user_id, fill_hash)` is the final guard
- Race-condition duplicate inserts (code 23505) are silently skipped in `run-import.ts`

### Account Resolution (`resolve-account.ts`)
- Looks up by `(user_id, external_id)` — creates if missing
- New accounts named after their external_id; user renames in Settings

### Instrument Resolution (`resolve-instrument.ts`)
- Known symbols (MNQ, MES, MGC, NQ, ES, GC, CL, YM, RTY, M2K, MCL, MYM) get preset defaults
- Unknown symbols created with `tick_size=0`, `tick_value=0` — flagged for user configuration
- After creation, all values are user-editable; defaults are a starting point only

### Trade Reconstruction (`reconstruct-trades.ts`)
- Flat-to-Flat algorithm: group by `(accountId, rootSymbol)`, sort by `fill_time`, walk position
- `multiplier` from instruments table used for P&L (never hardcoded)
- Open trades (`is_open=true`) created when session ends with non-zero position
- Each fill's `trade_id` FK updated after trade insertion

### API Route (`src/app/api/import/route.ts`)
- POST `/api/import` — multipart/form-data, field name `file`
- Auth via server Supabase client (`createClient()`)
- All DB writes via admin client (`createAdminClient()`) to bypass RLS
- Returns `ImportResult` JSON

### Import Modal (`src/components/import/import-modal.tsx`)
- State machine: `idle → processing → complete | error`
- Drag & drop zone + file picker (accept `.csv`)
- Results: new fills / duplicates / trades created / error count
- Expandable error detail list
- Wired via `GlobalToolbar` (`src/components/layout/global-toolbar.tsx`)

---

## Test Data

`test-data/Fills.csv` — 36 rows, 2 accounts, symbols: MNQ, MGC
Expected reconstruction:
- MNQ fills form multiple LONG/SHORT trades
- MGC fills include a complex multi-fill trade with scale-in/scale-out

---

## 2026-02-19 — FK Violation Fix
**Status**: Complete ✅
**What was done**:
- Root cause: `import_batches.user_id` FK points to `public.users.id`, but Supabase Auth only
  writes to `auth.users`. Service-role client hits FK directly.
- `supabase/migrations/20260219000000_sync_auth_users.sql`:
  - `handle_new_auth_user()` trigger: fires AFTER INSERT on `auth.users`, auto-inserts into
    `public.users` (id, email, display_name, password_hash='' placeholder)
  - One-time backfill: syncs all existing auth users missing from `public.users`
  - **Run this in Supabase SQL Editor** before testing
- `src/lib/import/run-import.ts`:
  - Added `userEmail: string` as 5th parameter
  - Step 0: upsert into `public.users` before any batch insert (safety net, ON CONFLICT DO NOTHING)
- `src/app/api/import/route.ts`:
  - Extract + guard `user.email` → 401 if missing
  - Pass `userEmail` as 5th arg to `runImport`
**Verified by**: build ✅ | migration created ✅ | type check ✅
**Next**: Run the migration SQL in Supabase, then test full import in browser

---

## Next Phase

- [ ] Wire `GlobalToolbar` into `src/app/layout.tsx`
- [ ] Add Inngest background job for large file imports
- [ ] Re-import handling: reconstruct open trades when new fills arrive
- [ ] Daily summaries recalculation after import
