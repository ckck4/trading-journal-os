import { createHash } from "crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { parseCSV } from "./parse-csv";
import { deduplicateFills, type FillWithHash } from "./dedupe";
import { resolveAccount } from "./resolve-account";
import { resolveInstrument, type ResolvedInstrument } from "./resolve-instrument";
import { reconstructTrades, type InsertedFill } from "./reconstruct-trades";
import { recalcSummaries } from "../services/recalc-summaries";

// ── Public result type ─────────────────────────────────────────────────────
export interface ImportResult {
    batchId: string;
    newFills: number;
    duplicateFills: number;
    tradesCreated: number;
    errorRows: number;
    errors: Array<{ row?: number; message: string }>;
}

// ── Helpers ────────────────────────────────────────────────────────────────
function hashFile(content: string): string {
    return createHash("sha256").update(content).digest("hex");
}

async function finalizeBatch(
    supabase: SupabaseClient,
    batchId: string,
    status: string,
    totalRows: number,
    newFills: number,
    duplicateFills: number,
    errorRows: number,
    errors: Array<{ row?: number; message: string }>,
) {
    await supabase
        .from("import_batches")
        .update({
            status,
            total_rows: totalRows,
            new_fills: newFills,
            duplicate_fills: duplicateFills,
            error_rows: errorRows,
            error_details: errors.length > 0 ? errors : null,
            completed_at: new Date().toISOString(),
        })
        .eq("id", batchId);
}

