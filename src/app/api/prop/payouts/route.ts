import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

// ─── GET /api/prop/payouts ────────────────────────────────────────────────────
// List all payouts for the user (joined with evaluation + account info).

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

    const admin = createAdminClient()

    const { data, error } = await admin
      .from('payouts')
      .select(
        `*,
        prop_evaluations(id, stage, account_id, accounts(name))`
      )
      .eq('user_id', user.id)
      .order('requested_at', { ascending: false })

    if (error) {
      console.error('[prop/payouts GET] query error:', error)
      return NextResponse.json({ error: 'Failed to fetch payouts' }, { status: 500 })
    }

    return NextResponse.json({ payouts: data ?? [] })
  } catch (error) {
    console.error('[prop/payouts GET] error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// ─── POST /api/prop/payouts ───────────────────────────────────────────────────
// Log a new payout for an evaluation.

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

    const body = await request.json()
    const { evaluationId, amount, status, requestedAt, notes } = body

    if (!evaluationId || !amount) {
      return NextResponse.json(
        { error: 'evaluationId and amount are required' },
        { status: 400 }
      )
    }

    const admin = createAdminClient()

    // Verify evaluation belongs to user
    const { data: evalData, error: evalErr } = await admin
      .from('prop_evaluations')
      .select('id')
      .eq('id', evaluationId)
      .eq('user_id', user.id)
      .single()

    if (evalErr || !evalData) {
      return NextResponse.json({ error: 'Evaluation not found' }, { status: 404 })
    }

    // Get next payout number for this evaluation
    const { data: existing } = await admin
      .from('payouts')
      .select('payout_number')
      .eq('evaluation_id', evaluationId)
      .order('payout_number', { ascending: false })
      .limit(1)

    const nextNum = existing && existing.length > 0 ? (existing[0].payout_number as number) + 1 : 1

    const { data, error } = await admin
      .from('payouts')
      .insert({
        user_id: user.id,
        evaluation_id: evaluationId,
        amount: amount.toString(),
        payout_number: nextNum,
        status: status ?? 'pending',
        requested_at: requestedAt ?? new Date().toISOString(),
        notes: notes ?? null,
      })
      .select(
        `*,
        prop_evaluations(id, stage, account_id, accounts(name))`
      )
      .single()

    if (error) {
      console.error('[prop/payouts POST] insert error:', error)
      return NextResponse.json({ error: 'Failed to log payout' }, { status: 500 })
    }

    return NextResponse.json({ payout: data }, { status: 201 })
  } catch (error) {
    console.error('[prop/payouts POST] error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
