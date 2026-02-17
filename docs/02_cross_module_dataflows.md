# Cross-Module Data Flows — OS Cohesion

> This document explains how Trading Journal OS achieves "single source of truth" integration.
> Every module reads from a shared data layer and emits domain events that keep the entire system consistent.

---

## 1. Shared Data Model (Canonical Entities)

```
┌─────────────────────────────────────────────────────┐
│                   SHARED DATA LAYER                 │
│                                                     │
│  fills ──► trades ──► daily_summaries               │
│                │                                     │
│                ├── trade_tags                        │
│                ├── trade_grades                      │
│                ├── trade_screenshots                 │
│                ├── trade_notes                       │
│                └── trade_strategy_link               │
│                                                     │
│  accounts ─── instruments ─── sessions              │
│  strategies ─ grading_rubrics ─ prop_templates      │
│  goals ────── routines ──── business_expenses       │
│  import_batches ─── import_fill_hashes              │
└─────────────────────────────────────────────────────┘
```

All modules query the same entities. There is no per-module data copy.

---

## 2. Domain Event Bus (Inngest)

The system uses **Inngest** to propagate changes via event-driven background functions. Events are sent from API Routes and Server Actions; Inngest functions consume them for async processing, fan-out, and cascading recalculations.

### Event Catalog

| Event | Emitted By | Consumed By |
|-------|-----------|-------------|
| `fills.imported` | Import Engine | Trade Reconstructor |
| `trades.reconstructed` | Trade Reconstructor | Journal, Analytics, Grading, Prop HQ, Finance, Leak Detector, Goals, Command Center |
| `trade.updated` | Trade Journal (edit) | Analytics Lab, Grading, Leak Detector, Goals, Command Center, Prop HQ, Finance |
| `trade.graded` | Grading | Analytics Lab, Leak Detector, Goals, Command Center |
| `trade.tagged` | Trade Journal | Analytics Lab, Leak Detector, Command Center |
| `trade.strategy_assigned` | Trade Journal / Auto-suggest | Analytics Lab, Strategies, Leak Detector, Command Center |
| `trade.screenshot_added` | Trade Journal | (stored, no downstream) |
| `trade.split` | Trade Journal | Analytics Lab, Grading, Prop HQ, Finance, Leak Detector, Goals, Command Center |
| `trade.merged` | Trade Journal | Analytics Lab, Grading, Prop HQ, Finance, Leak Detector, Goals, Command Center |
| `daily_summary.recalculated` | Analytics Engine | Command Center, Prop HQ, Leak Detector, Goals, Finance |
| `grade_rollup.updated` | Grading | Command Center, Goals, AI Coach |
| `prop_rule.evaluated` | Prop HQ | Command Center, Finance |
| `payout.recorded` | Prop HQ | Finance, Business Ledger |
| `expense.created` | Business Ledger | Finance (ROI) |
| `routine.completed` | Routines | Goals, Command Center |
| `goal.progress_updated` | Goals | Command Center, AI Coach |
| `config.changed` | Settings | All modules (re-query) |
| `account.selected` | Global Toolbar | All modules (re-filter) |
| `daterange.changed` | Global Toolbar | All modules (re-filter) |

---

## 3. Core Data Flows

### 3.1 Import → Trade Reconstruction → Everything

```
CSV Upload
    │
    ▼
┌──────────────┐    fills.imported     ┌────────────────────┐
│ Import Engine │ ──────────────────► │ Trade Reconstructor │
│ (parse,       │                      │ (Flat-to-Flat)      │
│  dedupe,      │                      │                      │
│  normalize)   │                      │ ● Group fills        │
└──────────────┘                      │ ● Compute P&L        │
                                       │ ● Apply fees         │
                                       │ ● Auto-assign strat  │
                                       │ ● R-multiple (if SL) │
                                       └────────┬─────────────┘
                                                │
                                    trades.reconstructed
                                                │
                    ┌───────────────────────────┼───────────────────────────┐
                    │               │           │           │               │
                    ▼               ▼           ▼           ▼               ▼
              Trade Journal   Analytics   Prop HQ    Finance Mgr    Command Center
                    │           Lab                        │
                    ▼                                      ▼
                 Grading                           Business Ledger
                    │
                    ▼
              Leak Detector ──► AI Coach ──► Goals
```

### 3.2 Trade Edit Propagation

When a user edits any trade attribute (strategy, tags, grade, R-value, notes):

```
User edits trade in Journal
    │
    ├── trade.updated event
    │
    ├──► Analytics Lab: recomputes KPIs for affected dimensions
    ├──► Grading: recalculates daily/weekly/monthly roll-ups
    ├──► Leak Detector: re-evaluates signals
    ├──► Goals: rechecks progress
    ├──► Prop HQ: re-evaluates rules (if P&L-affecting edit like split/merge)
    ├──► Finance Manager: recalculates if fees/P&L changed
    └──► Command Center: refreshes affected widgets
```

### 3.3 Account Selector & Filter Pipeline

