import type { SupabaseClient } from "@supabase/supabase-js";
import type { FillWithHash } from "./dedupe";
import type { ResolvedInstrument } from "./resolve-instrument";

// ── Types ──────────────────────────────────────────────────────────────────
// Fills enriched with DB IDs after insertion
export interface InsertedFill extends FillWithHash {
    id: string;
    accountId: string;
    instrumentId: string;
}

// ── Flat-to-Flat trade reconstruction ─────────────────────────────────────
// Groups fills by (accountId, rootSymbol), sorts by fill_time, then walks
// fills tracking net position. When position returns to zero a trade is complete.
export async function reconstructTrades(
    insertedFills: InsertedFill[],
    userId: string,
    instruments: Map<string, ResolvedInstrument>,
    supabase: SupabaseClient,
): Promise<number> {
    if (insertedFills.length === 0) return 0;

    // Group by account + symbol
    const groups = new Map<string, InsertedFill[]>();
    for (const fill of insertedFills) {
        const key = `${fill.accountId}:${fill.rootSymbol}`;
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key)!.push(fill);
    }

    let tradesCreated = 0;

    for (const [, groupFills] of groups) {
        // Sort ascending by fill_time
        groupFills.sort(
            (a, b) => new Date(a.fillTime).getTime() - new Date(b.fillTime).getTime(),
        );

        const { accountId, rootSymbol, instrumentId } = groupFills[0];
        const instrument = instruments.get(rootSymbol);
        if (!instrument) continue;

        // Walk fills tracking net position
        let position = 0;
        let currentTradeFills: InsertedFill[] = [];

        for (const fill of groupFills) {
            position += fill.side === "BUY" ? fill.quantity : -fill.quantity;
            currentTradeFills.push(fill);

            if (position === 0 && currentTradeFills.length > 0) {
                // Closed trade
                const tradeId = await createTrade({
                    fills: currentTradeFills,
                    userId,
                    accountId,
                    instrumentId,
                    rootSymbol,
                    instrument,
                    isOpen: false,
                    supabase,
                });
                tradesCreated++;

                // Link all fills in this trade to the trade record
                await supabase
                    .from("fills")
                    .update({ trade_id: tradeId })
                    .in("id", currentTradeFills.map((f) => f.id));

                currentTradeFills = [];
            }
        }

        // Remaining fills form an open trade (position not yet flat)
        if (currentTradeFills.length > 0 && position !== 0) {
            const tradeId = await createTrade({
                fills: currentTradeFills,
                userId,
                accountId,
                instrumentId,
                rootSymbol,
                instrument,
                isOpen: true,
                supabase,
            });
            tradesCreated++;

            await supabase
                .from("fills")
                .update({ trade_id: tradeId })
                .in("id", currentTradeFills.map((f) => f.id));
        }
    }

    return tradesCreated;
}

// ── Trade builder ──────────────────────────────────────────────────────────
interface CreateTradeArgs {
    fills: InsertedFill[];
    userId: string;
    accountId: string;
    instrumentId: string;
    rootSymbol: string;
    instrument: ResolvedInstrument;
    isOpen: boolean;
    supabase: SupabaseClient;
}

async function createTrade({
    fills,
    userId,
    accountId,
    instrumentId,
    rootSymbol,
    instrument,
    isOpen,
    supabase,
}: CreateTradeArgs): Promise<string> {
    const firstFill = fills[0];

    // Trade direction determined by first fill's side
    const tradeSide: "LONG" | "SHORT" = firstFill.side === "BUY" ? "LONG" : "SHORT";
    const openingSide = tradeSide === "LONG" ? "BUY" : "SELL";
    const closingSide = tradeSide === "LONG" ? "SELL" : "BUY";

    const entryFills = fills.filter((f) => f.side === openingSide);
    const exitFills = fills.filter((f) => f.side === closingSide);

    const entryQty = entryFills.reduce((sum, f) => sum + f.quantity, 0);
    const exitQty = exitFills.reduce((sum, f) => sum + f.quantity, 0);

    // Quantity-weighted average prices
    const avgEntryPrice =
        entryQty > 0
            ? entryFills.reduce((sum, f) => sum + f.price * f.quantity, 0) / entryQty
            : 0;

    const avgExitPrice =
        exitQty > 0
            ? exitFills.reduce((sum, f) => sum + f.price * f.quantity, 0) / exitQty
            : null;

    // Timing
    const entryTimestamps = entryFills.map((f) => new Date(f.fillTime).getTime());
    const exitTimestamps = exitFills.map((f) => new Date(f.fillTime).getTime());
    const entryTime = new Date(Math.min(...entryTimestamps)).toISOString();
    const exitTime =
        exitTimestamps.length > 0
            ? new Date(Math.max(...exitTimestamps)).toISOString()
            : null;

    const durationSeconds =
        exitTime != null
            ? Math.round(
                  (new Date(exitTime).getTime() - new Date(entryTime).getTime()) / 1000,
              )
            : null;

    // Gross P&L — uses multiplier from instruments table (user-configured, never hardcoded)
    // multiplier = tick_value / tick_size, pre-computed on the instrument record
    let grossPnl = 0;
    if (!isOpen && avgExitPrice !== null) {
        const priceDiff =
            tradeSide === "LONG"
                ? avgExitPrice - avgEntryPrice
                : avgEntryPrice - avgExitPrice;
        grossPnl = priceDiff * exitQty * instrument.multiplier;
    }

    // commission comes from fills; fee is 0 for CSV imports (no separate fee source)
    const commissionTotal = fills.reduce((sum, f) => sum + f.commission, 0);
    const feesTotal = 0;
    const netPnl = grossPnl - commissionTotal - feesTotal;

    // Outcome
    let outcome: "WIN" | "LOSS" | "BREAKEVEN" | null = null;
    if (!isOpen) {
        if (netPnl > 0) outcome = "WIN";
        else if (netPnl < 0) outcome = "LOSS";
        else outcome = "BREAKEVEN";
    }

    const { data: trade, error } = await supabase
        .from("trades")
        .insert({
            user_id: userId,
            account_id: accountId,
            instrument_id: instrumentId,
            root_symbol: rootSymbol,
            trading_day: firstFill.tradingDay,
            entry_time: entryTime,
            exit_time: exitTime,
            duration_seconds: durationSeconds,
            side: tradeSide,
            entry_qty: entryQty,
            exit_qty: exitQty,
            avg_entry_price: avgEntryPrice.toString(),
            avg_exit_price: avgExitPrice?.toString() ?? null,
            is_open: isOpen,
            gross_pnl: grossPnl.toFixed(2),
            commission_total: commissionTotal.toFixed(4),
            fees_total: feesTotal.toFixed(4),
            net_pnl: netPnl.toFixed(2),
            outcome,
            grouping_method: "flat_to_flat",
        })
        .select("id")
        .single();

    if (error) throw new Error(`Trade creation failed: ${error.message}`);
    return trade.id;
}
