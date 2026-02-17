# MVP Backlog — Prioritized Tickets

> **Reading order**: Epics are sequenced by dependency chain. Each story must be completed before stories that depend on it. Tasks within a story can be parallelized unless noted.

---

## Epic 1: Foundation

**Objective**: Scaffolding, database, auth, design system — zero business logic, 100% infrastructure.

---

### E1-S1: Project Setup & Database

**Objective**: Working Next.js app with Supabase database, local dev environment.

| ID | Task | Effort | Depends On |
|----|------|--------|------------|
| E1-S1-T1 | `npx create-next-app@latest` with TypeScript, App Router, Tailwind, `src/` directory | 0.25d | — |
| E1-S1-T2 | Install + configure: `@supabase/ssr`, `drizzle-orm`, `drizzle-kit`, `inngest`, TanStack Query, Zustand, nuqs | 0.5d | T1 |
| E1-S1-T3 | `npx supabase init` + configure `supabase/config.toml` for local dev | 0.25d | T1 |
| E1-S1-T4 | Write Supabase SQL migration (all 26 tables from `db/01_schema.sql`) + RLS policies on every table | 1.5d | T3 |
| E1-S1-T5 | Drizzle schema file (`src/lib/db/schema.ts`) mirroring the SQL schema | 1d | T4 |
| E1-S1-T6 | `supabase/seed.sql`: preset instruments (MNQ/MES/MGC), sessions, LucidFlex 50K template | 0.5d | T4 |
| E1-S1-T7 | Supabase client setup: browser client, server client (cookies), admin client (service role for Inngest) | 0.5d | T2 |
| E1-S1-T8 | `.env.local` + `.env.example` with all required vars | 0.25d | T7 |

**Acceptance Criteria**:
- [ ] `supabase start` + `npm run dev` starts local environment
- [ ] All 26 tables created with RLS policies
- [ ] Seed data: 3 instruments, 3 sessions, 1 prop template
- [ ] Supabase Studio accessible at localhost:54323

**OS Propagation**: None (foundation).

---

### E1-S2: Auth & Inngest Setup

**Objective**: Supabase Auth flows + Inngest background job infrastructure.

| ID | Task | Effort | Depends On |
|----|------|--------|------------|
| E1-S2-T1 | Supabase Auth: enable email/password in dashboard | 0.25d | E1-S1 |
| E1-S2-T2 | Next.js middleware (`middleware.ts`): refresh Supabase session on every request | 0.5d | T1 |
| E1-S2-T3 | Auth pages: register + login using `@supabase/ssr` with form validation (shadcn/ui Form) | 1d | T2 |
| E1-S2-T4 | Protected route wrapper: redirect to `/login` if not authenticated | 0.25d | T2 |
| E1-S2-T5 | Inngest client (`src/lib/inngest/client.ts`) + serve route (`/api/inngest/route.ts`) | 0.5d | E1-S1 |
| E1-S2-T6 | Verify: Inngest dev server connects, test function executes | 0.25d | T5 |

**Acceptance Criteria**:
- [ ] User can register → login → see dashboard
- [ ] Unauthenticated user redirected to /login
- [ ] Inngest dev server shows connected functions
- [ ] Test background function executes and logs

**OS Propagation**: `auth.uid()` used by all RLS policies.

---

### E1-S3: App Shell & Design System

**Objective**: shadcn/ui component library, layout, global toolbar, empty page shells.

| ID | Task | Effort | Depends On |
|----|------|--------|------------|
| E1-S3-T1 | `npx shadcn@latest init` + install core components (Button, Card, Dialog, Input, Select, Sheet, Tabs, Table, Badge, Tooltip) | 0.5d | E1-S1 |
| E1-S3-T2 | Tailwind theme: custom colors (dark mode default), typography (Inter via next/font) | 0.5d | T1 |
| E1-S3-T3 | AppShell layout: collapsible sidebar + content area + top toolbar (in `(dashboard)/layout.tsx`) | 1d | T1 |
| E1-S3-T4 | Sidebar navigation with all 29 routes, active state, icons (Lucide) | 0.5d | T3 |
| E1-S3-T5 | Global toolbar: account selector, date range picker, session filter, instrument filter (shadcn Select + Popover) | 1.5d | T3 |
| E1-S3-T6 | Zustand store + nuqs: GlobalContext (accounts, dateRange, session, instrument) synced to URL params | 1d | T5 |
| E1-S3-T7 | Placeholder pages for all routes (empty shells with route title + breadcrumb) | 0.5d | T4 |
| E1-S3-T8 | Supabase Storage bucket: `screenshots` (private, user-scoped RLS policy) | 0.25d | E1-S1 |

