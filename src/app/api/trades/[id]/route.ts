import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { recalcSummaries } from '@/lib/services/recalc-summaries'

// Allowed editable fields — never expose internal fields to mutation
const ALLOWED_FIELDS = ['notes', 'tradingview_link', 'strategy_id'] as const
type AllowedField = (typeof ALLOWED_FIELDS)[number]

type PatchBody = Partial<Record<AllowedField, string | null>>

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Auth
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: tradeId } = await params

    if (!tradeId) {
      return NextResponse.json({ error: 'Trade ID required' }, { status: 400 })
    }

    // Parse body
    let body: Record<string, unknown>
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
    }

    // Strip to only allowed fields
    const patch: PatchBody = {}
    for (const field of ALLOWED_FIELDS) {
      if (field in body) {
        const val = body[field]
        patch[field] = typeof val === 'string' ? val : null
      }
    }

    if (Object.keys(patch).length === 0) {
      return NextResponse.json(
        { error: 'No valid fields to update' },
        { status: 400 }
      )
    }

    const adminClient = createAdminClient()

    // Verify the trade belongs to this user (ownership check before update)
    const { data: existing, error: fetchError } = await adminClient
      .from('trades')
      .select('id, user_id')
      .eq('id', tradeId)
      .single()

    if (fetchError || !existing) {
      return NextResponse.json({ error: 'Trade not found' }, { status: 404 })
    }

    // Cast — justified: controlled query returning a known shape
    const existingTrade = existing as unknown as { id: string; user_id: string }

    if (existingTrade.user_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Apply update
    const { data: updated, error: updateError } = await adminClient
      .from('trades')
      .update({ ...patch, updated_at: new Date().toISOString() })
      .eq('id', tradeId)
      .select()
      .single()

    if (updateError) {
      console.error('[trades PATCH] update error:', updateError)
      return NextResponse.json({ error: 'Update failed' }, { status: 500 })
    }

    // Recalculate daily summary for the trade's day
    try {
      const { data: tradeForRecalc } = await adminClient
        .from('trades')
        .select('account_id, trading_day')
        .eq('id', tradeId)
        .single()
      if (tradeForRecalc) {
        const t = tradeForRecalc as unknown as { account_id: string; trading_day: string }
        await recalcSummaries(user.id, t.account_id, t.trading_day)
      }
    } catch (recalcErr) {
      console.error('[trades PATCH] recalc error (non-fatal):', recalcErr)
    }

    return NextResponse.json({ trade: updated })
  } catch (error) {
    console.error('[trades PATCH] error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
