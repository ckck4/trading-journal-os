# Acceptance Criteria

---

## 1. Import Engine

### AC-IMP-01: CSV Upload & Parse
- [ ] User can drag-drop a CSV file onto the import modal
- [ ] User can use a file picker to select CSV
- [ ] System validates CSV header against expected columns
- [ ] Invalid CSV (wrong format, empty) shows clear error message
- [ ] Maximum file size: 50 MB

### AC-IMP-02: Deduplication
- [ ] First import of a CSV creates all fills and trades
- [ ] Re-importing the same CSV creates zero new fills
- [ ] Re-importing the same CSV creates zero new trades
- [ ] Import report shows correct counts: new, duplicate, error
- [ ] Partial overlap (CSV with some new + some existing fills) correctly dedupes

### AC-IMP-03: Root Symbol from `Product` Column
- [ ] CSV `Product` column value "MNQ" → fills.root_symbol = "MNQ" (direct, no regex)
- [ ] CSV `Product` column value "MES" → fills.root_symbol = "MES"
- [ ] CSV `Product` column value "MGC" → fills.root_symbol = "MGC"
- [ ] CSV `Contract` column stored in `fills.raw_instrument` (full description)
- [ ] Unknown Product not in configured instruments → flagged for user review

### AC-IMP-04: Multi-Account
- [ ] CSV with fills from different `Account` values auto-separates
- [ ] Account format: `LFE0506373520003` stored as `accounts.external_id`
- [ ] New account detected → user prompted to create or map
- [ ] Subsequent imports auto-match by external_id

### AC-IMP-05: Trade Reconstruction (Flat-to-Flat)
- [ ] Simple long: BUY 2 → SELL 2 = 1 trade, LONG, correct P&L
- [ ] Simple short: SELL 2 → BUY 2 = 1 trade, SHORT, correct P&L
- [ ] Scale-in: BUY 1 → BUY 1 → SELL 2 = 1 trade with averaged entry
- [ ] Scale-out: BUY 2 → SELL 1 → SELL 1 = 1 trade
- [ ] Position flip: BUY 2 → SELL 4 = 1 closed long + 1 open short (2 contracts)
- [ ] Open position (unfilled): BUY 2 with no exit = 1 open trade

### AC-IMP-06: Post-Import Pipeline
- [ ] After import: strategies auto-suggested for new trades
- [ ] After import: sessions matched from entry time
- [ ] After import: daily summaries recalculated
- [ ] After import: Command Center widgets refresh
- [ ] After import: Prop HQ rules re-evaluated

---

## 2. OS Cohesion (Cross-Module Propagation)

### AC-OS-01: Trade Edit Propagation
- [ ] Change strategy on a trade → Analytics Lab strategy breakdown updates
- [ ] Add tag to a trade → Analytics Lab tag breakdown updates
- [ ] Grade a trade → Grading roll-ups (daily/weekly/monthly) update
- [ ] Grade a trade → Command Center grade widget updates
- [ ] Grade a trade → Goals with grade metrics update progress
- [ ] Edit R-value → Analytics Lab R-stats update
- [ ] Split a trade → all downstream modules recalculate
- [ ] Merge trades → all downstream modules recalculate

### AC-OS-02: Account Selector Consistency
- [ ] Switch to "All Accounts" → every module shows aggregated data
- [ ] Switch to single account → every module shows only that account
- [ ] Account selector state persists across page navigation
- [ ] Account selector visible on every page (via global toolbar)

### AC-OS-03: Date Range Filter Consistency
- [ ] Change date range → Journal, Analytics, Prop, Finance, Grading, Leaks all update
- [ ] Date range presets: Today, This Week, This Month, Last 30d, Custom
- [ ] Custom date range via calendar picker
- [ ] Date range state persists across page navigation

### AC-OS-04: Drill-Down Chain
- [ ] Command Center widget value → click → opens relevant module with filters
- [ ] Analytics KPI card → click → filtered trade list
- [ ] Analytics chart data point → click → filtered trade list
- [ ] Heatmap cell → click → filtered trade list
- [ ] Leak signal card → click → filtered trade list
- [ ] From any filtered trade list → click trade → trade detail panel

---

## 3. Trade Journal

