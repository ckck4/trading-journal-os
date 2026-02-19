import { createAdminClient } from '@/lib/supabase/admin'

// Raw trade row shape returned from Supabase for recalc purposes
type TradeRow = {
  id: string
  net_pnl: string
  gross_pnl: string
  commission_total: string
  fees_total: string
  outcome: string | null
  r_multiple: string | null
  entry_qty: number
}

// Raw daily_summary row for cumulative pnl calculation
type DailySummaryRow = {
  net_pnl: string
}

/**
 * Recalculates and upserts the daily_summaries row for a given user/account/day.
 * Pure server function — caller must ensure auth before calling.
 * Uses adminClient internally (bypasses RLS — user_id always set explicitly).
 */
export async function recalcSummaries(
  userId: string,
  accountId: string,
  tradingDay: string // YYYY-MM-DD
): Promise<void> {
  const adminClient = createAdminClient()

  // 1. Query all closed trades for this day
  const { data: rows, error: tradesError } = await adminClient
    .from('trades')
    .select('id, net_pnl, gross_pnl, commission_total, fees_total, outcome, r_multiple, entry_qty')
    .eq('user_id', userId)
    .eq('account_id', accountId)
    .eq('trading_day', tradingDay)
    .eq('is_open', false)

  if (tradesError) {
    throw new Error(`[recalcSummaries] Failed to query trades: ${tradesError.message}`)
  }

  const trades = (rows ?? []) as TradeRow[]

  // 2. Compute metrics
  const tradeCount = trades.length
  const winCount = trades.filter((t) => t.outcome === 'WIN').length
  const lossCount = trades.filter((t) => t.outcome === 'LOSS').length
  const breakevenCount = trades.filter((t) => t.outcome === 'BE').length

  const grossPnl = trades.reduce((sum, t) => sum + parseFloat(t.gross_pnl ?? '0'), 0)
  const netPnl = trades.reduce((sum, t) => sum + parseFloat(t.net_pnl ?? '0'), 0)
  const commissionTotal = trades.reduce((sum, t) => sum + parseFloat(t.commission_total ?? '0'), 0)
  const feesTotal = trades.reduce((sum, t) => sum + parseFloat(t.fees_total ?? '0'), 0)

  const wins = trades
    .filter((t) => t.outcome === 'WIN')
    .map((t) => parseFloat(t.net_pnl ?? '0'))
  const losses = trades
    .filter((t) => t.outcome === 'LOSS')
    .map((t) => parseFloat(t.net_pnl ?? '0'))

  const sumWins = wins.reduce((a, b) => a + b, 0)
  const sumLosses = losses.reduce((a, b) => a + b, 0)

  const winRate = tradeCount > 0 ? (winCount / tradeCount) * 100 : null

  let profitFactor: number | null
  if (sumLosses < 0) {
    profitFactor = Math.abs(sumWins) / Math.abs(sumLosses)
  } else if (sumWins > 0) {
    profitFactor = 9999
  } else {
    profitFactor = null
  }

  const avgWin = wins.length > 0 ? sumWins / wins.length : null
  const avgLoss = losses.length > 0 ? sumLosses / losses.length : null
  const largestWin = wins.length > 0 ? Math.max(...wins) : null
  const largestLoss = losses.length > 0 ? Math.min(...losses) : null

  const rMultiples = trades
    .filter((t) => t.r_multiple != null)
    .map((t) => parseFloat(t.r_multiple!))

  const avgR =
    rMultiples.length > 0
      ? rMultiples.reduce((a, b) => a + b, 0) / rMultiples.length
      : null
  const totalR =
    rMultiples.length > 0 ? rMultiples.reduce((a, b) => a + b, 0) : null

  const maxContracts =
    trades.length > 0 ? Math.max(...trades.map((t) => t.entry_qty)) : null

  // 3. Compute cumulative_pnl using prior days' net_pnl
  const { data: priorRows, error: priorError } = await adminClient
    .from('daily_summaries')
    .select('net_pnl')
    .eq('user_id', userId)
    .eq('account_id', accountId)
    .lt('trading_day', tradingDay)
    .order('trading_day', { ascending: true })

  if (priorError) {
    throw new Error(`[recalcSummaries] Failed to query prior summaries: ${priorError.message}`)
  }

  const priorNetPnl = ((priorRows ?? []) as DailySummaryRow[]).reduce(
    (sum, row) => sum + parseFloat(row.net_pnl ?? '0'),
    0
  )
  const cumulativePnl = priorNetPnl + netPnl

  // 4. Upsert into daily_summaries — always include user_id explicitly
  const { error: upsertError } = await adminClient.from('daily_summaries').upsert(
    {
      user_id: userId,
      account_id: accountId,
      trading_day: tradingDay,
      trade_count: tradeCount,
      win_count: winCount,
      loss_count: lossCount,
      breakeven_count: breakevenCount,
      gross_pnl: grossPnl.toString(),
      net_pnl: netPnl.toString(),
      commission_total: commissionTotal.toString(),
      fees_total: feesTotal.toString(),
      win_rate: winRate !== null ? winRate.toString() : null,
      profit_factor: profitFactor !== null ? profitFactor.toString() : null,
      avg_win: avgWin !== null ? avgWin.toString() : null,
      avg_loss: avgLoss !== null ? avgLoss.toString() : null,
      largest_win: largestWin !== null ? largestWin.toString() : null,
      largest_loss: largestLoss !== null ? largestLoss.toString() : null,
      avg_r: avgR !== null ? avgR.toString() : null,
      total_r: totalR !== null ? totalR.toString() : null,
      max_contracts: maxContracts,
      cumulative_pnl: cumulativePnl.toString(),
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id,account_id,trading_day' }
  )

  if (upsertError) {
    throw new Error(`[recalcSummaries] Failed to upsert daily_summaries: ${upsertError.message}`)
  }
}