**Acceptance Criteria**:
- [ ] Sidebar navigation works; all 29 routes accessible
- [ ] Dark mode renders correctly with shadcn/ui + Tailwind
- [ ] Global context persists across navigation (URL params + Zustand)
- [ ] Filter changes update URL (bookmarkable state)

**OS Propagation**: `GlobalContext` established — all modules consume it. **AC-OS-02** and **AC-OS-03** depend on this.

---

## Epic 2: Import Engine

**Objective**: CSV upload → fill storage → trade reconstruction. This is the data heartbeat of the OS.

**Dependency**: Epic 1 (infrastructure + auth + instruments/accounts tables).

---

### E2-S1: CSV Upload & Parse

**Objective**: Accept Tradeovate FILLS CSV, validate headers, parse rows.

| ID | Task | Effort | Depends On |
|----|------|--------|------------|
| E2-S1-T1 | `POST /import/upload` endpoint (multipart file upload, size limit 50 MB) | 0.5d | E1-S2 |
| E2-S1-T2 | CSV parser: read header row, validate required columns against mapping (`import/01_tradeovate_fills_mapping.md`) | 1d | T1 |
| E2-S1-T3 | Row filtering: skip `active ≠ TRUE`, validate required fields, log errors | 0.5d | T2 |
| E2-S1-T4 | Account resolution: lookup `Account` column → `accounts.external_id`, prompt on new | 0.5d | T2 |
| E2-S1-T5 | Create `import_batches` record with status tracking (pending → processing → completed) | 0.5d | T1 |

**Acceptance Criteria** (refs: **AC-IMP-01**, **AC-IMP-04**):
- [ ] Drag-drop or file picker upload works
- [ ] Missing/wrong columns → clear error
- [ ] Inactive rows skipped silently
- [ ] New account `LFE0506373520003` → prompt user to create/map

**OS Propagation**: New accounts created here flow into account selector (E1-S3-T4).

---

### E2-S2: Fill Insertion & Dedup

**Objective**: Hash each fill, skip duplicates, insert new fills.

| ID | Task | Effort | Depends On |
|----|------|--------|------------|
| E2-S2-T1 | Fill hash computation: SHA-256 of `Account|id|Product|B/S|Quantity|Price|Timestamp` (all trimmed + uppercased) | 0.5d | E2-S1 |
| E2-S2-T2 | Insert fills with ON CONFLICT DO NOTHING on `(user_id, fill_hash)` | 0.5d | T1 |
| E2-S2-T3 | Root symbol resolution: `Product` column → `fills.root_symbol` (direct, no regex) | 0.25d | T2 |
| E2-S2-T4 | Instrument matching: `root_symbol` → `instruments.id` lookup, flag unknown | 0.25d | T3 |
| E2-S2-T5 | Commission cascade: CSV value → account override → instrument default → zero | 0.5d | T2 |
| E2-S2-T6 | Batch counters: new_fills, duplicate_fills, error_rows + validation report generation | 0.5d | T2 |

**Acceptance Criteria** (refs: **AC-IMP-02**, **AC-IMP-03**):
- [ ] First import: all fills inserted, correct root_symbols
- [ ] Re-import same CSV: zero new fills, all duplicates
- [ ] Partial overlap: only new fills inserted
- [ ] Import report shows accurate counts

**OS Propagation**: Fills are source of truth. All downstream modules depend on correct fill data.

---

### E2-S3: Trading Day & Session Matching

**Objective**: Assign each fill a trading day (rollover-aware) and match sessions.

| ID | Task | Effort | Depends On |
|----|------|--------|------------|
| E2-S3-T1 | Timestamp parser: `M/D/YYYY HH:MM` → TIMESTAMPTZ (configurable source TZ, default CT) | 0.5d | E2-S2 |
| E2-S3-T2 | Rollover logic: 18:00 ET boundary → `trading_day` assignment (DST-safe via IANA TZ) | 0.5d | T1 |
| E2-S3-T3 | Session matching: compare fill `entry_time` against session time ranges → assign `session_id` | 0.5d | T2 |

**Acceptance Criteria** (refs: **AC-CFG-02**):
- [ ] Fill at 19:30 ET → trading_day = next calendar date
- [ ] Fill at 09:30 ET → trading_day = same calendar date
- [ ] DST transition: no off-by-one errors
- [ ] Sessions correctly matched (RTH, Pre-Market, Post-Market)

**OS Propagation**: `trading_day` drives daily summaries, prop evaluation, goals, calendar views.

---

### E2-S4: Flat-to-Flat Trade Reconstruction

**Objective**: Group fills into trades using the Flat-to-Flat algorithm.

