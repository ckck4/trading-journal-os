# End-to-End Test Plan

> Focused on the five critical correctness pillars: idempotent import, trade reconstruction, root-symbol handling, PnL accuracy, and OS-wide edit propagation.

---

## E2E-01: Idempotent Re-Import

**Objective**: Same CSV, imported twice, produces zero new data.

### Setup
- Import `test_fills_day1.csv` (real Tradeovate FILLS file, ~20 fills)
- Record: fill count, trade count, daily_summary states

### Scenario A: Exact re-import
```
Step 1: Import test_fills_day1.csv → record batch_1 (e.g. 20 new, 0 dupe)
Step 2: Import test_fills_day1.csv → record batch_2

Assert:
  batch_2.new_fills        == 0
  batch_2.duplicate_fills  == 20
  batch_2.error_rows       == 0
  Total fills in DB        == 20 (unchanged)
  Total trades in DB       == same as after batch_1
  daily_summaries          == unchanged (byte-identical JSON)
```

### Scenario B: Partial overlap
```
Step 1: Import test_fills_day1.csv (20 fills → N trades)
Step 2: Import test_fills_day1_plus_day2.csv (20 old + 15 new fills)

Assert:
  batch_2.new_fills        == 15
  batch_2.duplicate_fills  == 20
  Total fills in DB        == 35
  Trades for day1          == unchanged (same IDs, same P&L)
  Trades for day2          == newly created
  daily_summaries for day1 == unchanged
  daily_summaries for day2 == newly created
```

### Scenario C: File hash warning
```
Step 1: Import test_fills_day1.csv → record file_hash
Step 2: Import same file again

Assert:
  Warning shown: "This file was previously imported"
  Processing continues (per-fill dedup handles idempotency)
  Result: 0 new fills
```

---

## E2E-02: Flat-to-Flat Trade Reconstruction

**Objective**: All edge cases produce correct trade objects.

### Test Dataset
Create synthetic fills for each case, all on account `LFE0506373520003`, instrument `MNQ`.

### Case A: Simple Long
```
Fill 1: BUY  2 @ 25400.00 at 09:31
Fill 2: SELL 2 @ 25410.00 at 09:45

Expected trade:
  side             = LONG
  entry_qty        = 2
  exit_qty         = 2
  avg_entry_price  = 25400.00
  avg_exit_price   = 25410.00
  gross_pnl        = (25410 - 25400) × 2 × 2.00 = $40.00
  is_open          = false
  outcome          = WIN
```

### Case B: Simple Short
```
Fill 1: SELL 2 @ 25400.00 at 10:00
Fill 2: BUY  2 @ 25390.00 at 10:15

Expected trade:
  side             = SHORT
  gross_pnl        = (25400 - 25390) × 2 × 2.00 = $40.00
  outcome          = WIN
```

### Case C: Scale-In
```
Fill 1: BUY  1 @ 25400.00 at 09:31
Fill 2: BUY  1 @ 25395.00 at 09:35
Fill 3: SELL 2 @ 25410.00 at 09:50

Expected trade:
  side             = LONG
  entry_qty        = 2
  avg_entry_price  = (25400 + 25395) / 2 = 25397.50
  avg_exit_price   = 25410.00
  gross_pnl        = (25410 - 25397.5) × 2 × 2.00 = $50.00
```

### Case D: Scale-Out
```
Fill 1: BUY  2 @ 25400.00 at 09:31
Fill 2: SELL 1 @ 25410.00 at 09:40
Fill 3: SELL 1 @ 25420.00 at 09:50

Expected trade:
  side             = LONG
  exit_qty         = 2
  avg_exit_price   = (25410 + 25420) / 2 = 25415.00
  gross_pnl        = (25415 - 25400) × 2 × 2.00 = $60.00
```

### Case E: Position Flip
```
Fill 1: BUY  2 @ 25400.00 at 09:31
Fill 2: SELL 4 @ 25410.00 at 09:45

Expected:
  Trade 1 (closed long):
    side = LONG, entry_qty = 2, exit_qty = 2
    avg_entry = 25400, avg_exit = 25410
    gross_pnl = $40.00, is_open = false

  Trade 2 (open short):
    side = SHORT, entry_qty = 2, exit_qty = 0
    avg_entry = 25410
    is_open = true, outcome = null
```

### Case F: Open Position
```
Fill 1: BUY  2 @ 25400.00 at 09:31
(no exit fill)

Expected trade:
  side     = LONG
  is_open  = true
  exit_qty = 0
  outcome  = null (not computed for open trades)
```

