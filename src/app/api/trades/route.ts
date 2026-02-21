import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import type { Trade } from '@/types/trades'

// Raw DB row types for type-safe casting (no generated schema file available)
type RawFillRow = {
  id: string
  fill_time: string
  side: string
  quantity: number
  price: string
  commission: string | null
}

type RawTagRow = {
  id: string
  name: string
  color: string | null
}

type RawTradeTagRow = {
  tags: RawTagRow | null
}

type RawTradeRow = {
  id: string
  account_id: string
  instrument_id: string | null
  root_symbol: string
  trading_day: string
  entry_time: string
  exit_time: string | null
  duration_seconds: number | null
  session_id: string | null
  side: string
  entry_qty: number
  exit_qty: number
  avg_entry_price: string
  avg_exit_price: string | null
  is_open: boolean
  gross_pnl: string
  commission_total: string
  fees_total: string
  net_pnl: string
  r_multiple: string | null
  strategy_id: string | null
  outcome: string | null
  notes: string | null
  tradingview_link: string | null
  fills: RawFillRow[]
  trade_tags: RawTradeTagRow[]
}

export async function GET(request: NextRequest) {
  try {
    // Auth — verify session via server client
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const adminClient = createAdminClient()
    const { searchParams } = new URL(request.url)

    const accountId = searchParams.get('account_id')
    const dateFrom = searchParams.get('date_from')
    const dateTo = searchParams.get('date_to')
    const instrument = searchParams.get('instrument')
    const strategyId = searchParams.get('strategy_id')
    const sessionId = searchParams.get('session_id')

    // Build query — all trades for this user with embedded fills + tags
    let query = adminClient
      .from('trades')
      .select(
        `id,
        account_id,
        instrument_id,
        root_symbol,
        trading_day,
        entry_time,
        exit_time,
        duration_seconds,
        session_id,
        side,
        entry_qty,
        exit_qty,
        avg_entry_price,
        avg_exit_price,
        is_open,
        gross_pnl,
        commission_total,
        fees_total,
        net_pnl,
        r_multiple,
        strategy_id,
        outcome,
        notes,
        tradingview_link,
        fills(id, fill_time, side, quantity, price, commission),
        trade_tags(tags(id, name, color))`
      )
      .eq('user_id', user.id)
      .order('trading_day', { ascending: false })
      .order('entry_time', { ascending: false })

    // Apply optional filters
    if (accountId) query = query.eq('account_id', accountId)
    if (dateFrom) query = query.gte('trading_day', dateFrom)
    if (dateTo) query = query.lte('trading_day', dateTo)
    if (instrument) query = query.eq('root_symbol', instrument)
    if (strategyId) query = query.eq('strategy_id', strategyId)
    if (sessionId) query = query.eq('session_id', sessionId)

    const { data, error } = await query

    if (error) {
      console.error('[trades GET] query error:', error)
      return NextResponse.json({ error: 'Failed to fetch trades' }, { status: 500 })
    }

    // Cast to known shape — justified: we control the select and schema
    const rawRows = (data ?? []) as unknown as RawTradeRow[]

    const trades: Trade[] = rawRows.map((t) => ({
      id: t.id,
      accountId: t.account_id,
      instrumentId: t.instrument_id,
      rootSymbol: t.root_symbol,
      tradingDay: t.trading_day,
      entryTime: t.entry_time,
      exitTime: t.exit_time,
      durationSeconds: t.duration_seconds,
      sessionId: t.session_id,
      side: t.side,
      entryQty: t.entry_qty,
      exitQty: t.exit_qty,
      avgEntryPrice: t.avg_entry_price,
      avgExitPrice: t.avg_exit_price,
      isOpen: t.is_open,
      grossPnl: t.gross_pnl,
      commissionTotal: t.commission_total,
      feesTotal: t.fees_total,
      netPnl: t.net_pnl,
      rMultiple: t.r_multiple,
      strategyId: t.strategy_id,
      outcome: t.outcome,
      notes: t.notes,
      tradingviewLink: t.tradingview_link,
      fillsCount: (t.fills ?? []).length,
      fills: (t.fills ?? [])
        .sort(
          (a, b) =>
            new Date(a.fill_time).getTime() - new Date(b.fill_time).getTime()
        )
        .map((f) => ({
          id: f.id,
          fillTime: f.fill_time,
          side: f.side,
          quantity: f.quantity,
          price: f.price,
          commission: f.commission,
        })),
      tags: (t.trade_tags ?? []).flatMap((tt) =>
        tt.tags
          ? [{ id: tt.tags.id, name: tt.tags.name, color: tt.tags.color }]
          : []
      ),
    }))

    return NextResponse.json({ trades })
  } catch (error) {
    console.error('[trades GET] error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
