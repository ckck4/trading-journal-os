import { createHash } from "crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { ParsedFill } from "./parse-csv";

// ── Types ──────────────────────────────────────────────────────────────────
export interface FillWithHash extends ParsedFill {
    fillHash: string;
}

export interface DedupeResult {
    newFills: FillWithHash[];
    duplicates: FillWithHash[];
}

// ── Hash generation ────────────────────────────────────────────────────────
// Deterministic SHA-256 from: user_id | raw_fill_id | fill_time | side | quantity | price
// The DB unique constraint (user_id, fill_hash) enforces idempotency.
function generateFillHash(
    userId: string,
    rawFillId: string,
    fillTime: string,
    side: string,
    quantity: number,
    price: number,
): string {
    const input = [
        userId,
        rawFillId,
        fillTime,
        side.toUpperCase(),
        quantity.toString(),
        price.toString(),
    ].join("|");
    return createHash("sha256").update(input).digest("hex");
}

// ── Deduplicator ───────────────────────────────────────────────────────────
// Returns fills split into new vs. already-present for this user.
export async function deduplicateFills(
    fills: ParsedFill[],
    userId: string,
    supabase: SupabaseClient,
): Promise<DedupeResult> {
    if (fills.length === 0) return { newFills: [], duplicates: [] };

    // Attach deterministic hashes to every fill
    const fillsWithHashes: FillWithHash[] = fills.map((fill) => ({
        ...fill,
        fillHash: generateFillHash(
            userId,
            fill.rawFillId,
            fill.fillTime,
            fill.side,
            fill.quantity,
            fill.price,
        ),
    }));

    // Batch-check which hashes already exist in the fills table for this user
    const hashes = fillsWithHashes.map((f) => f.fillHash);
    const { data: existingRows, error } = await supabase
        .from("fills")
        .select("fill_hash")
        .eq("user_id", userId)
        .in("fill_hash", hashes);

    if (error) throw new Error(`Dedup query failed: ${error.message}`);

    const existingHashes = new Set(
        (existingRows ?? []).map((r: { fill_hash: string }) => r.fill_hash),
    );

    const newFills: FillWithHash[] = [];
    const duplicates: FillWithHash[] = [];

    for (const fill of fillsWithHashes) {
        if (existingHashes.has(fill.fillHash)) {
            duplicates.push(fill);
        } else {
            newFills.push(fill);
        }
    }

    return { newFills, duplicates };
}