### Case G: Multi-instrument same account
```
Fill 1: BUY 1 MNQ @ 25400 at 09:31
Fill 2: BUY 1 MES @ 5850 at 09:32
Fill 3: SELL 1 MNQ @ 25410 at 09:45
Fill 4: SELL 1 MES @ 5840 at 09:50

Expected: 2 separate trades (one MNQ, one MES), independently reconstructed
```

---

## E2E-03: Root Symbol Resolution & Overrides

**Objective**: `Product` column maps directly, no regex; custom roots handled.

### Scenario A: Standard root symbols
```
CSV rows with Product = "MNQ":
  Assert: fills.root_symbol = "MNQ"
  Assert: fills.instrument_id = UUID of MNQ instrument
  Assert: fills.raw_instrument = "Micro E-Mini NASDAQ-100 MNQH6" (from Contract column)
```

### Scenario B: Unknown product
```
CSV row with Product = "ZQ" (not in configured instruments):
  Assert: fills.root_symbol = "ZQ"
  Assert: fills.instrument_id = null
  Assert: Warning in import report: "Unknown product ZQ — not configured"
  Assert: fill is still imported (not skipped)
  Assert: trade is still reconstructed
```

### Scenario C: Custom instrument added
```
Step 1: Import CSV with Product = "ZQ" → warning
Step 2: User creates instrument with root_symbol = "ZQ" in Settings
Step 3: Re-import same CSV

Assert: fills.instrument_id now set for ZQ fills
Assert: Analytics shows ZQ in instrument breakdown
```

### Scenario D: Root-level analytics grouping
```
Import fills across multiple contract months:
  Row 1: Product = "MNQ", Contract = "...MNQH6"
  Row 2: Product = "MNQ", Contract = "...MNQM6"

Assert: Both fills grouped under root "MNQ" in analytics
Assert: Breakdown by instrument shows single "MNQ" entry (not split by month)
Assert: raw_instrument preserves full contract name for each fill
```

---

## E2E-04: Net vs Gross P&L Using Fee Library

**Objective**: Commission cascade and P&L accuracy across all levels.

### Setup
```
Instrument config: MNQ = { tick_size: 0.25, tick_value: 0.50, multiplier: 2.00, commission_per_side: 0.62 }
Account override: account_instrument_fees for Account A + MNQ = 0.47 per side
```

### Scenario A: Commission from CSV
```
Fill: BUY 1 MNQ @ 25400, commission = 0.52 (from CSV)
Fill: SELL 1 MNQ @ 25410, commission = 0.52 (from CSV)

Expected trade:
  gross_pnl        = (25410 - 25400) × 1 × 2.00 = $20.00
  commission_total  = 0.52 + 0.52 = $1.04 (CSV value takes priority)
  net_pnl          = 20.00 - 1.04 = $18.96
```

### Scenario B: Commission from account override
```
Fill: BUY 1 MNQ @ 25400, commission = 0 or null (missing from CSV)
Fill: SELL 1 MNQ @ 25410, commission = 0 or null
Account has override: 0.47 per side

Expected trade:
  commission_total = (0.47 × 1) × 2 sides = $0.94
  net_pnl         = 20.00 - 0.94 = $19.06
```

### Scenario C: Commission from instrument default
```
Fill: BUY 1 MNQ @ 25400, commission = null (no CSV value)
Fill: SELL 1 MNQ @ 25410, commission = null
No account override configured

Expected trade:
  commission_total = (0.62 × 1) × 2 sides = $1.24
  net_pnl         = 20.00 - 1.24 = $18.76
```

### Scenario D: Multi-contract P&L
```
Fill: BUY 2 MNQ @ 25400, commission = 1.04
Fill: SELL 2 MNQ @ 25395, commission = 1.04

Expected trade:
  gross_pnl        = (25395 - 25400) × 2 × 2.00 = -$20.00
  commission_total  = 1.04 + 1.04 = $2.08
  net_pnl          = -20.00 - 2.08 = -$22.08
  outcome          = LOSS
```

### Scenario E: Finance Manager accuracy
```
After all above trades imported:
  Assert: Finance /summary gross_pnl = SUM of all trades' gross_pnl
  Assert: Finance /summary commissions = SUM of all commission_totals
  Assert: Finance /summary net_pnl = gross_pnl - commissions - fees
  Assert: Per-account equity curve starts from starting_balance and accumulates correctly
  Assert: Finance /fee-breakdown/MNQ matches total MNQ commissions
```

