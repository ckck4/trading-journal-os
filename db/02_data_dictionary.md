# Data Dictionary

> Canonical reference for every table and column in the Trading Journal OS database.

---

## 1. `users`
User accounts for the application.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | UUID | NO | uuid_generate_v4() | Primary key |
| email | VARCHAR(255) | NO | — | Unique login email |
| display_name | VARCHAR(100) | NO | — | Display name |
| password_hash | TEXT | NO | — | bcrypt hash |
| timezone | VARCHAR(64) | NO | 'America/New_York' | User's display timezone |
| currency | VARCHAR(3) | NO | 'USD' | Preferred currency |
| created_at | TIMESTAMPTZ | NO | NOW() | Creation timestamp |
| updated_at | TIMESTAMPTZ | NO | NOW() | Last update |

---

## 2. `accounts`
Trading accounts (Tradeovate brokerages, prop firm evals, etc.).

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | UUID | NO | uuid_generate_v4() | Primary key |
| user_id | UUID | NO | — | FK → users |
| name | VARCHAR(100) | NO | — | Display name (e.g. "LucidFlex 50K #1") |
| external_id | VARCHAR(255) | YES | — | Account ID from Tradeovate CSV `Account` column (e.g. "LFE0506373520003") |
| broker | VARCHAR(50) | NO | 'Tradeovate' | Broker name |
| starting_balance | NUMERIC(14,2) | NO | 0 | Starting balance for equity curve |
| currency | VARCHAR(3) | NO | 'USD' | Account currency |
| is_archived | BOOLEAN | NO | FALSE | Soft archive flag |
| created_at | TIMESTAMPTZ | NO | NOW() | — |
| updated_at | TIMESTAMPTZ | NO | NOW() | — |

**Unique**: (user_id, external_id)

---

## 3. `instruments`
Futures instruments configured by user.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | UUID | NO | uuid_generate_v4() | Primary key |
| user_id | UUID | NO | — | FK → users |
| root_symbol | VARCHAR(10) | NO | — | Normalized root (e.g. "MNQ") |
| display_name | VARCHAR(50) | NO | — | Human label (e.g. "Micro Nasdaq") |
| tick_size | NUMERIC(10,6) | NO | — | Minimum price increment |
| tick_value | NUMERIC(10,4) | NO | — | Dollar value of one tick |
| commission_per_side | NUMERIC(8,4) | NO | 0 | Default per-side commission |
| currency | VARCHAR(3) | NO | 'USD' | — |
| is_micro | BOOLEAN | NO | TRUE | Micro vs mini flag |
| multiplier | NUMERIC(10,4) | NO | 1 | Points-to-dollars multiplier |
| created_at | TIMESTAMPTZ | NO | NOW() | — |
| updated_at | TIMESTAMPTZ | NO | NOW() | — |

**Unique**: (user_id, root_symbol)

### Preset Values

| root_symbol | display_name | tick_size | tick_value | multiplier | is_micro |
|-------------|-------------|-----------|------------|------------|----------|
| MNQ | Micro Nasdaq | 0.25 | 0.50 | 2.00 | TRUE |
| MES | Micro S&P | 0.25 | 1.25 | 5.00 | TRUE |
| MGC | Micro Gold | 0.10 | 1.00 | 10.00 | TRUE |

---

## 4. `account_instrument_fees`
Per-account commission overrides.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | UUID | NO | uuid_generate_v4() | Primary key |
| account_id | UUID | NO | — | FK → accounts |
| instrument_id | UUID | NO | — | FK → instruments |
| commission_per_side | NUMERIC(8,4) | NO | — | Override commission |
| created_at | TIMESTAMPTZ | NO | NOW() | — |

**Unique**: (account_id, instrument_id)

---

## 5. `sessions`
Named trading sessions with time boundaries.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | UUID | NO | uuid_generate_v4() | Primary key |
| user_id | UUID | NO | — | FK → users |
| name | VARCHAR(50) | NO | — | e.g. "RTH", "Pre-Market" |
| start_time | TIME | NO | — | Session start (tz-aware via timezone col) |
| end_time | TIME | NO | — | Session end |
| timezone | VARCHAR(64) | NO | 'America/New_York' | IANA timezone |
| is_active | BOOLEAN | NO | TRUE | — |
| sort_order | INT | NO | 0 | Display order |

