# API Status

## Recent Updates
- **`runImport` Cross-day PnL Recalc Fix**: Fixed a bug where `daily_summaries` was only recalculating the specific trading days present in an imported CSV. Now, `runImport` finds the earliest `trading_day` affected for an account and recalculates ALL subsequent days in chronological order, ensuring `cumulative_pnl` stays perfectly in sync across all dates.
