import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const adminClient = createAdminClient();

    // 1. Fetch all strategies for the user
    const { data: strategies, error: stratErr } = await adminClient
      .from("strategies")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (stratErr) throw stratErr;

    // 2. Fetch all trades to compute stats
    const { data: trades, error: tradesErr } = await adminClient
      .from("trades")
      .select("strategy_id, net_pnl")
      .eq("user_id", user.id)
      .not("strategy_id", "is", null);

    if (tradesErr) throw tradesErr;

    // 3. Compute stats per strategy
    const strategyStats = new Map();

    trades?.forEach(trade => {
      const sid = trade.strategy_id;
      const pnl = parseFloat(trade.net_pnl || "0");
      const isWin = pnl > 0;
      const isLoss = pnl < 0;

      if (!strategyStats.has(sid)) {
        strategyStats.set(sid, {
          tradeCount: 0,
          totalPnl: 0,
          winCount: 0,
          grossWinningPnl: 0,
          grossLosingPnl: 0,
        });
      }

      const stats = strategyStats.get(sid);
      stats.tradeCount++;
      stats.totalPnl += pnl;

      if (isWin) {
        stats.winCount++;
        stats.grossWinningPnl += pnl;
      } else if (isLoss) {
        stats.grossLosingPnl += Math.abs(pnl);
      }
    });

    const strategiesWithStats = strategies?.map(strategy => {
      const stats = strategyStats.get(strategy.id) || {
        tradeCount: 0,
        totalPnl: 0,
        winCount: 0,
        grossWinningPnl: 0,
        grossLosingPnl: 0,
      };

      const winRate = stats.tradeCount > 0
        ? (stats.winCount / stats.tradeCount) * 100
        : null;

      let profitFactor = null;
      if (stats.tradeCount > 0) {
        if (stats.grossLosingPnl === 0) {
          profitFactor = stats.grossWinningPnl > 0 ? 999 : 0; // Arbitrary high number if no losses
        } else {
          profitFactor = stats.grossWinningPnl / stats.grossLosingPnl;
        }
      }

      return {
        ...strategy,
        tradeCount: stats.tradeCount,
        totalPnl: stats.totalPnl,
        winRate: winRate !== null ? Number(winRate.toFixed(2)) : null,
        profitFactor: profitFactor !== null ? Number(profitFactor.toFixed(2)) : null
      };
    });

    return NextResponse.json({ data: strategiesWithStats });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { name, description, status, entry_rules, invalidation_conditions } = body;

    if (!name) {
      return NextResponse.json({ error: "Strategy name is required" }, { status: 400 });
    }

    const adminClient = createAdminClient();
    const { data, error } = await adminClient
      .from("strategies")
      .insert({
        user_id: user.id,
        name,
        description,
        status: status || "active",
        entry_rules,
        invalidation_conditions
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ data });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
