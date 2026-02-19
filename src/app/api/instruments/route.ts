import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

type RawInstrumentRow = {
  id: string
  root_symbol: string
  display_name: string
}

export type InstrumentOption = {
  id: string
  rootSymbol: string
  displayName: string
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
      .from('instruments')
      .select('id, root_symbol, display_name')
      .eq('user_id', user.id)
      .order('root_symbol', { ascending: true })

    if (error) {
      console.error('[instruments GET] query error:', error)
      return NextResponse.json({ error: 'Failed to fetch instruments' }, { status: 500 })
    }

    const rawRows = (data ?? []) as unknown as RawInstrumentRow[]

    const instruments: InstrumentOption[] = rawRows.map((i) => ({
      id: i.id,
      rootSymbol: i.root_symbol,
      displayName: i.display_name,
    }))

    return NextResponse.json({ instruments })
  } catch (error) {
    console.error('[instruments GET] error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
