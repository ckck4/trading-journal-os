import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

type RawSessionRow = {
  id: string
  name: string
  start_time: string
  end_time: string
}

export type SessionOption = {
  id: string
  name: string
  startTime: string
  endTime: string
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
      .from('sessions')
      .select('id, name, start_time, end_time')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .order('sort_order', { ascending: true })

    if (error) {
      console.error('[sessions GET] query error:', error)
      return NextResponse.json({ error: 'Failed to fetch sessions' }, { status: 500 })
    }

    const rawRows = (data ?? []) as unknown as RawSessionRow[]

    const sessions: SessionOption[] = rawRows.map((s) => ({
      id: s.id,
      name: s.name,
      startTime: s.start_time,
      endTime: s.end_time,
    }))

    return NextResponse.json({ sessions })
  } catch (error) {
    console.error('[sessions GET] error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
