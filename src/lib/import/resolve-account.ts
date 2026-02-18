import type { SupabaseClient } from "@supabase/supabase-js";

// ── Account Resolution ─────────────────────────────────────────────────────
// Given the Account value from the CSV (e.g. "LFE0506373520003"):
// - Look up accounts table by external_id for this user
// - If found → return account_id
// - If not found → create a new account (user renames it in Settings → Accounts)
export async function resolveAccount(
    externalId: string,
    userId: string,
    supabase: SupabaseClient,
): Promise<string> {
    const { data: existing, error: lookupError } = await supabase
        .from("accounts")
        .select("id")
        .eq("user_id", userId)
        .eq("external_id", externalId)
        .maybeSingle();

    if (lookupError) throw new Error(`Account lookup failed: ${lookupError.message}`);
    if (existing) return existing.id;

    // Create: name defaults to external_id so the user can identify and rename it
    const { data: created, error: createError } = await supabase
        .from("accounts")
        .insert({
            user_id: userId,
            name: externalId,
            external_id: externalId,
            broker: "Tradeovate",
        })
        .select("id")
        .single();

    if (createError) throw new Error(`Account creation failed: ${createError.message}`);
    return created.id;
}
