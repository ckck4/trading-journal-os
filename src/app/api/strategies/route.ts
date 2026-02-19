import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import type { Strategy } from '@/types/trades'

type RawStrategyRow = {
  id: string
  name: string
  is_active: boolean
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
      .from('strategies')
      .select('id, name, is_active')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .order('name', { ascending: true })

    if (error) {
      console.error('[strategies GET] query error:', error)
      return NextResponse.json({ error: 'Failed to fetch strategies' }, { status: 500 })
    }

    const rawRows = (data ?? []) as unknown as RawStrategyRow[]

    const strategies: Strategy[] = rawRows.map((s) => ({
      id: s.id,
      name: s.name,
      isActive: s.is_active,
    }))

    return NextResponse.json({ strategies })
  } catch (error) {
    console.error('[strategies GET] error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
