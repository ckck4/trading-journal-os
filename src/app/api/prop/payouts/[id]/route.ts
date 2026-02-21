import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

// ─── PATCH /api/prop/payouts/[id] ────────────────────────────────────────────
// Update payout status (pending → paid) or notes.

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
    const { status, paidAt, notes } = body

    const admin = createAdminClient()

    // Verify ownership
    const { data: existing, error: fetchErr } = await admin
      .from('payouts')
      .select('id')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (fetchErr || !existing) {
      return NextResponse.json({ error: 'Payout not found' }, { status: 404 })
    }

    const updates: Record<string, unknown> = {}
    if (status !== undefined) updates.status = status
    if (paidAt !== undefined) updates.paid_at = paidAt
    if (notes !== undefined) updates.notes = notes

    // Auto-set paid_at when marking as paid
    if (status === 'paid' && paidAt === undefined) {
      updates.paid_at = new Date().toISOString()
    }

    const { data, error } = await admin
      .from('payouts')
      .update(updates)
      .eq('id', id)
      .select(
        `*,
        prop_evaluations(id, stage, account_id, accounts(name))`
      )
      .single()

    if (error) {
      console.error('[prop/payouts PATCH] update error:', error)
      return NextResponse.json({ error: 'Failed to update payout' }, { status: 500 })
    }

    return NextResponse.json({ payout: data })
  } catch (error) {
    console.error('[prop/payouts PATCH] error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// ─── DELETE /api/prop/payouts/[id] ───────────────────────────────────────────

export async function DELETE(
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

    const { error } = await admin
      .from('payouts')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)

    if (error) {
      console.error('[prop/payouts DELETE] error:', error)
      return NextResponse.json({ error: 'Failed to delete payout' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[prop/payouts DELETE] error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