### AC-TJ-01: Trade List & Detail
- [ ] Trades displayed grouped by trading day
- [ ] Click trade row → detail panel slides in
- [ ] Detail shows: fills table, P&L, duration, session, strategy, tags, grade, notes, screenshots
- [ ] All editable fields save on change (optimistic UI)

### AC-TJ-02: Calendar View
- [ ] Toggle to calendar view shows monthly grid
- [ ] Cells colored by daily net P&L (green = profit, red = loss)
- [ ] Toggle color metric: P&L or grade
- [ ] Click day cell → filtered trade list for that day

### AC-TJ-03: Screenshots
- [ ] Drag-drop image onto trade detail → attaches
- [ ] Multiple screenshots per trade
- [ ] Click screenshot → lightbox overlay
- [ ] Delete screenshot

---

## 4. Analytics Lab

### AC-AL-01: KPIs
- [ ] All core KPIs display correctly: Net P&L, Win Rate, Profit Factor, Avg Win, Avg Loss, Expectancy, Avg R, Max DD
- [ ] KPIs update when filters change
- [ ] KPIs based on fills-only data (no market data dependency)

### AC-AL-02: Breakdowns
- [ ] Breakdown by: instrument, strategy, session, day-of-week, hour-of-day, tag, account, side
- [ ] Each bar in breakdown chart is clickable → filtered trade list

### AC-AL-03: Heatmaps
- [ ] Calendar heatmap renders correctly
- [ ] Day × Hour heatmap renders with correct color scaling
- [ ] Instrument × Strategy heatmap renders

---

## 5. Prop Firm HQ

### AC-PF-01: Rule Evaluation
- [ ] Profit target progress shows correct % and amount
- [ ] Max loss remaining calculated correctly
- [ ] Consistency ratio: largest single day profit / total profit ≤ 50%
- [ ] Position size check against max minis/micros
- [ ] Violations display clearly with link to offending trades

### AC-PF-02: Payout Tracker
- [ ] Days with profit ≥ $150 counted correctly
- [ ] Net profit for payout cycle displayed
- [ ] Payout eligibility status shown
- [ ] Max payout amount calculated (50% of profit, capped $2,000)

### AC-PF-03: Trading Window
- [ ] Warning if position held past 4:45 PM ET
- [ ] Account for DST in time checks
- [ ] Holiday exceptions configurable

---

## 6. Finance Manager

### AC-FM-01: Financial Accuracy
- [ ] Net P&L = Gross P&L − Commissions − Fees
- [ ] Per-account equity curve starts from configured starting_balance
- [ ] Fee breakdown matches configured commission rates
- [ ] Payouts reflected in financial summary

---

## 7. Grading

### AC-GR-01: Rubric Grading
- [ ] 4 default categories: Setup, Execution, Risk, Psychology
- [ ] Each scored 0–10 with configurable weight
- [ ] Numeric composite: weighted average × 10 (0–100 scale)
- [ ] Letter grade derived from standard scale (A+ = 97–100 ... F = 0–59)

### AC-GR-02: Roll-ups
- [ ] Daily roll-up: average of all graded trades that day
- [ ] Weekly roll-up: average of daily roll-ups
- [ ] Monthly roll-up: average of weekly roll-ups
- [ ] Roll-ups update when any trade grade changes

---

## 8. Configuration

### AC-CFG-01: Instruments
- [ ] Presets loaded: MNQ, MES, MGC with correct tick_size, tick_value, multiplier
- [ ] User can add custom instruments
- [ ] Per-account commission overrides work

### AC-CFG-02: Trading Day
- [ ] Rollover at 18:00 ET by default
- [ ] Fill at 19:30 ET → assigned to next trading day
- [ ] Fill at 09:30 ET → assigned to current trading day
- [ ] DST transitions handled correctly (no off-by-one day errors)

---

## 9. R-Multiple

### AC-R-01: Calculation
- [ ] Points input mode: R = net_pnl / (points × multiplier × qty)
- [ ] Price input mode: R = net_pnl / (|entry − stop| × multiplier × qty)
- [ ] Trades without initial stop → R-multiple = null (not zero)
- [ ] R-stats exclude trades where R is null

---

## 10. Leak Detector

### AC-LD-01: Signals
- [ ] Detects recurring losses by time window (statistically significant)
- [ ] Detects recurring losses by day-of-week
- [ ] Detects underperforming instruments
- [ ] Each signal links to underlying trades
- [ ] No "cost of mistakes" language or metric anywhere