| ID | Task | Effort | Depends On |
|----|------|--------|------------|
| E2-S4-T1 | Position tracker: per (account, root_symbol) ordered by fill_time | 0.5d | E2-S3 |
| E2-S4-T2 | Trade builder: when position reaches 0, create closed trade from accumulated fills | 1d | T1 |
| E2-S4-T3 | P&L computation: avg_entry, avg_exit, gross_pnl = price_diff × qty × multiplier | 0.5d | T2 |
| E2-S4-T4 | Net P&L: gross_pnl − commission_total − fees_total | 0.25d | T3 |
| E2-S4-T5 | Edge cases: scale-in, scale-out, position flip (split into 2 trades), open position | 1d | T2 |
| E2-S4-T6 | outcome assignment: WIN/LOSS/BREAKEVEN from net_pnl | 0.25d | T4 |
| E2-S4-T7 | Strategy auto-suggest: match instrument + session → `strategy_auto_assign_rules` | 0.5d | T2 |

**Acceptance Criteria** (refs: **AC-IMP-05**):
- [ ] Simple long: BUY 2 → SELL 2 = 1 LONG trade, correct P&L
- [ ] Simple short: SELL 2 → BUY 2 = 1 SHORT trade
- [ ] Scale-in: BUY 1 → BUY 1 → SELL 2 = 1 trade with averaged entry
- [ ] Scale-out: BUY 2 → SELL 1 → SELL 1 = 1 trade
- [ ] Position flip: BUY 2 → SELL 4 = 1 closed long + 1 open short
- [ ] Open position: BUY 2 (no exit) = 1 open trade

**OS Propagation**: `trades.reconstructed` event → consumed by Journal, Analytics, Grading, Prop HQ, Finance, Goals, Command Center. **This is the most critical OS event.**

---

### E2-S5: Import UI

**Objective**: Frontend modal for CSV upload with progress and validation report.

| ID | Task | Effort | Depends On |
|----|------|--------|------------|
| E2-S5-T1 | Import modal component: drag-drop zone + file picker | 0.5d | E2-S1 |
| E2-S5-T2 | Column mapping preview (auto-matched columns shown, optional override) | 0.5d | T1 |
| E2-S5-T3 | New account detection prompt (inline in import flow) | 0.5d | T2 |
| E2-S5-T4 | Progress bar (SSE stream from `GET /import/batches/:id/progress`) | 0.5d | T1 |
| E2-S5-T5 | Validation report display: new/duplicate/warning/error counts, expandable details | 0.5d | T4 |

**Acceptance Criteria** (refs: **AC-IMP-01**, **AC-IMP-04**):
- [ ] Drag-drop CSV opens import flow
- [ ] Progress visible during processing
- [ ] Report shows ✅ new, 🔄 duplicates, ⚠️ warnings, ❌ errors
- [ ] "Done" closes modal → Command Center refreshes

**OS Propagation**: Post-import triggers Command Center widget refresh, Prop HQ rule re-evaluation, daily summary recalculation.

---

## Epic 3: Analytics Core & Daily Summaries

**Objective**: Materialized daily summaries + KPI computation service — the analytics backbone.

**Dependency**: Epic 2 (trades must exist).

---

### E3-S1: Daily Summary Materialization

**Objective**: Compute and persist daily metrics per account.

| ID | Task | Effort | Depends On |
|----|------|--------|------------|
| E3-S1-T1 | Daily summary computation: trade_count, win_count, loss_count, gross_pnl, net_pnl, win_rate, profit_factor, avg_win, avg_loss, largest_win, largest_loss, avg_r, total_r, max_contracts, cumulative_pnl | 1.5d | E2-S4 |
| E3-S1-T2 | Trigger: recalculate on `trades.reconstructed`, `trade.updated`, `trade.split`, `trade.merged` | 0.5d | T1 |
| E3-S1-T3 | `GET /analytics/kpis` endpoint with GlobalContext filtering | 0.5d | T1 |

**Acceptance Criteria** (refs: **AC-AL-01**):
- [ ] All 15 daily metrics computed correctly
- [ ] Recalculation triggered automatically on any trade change
- [ ] KPIs filtered by GlobalContext (account, date range, session, instrument)

**OS Propagation**: `daily_summary.recalculated` event → Command Center, Prop HQ, Leak Detector, Goals, Finance.

---

### E3-S2: Analytics API & Charts

**Objective**: Breakdown, distribution, equity curve, and heatmap endpoints.

| ID | Task | Effort | Depends On |
|----|------|--------|------------|
| E3-S2-T1 | `GET /analytics/breakdown/:dimension` — (instrument, strategy, session, day, hour, tag, account, side) | 1d | E3-S1 |
| E3-S2-T2 | `GET /analytics/equity-curve` — cumulative PnL time series | 0.5d | E3-S1 |
| E3-S2-T3 | `GET /analytics/distribution/:metric` — histograms (pnl, r-multiple, duration) | 0.5d | E3-S1 |
| E3-S2-T4 | `GET /analytics/heatmap/:type` — calendar, day×hour, instrument×strategy | 1d | E3-S1 |

