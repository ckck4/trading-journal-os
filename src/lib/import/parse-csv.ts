import Papa from "papaparse";

// ── Configurable column map ────────────────────────────────────────────────
// Keys are our internal field names; values are the CSV column headers.
// Swap this map to support other brokers without touching the rest of the code.
export const COLUMN_MAP = {
    rawFillId: "Fill ID",
    rawOrderId: "Order ID",
    rawInstrument: "Contract",
    rootSymbol: "Product",
    side: "B/S",
    quantity: "Quantity",
    price: "Price",
    fillTime: "_timestamp", // ISO UTC — more precise than display Timestamp
    tradingDay: "_tradeDate", // YYYY-MM-DD
    commission: "commission",
    accountExternalId: "Account",
    active: "_active", // filter-only, not stored
} as const;

export type ColumnMap = typeof COLUMN_MAP;

// ── Parsed fill shape ──────────────────────────────────────────────────────
export interface ParsedFill {
    rawFillId: string;
    rawOrderId: string;
    rawInstrument: string;
    rootSymbol: string;
    side: "BUY" | "SELL";
    quantity: number;
    price: number;
    fillTime: string; // ISO UTC string (from _timestamp)
    tradingDay: string; // YYYY-MM-DD (from _tradeDate)
    commission: number;
    accountExternalId: string;
}

export interface ParseError {
    row: number;
    message: string;
}

export interface ParseResult {
    fills: ParsedFill[];
    errors: ParseError[];
    totalRows: number;
}

// ── Parser ─────────────────────────────────────────────────────────────────
export function parseCSV(csvText: string): ParseResult {
    const { data, errors: papaErrors } = Papa.parse<Record<string, string>>(csvText, {
        header: true,
        skipEmptyLines: true,
    });

    const fills: ParsedFill[] = [];
    const errors: ParseError[] = [];
    const C = COLUMN_MAP;

    // Surface any structural parse errors from Papaparse
    for (const pe of papaErrors) {
        if (pe.row !== undefined) {
            errors.push({ row: pe.row + 2, message: `CSV parse error: ${pe.message}` });
        }
    }

    for (let i = 0; i < data.length; i++) {
        const row = data[i];
        const rowNum = i + 2; // 1-indexed, +1 for header row

        // Skip inactive/cancelled fills silently
        const activeVal = row[C.active]?.trim().toLowerCase();
        if (activeVal !== "true") continue;

        // Validate required fields are present
        const required: Array<[string, string]> = [
            [C.rootSymbol, "Product"],
            [C.side, "B/S"],
            [C.quantity, "Quantity"],
            [C.price, "Price"],
            [C.fillTime, "_timestamp"],
        ];
        const missing = required.filter(([col]) => !row[col]?.trim()).map(([, label]) => label);
        if (missing.length > 0) {
            errors.push({ row: rowNum, message: `Missing required fields: ${missing.join(", ")}` });
            continue;
        }

        // Side — trim leading/trailing whitespace (CSV has " Buy", " Sell") then uppercase
        const rawSide = row[C.side].trim().toUpperCase();
        if (rawSide !== "BUY" && rawSide !== "SELL") {
            errors.push({ row: rowNum, message: `Invalid B/S value: "${row[C.side]}"` });
            continue;
        }

        // Quantity
        const quantity = parseInt(row[C.quantity].trim(), 10);
        if (isNaN(quantity) || quantity <= 0) {
            errors.push({ row: rowNum, message: `Invalid quantity: "${row[C.quantity]}"` });
            continue;
        }

        // Price
        const price = parseFloat(row[C.price].trim());
        if (isNaN(price)) {
            errors.push({ row: rowNum, message: `Invalid price: "${row[C.price]}"` });
            continue;
        }

        // fill_time — _timestamp column is "2026-02-10 15:01:01.116Z" (space-separated ISO UTC)
        const fillTimeRaw = row[C.fillTime]?.trim();
        if (!fillTimeRaw) {
            errors.push({ row: rowNum, message: "Missing _timestamp" });
            continue;
        }
        // Normalize space-separated ISO to standard T-separator
        const fillTimeNorm = fillTimeRaw.includes("T") ? fillTimeRaw : fillTimeRaw.replace(" ", "T");
        const fillTimeDate = new Date(fillTimeNorm);
        if (isNaN(fillTimeDate.getTime())) {
            errors.push({ row: rowNum, message: `Unparseable _timestamp: "${fillTimeRaw}"` });
            continue;
        }

        // trading_day — _tradeDate column is already "YYYY-MM-DD"
        const tradingDay = row[C.tradingDay]?.trim();
        if (!tradingDay) {
            errors.push({ row: rowNum, message: "Missing _tradeDate" });
            continue;
        }

        // Commission — optional, default to 0
        const commissionRaw = row[C.commission]?.trim();
        const commission = commissionRaw ? parseFloat(commissionRaw) : 0;

        fills.push({
            rawFillId: row[C.rawFillId]?.trim() ?? "",
            rawOrderId: row[C.rawOrderId]?.trim() ?? "",
            rawInstrument: row[C.rawInstrument]?.trim() ?? "",
            rootSymbol: row[C.rootSymbol].trim(),
            side: rawSide as "BUY" | "SELL",
            quantity,
            price,
            fillTime: fillTimeDate.toISOString(),
            tradingDay,
            commission: isNaN(commission) ? 0 : commission,
            accountExternalId: row[C.accountExternalId]?.trim() ?? "",
        });
    }

    return {
        fills,
        errors,
        totalRows: data.length,
    };
}
