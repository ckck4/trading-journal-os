# Screens Inventory

## Screen List

| # | Screen | Module | Route | Layout |
|---|--------|--------|-------|--------|
| 1 | Command Center | Dashboard | `/` | Widget grid + AI banner |
| 2 | Trade Journal — List | Journal | `/journal` | List + detail panel |
| 3 | Trade Journal — Calendar | Journal | `/journal/calendar` | Heatmap calendar |
| 4 | Trade Detail | Journal | `/journal/:tradeId` | Full detail view |
| 5 | Analytics Lab | Analytics | `/analytics` | KPIs + charts |
| 6 | Analytics — Breakdown | Analytics | `/analytics/:dimension` | Filtered breakdown |
| 7 | Strategies — List | Strategies | `/strategies` | Card grid |
| 8 | Strategy — Detail | Strategies | `/strategies/:id` | Playbook editor + stats |
| 9 | Prop Firm HQ | Prop | `/prop` | Funnel + rules + payout |
| 10 | Prop — Evaluation Detail | Prop | `/prop/:evalId` | Per-eval rule status |
| 11 | Finance Manager | Finance | `/finance` | CFO dashboard |
| 12 | Business Ledger | Ledger | `/ledger` | Entries table + ROI |
| 13 | Business Ledger — Entry | Ledger | `/ledger/new` | Add/edit expense |
| 14 | Grading Overview | Grading | `/grading` | Roll-ups + distribution |
| 15 | Leak Detector | Leaks | `/leaks` | Signal cards grid |
| 16 | AI Coach | AI | `/coach` | Insights + action plans |
| 17 | Goals | Goals | `/goals` | Targets + streaks |
| 18 | Import Modal | Import | modal overlay | Upload + validation |
| 19 | Settings — Accounts | Settings | `/settings/accounts` | CRUD table |
| 20 | Settings — Instruments | Settings | `/settings/instruments` | CRUD table |
| 21 | Settings — Sessions | Settings | `/settings/sessions` | CRUD table |
| 22 | Settings — Strategies | Settings | `/settings/strategies` | CRUD table |
| 23 | Settings — Tags | Settings | `/settings/tags` | CRUD table |
| 24 | Settings — Grading Rubrics | Settings | `/settings/grading` | Rubric editor |
| 25 | Settings — Prop Templates | Settings | `/settings/prop-templates` | Template editor |
| 26 | Settings — Dashboard | Settings | `/settings/dashboard` | Layout manager |
| 27 | Settings — Routines | Settings | `/settings/routines` | Checklist editor |
| 28 | Settings — Preferences | Settings | `/settings/preferences` | TZ, currency, etc. |
| 29 | Settings — Data | Settings | `/settings/data` | Export, import history |

---

## Screen Details

### 1. Command Center (`/`)
**Purpose**: Daily cockpit — **7 configurable widgets** above the fold (user-selected default).

**Sections**:
- Top: AI Coach insights banner (dismissable)
- Main: 4 + 3 widget grid (row 1: 4 cards, row 2: 3 wider cards)
- Below fold: additional widgets, routine status, recent trades preview

**Default Widget Preset** (above the fold):
1. Net P&L (card: today / week / month / custom)
2. Win Rate (card with trend arrow)
3. Profit Factor (card)
4. Calendar Heatmap (mini)
5. Grade Summary (avg grade card)
6. R Stats (avg R, total R)
7. Equity Curve (mini chart)

**Additional Widgets Available** (below fold / customizable):
- Recent Trades (compact table, 5 rows)
- Prop Status (progress bars)
- Goal Progress (progress bars)
- Streak Counter (win/loss)
- Trade Count (today + period)

### 2–4. Trade Journal
**List view**: Scrollable trade rows grouped by day header. Each row: time, instrument, side (arrow), entry/exit price, P&L colored, R, grade badge, tags.

**Detail panel** (right slide-over): Full trade info — fills table, metrics, editable fields (strategy dropdown, tags chips, R-input, grade rubric, notes textarea, screenshot drop zone, TradingView link).

**Calendar view**: Monthly calendar grid, cells colored by daily P&L or grade. Click day → filtered trade list.

### 5–6. Analytics Lab
**KPI Row**: 6–8 KPI cards across top (Net P&L, Win Rate, Profit Factor, Avg Win, Avg Loss, Expectancy, Avg R, Max DD).

**Charts area**: 2×2 grid of configurable charts. Dimension selector dropdown. Date range / rolling window controls.

**Drill-down**: Click any data point → filtered trade list opens below or in slide-over.

### 7–8. Strategies
**List**: Cards with strategy name, win rate badge, trade count, mini sparkline. Click → detail.

**Detail**: Left: strategy definition editor (name, description, confluence checklist). Right: per-strategy analytics (same KPI set, filtered).

### 9–10. Prop Firm HQ
**Funnel**: Visual pipeline — columns for each stage (Evaluation → Payout → Live). Account cards in each column with status badges.

**Rule Status**: Progress bars/gauges for each rule (profit target, max loss, consistency, size). Color-coded.

**Payout Tracker**: Table showing qualifying days, daily P&L, eligibility status.

### 11. Finance Manager
**Top**: Summary cards — Gross P&L, Net P&L, Total Commissions, Total Fees, Payouts.

**Equity curves**: Per-account line charts.

**Tables**: Monthly/weekly breakdowns, fee analysis by instrument.

### 12–13. Business Ledger
**Table**: Date, type (expense/revenue), category, amount, description, recurring badge. Filterable.

**Summary**: Revenue vs Expenses bar chart, ROI card, monthly P&L statement.

**Entry form**: Modal or inline — date, category dropdown, amount, description, recurring toggle.

### 14. Grading Overview
**Roll-ups**: Daily/weekly/monthly average grades in cards.

**Distribution**: Grade distribution bar chart.

**Trend**: Grade over time line chart.

### 15. Leak Detector
**Signal cards**: Grid of cards. Each card: title ("MNQ after 2PM"), severity badge, key metric, trade count. Click → filtered trades.

### 16. AI Coach
**Insights**: Cards with daily summaries (auto-shown).

**Buttons**: "Generate Action Plan", "Draft Pre-Market Plan".

**History**: Scrollable list of past insights.

### 17. Goals
**Active goals**: Cards with progress bars, streak counters, target vs actual.

**Add goal**: Modal with metric selector, target input, period selector.