**Unique**: (user_id, name)

---

## 6. `strategies`
Playbook definitions.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | UUID | NO | uuid_generate_v4() | Primary key |
| user_id | UUID | NO | — | FK → users |
| name | VARCHAR(100) | NO | — | Strategy name |
| description | TEXT | YES | — | Markdown-supported description |
| is_active | BOOLEAN | NO | TRUE | — |
| version | INT | NO | 1 | Current version |

---

## 7. `strategy_auto_assign_rules`
Auto-suggestion rules: instrument × session → strategy.

| Column | Type | Description |
|--------|------|-------------|
| strategy_id | UUID | FK → strategies |
| instrument_id | UUID | FK → instruments (null = any) |
| session_id | UUID | FK → sessions (null = any) |
| priority | INT | Higher priority wins when multiple match |

---

## 8. `strategy_confluences`
Checklist template items per strategy.

| Column | Type | Description |
|--------|------|-------------|
| strategy_id | UUID | FK → strategies |
| label | VARCHAR(200) | Confluence check item text |
| sort_order | INT | Display order |
| is_active | BOOLEAN | Soft disable |

---

## 9. `tags`
User-defined labels for trades.

| Column | Type | Description |
|--------|------|-------------|
| user_id | UUID | FK → users |
| name | VARCHAR(50) | Tag label |
| color | VARCHAR(7) | Hex color code |

---

## 10. `import_batches`
Import audit log — one row per CSV upload.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| user_id | UUID | FK → users |
| filename | VARCHAR(255) | Original filename |
| file_hash | VARCHAR(64) | SHA-256 of file for whole-file dedup |
| status | VARCHAR(20) | pending / processing / completed / failed |
| total_rows | INT | CSV rows parsed |
| new_fills | INT | New fills inserted |
| duplicate_fills | INT | Skipped duplicates |
| error_rows | INT | Rows that failed validation |
| error_details | JSONB | Per-row error messages |

---

## 11. `fills`
Source of truth — individual fill records parsed from Tradeovate CSV.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| import_batch_id | UUID | FK → import_batches |
| user_id | UUID | FK → users |
| account_id | UUID | FK → accounts |
| fill_hash | VARCHAR(64) | SHA-256 of canonical fields for dedup |
| raw_fill_id | VARCHAR(100) | Fill ID from CSV `id` column |
| raw_order_id | VARCHAR(100) | Order ID from CSV `orderId` column |
| raw_instrument | VARCHAR(200) | From CSV `Contract` column (full description + contract code) |
| root_symbol | VARCHAR(10) | From CSV `Product` column directly (e.g. "MNQ" — no regex needed) |
| side | VARCHAR(4) | BUY / SELL (normalized from CSV `B/S` column) |
| quantity | INT | Fill quantity (from CSV `Quantity` column) |
| price | NUMERIC(14,6) | Fill price (from CSV `Price` column) |
| fill_time | TIMESTAMPTZ | Fill timestamp (from CSV `Timestamp` column, parsed M/D/YYYY HH:MM) |
| commission | NUMERIC(8,4) | From CSV `commission` column or computed from config |
| fee | NUMERIC(8,4) | Exchange/NFA fees |
| instrument_id | UUID | FK → instruments (matched by root_symbol) |
| trading_day | DATE | Computed via rollover rule |
| trade_id | UUID | FK → trades (assigned during reconstruction) |

**Unique**: (user_id, fill_hash) — this is the dedup key.

---

