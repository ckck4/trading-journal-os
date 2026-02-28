# Build Sequence Checklist — Definition of Done Gates

> Each gate must pass before proceeding. Gates marked ⛔ are hard blockers.

---

## Gate 0: Infrastructure Boots ⛔

**When**: End of Epic 1 (Foundation)

- [x] `supabase start` launches local Postgres + Auth + Storage (Docker containers)
- [x] `npx inngest-cli@latest dev` connects to the Next.js app
- [x] `npm run dev` starts Next.js at localhost:3000
- [x] Supabase Studio accessible at localhost:54323 — all 26 tables visible
- [x] RLS policies active on every table (`SELECT * FROM pg_policies` shows >= 26 policies)
- [x] Seed data loaded: 3 instruments (MNQ/MES/MGC), 3 sessions, 1 LucidFlex 50K template
- [x] Register user via UI → user appears in Supabase Auth dashboard
- [x] Login → redirect to dashboard (`/`)
- [x] Unauthenticated visit to `/` → redirect to `/login`
- [x] Sidebar renders all 29 navigation items with Lucide icons
- [x] Global toolbar renders: account selector, date range picker, session, instrument
- [x] Zustand + nuqs: filter changes update URL params (bookmarkable)
- [x] shadcn/ui + Tailwind dark mode renders correctly (Inter font loaded)
- [x] Inngest test function: trigger event → function executes → log visible in Inngest dev UI
- [x] Supabase Storage: `screenshots` bucket exists with RLS policy

**Quick smoke test**: Navigate to 5+ pages via sidebar — all load, toolbar state preserved, dark mode consistent.

---

## Gate 1: Data Pipeline Complete ⛔

**When**: End of Epic 2 (Import Engine)

- [x] Upload real Tradeovate FILLS CSV → fills inserted into `fills` table
- [x] `Product` column → `root_symbol` with NO regex — direct copy
- [x] `Account` column → `accounts.external_id` (e.g. `LFE0506373520003`)
- [x] Fill hash (SHA-256) computed correctly — verified by manual hash check
- [x] Re-import same CSV → 0 new fills, all duplicates
- [x] Partial overlap CSV → only net-new fills inserted
- [x] Trading day assignment correct:
  - Fill at 19:30 ET → next day
  - Fill at 09:30 ET → same day
  - DST boundary → no off-by-one
- [x] Sessions matched for each fill
- [x] Flat-to-Flat reconstruction produces correct trades:
  - Simple long/short ✅
  - Scale-in ✅
  - Scale-out ✅
  - Position flip → 2 trades ✅
  - Open position ✅
- [x] Commission cascade: CSV → account override → instrument default → zero
- [x] Import validation report: accurate counts (new, duplicate, warning, error)
- [x] `import_batches` record has correct status + counters

**Quick smoke test**: Import → verify fill count in DB → verify trade count → re-import → 0 new.

---

## Gate 2: Analytics Backbone ⛔

**When**: End of Epic 3 (Analytics Core)

- [x] `daily_summaries` table populated for imported data
- [x] All 15 metrics computed correctly (spot-check 3 days manually):
  - trade_count, win_count, loss_count
  - gross_pnl, net_pnl (= gross − commissions − fees)
  - win_rate (= wins / total)
  - profit_factor (= gross_wins / gross_losses)
  - avg_win, avg_loss, largest_win, largest_loss
  - avg_r, total_r
  - max_contracts, cumulative_pnl
- [x] `GET /analytics/kpis` returns correct values for GlobalContext
- [x] `GET /analytics/breakdown/instrument` returns per-instrument data
- [x] `GET /analytics/equity-curve` returns correct time series
- [x] Editing a trade triggers daily_summary recalculation
- [x] KPI values match a manual spreadsheet calculation (golden dataset test)

**Quick smoke test**: Import → `GET /analytics/kpis` → compare 3 metrics to manual calc.

---

## Gate 3: Dashboard Shows Real Data

**When**: End of Epic 4 (Command Center)

- [x] Command Center (`/`) renders 7 widgets in 4+3 grid layout
- [x] Net P&L widget shows correct value matching `/analytics/kpis`
- [x] Win Rate widget shows correct % with trend arrow
- [x] Profit Factor widget shows correct ratio
- [x] Calendar Heatmap shows current month colored correctly
- [x] Grade Summary widget shows "—" (no grades yet)
- [x] R Stats widget shows correct values (or "—" if no R set)
- [x] Equity Curve sparkline matches equity-curve endpoint data
- [x] Click any widget → navigates to correct module with filters preserved
- [x] Import new data → widgets refresh automatically

**Quick smoke test**: Import → load / → all 7 widgets show data → click Net P&L → lands on Analytics.

---

## Gate 4: Trade Journal Edits Propagate ⛔

**When**: End of Epic 5 (Trade Journal) + Epic 6 (Grading)

This is the **core OS cohesion gate**. If this fails, the system is not an OS.

- [x] Trade list renders day-grouped, filtered by GlobalContext
- [x] Click trade → detail panel displays correct fills, P&L, duration
- [x] **Strategy edit propagation**:
  - Change strategy on trade → Analytics breakdown/strategy updates ✅
  - Command Center refreshes ✅
- [x] **Tag edit propagation**:
  - Add tag → Analytics breakdown/tag updates ✅
