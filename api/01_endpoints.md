# API Endpoints

> All endpoints require authentication (JWT). All accept GlobalContext query params: `accountIds`, `from`, `to`, `session`, `instrument`, `strategy`.

Base URL: `/api/v1`

---

## Auth

| Method | Path | Description |
|--------|------|-------------|
| POST | `/auth/register` | Create account |
| POST | `/auth/login` | Login → JWT tokens |
| POST | `/auth/refresh` | Refresh access token |
| POST | `/auth/logout` | Invalidate refresh token |
| POST | `/auth/logout-all` | Invalidate all sessions |

## Import

| Method | Path | Description |
|--------|------|-------------|
| POST | `/import/upload` | Upload CSV (multipart) → returns batch ID |
| GET | `/import/batches` | List import batches |
| GET | `/import/batches/:id` | Batch detail + validation report |
| DELETE | `/import/batches/:id` | Rollback import batch |
| GET | `/import/batches/:id/progress` | SSE stream for import progress |

## Accounts

| Method | Path | Description |
|--------|------|-------------|
| GET | `/accounts` | List accounts |
| POST | `/accounts` | Create account |
| PUT | `/accounts/:id` | Update account |
| DELETE | `/accounts/:id` | Archive account |
| PUT | `/accounts/:id/fees` | Set per-account instrument fees |

## Instruments

| Method | Path | Description |
|--------|------|-------------|
| GET | `/instruments` | List instruments |
| POST | `/instruments` | Create instrument |
| PUT | `/instruments/:id` | Update instrument |
| DELETE | `/instruments/:id` | Delete instrument |

## Trades

| Method | Path | Description |
|--------|------|-------------|
| GET | `/trades` | List trades (filtered, paginated) |
| GET | `/trades/:id` | Trade detail with fills |
| PATCH | `/trades/:id` | Update trade (strategy, tags, R, notes, TV link) |
| POST | `/trades/:id/split` | Split trade at fill index |
| POST | `/trades/merge` | Merge trades (body: {tradeIds}) |
| GET | `/trades/calendar` | Calendar data (day → metrics) |

## Trade Annotations

| Method | Path | Description |
|--------|------|-------------|
| POST | `/trades/:id/tags` | Add tags |
| DELETE | `/trades/:id/tags/:tagId` | Remove tag |
| POST | `/trades/:id/screenshots` | Upload screenshot |
| DELETE | `/trades/:id/screenshots/:screenshotId` | Remove screenshot |
| PUT | `/trades/:id/grade` | Set/update grade |
| DELETE | `/trades/:id/grade` | Remove grade |

## Analytics

| Method | Path | Description |
|--------|------|-------------|
| GET | `/analytics/kpis` | Core KPIs for current filter context |
| GET | `/analytics/breakdown/:dimension` | Breakdown by dimension (instrument, strategy, etc.) |
| GET | `/analytics/equity-curve` | Equity curve data points |
| GET | `/analytics/distribution/:metric` | Histogram data (pnl, r-multiple, duration) |
| GET | `/analytics/heatmap/:type` | Heatmap data (calendar, day-hour, instrument-strategy) |
| GET | `/analytics/comparison` | Side-by-side comparison data |

## Strategies

| Method | Path | Description |
|--------|------|-------------|
| GET | `/strategies` | List strategies |
| POST | `/strategies` | Create strategy |
| PUT | `/strategies/:id` | Update strategy |
| DELETE | `/strategies/:id` | Deactivate strategy |
| GET | `/strategies/:id/analytics` | Per-strategy KPIs |
| GET | `/strategies/:id/confluences` | Get confluence checklist |
| PUT | `/strategies/:id/confluences` | Update confluences |
| GET | `/strategies/:id/versions` | Version history |

## Prop Firm