## 12. `trades`
Reconstructed trades from fills (Flat-to-Flat grouping).

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| user_id, account_id, instrument_id | UUID | Foreign keys |
| root_symbol | VARCHAR(10) | Normalized root |
| trading_day | DATE | Assigned trading day |
| entry_time / exit_time | TIMESTAMPTZ | First fill / last fill timestamp |
| duration_seconds | INT | Computed |
| session_id | UUID | Auto-matched from entry_time |
| side | VARCHAR(5) | LONG / SHORT |
| entry_qty / exit_qty | INT | Total contracts entered / exited |
| avg_entry_price / avg_exit_price | NUMERIC(14,6) | Weighted average |
| is_open | BOOLEAN | TRUE if exit_qty < entry_qty |
| gross_pnl | NUMERIC(14,2) | Before fees |
| commission_total / fees_total | NUMERIC(10,4) | Sum from fills or computed |
| net_pnl | NUMERIC(14,2) | gross - commission - fees |
| initial_stop_price / initial_stop_points | NUMERIC | User input for R-multiple |
| r_multiple | NUMERIC(8,4) | net_pnl / (risk_per_contract × qty) |
| strategy_id | UUID | FK → strategies |
| strategy_auto | BOOLEAN | Auto-assigned flag |
| outcome | VARCHAR(10) | WIN / LOSS / BREAKEVEN |
| notes | TEXT | User free-text |
| tradingview_link | VARCHAR(500) | Optional URL |
| grouping_method | VARCHAR(20) | flat_to_flat / manual |
| manually_adjusted | BOOLEAN | User split/merged this trade |

---

## 13. `trade_grades`
Per-trade grading results (one grade per trade).

| Column | Type | Description |
|--------|------|-------------|
| trade_id | UUID | FK → trades (unique) |
| rubric_id | UUID | FK → grading_rubrics |
| category_scores | JSONB | Array of {category_id, score} |
| numeric_score | NUMERIC(5,2) | Weighted composite 0–100 |
| letter_grade | VARCHAR(2) | A+ through F |
| confluence_results | JSONB | Array of {confluence_id, checked} |

### Letter Grade Scale

| Numeric Range | Letter |
|--------------|--------|
| 97–100 | A+ |
| 93–96 | A |
| 90–92 | A- |
| 87–89 | B+ |
| 83–86 | B |
| 80–82 | B- |
| 77–79 | C+ |
| 73–76 | C |
| 70–72 | C- |
| 67–69 | D+ |
| 63–66 | D |
| 60–62 | D- |
| 0–59 | F |

---

## 14. `daily_summaries`
Materialized daily metrics per account — recalculated on trade change.

Key metrics: trade_count, win_count, loss_count, gross_pnl, net_pnl, win_rate, profit_factor, avg_win, avg_loss, largest_win, largest_loss, avg_r, total_r, max_contracts, cumulative_pnl, avg_grade.

---

## 15. `prop_templates`
LucidFlex (or custom) evaluation rule templates.

| Key `rules_json` Fields | Type | Description |
|--------------------------|------|-------------|
| profit_target | number | e.g. 3000 |
| max_loss_limit | number | e.g. 2000 |
| consistency_max_pct | number | e.g. 50 |
| max_minis / max_micros | number | Position size limits |
| flat_by / trading_resumes | string | Time in HH:MM |
| flat_by_tz | string | IANA timezone |
| payout.* | object | Payout cycle rules |

---

## 16. `prop_evaluations`
Live tracking of an account against a prop template.

| Column | Type | Description |
|--------|------|-------------|
| account_id | UUID | FK → accounts |
| template_id | UUID | FK → prop_templates |
| stage | VARCHAR(30) | evaluation / payout / live |
| status | VARCHAR(20) | active / passed / failed / withdrawn |
| cumulative_pnl | NUMERIC | Running P&L |
| max_drawdown | NUMERIC | Peak-to-trough |
| consistency_pct | NUMERIC | Largest day / total |
| days_traded | INT | Count of trading days |
| violations | JSONB | Array of rule violation records |

---

## 17. `business_entries`
Revenue and expense records for business ROI.

- `entry_type`: 'expense' or 'revenue'
- `source`: 'manual', 'auto_trading_pnl', 'auto_payout' — auto entries link back via reference_id

---

## 18. `goals`
Performance and habit targets.

- `metric` enum: net_pnl, win_rate, avg_grade, routine_completion, max_trades, trade_count, total_r, etc.
- `target_operator`: >=, <=, =
- Streak tracking: current_streak, best_streak

---

## 19. `routines` / `routine_items` / `routine_completions`
Pre/post market checklists with daily completion logs.

- One-click confirmation: completions store items_completed JSONB array
- Used by Goals module to track routine habit streaks

---

## 20. `leak_signals`
Descriptive analytics signals surfaced by the Leak Detector.

- Each signal links to underlying trade_ids for drill-down
- Severity: low / medium / high
- Dismissable by user