- [x] **Grade propagation**:
  - Grade trade with rubric → composite 0–100, letter grade correct ✅
  - Daily/weekly/monthly roll-ups recalculated ✅
  - Command Center grade widget updates ✅
  - Goals with grade metric update progress ✅
- [x] **R-value propagation**:
  - Set R-value → Analytics R-stats updates ✅
  - Command Center R Stats widget updates ✅
  - Trades without stop → R = null (not zero)
- [x] **Split propagation**:
  - Split trade → 2 new trades, correct P&L each ✅
  - All downstream modules recalculate ✅
- [x] **Merge propagation**:
  - Merge 2 trades → 1 combined trade ✅
  - All downstream modules recalculate ✅
- [x] Calendar view: cells colored, click → filtered list

**Quick smoke test**: Edit strategy on trade → immediately check Analytics strategy breakdown + Command Center → values updated.

---

## Gate 5: Prop Rules & Finance Accurate

**When**: End of Epic 7 (Prop HQ) + Epic 8 (Finance + Ledger)

- [x] Create evaluation (account → LucidFlex 50K)
- [x] Profit target progress: cumulative P&L vs $3,000
- [x] Max loss remaining: $2,000 − max drawdown
- [x] Consistency ratio: largest day / total ≤ 50%
- [x] Position size check: max 4 minis / 40 micros
- [x] Flat-by 4:45 PM ET check (DST-safe)
- [x] Violation → link to offending trade(s)
- [x] Payout tracker: qualifying days (profit ≥ $150), max payout (50% capped $2K)
- [x] Finance Manager: Net P&L = Gross − Commissions − Fees
- [x] Equity curve from starting_balance
- [x] Fee breakdown matches configured rates
- [x] Business Ledger: manual expense + auto-revenue entries
- [x] ROI calculation correct

**Quick smoke test**: Import 2 weeks of data → create evaluation → verify all 5 rule gauges against manual calc.

---

## Gate 6: Goals, Leaks & Full Analytics UI

**When**: End of Epic 9 (Goals + Routines) + Epic 10 (Leak Detector + Analytics UI)

- [x] Create goal (e.g. "Win rate ≥ 60% this week") → progress auto-tracked
- [x] Streak increments correctly
- [x] Routine checklist → one-click complete → Goal streak updates
- [x] Leak Detector: at least 1 signal surfaces from test data
- [x] Leak signal → click → filtered trade list matches
- [x] No "cost of mistakes" language anywhere
- [x] Analytics Lab: all 8 KPI cards render
- [x] All 8 breakdown dimensions render charts
- [x] Drill-down: chart → trade list → trade detail (3-click chain works)

**Quick smoke test**: Import → grade 5 trades → create goal → verify streak → check leak signals.

---

## Gate 7: Day-in-the-Life Test ⛔

**When**: After all previous gates pass.

**Scenario**: Simulate one real trading day with actual Tradeovate data.

```
Steps:
1. MORNING
   a. Open app → Command Center displays 7 widgets with yesterday's data
   b. Complete pre-market routine → streak increments
   c. Quick check Prop HQ → all rules green

2. END OF DAY
   a. Export today's fills from Tradeovate
   b. Import CSV → progress bar → report (N new, 0 dupe)
   c. Re-import same CSV → report (0 new, N dupe)
   d. Navigate to Trade Journal → today's trades visible
   e. For each trade:
      - Assign strategy
      - Add tags
      - Set R-value
      - Grade with rubric
      - Attach screenshot
      - Add notes
   f. After edits → verify:
      - Command Center: all 7 widgets updated
      - Analytics Lab: KPIs + breakdowns reflect new data
      - Grading: daily roll-up shows today's avg
      - Prop HQ: rules re-evaluated with today's trades
      - Goals: progress updated
      - Finance: P&L and fees accurate

3. EOD REVIEW
   a. Open Analytics → breakdown by session
   b. Drill-down: click bar → filtered trade list → click trade → detail
   c. Open Prop HQ → verify no violations
   d. Open Finance → confirm Net P&L, commission totals
   e. Add a manual expense in Ledger ($50 "market data")
   f. Verify ROI updates

4. EDGE CASE
   a. Split one trade → verify downstream
   b. Merge two adjacent trades → verify downstream
   c. Change rollover time → verify trading_day reassignment
```

**Pass criteria**:
- [x] Zero data discrepancies between modules
- [x] All 7 Command Center widgets accurate
- [x] Re-import is perfectly idempotent
- [x] Every edit propagates within same page load (no manual refresh)
- [x] Drill-down chain works end-to-end
- [x] Prop rules match manual calculation
- [x] Finance Net P&L = Gross − Commissions − Fees (penny-accurate)

---

## Gate 8: Release Candidate

**When**: After Gate 7 + AI Coach + Polish (Epic 12)

- [x] AI Coach generates meaningful insight from real data
- [x] Full JSON export → import on fresh account → data identical
- [x] Trades CSV export → opens correctly in spreadsheet
- [x] All acceptance criteria (AC-*) from `tests/01_acceptance_criteria.md` passed
- [x] E2E test plan (`tests/02_end_to_end_test_plan.md`) passed
- [x] Performance: page loads < 500ms with 1K+ trades
- [x] No console errors in production build (`next build` succeeds)
- [x] Vercel production deployment works (auto-deploy from main branch)
- [x] Supabase production migration applied without errors
- [x] Inngest functions registered and executing in production
- [x] README with setup instructions complete (references `plan/04_setup_checklist.md`)

**Ship it.** 🚀