**Acceptance Criteria** (refs: **AC-AL-02**, **AC-AL-03**):
- [ ] All 8 breakdown dimensions return correct data
- [ ] Equity curve matches cumulative daily net_pnl
- [ ] Heatmaps return correctly shaped data arrays

**OS Propagation**: Data consumed by Analytics Lab UI + Command Center widgets.

---

## Epic 4: Command Center (Minimal Viable Preset)

**Objective**: 7-widget dashboard showing live data from analytics core.

**Dependency**: Epic 3 (KPI data + equity curve + heatmap).

---

### E4-S1: Widget Grid & 7 Default Widgets

**Objective**: Configurable widget grid with the 7 user-chosen defaults.

| ID | Task | Effort | Depends On |
|----|------|--------|------------|
| E4-S1-T1 | Widget grid layout engine (react-grid-layout or equivalent) with 4+3 row preset | 1d | E3-S2 |
| E4-S1-T2 | Net P&L widget: today/week/month card, positive green / negative red | 0.5d | T1 |
| E4-S1-T3 | Win Rate widget: percentage + trend arrow (vs last period) | 0.5d | T1 |
| E4-S1-T4 | Profit Factor widget: value card | 0.25d | T1 |
| E4-S1-T5 | Calendar Heatmap widget: mini monthly heatmap colored by daily P&L | 0.5d | T1 |
| E4-S1-T6 | Grade Summary widget: avg letter grade + numeric score for period | 0.5d | T1 |
| E4-S1-T7 | R Stats widget: avg R + total R for period | 0.5d | T1 |
| E4-S1-T8 | Equity Curve widget: mini sparkline chart for selected period | 0.5d | T1 |
| E4-S1-T9 | Widget click → drill-down navigation to relevant module with filters | 0.5d | T2–T8 |

**Acceptance Criteria**:
- [ ] 7 widgets render above the fold in 4+3 grid
- [ ] All widgets show correct data from KPI endpoints
- [ ] Data refreshes on import, trade edit, or filter change
- [ ] Click any widget value → navigates to relevant module with context

**OS Propagation**: Reacts to `trades.reconstructed`, `trade.updated`, `trade.graded`, `daily_summary.recalculated`, `grade_rollup.updated`. **AC-OS-04** drill-down chain validated here.

---

### E4-S2: Dashboard Customization

**Objective**: Add/remove/resize widgets, save layout.

| ID | Task | Effort | Depends On |
|----|------|--------|------------|
| E4-S2-T1 | Edit mode: drag-to-reorder, resize handles, +/× buttons | 1d | E4-S1 |
| E4-S2-T2 | Widget library drawer: 12+ widget types categorized | 0.5d | T1 |
| E4-S2-T3 | `POST/PUT /settings/dashboard-layouts` — save/load layouts | 0.5d | T1 |
| E4-S2-T4 | Named presets: "Save As…" for multiple layouts | 0.5d | T3 |

**Acceptance Criteria**:
- [ ] User can add/remove/resize/reorder widgets
- [ ] Layout persists across sessions
- [ ] Multiple named layouts supported

**OS Propagation**: Layout stored in `dashboard_layouts` table.

---

## Epic 5: Trade Journal with Edit Propagation

**Objective**: Browse, annotate, and edit trades — with OS-wide propagation.

**Dependency**: Epic 2 (trades), Epic 3 (summaries for calendar).

---

### E5-S1: Trade List & Detail Panel

**Objective**: Day-grouped trade list with slide-over detail panel.

| ID | Task | Effort | Depends On |
|----|------|--------|------------|
| E5-S1-T1 | `GET /trades` API: filtered by GlobalContext, paginated, day-grouped | 1d | E2-S4 |
| E5-S1-T2 | Trade list UI: compact rows (time, instrument, side arrow, entry/exit, P&L colored, R, grade badge, tags) | 1.5d | T1 |
| E5-S1-T3 | Trade detail slide-over: fills table, metrics summary, all editable fields | 1.5d | T2 |
| E5-S1-T4 | Filter bar: instrument, strategy, session, tag, outcome, date range | 0.5d | T2 |

**Acceptance Criteria** (refs: **AC-TJ-01**):
- [ ] Trades grouped by trading day
- [ ] Click trade → detail panel slides in from right
- [ ] Detail displays: fills, P&L, duration, session, strategy, tags, grade, notes, screenshots

**OS Propagation**: None (read-only). Propagation happens on edits (next story).

---

### E5-S2: Trade Edit Propagation

**Objective**: Edit strategy, tags, R-value, grade, notes — with OS-wide event emission.