// ── Main orchestrator ──────────────────────────────────────────────────────
// All writes use the admin client — RLS is bypassed, so the auto_set_user_id
// trigger does NOT fire.  Every insert MUST include user_id explicitly.
//
// userEmail is required to ensure the user exists in public.users before we
// attempt to insert into import_batches (which has a FK to public.users.id).
// The admin client bypasses RLS, hitting the FK directly against public.users.
export async function runImport(
    csvText: string,
    filename: string,
    userId: string,
    userEmail: string,
    supabase: SupabaseClient,
): Promise<ImportResult> {
    // ── Guard: both userId and userEmail must be non-empty strings ─────────
    if (!userId || typeof userId !== "string") {
        throw new Error(
            `runImport: userId is required but received: ${JSON.stringify(userId)}`,
        );
    }
    if (!userEmail || typeof userEmail !== "string") {
        throw new Error(
            `runImport: userEmail is required but received: ${JSON.stringify(userEmail)}`,
        );
    }

    console.log("[run-import] starting for user:", userId, "email:", userEmail, "file:", filename);

    // ── Step 0: Ensure user exists in public.users ─────────────────────────
    // The admin client bypasses RLS and hits FK constraints directly.
    // import_batches.user_id → public.users.id — must exist before inserting.
    // Supabase Auth writes to auth.users only; the trigger in the migration
    // handles future signups, but we upsert here as a safety net for cases
    // where the trigger hasn't run yet (e.g. existing users before migration).
    const displayName = userEmail.split("@")[0];
    const { error: upsertUserError } = await supabase
        .from("users")
        .upsert(
            {
                id: userId,
                email: userEmail,
                display_name: displayName,
                password_hash: "", // auth handled by Supabase Auth — placeholder only
            },
            { onConflict: "id", ignoreDuplicates: true },
        );

    if (upsertUserError) {
        // If the user already exists with a different email this is a conflict
        // on the unique email index — log but do not abort, the FK will succeed.
        console.warn("[run-import] public.users upsert warning:", upsertUserError.message);
    } else {
        console.log("[run-import] public.users upsert OK for", userId);
    }

    const errors: Array<{ row?: number; message: string }> = [];
    const fileHash = hashFile(csvText);

    // ── Step 1: Create import_batch ────────────────────────────────────────
    // user_id must be explicit — the admin client bypasses the auto_set_user_id trigger.
    const batchInsert = {
        user_id: userId,
        filename: filename,
        file_hash: fileHash,
        status: "processing",
        started_at: new Date().toISOString(),
    };
    console.log("[run-import] inserting import_batch:", batchInsert);

    const { data: batch, error: batchCreateError } = await supabase
        .from("import_batches")
        .insert(batchInsert)
        .select("id")
        .single();

    if (batchCreateError) {
        console.error("[run-import] import_batch insert failed:", batchCreateError);
        throw new Error(`Failed to create import batch: ${batchCreateError.message}`);
    }

    const batchId = batch.id;
    console.log("[run-import] batch created:", batchId);

    try {
        // ── Step 2: Parse CSV ──────────────────────────────────────────────
        const { fills, errors: parseErrors, totalRows } = parseCSV(csvText);
        errors.push(...parseErrors.map((e) => ({ row: e.row, message: e.message })));

        if (fills.length === 0 && totalRows === 0) {
            await finalizeBatch(supabase, batchId, "failed", 0, 0, 0, parseErrors.length, errors);
            return {
                batchId,
                newFills: 0,
                duplicateFills: 0,
                tradesCreated: 0,
                errorRows: parseErrors.length,
                errors,
            };
        }

        // ── Step 3: Resolve accounts ───────────────────────────────────────
        const accountExternalIds = [...new Set(fills.map((f) => f.accountExternalId))];
        const accountIdMap = new Map<string, string>();
        for (const extId of accountExternalIds) {
            const accountId = await resolveAccount(extId, userId, supabase);
            accountIdMap.set(extId, accountId);
        }

        // ── Step 4: Resolve instruments ────────────────────────────────────
        const rootSymbols = [...new Set(fills.map((f) => f.rootSymbol))];
        const instrumentMap = new Map<string, ResolvedInstrument>();
        for (const symbol of rootSymbols) {
            const instrument = await resolveInstrument(symbol, userId, supabase);
            instrumentMap.set(symbol, instrument);
        }

        // ── Step 5: Deduplicate ────────────────────────────────────────────
        const { newFills, duplicates } = await deduplicateFills(fills, userId, supabase);
        console.log("[run-import] dedup: new=", newFills.length, "dupes=", duplicates.length);

        // ── Step 6: Insert new fills ───────────────────────────────────────
        let insertedCount = 0;
        const insertedFills: InsertedFill[] = [];

        for (const fill of newFills) {
            const accountId = accountIdMap.get(fill.accountExternalId);
            const instrument = instrumentMap.get(fill.rootSymbol);

            if (!accountId || !instrument) {
                errors.push({
                    message: `Could not resolve account or instrument for fill ${fill.rawFillId}`,
                });
                continue;
            }

            const { data: inserted, error: insertError } = await supabase
                .from("fills")
                .insert({
                    import_batch_id: batchId,
                    user_id: userId,
                    account_id: accountId,
                    fill_hash: fill.fillHash,
                    raw_fill_id: fill.rawFillId,
                    raw_order_id: fill.rawOrderId,
                    raw_instrument: fill.rawInstrument,
                    root_symbol: fill.rootSymbol,
                    side: fill.side,
                    quantity: fill.quantity,
                    price: fill.price.toString(),
                    fill_time: fill.fillTime,
                    commission: fill.commission.toString(),
                    fee: "0",
                    instrument_id: instrument.id,
                    trading_day: fill.tradingDay,
                })
                .select("id")
                .single();

            if (insertError) {
                // 23505 = unique_violation — concurrent re-import; skip silently
                if (insertError.code === "23505") continue;
                errors.push({
                    message: `Fill insert failed for ${fill.rawFillId}: ${insertError.message}`,
                });
                continue;
            }

            insertedFills.push({
                ...fill,
                id: inserted.id,
                accountId,
                instrumentId: instrument.id,
            });
            insertedCount++;
        }

        // ── Step 7: Reconstruct trades ─────────────────────────────────────
        let tradesCreated = 0;
        try {
            tradesCreated = await reconstructTrades(
                insertedFills,
                userId,
                instrumentMap,
                supabase,
            );
        } catch (e) {
            errors.push({
                message: `Trade reconstruction error: ${e instanceof Error ? e.message : String(e)}`,
            });
        }

        // ── Step 7.5: Recalculate daily summaries ─────────────────────────
        // Run after trades are written so summaries reflect the new data.
        // We must recalculate not only the days present in the imported fills,
        // but ALSO all subsequent days for the affected accounts, because
        // cumulative_pnl relies on the previous days' totals.
        if (insertedFills.length > 0) {
            const accountMinDayMap = new Map<string, string>();
            for (const fill of insertedFills) {
                const currentMin = accountMinDayMap.get(fill.accountId);
                if (!currentMin || fill.tradingDay < currentMin) {
                    accountMinDayMap.set(fill.accountId, fill.tradingDay);
                }
            }

            try {
                await Promise.all(
                    [...accountMinDayMap.entries()].map(async ([accountId, minDay]) => {
                        // 1. Get all trading days >= minDay for this account
                        const { data: tradeDays } = await supabase
                            .from("trades")
                            .select("trading_day")
                            .eq("user_id", userId)
                            .eq("account_id", accountId)
                            .gte("trading_day", minDay);

                        const daySet = new Set<string>();
                        if (tradeDays) {
                            for (const row of tradeDays) {
                                daySet.add(row.trading_day);
                            }
                        }

                        // 2. Ensure we also include the actual days from the fills
                        // (in case a day has fills but no closed trades yet)
                        for (const fill of insertedFills) {
                            if (fill.accountId === accountId) {
                                daySet.add(fill.tradingDay);
                            }
                        }

                        // 3. Sort ascending so each day sees correct prior cumulative
                        const days = [...daySet].sort();
                        for (const tradingDay of days) {
                            await recalcSummaries(userId, accountId, tradingDay);
                        }
                    }),
                );
                console.log("[run-import] recalcSummaries complete for", accountMinDayMap.size, "account(s)");
            } catch (recalcErr) {
                // Non-fatal — trades are persisted; summaries are stale but recoverable
                console.error("[run-import] recalcSummaries error (non-fatal):", recalcErr);
            }
        }

        // ── Step 8: Finalize batch ─────────────────────────────────────────
        await finalizeBatch(
            supabase,
            batchId,
            "complete",
            totalRows,
            insertedCount,
            duplicates.length,
            parseErrors.length,
            errors,
        );

        console.log("[run-import] complete — fills:", insertedCount, "trades:", tradesCreated);
        return {
            batchId,
            newFills: insertedCount,
            duplicateFills: duplicates.length,
            tradesCreated,
            errorRows: parseErrors.length,
            errors,
        };
    } catch (e) {
        const errMsg = e instanceof Error ? e.message : String(e);
        errors.push({ message: errMsg });
        await finalizeBatch(supabase, batchId, "failed", 0, 0, 0, 1, errors);
        throw e;
    }
}
