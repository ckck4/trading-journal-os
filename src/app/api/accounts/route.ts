import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

type RawAccountRow = {
  id: string
  name: string
  broker: string
  external_id: string | null
  starting_balance: string
  trades?: { count: number }[]
}

export type AccountOption = {
  id: string
  name: string
  broker: string
  externalId: string | null
  startingBalance: string
  tradeCount: number
}

export async function GET() {
  try {
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const adminClient = createAdminClient()

    const { data, error } = await adminClient
      .from('accounts')
      .select('id, name, broker, external_id, starting_balance, trades(count)')
      .eq('user_id', user.id)
      .eq('is_archived', false)
      .order('name', { ascending: true })

    if (error) {
      console.error('[accounts GET] query error:', error)
      return NextResponse.json({ error: 'Failed to fetch accounts' }, { status: 500 })
    }

    const rawRows = (data ?? []) as unknown as RawAccountRow[]

    const accounts: AccountOption[] = rawRows.map((a) => {
      const tradesCountObj = Array.isArray(a.trades) ? a.trades[0] : a.trades
      const tradeCount = tradesCountObj && typeof tradesCountObj === 'object' && 'count' in tradesCountObj
        ? Number(tradesCountObj.count)
        : 0
      return {
        id: a.id,
        name: a.name,
        broker: a.broker,
        externalId: a.external_id,
        startingBalance: a.starting_balance,
        tradeCount,
      }
    })

    return NextResponse.json({ accounts })
  } catch (error) {
    console.error('[accounts GET] error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