| ID | Task | Effort | Depends On |
|----|------|--------|------------|
| E5-S2-T1 | `PATCH /trades/:id` API: update strategy_id, notes, tradingview_link, initial_stop | 0.5d | E5-S1 |
| E5-S2-T2 | `POST /trades/:id/tags` + `DELETE /trades/:id/tags/:tagId` | 0.5d | T1 |
| E5-S2-T3 | R-value editor: points/price input mode → compute `r_multiple` | 0.5d | T1 |
| E5-S2-T4 | Domain event emission: `trade.updated` → recalc daily_summaries, mark analytics stale | 0.5d | T1 |
| E5-S2-T5 | Optimistic UI: save on change, show pending indicator, rollback on error | 0.5d | T1 |
| E5-S2-T6 | Screenshot upload (`POST /trades/:id/screenshots`) + lightbox display | 0.5d | T1 |

**Acceptance Criteria** (refs: **AC-OS-01**, **AC-R-01**):
- [ ] Change strategy → Analytics Lab strategy breakdown updates
- [ ] Add tag → Analytics Lab tag breakdown updates
- [ ] Edit R-value → R-stats update in Analytics and Command Center
- [ ] Trades without initial stop → R = null (not zero)
- [ ] All edits save immediately with optimistic UI

**OS Propagation**: `trade.updated` event → Analytics Lab, Grading, Leak Detector, Goals, Command Center, Prop HQ, Finance. **This is the OS cohesion test.**

---

### E5-S3: Trade Split, Merge & Calendar

**Objective**: Split/merge trades + calendar heatmap view.

| ID | Task | Effort | Depends On |
|----|------|--------|------------|
| E5-S3-T1 | `POST /trades/:id/split` API: split at fill index → create 2 trades | 1d | E5-S1 |
| E5-S3-T2 | `POST /trades/merge` API: merge 2 adjacent trades → 1 trade | 0.5d | T1 |
| E5-S3-T3 | Split/merge UI: fill table with split-point selector, merge checkbox | 0.5d | T1 |
| E5-S3-T4 | Calendar view: monthly grid, cells colored by daily net P&L or grade, click → filtered list | 1d | E5-S1 |
| E5-S3-T5 | Domain event emission: `trade.split` / `trade.merged` → full downstream recalculation | 0.5d | T1 |

**Acceptance Criteria** (refs: **AC-TJ-02**, **AC-TJ-03**):
- [ ] Split creates 2 trades with correct P&L, both marked `manually_adjusted`
- [ ] Merge combines into 1 trade, recalculated P&L
- [ ] Calendar cells colored correctly, click → filtered trade list
- [ ] All downstream modules recalculate after split/merge

**OS Propagation**: `trade.split`/`trade.merged` events → identical propagation chain as `trade.updated` + daily summary recalculation.

---

## Epic 6: Grading System with Roll-ups

**Objective**: Rubric-based grading with daily/weekly/monthly roll-ups that feed back into Command Center + Goals.

**Dependency**: Epic 5 (trade detail panel for inline grading).

---

### E6-S1: Rubric Configuration

**Objective**: CRUD for grading rubrics + categories.

| ID | Task | Effort | Depends On |
|----|------|--------|------------|
| E6-S1-T1 | `POST/PUT/GET /grading/rubrics` API with category management | 0.5d | E5-S1 |
| E6-S1-T2 | Default rubric seed: Setup (25%), Execution (25%), Risk (25%), Psychology (25%) | 0.25d | T1 |
| E6-S1-T3 | Rubric editor UI in Settings → Grading Rubrics | 0.5d | T1 |

**Acceptance Criteria** (refs: **AC-GR-01**):
- [ ] 4 default categories with configurable weight
- [ ] Weights must sum to 100%
- [ ] User can add/remove/reweight categories

**OS Propagation**: Rubric changes → existing grades flagged as "legacy rubric."

---

### E6-S2: Trade Grading & Roll-ups

**Objective**: Grade trades with rubric, compute composite score, roll up daily/weekly/monthly.

| ID | Task | Effort | Depends On |
|----|------|--------|------------|
| E6-S2-T1 | `PUT /trades/:id/grade` API: accept category scores + confluence results → compute composite | 0.5d | E6-S1 |
| E6-S2-T2 | Grading UI in trade detail: category sliders (0–10), confluence checkboxes, auto-calculated letter grade | 1d | T1 |
| E6-S2-T3 | Letter grade derivation: weighted avg × 10 → A+ through F (standard scale) | 0.25d | T1 |
| E6-S2-T4 | Roll-up computation: daily (avg graded trades), weekly (avg of daily), monthly (avg of weekly) | 0.5d | T1 |
| E6-S2-T5 | `GET /grading/rollups` API with period filtering | 0.5d | T4 |
| E6-S2-T6 | Domain event: `trade.graded` → roll-up recalc, Command Center grade widget, Goals | 0.5d | T4 |

