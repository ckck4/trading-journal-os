# KPIs & Formulas

> All KPIs derive from fills + trades + user annotations. No market data.

---

## Core P&L KPIs

| KPI | Formula | Notes |
|-----|---------|-------|
| **Gross P&L** | `SUM(trades.gross_pnl)` | Before fees |
| **Net P&L** | `SUM(trades.net_pnl)` | After commissions + fees |
| **Total Commissions** | `SUM(trades.commission_total)` | |
| **Total Fees** | `SUM(trades.fees_total)` | |
| **Average P&L per Trade** | `Net P&L / trade_count` | |
| **Average Win** | `AVG(net_pnl) WHERE outcome = 'WIN'` | |
| **Average Loss** | `AVG(net_pnl) WHERE outcome = 'LOSS'` | Shown as negative |
| **Largest Win** | `MAX(net_pnl)` | |
| **Largest Loss** | `MIN(net_pnl)` | |

## Win/Loss KPIs

| KPI | Formula |
|-----|---------|
| **Total Trades** | `COUNT(trades)` |
| **Wins** | `COUNT WHERE outcome = 'WIN'` |
| **Losses** | `COUNT WHERE outcome = 'LOSS'` |
| **Breakevens** | `COUNT WHERE outcome = 'BREAKEVEN'` |
| **Win Rate** | `Wins / (Wins + Losses) × 100` (exclude BEs) |
| **Loss Rate** | `100 - Win Rate` |

## Risk-Adjusted KPIs

| KPI | Formula | Notes |
|-----|---------|-------|
| **Profit Factor** | `SUM(winning_pnl) / ABS(SUM(losing_pnl))` | >1 = profitable |
| **Expectancy** | `(Win Rate × Avg Win) + (Loss Rate × Avg Loss)` | Expected per-trade return |
| **Expectancy (R)** | `(Win Rate × Avg R on wins) + (Loss Rate × Avg R on losses)` | R-based expectancy |
| **Payoff Ratio** | `Avg Win / ABS(Avg Loss)` | Reward-to-risk |

## R-Multiple KPIs

| KPI | Formula | Notes |
|-----|---------|-------|
| **R-value (per trade)** | `risk = initial_stop_points × multiplier × qty` | User inputs stop distance |
| **R-Multiple** | `net_pnl / R-value` | How many R earned/lost |
| **Average R** | `AVG(r_multiple) WHERE r_multiple IS NOT NULL` | |
| **Total R** | `SUM(r_multiple)` | |
| **Best R** | `MAX(r_multiple)` | |
| **Worst R** | `MIN(r_multiple)` | |

### R-Value Calculation

```
If initial_stop_points provided:
  risk_per_contract = initial_stop_points × instrument.multiplier
  total_risk = risk_per_contract × entry_qty
  r_multiple = net_pnl / total_risk

If initial_stop_price provided:
  stop_distance = ABS(avg_entry_price - initial_stop_price)
  risk_per_contract = stop_distance × instrument.multiplier
  total_risk = risk_per_contract × entry_qty
  r_multiple = net_pnl / total_risk
```

## Drawdown KPIs

| KPI | Formula |
|-----|---------|
| **Max Drawdown ($)** | Largest peak-to-trough decline in cumulative P&L |
| **Max Drawdown (%)** | Max Drawdown / peak equity × 100 |
| **Current Drawdown** | Current cumulative - peak cumulative |
| **Recovery Factor** | Net P&L / Max Drawdown |

## Streak KPIs

| KPI | Formula |
|-----|---------|
| **Current Win Streak** | Consecutive wins from latest trade |
| **Best Win Streak** | Longest consecutive wins in period |
| **Current Loss Streak** | Consecutive losses from latest trade |
| **Worst Loss Streak** | Longest consecutive losses in period |

## Time KPIs

| KPI | Formula |
|-----|---------|
| **Avg Duration** | `AVG(duration_seconds)` per trade |
| **Avg Duration (wins)** | `AVG(duration_seconds) WHERE WIN` |
| **Avg Duration (losses)** | `AVG(duration_seconds) WHERE LOSS` |
| **Trading Days** | `COUNT(DISTINCT trading_day)` |
| **Trades per Day** | `trade_count / trading_days` |

## Grading KPIs

| KPI | Formula |
|-----|---------|
| **Average Grade (numeric)** | `AVG(numeric_score) WHERE graded` |
| **Average Grade (letter)** | Derived from avg numeric |
| **% Graded** | `graded_count / trade_count × 100` |
| **Grade vs P&L Correlation** | Pearson correlation of grade & net_pnl |

## Prop Firm KPIs (LucidFlex)

| KPI | Formula |
|-----|---------|
| **Profit Target Progress** | `cumulative_pnl / profit_target × 100` |
| **Max Loss Remaining** | `max_loss_limit - ABS(max_drawdown)` |
| **Consistency Ratio** | `largest_single_day_profit / cumulative_pnl × 100` |
| **Days Traded** | `COUNT(DISTINCT trading_day)` in eval period |
| **Payout Days** | Days with net_pnl >= min_daily_profit |

## Breakdown Dimensions

All KPIs support breakdown by:

| Dimension | Source | Example |
|-----------|--------|---------|
| Instrument | trades.root_symbol | MNQ, MES, MGC |
| Strategy | trades.strategy_id | ORB, Reversal |
| Session | trades.session_id | RTH, Pre-Market |
| Account | trades.account_id | Eval #1, Eval #2 |
| Day of Week | EXTRACT(dow FROM trading_day) | Mon–Fri |
| Hour of Day | EXTRACT(hour FROM entry_time) | 9, 10, ... |
| Tag | trade_tags.tag_id | Revenge, FOMO |
| Outcome | trades.outcome | WIN, LOSS, BE |
| Side | trades.side | LONG, SHORT |
| Month | DATE_TRUNC('month', trading_day) | Jan 2025 |
| Week | DATE_TRUNC('week', trading_day) | Week 3 |
