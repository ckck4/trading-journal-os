import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

// ─── GET /api/accounts/[id] ───────────────────────────────────────────────────
// Returns account details + earliest trading_day from daily_summaries.

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const admin = createAdminClient()

    const { data: account, error } = await admin
      .from('accounts')
      .select('id, name, broker, starting_balance, external_id')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (error || !account) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 })
    }

    // Fetch earliest trading day from daily_summaries for this account
    const { data: earliest } = await admin
      .from('daily_summaries')
      .select('trading_day')
      .eq('account_id', id)
      .eq('user_id', user.id)
      .order('trading_day', { ascending: true })
      .limit(1)
      .maybeSingle()

    const rawAccount = account as {
      id: string
      name: string
      broker: string
      starting_balance: string
      external_id: string | null
    }

    return NextResponse.json({
      account: {
        id: rawAccount.id,
        name: rawAccount.name,
        broker: rawAccount.broker,
        startingBalance: rawAccount.starting_balance,
        externalId: rawAccount.external_id,
      },
      earliestTradingDay: (earliest as { trading_day?: string } | null)?.trading_day ?? null,
    })
  } catch (error) {
    console.error('[accounts/[id] GET] error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// ─── PATCH /api/accounts/[id] ─────────────────────────────────────────────────
// Update name and/or starting_balance. Verifies ownership first.

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()
    const admin = createAdminClient()

    // Verify ownership
    const { data: existing, error: fetchErr } = await admin
      .from('accounts')
      .select('id')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (fetchErr || !existing) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 })
    }

    const updates: Record<string, unknown> = {}
    if (body.name !== undefined) updates.name = String(body.name).trim()
    if (body.startingBalance !== undefined) updates.starting_balance = body.startingBalance

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 })
    }

    const { data, error } = await admin
      .from('accounts')
      .update(updates)
      .eq('id', id)
      .select('id, name, broker, starting_balance')
      .single()

    if (error) {
      console.error('[accounts/[id] PATCH] update error:', error)
      return NextResponse.json({ error: 'Failed to update account' }, { status: 500 })
    }

    return NextResponse.json({ account: data })
  } catch (error) {
    console.error('[accounts/[id] PATCH] error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// ─── DELETE /api/accounts/[id] ────────────────────────────────────────────────
// Deletes account and all its associated data (cascade).

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const admin = createAdminClient()

    // 1. Verify ownership
    const { data: acc, error: accError } = await admin
      .from('accounts')
      .select('id')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (accError || !acc) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 })
    }

    // 2. Cascade delete manually via admin client
    await admin.from('daily_summaries').delete().eq('account_id', id)
    await admin.from('trades').delete().eq('account_id', id)
    await admin.from('fills').delete().eq('account_id', id)
    await admin.from('import_batches').delete().eq('account_id', id)

    // Check if account has an active evaluation, and delete if necessary or just let cascading happen if configured
    // Wait, the instructions specify exact order for these 5 tables.
    const { error: delError } = await admin.from('accounts').delete().eq('id', id)

    if (delError) {
      throw delError
    }

    return NextResponse.json({ success: true }, { status: 200 })
  } catch (error) {
    console.error('[accounts/[id] DELETE] error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