**Acceptance Criteria** (refs: **AC-GR-01**, **AC-GR-02**):
- [ ] Numeric composite: weighted average × 10 (0–100)
- [ ] Letter grade: A+ = 97–100, A = 93–96, ..., F = 0–59
- [ ] Roll-ups update when any trade grade changes
- [ ] Command Center grade widget refreshes immediately

**OS Propagation**: `trade.graded` → Analytics Lab, Grading overview, Command Center, Goals, AI Coach.

---

## Epic 7: Prop Firm HQ

**Objective**: LucidFlex evaluation tracking with rule engine, payout tracker, and violation detection.

**Dependency**: Epic 3 (daily summaries for rule evaluation), Epic 5 (trade data).

---

### E7-S1: Template & Evaluation Management

**Objective**: Prop template CRUD + link accounts to evaluations.

| ID | Task | Effort | Depends On |
|----|------|--------|------------|
| E7-S1-T1 | `GET/POST/PUT /prop/templates` API + LucidFlex 50K preset seed | 0.5d | E3-S1 |
| E7-S1-T2 | `POST /prop/evaluations` API: link account to template, set stage | 0.5d | T1 |
| E7-S1-T3 | Template editor UI + version history ( `prop_template_versions`) | 1d | T1 |
| E7-S1-T4 | Evaluation funnel UI: pipeline columns (Evaluation → Payout → Live) with account cards | 1d | T2 |

**Acceptance Criteria**:
- [ ] LucidFlex 50K preset pre-loaded with correct rules
- [ ] User can create evaluation linking account to template
- [ ] Funnel shows accounts in correct stage columns

**OS Propagation**: Template used by rule engine (next story).

---

### E7-S2: Rule Engine & Payout Tracker

**Objective**: Real-time rule evaluation against daily summaries.

| ID | Task | Effort | Depends On |
|----|------|--------|------------|
| E7-S2-T1 | Rule engine: profit target % vs cumulative P&L | 0.5d | E7-S1, E3-S1 |
| E7-S2-T2 | Rule engine: max loss remaining (starting balance − current equity drawdown) | 0.5d | T1 |
| E7-S2-T3 | Rule engine: consistency ratio (largest single day / total ≤ 50%) | 0.5d | T1 |
| E7-S2-T4 | Rule engine: position size check (max minis / max micros per trade) | 0.5d | T1 |
| E7-S2-T5 | Trading window check: flat-by 4:45 PM ET (DST-safe) | 0.5d | T1 |
| E7-S2-T6 | Payout tracker: days with profit ≥ $150, max payout calculation (50% profit, cap $2K) | 0.5d | T1 |
| E7-S2-T7 | Evaluation detail UI: gauges for each rule, daily breakdown, violation alerts | 1d | T1–T6 |
| E7-S2-T8 | Domain event: `prop_rule.evaluated` → Command Center widget, Finance | 0.5d | T1 |

**Acceptance Criteria** (refs: **AC-PF-01**, **AC-PF-02**, **AC-PF-03**):
- [ ] All 5 rules evaluate correctly against live data
- [ ] Violations link to offending trades
- [ ] Payout eligibility calculated correctly
- [ ] Warning when position held past 4:45 PM ET

**OS Propagation**: `prop_rule.evaluated` → Command Center Prop widget, Finance Manager. `payout.recorded` → Business Ledger auto-revenue.

---

## Epic 8: Finance Manager & Business Ledger

**Objective**: CFO dashboard, fee breakdown, expense tracking, ROI.

**Dependency**: Epic 3 (daily summaries), Epic 7 (payouts).

---

### E8-S1: Finance Manager

**Objective**: Financial overview with equity curves and fee analysis.

| ID | Task | Effort | Depends On |
|----|------|--------|------------|
| E8-S1-T1 | `GET /finance/summary` — gross P&L, net P&L, commissions, fees, payouts | 0.5d | E3-S1 |
| E8-S1-T2 | `GET /finance/equity-curves` — per-account cumulative P&L from starting_balance | 0.5d | T1 |
| E8-S1-T3 | `GET /finance/fee-breakdown` — fees by instrument and account | 0.5d | T1 |
| E8-S1-T4 | Finance Manager UI: summary cards + equity charts + fee table | 1d | T1–T3 |

**Acceptance Criteria** (refs: **AC-FM-01**):
- [ ] Net P&L = Gross P&L − Commissions − Fees
- [ ] Equity curve starts from configured starting_balance
- [ ] Fee breakdown matches configured commission rates

**OS Propagation**: Reads from trades + daily_summaries. Auto-populates Business Ledger revenue entries.

---

### E8-S2: Business Ledger

**Objective**: Manual expenses + auto-revenue from trading, ROI calculation.

