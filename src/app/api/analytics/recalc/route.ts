import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { recalcSummaries } from '@/lib/services/recalc-summaries'

type TradingDayRow = {
  trading_day: string
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    let body: Record<string, unknown>
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
    }

    const accountId = body.accountId
    if (!accountId || typeof accountId !== 'string') {
      return NextResponse.json({ error: 'accountId is required' }, { status: 400 })
    }

    const adminClient = createAdminClient()

    // Query all distinct trading_days for this user+account
    const { data: rows, error: daysError } = await adminClient
      .from('trades')
      .select('trading_day')
      .eq('user_id', user.id)
      .eq('account_id', accountId)

    if (daysError) {
      console.error('[analytics/recalc] error querying trading days:', daysError)
      return NextResponse.json({ error: 'Failed to query trading days' }, { status: 500 })
    }

    // Deduplicate trading_days
    const allDays = (rows ?? []) as TradingDayRow[]
    const uniqueDays = [...new Set(allDays.map((r) => r.trading_day))].sort()

    // Recalculate summaries for each day sequentially
    for (const day of uniqueDays) {
      await recalcSummaries(user.id, accountId, day)
    }

    return NextResponse.json({ recomputed: uniqueDays.length })
  } catch (error) {
    console.error('[analytics/recalc] error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
