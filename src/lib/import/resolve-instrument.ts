import type { SupabaseClient } from "@supabase/supabase-js";

// ── Instrument defaults for known futures symbols ──────────────────────────
// These are starting points only — user can override in Settings → Instruments.
// multiplier = tick_value / tick_size (used for P&L calculation)
interface InstrumentDefaults {
    displayName: string;
    tickSize: number;
    tickValue: number;
    multiplier: number;
    commissionPerSide: number;
    isMicro: boolean;
}

const KNOWN_INSTRUMENTS: Record<string, InstrumentDefaults> = {
    // Micro futures
    MNQ: { displayName: "Micro Nasdaq", tickSize: 0.25, tickValue: 0.5, multiplier: 2.0, commissionPerSide: 0.5, isMicro: true },
    MES: { displayName: "Micro S&P", tickSize: 0.25, tickValue: 1.25, multiplier: 5.0, commissionPerSide: 0.5, isMicro: true },
    MGC: { displayName: "Micro Gold", tickSize: 0.1, tickValue: 1.0, multiplier: 10.0, commissionPerSide: 0.8, isMicro: true },
    MYM: { displayName: "Micro Dow", tickSize: 1.0, tickValue: 0.5, multiplier: 0.5, commissionPerSide: 0.5, isMicro: true },
    M2K: { displayName: "Micro Russell", tickSize: 0.1, tickValue: 0.5, multiplier: 5.0, commissionPerSide: 0.5, isMicro: true },
    MCL: { displayName: "Micro Crude Oil", tickSize: 0.01, tickValue: 1.0, multiplier: 100.0, commissionPerSide: 0.5, isMicro: true },
    // Standard futures
    NQ: { displayName: "E-mini Nasdaq", tickSize: 0.25, tickValue: 5.0, multiplier: 20.0, commissionPerSide: 2.05, isMicro: false },
    ES: { displayName: "E-mini S&P", tickSize: 0.25, tickValue: 12.5, multiplier: 50.0, commissionPerSide: 2.05, isMicro: false },
    GC: { displayName: "Gold", tickSize: 0.1, tickValue: 10.0, multiplier: 100.0, commissionPerSide: 2.05, isMicro: false },
    CL: { displayName: "Crude Oil", tickSize: 0.01, tickValue: 10.0, multiplier: 1000.0, commissionPerSide: 2.05, isMicro: false },
    YM: { displayName: "E-mini Dow", tickSize: 1.0, tickValue: 5.0, multiplier: 5.0, commissionPerSide: 2.05, isMicro: false },
    RTY: { displayName: "E-mini Russell", tickSize: 0.1, tickValue: 5.0, multiplier: 50.0, commissionPerSide: 2.05, isMicro: false },
};

// ── Return type ────────────────────────────────────────────────────────────
export interface ResolvedInstrument {
    id: string;
    tickSize: number;
    tickValue: number;
    multiplier: number;
}

// ── Resolver ───────────────────────────────────────────────────────────────
// Looks up or creates an instrument by root_symbol for this user.
// All values come from user config after creation — defaults are just a starting point.
export async function resolveInstrument(
    rootSymbol: string,
    userId: string,
    supabase: SupabaseClient,
): Promise<ResolvedInstrument> {
    const { data: existing, error: lookupError } = await supabase
        .from("instruments")
        .select("id, tick_size, tick_value, multiplier")
        .eq("user_id", userId)
        .eq("root_symbol", rootSymbol)
        .maybeSingle();

    if (lookupError) throw new Error(`Instrument lookup failed: ${lookupError.message}`);

    if (existing) {
        return {
            id: existing.id,
            tickSize: parseFloat(existing.tick_size),
            tickValue: parseFloat(existing.tick_value),
            multiplier: parseFloat(existing.multiplier),
        };
    }

    // Create with defaults — unknown symbols get null tick values (flagged for user to configure)
    const defaults = KNOWN_INSTRUMENTS[rootSymbol];

    const insertData = defaults
        ? {
              user_id: userId,
              root_symbol: rootSymbol,
              display_name: defaults.displayName,
              tick_size: defaults.tickSize.toString(),
              tick_value: defaults.tickValue.toString(),
              multiplier: defaults.multiplier.toString(),
              commission_per_side: defaults.commissionPerSide.toString(),
              is_micro: defaults.isMicro,
          }
        : {
              // Unknown symbol — user must configure tick values in Settings → Instruments
              user_id: userId,
              root_symbol: rootSymbol,
              display_name: rootSymbol,
              tick_size: "0",
              tick_value: "0",
              multiplier: "1",
              commission_per_side: "0",
              is_micro: false,
          };

    const { data: created, error: createError } = await supabase
        .from("instruments")
        .insert(insertData)
        .select("id, tick_size, tick_value, multiplier")
        .single();

    if (createError) throw new Error(`Instrument creation failed: ${createError.message}`);

    return {
        id: created.id,
        tickSize: parseFloat(created.tick_size),
        tickValue: parseFloat(created.tick_value),
        multiplier: parseFloat(created.multiplier),
    };
}
