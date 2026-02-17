# Tradeovate Fills CSV — Column Mapping

> **Status**: ✅ FINALIZED from actual CSV sample.

---

## 1. CSV Column Schema

The Tradeovate FILLS CSV contains both internal/API columns (lowercase) and display columns (capitalized). We use the **display columns** as they contain human-readable values.

### Full Header Row

```
id, orderId, contractId, timestamp, tradeDate, action, qty, price, active, account,
Fill ID, Order ID, Timestamp, Date, Account, B/S, Quantity, Price, Force,
priceFormat, tickSize, Contract, Product, ProductDescription, commission
```

### Column Mapping

| # | CSV Column | DB Field | Transform | Notes |
|---|-----------|----------|-----------|-------|
| 1 | `id` | fills.raw_fill_id | Direct (string) | Internal fill ID (large number) |
| 2 | `orderId` | fills.raw_order_id | Direct (string) | Internal order ID |
| 3 | `Account` | accounts.external_id | Lookup/create | **Account identifier**: e.g. `LFE0506373520003` |
| 4 | `Contract` | fills.raw_instrument | Direct | Full contract + description (e.g. "Micro E-Mini NASDAQ-100 MNQH6") |
| 5 | `Product` | fills.root_symbol | **Direct — no normalization needed** | Already the root symbol: `MNQ`, `MES`, `MGC` |
| 6 | `B/S` | fills.side | Normalize: `Buy`→`BUY`, `Sell`→`SELL` | |
| 7 | `Quantity` | fills.quantity | Parse integer | Display qty column |
| 8 | `Price` | fills.price | Parse numeric | e.g. `25387`, `25405.75`, `25138.5` |
| 9 | `Timestamp` | fills.fill_time | Parse `M/D/YYYY HH:MM` → TIMESTAMPTZ | Display timestamp column |
| 10 | `Date` | (cross-check) | Parse `M/D/YYYY` | Used to validate trading day |
| 11 | `commission` | fills.commission | Parse numeric | Commission per fill |
| 12 | `tickSize` | (cross-check) | Parse numeric | Validate against instrument config (e.g. `0.25`) |
| 13 | `ProductDescription` | (reference) | — | Human-readable name, e.g. "Micro E-Mini NASDAQ-100" |
| 14 | `active` | (filter) | Boolean | Skip rows where `active` ≠ TRUE |

### Ignored Columns
- `contractId` — internal numeric reference, not needed
- `tradeDate` — internal trade date, we compute our own via rollover
- `action` — redundant with `B/S`
- `qty` — internal qty, we use display `Quantity`
- `price` (lowercase) — internal, we use display `Price`
- `account` (lowercase) — internal numeric, we use display `Account`
- `Fill ID`, `Order ID` — display duplicates of `id`, `orderId`
- `Force`, `priceFormat` — not needed for analytics

---

## 2. Root Symbol Resolution

> **No regex normalization needed!** The CSV provides `Product` column with the clean root symbol.

```
CSV Product column → fills.root_symbol
"MNQ" → "MNQ"
"MES" → "MES"
"MGC" → "MGC"
```

The `Contract` column contains the full contract code (e.g. "Micro E-Mini NASDAQ-100 MNQH6") — stored in `raw_instrument` for audit purposes only.

---

## 3. Fill Hash (Dedup Key)

```
fill_hash = SHA-256(
  Account + "|" +
  id + "|" +
  Product + "|" +
  B/S + "|" +
  Quantity + "|" +
  Price + "|" +
  Timestamp
)
```

All fields trimmed and uppercased before hashing.
If hash exists for this user → skip (idempotent).

---

## 4. Timestamp Handling

### Source Format
```
Timestamp column: "2/10/2026 16:01"
Format: M/D/YYYY HH:MM (no seconds)
```

### Timezone Assumption
Tradeovate timestamps are in **exchange time or CT (Central Time)**. The importer must be configurable:
- Default assumption: **America/Chicago** (CT)
- User can override in settings if their export uses a different timezone

### Trading Day Assignment

```
fill_time in rollover_tz (America/New_York):
  if local_time >= 18:00 → trading_day = local_date + 1
  else → trading_day = local_date
```

---

## 5. Account Resolution

- Column: **`Account`** (display name)
- Example value: `LFE0506373520003`
- Stored in: `accounts.external_id`

```
1. Read `Account` column value (e.g. "LFE0506373520003")
2. Lookup: accounts WHERE external_id = value AND user_id = current_user
3. If found → use account_id
4. If not found → prompt user: "New account detected: LFE0506373520003"
   → User creates account → external_id set
```

---

## 6. Commission Handling

Priority:
1. CSV `commission` column value (if present and non-zero)
2. Per-account instrument override (`account_instrument_fees`)
3. Per-instrument default (`instruments.commission_per_side × quantity`)
4. Zero fallback

---

## 7. Row Filtering

- **Only import rows where `active` = TRUE** — skip inactive/cancelled fills
- This is a critical filter to avoid importing partial/cancelled orders

---

## 8. Validation Rules

| Rule | Severity | Action |
|------|----------|--------|
| Missing `Product`, `B/S`, `Quantity`, `Price`, `Timestamp` | ERROR | Skip row |
| `active` ≠ TRUE | INFO | Skip silently |
| Duplicate fill_hash | INFO | Skip, increment counter |
| Unknown Product (not in configured instruments) | WARNING | Import + flag |
| `Quantity` ≤ 0 | ERROR | Skip row |
| Unparseable Timestamp | ERROR | Skip row |
| Missing commission | INFO | Compute from config |

---

## 9. Import Flow

1. Upload CSV → create `import_batch` (processing)
2. Parse header → validate required columns present
3. Per row:
   a. Check `active` = TRUE (skip if not)
   b. Validate required fields
   c. Read `Product` as root_symbol (direct, no normalization)
   d. Resolve account via `Account` column
   e. Resolve instrument via `Product` → `instruments.root_symbol`
   f. Compute fill_hash
   g. Check for duplicate → skip or insert
4. Reconstruct trades (Flat-to-Flat)
5. Auto-assign strategies
6. Recalculate daily summaries
7. Emit `fills.imported` event
8. Update batch (completed + counters)
9. Show validation report

---

## 10. Sample Data (Redacted)

```csv
id,orderId,contractId,timestamp,tradeDate,action,qty,price,active,account,Fill ID,Order ID,Timestamp,Date,Account,B/S,Quantity,Price,Force,priceFormat,tickSize,Contract,Product,ProductDescription,commission
3.95E+11,3.98E+11,4214197,...,...,...,1,25387,TRUE,40159391,...,...,2/10/2026 16:01,2/10/2026,LFE0506373520003,Buy,1,25387,...,...,0.25,...,MNQ,Micro E-Mini NASDAQ-100,...
3.95E+11,3.98E+11,4214197,...,...,...,1,25405.75,TRUE,40159391,...,...,2/10/2026 ...,2/10/2026,LFE0506373520003,Sell,1,25405.75,...,...,0.25,...,MNQ,Micro E-Mini NASDAQ-100,...
3.95E+11,3.98E+11,4214207,...,...,...,1,25138.5,TRUE,40159391,...,...,2/11/2026 ...,2/11/2026,LFE0506373520003,Sell,1,25138.5,...,...,0.25,...,MNQ,Micro E-Mini NASDAQ-100,...
```
