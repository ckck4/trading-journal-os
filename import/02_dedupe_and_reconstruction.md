# Deduplication & Trade Reconstruction

## 1. Deduplication Strategy

### Fill-Level Dedup
Each fill gets a deterministic hash built from the actual Tradeovate CSV display columns:
```
fill_hash = SHA-256(
  Account + "|" +       -- e.g. "LFE0506373520003"
  id + "|" +            -- internal fill ID
  Product + "|" +       -- root symbol (e.g. "MNQ")
  B/S + "|" +           -- "BUY" or "SELL" (uppercased)
  Quantity + "|" +      -- integer
  Price + "|" +         -- numeric
  Timestamp             -- "M/D/YYYY HH:MM"
)
```

All fields trimmed and uppercased before hashing.

**UNIQUE constraint**: `(user_id, fill_hash)` — any attempt to insert a duplicate fill is silently skipped.

### Batch-Level Dedup
- File hash (SHA-256 of entire CSV) stored on `import_batches`
- Same-file re-upload → warn user but still process (idempotent per-fill dedup handles it)
- Import report shows: new fills, duplicates skipped, errors

### Idempotency Guarantee
Re-importing the same CSV produces zero new fills/trades. The counters update to show all rows as duplicates.

---

## 2. Trade Reconstruction: Flat-to-Flat

### Algorithm

```
For each (account, root_symbol) pair, ordered by fill_time:

  position = 0
  current_trade_fills = []

  For each fill:
    1. Apply fill to position:
       if fill.side == BUY: position += fill.quantity
       if fill.side == SELL: position -= fill.quantity

    2. Append fill to current_trade_fills

    3. If position == 0 AND current_trade_fills is not empty:
       → Create trade from current_trade_fills
       → Reset current_trade_fills = []

  If current_trade_fills is not empty AND position != 0:
    → Create OPEN trade (is_open = true)
```

### Trade Construction from Fills

```
Given fills[] for one trade:

side = if first_fill.side == BUY then 'LONG' else 'SHORT'

entry_fills = fills where side matches opening direction
exit_fills  = fills where side matches closing direction

entry_qty = SUM(entry_fills.quantity)
exit_qty  = SUM(exit_fills.quantity)

avg_entry_price = SUM(entry_fills.price × entry_fills.quantity) / entry_qty
avg_exit_price  = SUM(exit_fills.price × exit_fills.quantity) / exit_qty

entry_time = MIN(entry_fills.fill_time)
exit_time  = MAX(exit_fills.fill_time)

duration_seconds = exit_time - entry_time (in seconds)

gross_pnl:
  if LONG:  (avg_exit_price - avg_entry_price) × exit_qty × multiplier
  if SHORT: (avg_entry_price - avg_exit_price) × exit_qty × multiplier

commission_total = SUM(fills.commission)  // or computed from config
fees_total = SUM(fills.fee)
net_pnl = gross_pnl - commission_total - fees_total

outcome:
  if net_pnl > 0: 'WIN'
  if net_pnl < 0: 'LOSS'
  if net_pnl == 0: 'BREAKEVEN'

trading_day: computed from entry_time using rollover rule
session_id: matched from entry_time against session time ranges
```

### Edge Cases

| Case | Handling |
|------|----------|
| Scale-in (add to position) | Same trade, updated avg_entry_price |
| Scale-out (partial close) | Same trade until flat |
| Flip (long→short in one fill) | Split into close-of-long + open-of-short trades |
| Multiple accounts same instrument | Separate position tracking per account |
| Re-import with new fills | Reconstruct only affected trades |

---

## 3. Manual Split / Merge

### Split
User selects a trade → chooses a split point (between fills) → system creates two trades from the fill subsets.

```
Original trade fills: [F1, F2, F3, F4, F5]
User splits after F3:
  Trade A: [F1, F2, F3] → recalculate
  Trade B: [F4, F5] → recalculate
Both marked: manually_adjusted = true
```

### Merge
User selects two adjacent trades (same instrument, same day) → merged into one trade.

```
Trade A fills: [F1, F2, F3]
Trade B fills: [F4, F5]
Merged: [F1, F2, F3, F4, F5] → recalculate
Marked: manually_adjusted = true
```

---

## 4. Reconstruction Triggers

| Trigger | Scope |
|---------|-------|
| New import | All new fills for affected (account, instrument) pairs |
| Manual split/merge | Only the affected trades |
| Config change (rollover time) | All trades (trading_day reassignment) |
| Undo import batch | Delete fills + affected trades, re-reconstruct remaining |

---

## 5. Post-Reconstruction Pipeline

After trades are created/updated:

1. **Auto-assign strategy** (if not manually set)
2. **Match session** (from entry_time)
3. **Compute R-multiple** (if initial_stop is set)
4. **Recalculate daily summaries** for affected trading days
5. **Emit `trades.reconstructed` event** → downstream modules react
