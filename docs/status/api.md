# API Status

## Recent Updates
- **`runImport` Incorrect Account Recalc Fix**: Addressed a critical bug where imported CSVs recalculated PnL against an arbitrary cached/wrong account object (`c039...`) by completely refactoring Step 7.5 to directly select `trade_id` mapping out of `fills` to ensure strict 1:1 `accountId` assignment from verified trades. Corrupt `daily_summaries` were flushed and synced properly.
- **`runImport` Cross-day PnL Recalc Fix**: Fixed a bug where `daily_summaries` was only recalculating the specific trading days present in an imported CSV. Now, `runImport` finds the earliest `trading_day` affected for an account and recalculates ALL subsequent days in chronological order, ensuring `cumulative_pnl` stays perfectly in sync across all dates.
