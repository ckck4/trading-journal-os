import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import type { DayResult } from '@/types/analytics'

type DailySummaryRow = {
  trading_day: string
  trade_count: number
  win_count: number
  loss_count: number
  breakeven_count: number
  net_pnl: string
  gross_pnl: string
  commission_total: string
  win_rate: string | null
  profit_factor: string | null
  avg_r: string | null
  cumulative_pnl: string
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
      return NextResponse.json({ days: [] })
    }

    const adminClient = createAdminClient()

    let query = adminClient
      .from('daily_summaries')
      .select(
        'trading_day, trade_count, win_count, loss_count, breakeven_count, net_pnl, gross_pnl, commission_total, win_rate, profit_factor, avg_r, cumulative_pnl'
      )
      .eq('user_id', user.id)
      .eq('account_id', accountId)
      .order('trading_day', { ascending: true })

    if (from) query = query.gte('trading_day', from)
    if (to) query = query.lte('trading_day', to)

    const { data: rows, error: queryError } = await query

    if (queryError) {
      console.error('[analytics/daily] query error:', queryError)
      return NextResponse.json({ error: 'Failed to query daily summaries' }, { status: 500 })
    }

    const summaries = (rows ?? []) as DailySummaryRow[]

    const days: DayResult[] = summaries.map((r) => ({
      tradingDay: r.trading_day,
      tradeCount: r.trade_count ?? 0,
      winCount: r.win_count ?? 0,
      lossCount: r.loss_count ?? 0,
      breakevenCount: r.breakeven_count ?? 0,
      netPnl: parseFloat(r.net_pnl ?? '0'),
      grossPnl: parseFloat(r.gross_pnl ?? '0'),
      commissionTotal: parseFloat(r.commission_total ?? '0'),
      winRate: r.win_rate != null ? parseFloat(r.win_rate) : null,
      profitFactor: r.profit_factor != null ? parseFloat(r.profit_factor) : null,
      avgR: r.avg_r != null ? parseFloat(r.avg_r) : null,
      cumulativePnl: parseFloat(r.cumulative_pnl ?? '0'),
    }))

    return NextResponse.json({ days })
  } catch (error) {
    console.error('[analytics/daily] error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
