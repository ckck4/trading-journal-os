import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import type { BreakdownEntry, AnalyticsBreakdowns } from '@/types/analytics'

type TradeRow = {
  root_symbol: string
  session_id: string | null
  strategy_id: string | null
  outcome: string | null
  net_pnl: string
  r_multiple: string | null
  duration_seconds: number | null
}

type SessionRow = {
  id: string
  name: string
}

type StrategyRow = {
  id: string
  name: string
}

function buildBreakdowns(
  trades: TradeRow[],
  groupKey: keyof Pick<TradeRow, 'root_symbol' | 'session_id' | 'strategy_id'>,
  labelMap: Map<string, string>
): BreakdownEntry[] {
  const groups = new Map<string, TradeRow[]>()

  for (const trade of trades) {
    const rawKey = trade[groupKey] ?? null
    const key = rawKey ?? 'unassigned'
    if (!groups.has(key)) {
      groups.set(key, [])
    }
    groups.get(key)!.push(trade)
  }

  const entries: BreakdownEntry[] = []

  for (const [key, groupTrades] of groups) {
    const wins = groupTrades.filter((t) => t.outcome === 'WIN').length
    const losses = groupTrades.filter((t) => t.outcome === 'LOSS').length
    const breakevens = groupTrades.filter((t) => t.outcome === 'BE').length
    const netPnl = groupTrades.reduce((sum, t) => sum + parseFloat(t.net_pnl ?? '0'), 0)

    const total = wins + losses + breakevens
    const winRate = total > 0 ? (wins / total) * 100 : null

    const label =
      key === 'unassigned' ? 'Unassigned' : (labelMap.get(key) ?? key)

    entries.push({
      key,
      label,
      wins,
      losses,
      breakevens,
      netPnl,
      winRate,
    })
  }

  // Sort by net_pnl descending
  entries.sort((a, b) => b.netPnl - a.netPnl)

  return entries
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
      const empty: AnalyticsBreakdowns = {
        byInstrument: [],
        bySession: [],
        byStrategy: [],
        rMultiples: [],
        durations: [],
      }
      return NextResponse.json({ breakdowns: empty })
    }

    const adminClient = createAdminClient()

    // Query trades directly
    let query = adminClient
      .from('trades')
      .select(
        'root_symbol, session_id, strategy_id, outcome, net_pnl, r_multiple, duration_seconds'
      )
      .eq('user_id', user.id)
      .eq('account_id', accountId)
      .eq('is_open', false)

    if (from) query = query.gte('trading_day', from)
    if (to) query = query.lte('trading_day', to)

    const { data: tradeRows, error: tradesError } = await query

    if (tradesError) {
      console.error('[analytics/breakdowns] trades query error:', tradesError)
      return NextResponse.json({ error: 'Failed to query trades' }, { status: 500 })
    }

    const trades = (tradeRows ?? []) as TradeRow[]

    // Collect unique session_ids and strategy_ids for name lookups
    const sessionIds = [
      ...new Set(trades.map((t) => t.session_id).filter((id): id is string => id != null)),
    ]
    const strategyIds = [
      ...new Set(trades.map((t) => t.strategy_id).filter((id): id is string => id != null)),
    ]

    // Fetch session names
    const sessionLabelMap = new Map<string, string>()
    if (sessionIds.length > 0) {
      const { data: sessionRows, error: sessionsError } = await adminClient
        .from('sessions')
        .select('id, name')
        .in('id', sessionIds)

      if (sessionsError) {
        console.error('[analytics/breakdowns] sessions query error:', sessionsError)
      } else {
        for (const s of (sessionRows ?? []) as SessionRow[]) {
          sessionLabelMap.set(s.id, s.name)
        }
      }
    }

    // Fetch strategy names
    const strategyLabelMap = new Map<string, string>()
    if (strategyIds.length > 0) {
      const { data: strategyRows, error: strategiesError } = await adminClient
        .from('strategies')
        .select('id, name')
        .in('id', strategyIds)

      if (strategiesError) {
        console.error('[analytics/breakdowns] strategies query error:', strategiesError)
      } else {
        for (const s of (strategyRows ?? []) as StrategyRow[]) {
          strategyLabelMap.set(s.id, s.name)
        }
      }
    }

    // Build breakdowns
    // root_symbol label map: use root_symbol as label directly
    const symbolLabelMap = new Map<string, string>()
    for (const t of trades) {
      if (t.root_symbol) symbolLabelMap.set(t.root_symbol, t.root_symbol)
    }

    const byInstrument = buildBreakdowns(trades, 'root_symbol', symbolLabelMap)
    const bySession = buildBreakdowns(trades, 'session_id', sessionLabelMap)
    const byStrategy = buildBreakdowns(trades, 'strategy_id', strategyLabelMap)

    // R-multiples array (non-null values)
    const rMultiples = trades
      .filter((t) => t.r_multiple != null)
      .map((t) => parseFloat(t.r_multiple!))

    // Durations array (non-null values, in seconds)
    const durations = trades
      .filter((t) => t.duration_seconds != null)
      .map((t) => t.duration_seconds!)

    const breakdowns: AnalyticsBreakdowns = {
      byInstrument,
      bySession,
      byStrategy,
      rMultiples,
      durations,
    }

    return NextResponse.json({ breakdowns })
  } catch (error) {
    console.error('[analytics/breakdowns] error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
