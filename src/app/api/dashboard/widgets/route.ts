import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { evaluateRules } from '@/lib/services/prop-rule-engine'
import type { WidgetData, BalanceData, DailyPnlData, WinRateData } from '@/types/dashboard'
import { migrateRulesJson } from '@/lib/prop-migrate'

// ─── GET /api/dashboard/widgets ───────────────────────────────────────────────
// Runs all 7 widget queries in parallel. Returns single WidgetData object.
// Query params: accountId, from, to

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const accountId = searchParams.get('accountId')
    const today = new Date().toISOString().split('T')[0]
    const thirtyDaysAgo = new Date(Date.now() - 29 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split('T')[0]
    const from = searchParams.get('from') ?? thirtyDaysAgo
    const to = searchParams.get('to') ?? today

    if (!accountId) {
      return NextResponse.json({ error: 'accountId is required' }, { status: 400 })
    }

    const admin = createAdminClient()

    // ─── Parallel queries ────────────────────────────────────────────────────
    const [
      accountResult,
      latestSummaryResult,
      equitySummariesResult,
      todaySummaryResult,
      rangeSummariesResult,
      activeEvalResult,
      recentTradesResult,
      goalsResult,
    ] = await Promise.all([
      // 1. Account info
      admin
        .from('accounts')
        .select('id, name, starting_balance')
        .eq('id', accountId)
        .eq('user_id', user.id)
        .single(),

      // 2. Latest daily_summary for cumulative_pnl (current balance)
      admin
        .from('daily_summaries')
        .select('cumulative_pnl, net_pnl')
        .eq('account_id', accountId)
        .eq('user_id', user.id)
        .order('trading_day', { ascending: false })
        .limit(1),

      // 3. Last 30 days for equity curve
      admin
        .from('daily_summaries')
        .select('trading_day, cumulative_pnl')
        .eq('account_id', accountId)
        .eq('user_id', user.id)
        .gte('trading_day', thirtyDaysAgo)
        .lte('trading_day', today)
        .order('trading_day', { ascending: true }),

      // 4. Today's daily_summary
      admin
        .from('daily_summaries')
        .select('net_pnl, trade_count, win_count, loss_count')
        .eq('account_id', accountId)
        .eq('user_id', user.id)
        .eq('trading_day', today)
        .limit(1),

      // 5. Range daily_summaries for win rate widget
      admin
        .from('daily_summaries')
        .select('trade_count, win_count, loss_count, net_pnl, avg_win, avg_loss, profit_factor')
        .eq('account_id', accountId)
        .eq('user_id', user.id)
        .gte('trading_day', from)
        .lte('trading_day', to),

      // 6. Active evaluation for this account (with template for drawdown threshold)
      admin
        .from('prop_evaluations')
        .select('id, max_drawdown, template_id, prop_templates(rules_json)')
        .eq('account_id', accountId)
        .eq('user_id', user.id)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(1),

      // 7. Recent 5 trades
      admin
        .from('trades')
        .select('id, root_symbol, side, net_pnl, entry_time')
        .eq('account_id', accountId)
        .eq('user_id', user.id)
        .eq('is_open', false)
        .order('entry_time', { ascending: false })
        .limit(5),

      // 8. Active goals (user-scoped)
      admin
        .from('goals')
        .select('id, name, metric, current_value, target_value, target_operator')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .order('created_at', { ascending: true }),
    ])

    // ─── Balance widget ───────────────────────────────────────────────────────
    let balance: BalanceData | null = null

    if (!accountResult.error && accountResult.data) {
      const startingBalance = parseFloat(accountResult.data.starting_balance as string ?? '0')
      const latestRows = latestSummaryResult.data ?? []
      const latestRow = latestRows.length > 0 ? latestRows[0] : null
      const cumulativePnl = latestRow ? parseFloat(latestRow.cumulative_pnl as string ?? '0') : 0
      const currentBalance = startingBalance + cumulativePnl

      // Worst day across range for drawdown indicator
      const rangeRows = equitySummariesResult.data ?? []
      const dailyPnls = (rangeSummariesResult.data ?? []).map((r) =>
        parseFloat(r.net_pnl as string ?? '0')
      )
      const maxDailyLoss = dailyPnls.length > 0 ? Math.min(...dailyPnls) : 0

      // Drawdown threshold from active eval template
      let maxDailyLossThreshold: number | null = null
      const activeEvals = activeEvalResult.data ?? []
      if (activeEvals.length > 0) {
        const evalRow = activeEvals[0] as {
          max_drawdown: string
          stage?: string
          prop_templates?: { rules_json?: unknown } | null
        }
        const tmpl = evalRow.prop_templates
        if (tmpl?.rules_json) {
          const migrated = migrateRulesJson(tmpl.rules_json)
          const stage = evalRow.stage ?? 'evaluation'
          const stageRules = migrated.stages.find((s) => s.key === stage) ?? migrated.stages[0]
          if (stageRules?.rules?.maxDailyLoss != null) {
            maxDailyLossThreshold = stageRules.rules.maxDailyLoss
          }
        }
      }

      // Suppress unused var warning
      void rangeRows

      balance = {
        startingBalance,
        currentBalance,
        netPnl: cumulativePnl,
        maxDailyLoss,
        maxDailyLossThreshold,
      }
    }

    // ─── Equity curve ─────────────────────────────────────────────────────────
    const equityCurve = (equitySummariesResult.data ?? []).map((r) => ({
      date: r.trading_day as string,
      value: parseFloat(r.cumulative_pnl as string ?? '0'),
    }))

    // ─── Daily P&L widget ─────────────────────────────────────────────────────
    let dailyPnl: DailyPnlData | null = null
    const todayRows = todaySummaryResult.data ?? []
    if (todayRows.length > 0) {
      const t = todayRows[0]
      dailyPnl = {
        netPnl: parseFloat(t.net_pnl as string ?? '0'),
        tradeCount: (t.trade_count as number) ?? 0,
        winCount: (t.win_count as number) ?? 0,
        lossCount: (t.loss_count as number) ?? 0,
      }
    }

    // ─── Win rate widget ──────────────────────────────────────────────────────
    let winRate: WinRateData | null = null
    const rangeRows = rangeSummariesResult.data ?? []
    if (rangeRows.length > 0) {
      const totalTrades = rangeRows.reduce(
        (sum, r) => sum + ((r.trade_count as number) ?? 0),
        0
      )
      const totalWins = rangeRows.reduce(
        (sum, r) => sum + ((r.win_count as number) ?? 0),
        0
      )
      const wr = totalTrades > 0 ? (totalWins / totalTrades) * 100 : 0

      const totalWinPnl = rangeRows.reduce(
        (sum, r) =>
          sum +
          ((r.avg_win != null ? parseFloat(r.avg_win as string) * (r.win_count as number) : 0)),
        0
      )
      const totalLossPnl = rangeRows.reduce(
        (sum, r) =>
          sum +
          ((r.avg_loss != null
            ? parseFloat(r.avg_loss as string) * (r.loss_count as number)
            : 0)),
        0
      )
      const pf =
        totalLossPnl < 0
          ? Math.abs(totalWinPnl) / Math.abs(totalLossPnl)
          : totalWinPnl > 0
          ? 9999
          : 0

      winRate = { winRate: wr, totalTrades, profitFactor: pf }
    }

    // ─── Prop rules widget ────────────────────────────────────────────────────
    let propRules = null
    const activeEvals = activeEvalResult.data ?? []
    if (activeEvals.length > 0) {
      const activeEval = activeEvals[0] as { id: string; max_drawdown: string }
      try {
        propRules = await evaluateRules(accountId, activeEval.id)
      } catch {
        // Non-fatal — widget shows empty state
      }
    }

    // ─── Recent trades ────────────────────────────────────────────────────────
    const recentTrades = (recentTradesResult.data ?? []).map((t) => ({
      id: t.id as string,
      instrument: t.root_symbol as string,
      side: t.side as string,
      netPnl: parseFloat(t.net_pnl as string ?? '0'),
      entryTime: t.entry_time as string,
    }))

    // ─── Goals ───────────────────────────────────────────────────────────────
    const goals = (goalsResult.data ?? []).map((g) => {
      const current = parseFloat(g.current_value as string ?? '0')
      const target = parseFloat(g.target_value as string ?? '1')
      const progress = Math.min(100, Math.max(0, Math.round((Math.max(0, current) / target) * 100)))
      return {
        id: g.id as string,
        name: g.name as string,
        metric: g.metric as string,
        currentValue: current,
        targetValue: target,
        progress,
        targetOperator: g.target_operator as string,
      }
    })

    const widgetData: WidgetData = {
      balance,
      equityCurve,
      dailyPnl,
      winRate,
      propRules,
      recentTrades,
      goals,
    }

    return NextResponse.json({ widgets: widgetData })
  } catch (error) {
    console.error('[dashboard/widgets GET] error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