---

## E2E-05: Edit Propagation — OS Cohesion

**Objective**: Editing a trade in the Journal updates every dependent module within the same request cycle.

### Setup
- Import test data: at least 10 trades across 2 days
- Create evaluation (LucidFlex 50K) on the account
- Create goal: "Win rate ≥ 50% this week"
- Record baseline state of all modules

### Scenario A: Strategy Assignment
```
Step 1: Record Analytics /breakdown/strategy baseline
Step 2: PATCH /trades/:id → assign strategy "ORB"
Step 3: Immediately GET:
  - /analytics/breakdown/strategy
  - /analytics/kpis
  - Command Center widgets (via UI)

Assert:
  Analytics strategy breakdown: new "ORB" entry with this trade's metrics
  Command Center: any strategy-dependent widget reflects change
  Daily summary: unchanged (strategy doesn't affect P&L)
```

### Scenario B: Tag Assignment
```
Step 1: Record Analytics /breakdown/tag baseline
Step 2: POST /trades/:id/tags → add tag "FOMO"
Step 3: GET /analytics/breakdown/tag

Assert:
  Tag breakdown: "FOMO" entry includes this trade
  Command Center: tag-dependent widgets (if any) reflect change
```

### Scenario C: Grade Assignment
```
Step 1: Record:
  - /grading/rollups (daily, weekly, monthly)
  - Command Center grade widget value
  - Goals progress for grade-based goal

Step 2: PUT /trades/:id/grade → {Setup: 8, Execution: 7, Risk: 9, Psychology: 6}
  Weights: 25% each → numeric = (8+7+9+6)/4 × 10 = 75.0 → Letter: C

Step 3: Immediately GET:
  - /grading/rollups → daily avg includes this trade
  - Command Center grade widget → updated
  - Goals with grade metric → progress updated

Assert:
  Grade stored: numeric_score = 75.0, letter_grade = "C"
  Daily roll-up: average of all graded trades today (including this one)
  Weekly roll-up: average of daily roll-ups this week
  Command Center grade widget: shows updated avg
  Goal progress: recalculated
```

### Scenario D: R-Value Setting
```
Step 1: PATCH /trades/:id → initial_stop_price = 25390 (trade entry was 25400, LONG)
  Risk per contract = |25400 - 25390| × 2.00 = $20.00
  Net P&L = $18.96
  R-multiple = 18.96 / 20.00 = 0.948

Step 2: GET:
  - /analytics/kpis → avg_r, total_r
  - Command Center R Stats widget

Assert:
  R-multiple stored: 0.948
  Avg R & Total R computed correctly across all trades with R values
  Trades without initial_stop → R = null (excluded from R-stats, not zero)
```

### Scenario E: Trade Split → Full Cascade
```
Step 1: Record baseline of ALL modules:
  - Trade count, daily_summaries, KPIs, equity curve data points
  - Prop HQ: cumulative P&L, max drawdown, consistency ratio
  - Finance: net P&L
  - Goals: progress values
  - Command Center: all 7 widget values

Step 2: Split a trade (e.g. 4-fill trade → 2 + 2)

Step 3: Snapshot ALL modules again

Assert (per-module delta):
  Trade Journal:
    - Original trade deleted
    - 2 new trades exist with correctly recalculated P&L
    - Both marked manually_adjusted = true

  Daily Summaries:
    - Recalculated for affected trading day
    - trade_count may change
    - win_count / loss_count may change

  Analytics Lab (KPIs):
    - net_pnl unchanged (sum of parts = original)
    - win_rate may change (one WIN trade → could become WIN + LOSS)
    - profit_factor may change

  Command Center:
    - All 7 widgets reflect post-split data

  Prop Firm HQ:
    - Rules re-evaluated (consistency ratio may change)
    - No new violations unless split creates one

  Finance Manager:
    - net_pnl unchanged (split is P&L-neutral in total)
    - commission_total unchanged

  Grading:
    - Original trade's grade removed (trade no longer exists)
    - 2 new trades ungraded

  Goals:
    - Rechecked against new metrics
```

### Scenario F: Trade Merge → Full Cascade
```
Step 1: Snapshot all modules
Step 2: Merge 2 adjacent trades (same instrument, same day)
Step 3: Snapshot all modules

Assert (inverse of split, plus):
  1 merged trade exists with correct combined P&L
  Original 2 trades deleted
  All modules reflect merged state
  Grades from original trades removed; merged trade ungraded
```