| ID | Task | Effort | Depends On |
|----|------|--------|------------|
| E8-S2-T1 | Ledger CRUD API: `GET/POST/PUT/DELETE /ledger/entries` | 0.5d | E3-S1 |
| E8-S2-T2 | Auto-entries: trading P&L → revenue, commissions → expense, payouts → revenue | 0.5d | T1 |
| E8-S2-T3 | ROI calculation: `(Revenue − Expenses) / Expenses` | 0.25d | T2 |
| E8-S2-T4 | Ledger UI: entries table + monthly P&L statement + ROI card | 1d | T1–T3 |

**Acceptance Criteria**:
- [ ] Manual expenses stored and categorized
- [ ] Auto-populated entries from trading P&L, fees, payouts
- [ ] ROI updates when any entry changes

**OS Propagation**: Reads from Finance Manager data. Auto-entries created on `payout.recorded` and `daily_summary.recalculated`.

---

## Epic 9: Goals & Routines

**Objective**: Performance targets with streak tracking + pre/post market checklists.

**Dependency**: Epic 3 (metrics for goal progress), Epic 6 (grading for grade goals).

---

### E9-S1: Goals

| ID | Task | Effort | Depends On |
|----|------|--------|------------|
| E9-S1-T1 | Goals CRUD API: metric, target, operator, period | 0.5d | E3-S1 |
| E9-S1-T2 | Progress engine: compute goal vs actual from daily_summaries + grading rollups | 0.5d | T1 |
| E9-S1-T3 | Streak computation: consecutive days/weeks meeting goal | 0.5d | T2 |
| E9-S1-T4 | Goals UI: progress cards with bars, streak counters, add/edit modal | 1d | T1–T3 |

**Acceptance Criteria**:
- [ ] Goals auto-tracked from real data (no manual entry)
- [ ] Streaks increment/reset correctly
- [ ] Progress updates on trade changes and grade changes

**OS Propagation**: `goal.progress_updated` → Command Center (Goal Progress widget if configured), AI Coach.

---

### E9-S2: Routines

| ID | Task | Effort | Depends On |
|----|------|--------|------------|
| E9-S2-T1 | Routine CRUD API + items management | 0.5d | E1-S2 |
| E9-S2-T2 | One-click completion API + completion history | 0.5d | T1 |
| E9-S2-T3 | Routine UI: checklist items, "Complete" button, history | 0.5d | T1 |
| E9-S2-T4 | Command Center integration: routine reminder banner | 0.5d | T3 |

**Acceptance Criteria**:
- [ ] Pre-market and post-market routines configurable
- [ ] One-click completion logs
- [ ] Streak tracking via Goals module

**OS Propagation**: `routine.completed` → Goals (routine streak), Command Center (banner update).

---

## Epic 10: Leak Detector & Analytics Lab UI

**Objective**: Pattern detection + full analytics frontend.

**Dependency**: Epic 3 (daily summaries + analytics API), Epic 5 (trade data).

---

### E10-S1: Leak Detector

| ID | Task | Effort | Depends On |
|----|------|--------|------------|
| E10-S1-T1 | Signal generation algorithm: recurring losses by time window, day-of-week, instrument | 2d | E3-S1 |
| E10-S1-T2 | `GET /leaks/signals` + `POST /leaks/analyze` endpoints | 0.5d | T1 |
| E10-S1-T3 | Signal cards UI: title, severity badge, key metric, trade count, click → filtered trades | 0.5d | T2 |

**Acceptance Criteria** (refs: **AC-LD-01**):
- [ ] Detects recurring losses by time window (statistically significant)
- [ ] Detects underperforming instruments
- [ ] Each signal links to underlying trades
- [ ] No "cost of mistakes" language anywhere

**OS Propagation**: Reads from trades + daily_summaries. Drill-down to trade list.

---

### E10-S2: Analytics Lab UI

| ID | Task | Effort | Depends On |
|----|------|--------|------------|
| E10-S2-T1 | KPI cards row: 8 cards (Net P&L, Win Rate, PF, Avg Win, Avg Loss, Expectancy, Avg R, Max DD) | 1d | E3-S2 |
| E10-S2-T2 | Breakdown bar charts with dimension selector dropdown | 1d | T1 |
| E10-S2-T3 | Calendar heatmap (full-page) + day×hour heatmap | 1d | T1 |
| E10-S2-T4 | Equity curve chart (full-page, multi-account overlay option) | 0.5d | T1 |
| E10-S2-T5 | P&L distribution histogram | 0.5d | T1 |
| E10-S2-T6 | Drill-down: click any chart data point → filtered trade list below | 0.5d | T1 |

**Acceptance Criteria** (refs: **AC-AL-01**, **AC-AL-02**, **AC-AL-03**, **AC-OS-04**):
- [ ] 8 KPIs display correctly, update on filter change
- [ ] All 8 breakdown dimensions render
- [ ] Chart click → filtered trade list with correct filters

