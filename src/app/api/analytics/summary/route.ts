import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import type { AnalyticsSummary } from '@/types/analytics'

type DailySummaryRow = {
  trading_day: string
  trade_count: number
  win_count: number
  loss_count: number
  breakeven_count: number
  net_pnl: string
  gross_pnl: string
  win_rate: string | null
  profit_factor: string | null
  avg_win: string | null
  avg_loss: string | null
  largest_win: string | null
  largest_loss: string | null
  avg_r: string | null
}

const EMPTY_SUMMARY: AnalyticsSummary = {
  netPnl: 0,
  winRate: 0,
  profitFactor: 0,
  avgR: 0,
  totalTrades: 0,
  winCount: 0,
  lossCount: 0,
  avgWinner: 0,
  avgLoser: 0,
  largestWin: 0,
  largestLoss: 0,
  bestDay: null,
  worstDay: null,
}

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
    const from = searchParams.get('from')
    const to = searchParams.get('to')

    if (!accountId) {
      return NextResponse.json({ summary: EMPTY_SUMMARY })
    }

    const adminClient = createAdminClient()

    let query = adminClient
      .from('daily_summaries')
      .select(
        'trading_day, trade_count, win_count, loss_count, breakeven_count, net_pnl, gross_pnl, win_rate, profit_factor, avg_win, avg_loss, largest_win, largest_loss, avg_r'
      )
      .eq('user_id', user.id)
      .eq('account_id', accountId)

    if (from) query = query.gte('trading_day', from)
    if (to) query = query.lte('trading_day', to)

    const { data: rows, error: queryError } = await query

    if (queryError) {
      console.error('[analytics/summary] query error:', queryError)
      return NextResponse.json({ error: 'Failed to query summaries' }, { status: 500 })
    }

    const summaries = (rows ?? []) as DailySummaryRow[]

    if (summaries.length === 0) {
      return NextResponse.json({ summary: EMPTY_SUMMARY })
    }

    // Aggregate metrics across all days in range
    const totalTrades = summaries.reduce((sum, r) => sum + (r.trade_count ?? 0), 0)
    const winCount = summaries.reduce((sum, r) => sum + (r.win_count ?? 0), 0)
    const lossCount = summaries.reduce((sum, r) => sum + (r.loss_count ?? 0), 0)
    const netPnl = summaries.reduce((sum, r) => sum + parseFloat(r.net_pnl ?? '0'), 0)

    const winRate = totalTrades > 0 ? (winCount / totalTrades) * 100 : 0

    // Profit factor: sum all positive net_pnl days as "wins", negative as "losses"
    // Actually aggregate from win/loss pnl via avg_win/avg_loss * counts
    const totalWinPnl = summaries.reduce(
      (sum, r) => sum + (r.avg_win != null ? parseFloat(r.avg_win) * r.win_count : 0),
      0
    )
    const totalLossPnl = summaries.reduce(
      (sum, r) => sum + (r.avg_loss != null ? parseFloat(r.avg_loss) * r.loss_count : 0),
      0
    )
    const profitFactor =
      totalLossPnl < 0 ? Math.abs(totalWinPnl) / Math.abs(totalLossPnl) : totalWinPnl > 0 ? 9999 : 0

    // Weighted avg R across days (weighted by trade_count)
    let totalWeightedR = 0
    let totalRWeight = 0
    for (const r of summaries) {
      if (r.avg_r != null) {
        totalWeightedR += parseFloat(r.avg_r) * r.trade_count
        totalRWeight += r.trade_count
      }
    }
    const avgR = totalRWeight > 0 ? totalWeightedR / totalRWeight : 0

    // Average winner / loser
    const totalWins = winCount
    const totalLosses = lossCount
    const avgWinner = totalWins > 0 ? totalWinPnl / totalWins : 0
    const avgLoser = totalLosses > 0 ? totalLossPnl / totalLosses : 0

    // Largest win / loss across all days
    const largestWinValues = summaries
      .filter((r) => r.largest_win != null)
      .map((r) => parseFloat(r.largest_win!))
    const largestLossValues = summaries
      .filter((r) => r.largest_loss != null)
      .map((r) => parseFloat(r.largest_loss!))

    const largestWin = largestWinValues.length > 0 ? Math.max(...largestWinValues) : 0
    const largestLoss = largestLossValues.length > 0 ? Math.min(...largestLossValues) : 0

    // Best / worst day by net_pnl
    let bestDay: { date: string; netPnl: number } | null = null
    let worstDay: { date: string; netPnl: number } | null = null

    for (const r of summaries) {
      const dayPnl = parseFloat(r.net_pnl ?? '0')
      if (bestDay === null || dayPnl > bestDay.netPnl) {
        bestDay = { date: r.trading_day, netPnl: dayPnl }
      }
      if (worstDay === null || dayPnl < worstDay.netPnl) {
        worstDay = { date: r.trading_day, netPnl: dayPnl }
      }
    }

    const summary: AnalyticsSummary = {
      netPnl,
      winRate,
      profitFactor,
      avgR,
      totalTrades,
      winCount,
      lossCount,
      avgWinner,
      avgLoser,
      largestWin,
      largestLoss,
      bestDay,
      worstDay,
    }

    return NextResponse.json({ summary })
  } catch (error) {
    console.error('[analytics/summary] error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