### Scenario G: Account Selector Consistency
```
Step 1: Import data from 2 accounts
Step 2: Select Account A in toolbar
Step 3: Navigate through: Journal → Analytics → Prop HQ → Finance → Command Center

Assert per page:
  Only Account A data shown
  KPIs, charts, widgets all filtered to Account A
  No data leakage from Account B

Step 4: Switch to "All Accounts"

Assert:
  Aggregated data across both accounts
  All pages reflect aggregated view
```

### Scenario H: Date Range Filter
```
Step 1: Set date range to "This Week" in toolbar
Step 2: Navigate to Analytics Lab

Assert: KPIs and charts show only this week's data

Step 3: Change to "Last 30d"

Assert: Data expands to include last 30 days
Assert: No stale data (previous filter results cleared)
```

---

## E2E-06: Trading Day Rollover (DST Edge Cases)

**Objective**: Fills near the 18:00 ET rollover boundary, including DST transitions.

### Scenario A: Same-day before rollover
```
Fill time: 09:30 ET (America/New_York) on 2026-02-10
Rollover: 18:00 ET

Assert: trading_day = 2026-02-10
```

### Scenario B: Next-day after rollover
```
Fill time: 19:30 ET on 2026-02-10
Rollover: 18:00 ET

Assert: trading_day = 2026-02-11
```

### Scenario C: Exactly at rollover
```
Fill time: 18:00 ET on 2026-02-10

Assert: trading_day = 2026-02-11 (>= rollover → next day)
```

### Scenario D: DST spring-forward
```
DST transition: March 8, 2026 (clocks spring forward at 2:00 AM)
Fill time: 18:30 ET (America/New_York) on March 8, 2026

Assert: trading_day = 2026-03-09
Assert: No off-by-one caused by 23-hour day
```

### Scenario E: DST fall-back
```
DST transition: November 1, 2026 (clocks fall back at 2:00 AM)
Fill time: 17:30 ET on November 1, 2026

Assert: trading_day = 2026-11-01 (before rollover, same day)
Assert: No off-by-one caused by 25-hour day
```

### Scenario F: Custom rollover time
```
User changes rollover to 17:00 ET
Fill time: 17:30 ET on 2026-02-10

Assert: trading_day = 2026-02-11 (now after the new rollover)
Assert: All existing trades have trading_day reassigned
```

---

## E2E-07: Commission-Free vs Full Fee Scenario

**Objective**: Verify system handles zero-commission scenarios and fee-only scenarios.

### Scenario A: Zero commission
```
Instrument configured with commission_per_side = 0
No account override
CSV commission column = 0

Assert: commission_total = 0
Assert: net_pnl = gross_pnl
Assert: Finance fee breakdown shows $0 for this instrument
```

### Scenario B: Fee without commission
```
Fill with: commission = 0, fee = 0.22 (NFA fee)

Assert: net_pnl = gross_pnl - 0 - 0.22
Assert: Finance shows fee total correctly
```

---

## Test Data Requirements

| Dataset | Description | Usage |
|---------|-------------|-------|
| `test_fills_day1.csv` | Real Tradeovate export, 1 day, ~20 fills, MNQ only | E2E-01, E2E-02, E2E-03 |
| `test_fills_day1_plus_day2.csv` | Day 1 + Day 2 combined | E2E-01B (overlap) |
| `test_fills_multi_instrument.csv` | MNQ + MES fills, same account | E2E-02G, E2E-03D |
| `test_fills_multi_account.csv` | 2 different accounts | E2E-05G |
| `test_fills_edge_cases.csv` | Scale-in, scale-out, flip, open position | E2E-02 |
| `test_fills_dst.csv` | Fills around DST boundaries | E2E-06 |

> [!IMPORTANT]
> Use actual Tradeovate FILLS CSV format with all columns present. Synthetic data should match the exact header from `import/01_tradeovate_fills_mapping.md`.

---

## Execution Priority

| Priority | Tests | Rationale |
|----------|-------|-----------|
| P0 (run first) | E2E-01, E2E-02, E2E-04 | Data integrity — if these fail, nothing works |
| P0 (run second) | E2E-05 (A–F) | OS cohesion — the defining feature |
| P1 | E2E-03, E2E-06 | Correctness — edge cases that surface in production |
| P1 | E2E-05 (G, H) | Filter consistency — frequent user action |
| P2 | E2E-07 | Edge case — uncommon but must work |