```
Global Toolbar
    │
    ├── Account: [All ▾] [Account-1 ▾] [Account-2 ▾]
    ├── Date Range: [Today ▾] [This Week ▾] [Custom ▾]
    ├── Session: [All ▾] [Pre-market ▾] [RTH ▾] [Post-market ▾]
    ├── Instrument: [All ▾] [MNQ ▾] [MES ▾] [MGC ▾]
    └── Strategy: [All ▾] [ORB ▾] [...]
         │
         │  account.selected / daterange.changed / filter.changed
         │
         ▼  ALL modules re-query with new filter context
    ┌─────────────────────────────────────────────────────┐
    │  Command Center  │  Journal  │  Analytics  │  etc.  │
    └─────────────────────────────────────────────────────┘
```

### 3.4 Grading → Roll-ups → Dashboards

```
Trade graded in Journal
    │
    ├── trade.graded
    │
    ▼
Grading Engine
    │
    ├── Per-trade: letter + numeric from rubric weights
    ├── Daily roll-up: average score for all graded trades that day
    ├── Weekly roll-up: average of daily roll-ups
    └── Monthly roll-up: average of weekly roll-ups
         │
         ├── grade_rollup.updated
         │
         ├──► Command Center grade widget
         ├──► Goals: "Avg grade ≥ B this week" progress
         └──► AI Coach: trend input
```

### 3.5 Prop Firm Rule Evaluation

```
trades.reconstructed / daily_summary.recalculated
    │
    ▼
Prop HQ Rule Engine
    │
    ├── Check: cumulative P&L vs profit target ($3,000)
    ├── Check: account drawdown vs max loss ($2,000)
    ├── Check: consistency ratio (max single day / total ≤ 50%)
    ├── Check: position size vs max allowed (4 minis / 40 micros)
    ├── Check: flat-by-4:45 PM ET
    │
    ├── prop_rule.evaluated
    │
    ├──► Command Center: prop status widget
    ├──► Finance Manager: evaluation stage context
    └──► (If violation) ──► in-app alert
```

### 3.6 Finance → Business Ledger Integration

```
Finance Manager                          Business Ledger
    │                                         │
    ├── Trading P&L (auto)  ──────────►  Revenue (auto-populated)
    ├── Fees paid (auto)    ──────────►  Expense: "commissions" (auto)
    ├── Payouts received    ──────────►  Revenue: "payouts" (auto)
    │                                         │
    │                                    ┌────┴────┐
    │                                    │ Manual   │
    │                                    │ Expenses │
    │                                    │ (user)   │
    │                                    └────┬────┘
    │                                         │
    │                                         ▼
    │                                    ROI = Revenue − Expenses
    │                                         │
    └──────────────────────────────────────────┘
         Unified P&L statement
```

---

## 4. Root Symbol Resolution

All analytics default to **root symbol** (e.g., `MNQ` not `MNQH5`).

```
Fill CSV → Product column → "MNQ" (root symbol, already clean)
           Contract column → "Micro E-Mini NASDAQ-100 MNQH6" (stored as raw_instrument)
                                    │
                                    ▼
                             Resolution (no regex needed):
                             ├── Product → fills.root_symbol (direct mapping)
                             ├── Contract → fills.raw_instrument (audit trail)
                             └── All queries group by root_symbol by default
                                    │
                                    ▼
                             User can override:
                             ├── View by exact contract (toggle)
                             └── Custom root mapping (settings)
```

> [!NOTE]
> The Tradeovate CSV `Product` column provides the clean root symbol directly.
> No regex normalization (stripping month/year codes) is required.

---

## 5. Consistency Contract

Every module MUST adhere to these invariants:

| Invariant | Description |
|-----------|-------------|
| **SINGLE-SOURCE** | All modules read `trades`, `fills`, `accounts`, etc. from the shared layer. No module caches a private copy. |
| **EVENT-DRIVEN** | Any mutation emits a domain event. Downstream modules subscribe and react. |
| **FILTER-CONSISTENT** | Global toolbar filters (account, date range, session, instrument, strategy) apply uniformly to all modules. |
| **DRILL-DOWN** | Any aggregate number (KPI, chart bar, heatmap cell, widget value) is clickable and resolves to the underlying trade list. |
| **EDIT-PROPAGATION** | A trade edit in any module propagates via `trade.updated` to all dependent modules within the same request cycle. |
| **IDEMPOTENT-IMPORT** | Re-importing the same CSV file produces zero new fills/trades. |
| **ROOT-NORMALIZED** | All analytics group by root symbol by default; original contract code preserved in fill record for audit. |

---

## 6. Global Context Object

Every API request and every UI component receives a `GlobalContext`:

```json
{
  "selectedAccounts": ["acc-1", "acc-2"],   // or ["*"] for all
  "dateRange": { "from": "2025-01-01", "to": "2025-01-31" },
  "session": "RTH",                         // or "*" for all
  "instrument": "MNQ",                      // or "*" for all
  "strategy": "*",                          // or specific strategy ID
  "timezone": "America/New_York",
  "currency": "USD",
  "tradingDayRollover": "18:00"
}
```

This object is passed as a query parameter or context header to every API call, ensuring uniform filtering.