**OS Propagation**: Consumes `daily_summary.recalculated`, `trade.updated`, GlobalContext changes. Drill-down links into Trade Journal.

---

## Epic 11: Strategies & Settings

**Objective**: Strategy playbooks + all Settings pages.

**Dependency**: Epic 2 (for auto-assign rules), Epic 5 (for per-strategy analytics).

---

### E11-S1: Strategy Management

| ID | Task | Effort | Depends On |
|----|------|--------|------------|
| E11-S1-T1 | Strategy CRUD API + confluence template management | 0.5d | E1-S2 |
| E11-S1-T2 | Strategy card list UI with per-strategy analytics inline | 1d | T1 |
| E11-S1-T3 | Strategy detail: playbook editor + auto-assign rules config | 1d | T2 |
| E11-S1-T4 | Strategy versioning: snapshot on edit + version history | 0.5d | T1 |

**Acceptance Criteria**:
- [ ] CRUD strategies with confluences
- [ ] Per-strategy analytics show correct filtered data
- [ ] Version history accessible

**OS Propagation**: Strategy changes → trade.strategy_assigned events for auto-suggest. Analytics breakdowns by strategy reflect updates.

---

### E11-S2: Settings Pages

| ID | Task | Effort | Depends On |
|----|------|--------|------------|
| E11-S2-T1 | Settings: Accounts CRUD (name, external_id, starting_balance) | 0.5d | E1-S2 |
| E11-S2-T2 | Settings: Instruments CRUD (root_symbol, tick_size, tick_value, commission, multiplier) | 0.5d | T1 |
| E11-S2-T3 | Settings: Sessions CRUD (name, start_time, end_time, timezone) | 0.5d | T1 |
| E11-S2-T4 | Settings: Tags CRUD (name, color) | 0.25d | T1 |
| E11-S2-T5 | Settings: Preferences (timezone, currency, rollover time) | 0.5d | T1 |
| E11-S2-T6 | Settings: Data (export, import history, batch rollback) | 0.5d | T1 |

**Acceptance Criteria** (refs: **AC-CFG-01**):
- [ ] All config entities fully editable
- [ ] Instrument presets (MNQ/MES/MGC) loaded on first use
- [ ] Config changes emit `config.changed` → downstream modules react

**OS Propagation**: `config.changed` → all modules re-query. Critical: rollover time change → all trading days recalculated.

---

## Epic 12: AI Coach & Polish

**Objective**: AI-generated insights + UX polish + export.

**Dependency**: All previous epics (AI needs full data).

---

### E12-S1: AI Coach

| ID | Task | Effort | Depends On |
|----|------|--------|------------|
| E12-S1-T1 | Insights generation: feed trade/grade/leak data to LLM → structured insights | 2d | E10 |
| E12-S1-T2 | Action plan + pre-market plan generation endpoints | 1d | T1 |
| E12-S1-T3 | AI Coach UI: insights cards, action buttons, history | 1d | T2 |

**Acceptance Criteria**:
- [ ] AI generates actionable insights from real data
- [ ] Insights dismissable
- [ ] Rate limiting + caching to control API costs

**OS Propagation**: Consumes everything. Outputs insights to Command Center banner.

---

### E12-S2: Export & Polish

| ID | Task | Effort | Depends On |
|----|------|--------|------------|
| E12-S2-T1 | Export: full JSON backup, trades CSV, summaries CSV, ledger CSV | 1d | E8 |
| E12-S2-T2 | Restore from JSON backup | 0.5d | T1 |
| E12-S2-T3 | Keyboard shortcuts (Ctrl+I = import, Ctrl+K = search, etc.) | 0.5d | E5 |
| E12-S2-T4 | Micro-animations: transitions, hover effects, loading states | 1.5d | All |
| E12-S2-T5 | Performance: query caching (Redis), lazy loading, pagination tuning | 1d | All |

**Acceptance Criteria**:
- [ ] Full export/import cycle preserves all data
- [ ] UI feels responsive and polished
- [ ] Pages load within 500ms on 10K+ trades

**OS Propagation**: Export touches all modules.

---

## Dependency Graph (reading order)

```
E1 (Foundation)
 └─► E2 (Import Engine)
      └─► E3 (Analytics Core)
           ├─► E4 (Command Center)
           ├─► E7 (Prop HQ)
           │    └─► E8 (Finance + Ledger)
           └─► E10 (Leak Detector + Analytics UI)
      └─► E5 (Trade Journal)
           └─► E6 (Grading)
                └─► E9 (Goals + Routines)
      └─► E11 (Strategies + Settings)
 └─► E12 (AI Coach + Polish)
```