| Method | Path | Description |
|--------|------|-------------|
| GET | `/prop/templates` | List templates |
| POST | `/prop/templates` | Create template |
| PUT | `/prop/templates/:id` | Update template |
| GET | `/prop/templates/:id/versions` | Template version history |
| GET | `/prop/evaluations` | List evaluations |
| POST | `/prop/evaluations` | Create evaluation (link account to template) |
| GET | `/prop/evaluations/:id` | Evaluation detail + rule status |
| PATCH | `/prop/evaluations/:id` | Update stage/status |
| GET | `/prop/evaluations/:id/payout-tracker` | Payout cycle status |
| POST | `/prop/payouts` | Record payout |

## Finance

| Method | Path | Description |
|--------|------|-------------|
| GET | `/finance/summary` | CFO summary (P&L, fees, payouts) |
| GET | `/finance/equity-curves` | Per-account equity curves |
| GET | `/finance/fee-breakdown` | Fees by instrument/account |
| GET | `/finance/periodic` | Monthly/weekly summary table |

## Business Ledger

| Method | Path | Description |
|--------|------|-------------|
| GET | `/ledger/entries` | List entries (filtered) |
| POST | `/ledger/entries` | Create entry |
| PUT | `/ledger/entries/:id` | Update entry |
| DELETE | `/ledger/entries/:id` | Delete entry |
| GET | `/ledger/categories` | List expense categories |
| POST | `/ledger/categories` | Create category |
| GET | `/ledger/roi` | ROI summary |

## Grading

| Method | Path | Description |
|--------|------|-------------|
| GET | `/grading/rubrics` | List rubrics |
| POST | `/grading/rubrics` | Create rubric |
| PUT | `/grading/rubrics/:id` | Update rubric |
| GET | `/grading/rollups` | Roll-up data (daily/weekly/monthly) |

## Leak Detector

| Method | Path | Description |
|--------|------|-------------|
| GET | `/leaks/signals` | Get current leak signals |
| PATCH | `/leaks/signals/:id/dismiss` | Dismiss signal |
| POST | `/leaks/analyze` | Trigger fresh analysis |

## AI Coach

| Method | Path | Description |
|--------|------|-------------|
| GET | `/coach/insights` | Get insights (auto-generated) |
| POST | `/coach/action-plan` | Generate action plan |
| POST | `/coach/premarket-plan` | Generate pre-market plan |
| GET | `/coach/history` | Insight history |
| PATCH | `/coach/insights/:id/dismiss` | Dismiss insight |

## Goals

| Method | Path | Description |
|--------|------|-------------|
| GET | `/goals` | List goals |
| POST | `/goals` | Create goal |
| PUT | `/goals/:id` | Update goal |
| DELETE | `/goals/:id` | Delete goal |

## Routines

| Method | Path | Description |
|--------|------|-------------|
| GET | `/routines` | List routines |
| POST | `/routines` | Create routine |
| PUT | `/routines/:id` | Update routine |
| POST | `/routines/:id/complete` | Log completion |
| GET | `/routines/completions` | Completion history |

## Settings

| Method | Path | Description |
|--------|------|-------------|
| GET | `/settings` | Get all user settings |
| PUT | `/settings/preferences` | Update preferences (tz, currency) |
| GET | `/settings/trading-day` | Get trading day config |
| PUT | `/settings/trading-day` | Update rollover/window config |
| POST | `/settings/trading-day/exceptions` | Add holiday exception |
| GET | `/settings/tags` | List tags |
| POST | `/settings/tags` | Create tag |
| PUT | `/settings/tags/:id` | Update tag |
| DELETE | `/settings/tags/:id` | Delete tag |
| GET | `/settings/sessions` | List sessions |
| POST | `/settings/sessions` | Create session |
| PUT | `/settings/sessions/:id` | Update session |
| GET | `/settings/dashboard-layouts` | List layouts |
| POST | `/settings/dashboard-layouts` | Create layout |
| PUT | `/settings/dashboard-layouts/:id` | Update layout |

## Export

| Method | Path | Description |
|--------|------|-------------|
| GET | `/export/full` | Full JSON backup |
| GET | `/export/trades` | Trades CSV |
| GET | `/export/summaries` | Daily summaries CSV |
| GET | `/export/ledger` | Ledger CSV |
| POST | `/import/restore` | Restore from JSON backup |
