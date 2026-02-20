import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

// ─── PATCH /api/prop/evaluations/[id] ────────────────────────────────────────
// Update stage progression, status, dates. Used for "Advance Stage" button.

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
      .from('prop_evaluations')
      .select('id, stage, status')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (fetchErr || !existing) {
      return NextResponse.json({ error: 'Evaluation not found' }, { status: 404 })
    }

    const { stage, status, endDate, startDate } = body
    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }

    if (stage !== undefined) updates.stage = stage
    if (status !== undefined) updates.status = status
    if (endDate !== undefined) updates.end_date = endDate
    if (startDate !== undefined) updates.start_date = startDate

    const { data, error } = await admin
      .from('prop_evaluations')
      .update(updates)
      .eq('id', id)
      .select(
        `*,
        accounts(id, name, broker, starting_balance),
        prop_templates(id, template_name, firm_name, rules_json)`
      )
      .single()

    if (error) {
      console.error('[prop/evaluations PATCH] update error:', error)
      return NextResponse.json({ error: 'Failed to update evaluation' }, { status: 500 })
    }

    return NextResponse.json({ evaluation: data })
  } catch (error) {
    console.error('[prop/evaluations PATCH] error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// ─── DELETE /api/prop/evaluations/[id] ───────────────────────────────────────

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
      .from('prop_evaluations')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)

    if (error) {
      console.error('[prop/evaluations DELETE] error:', error)
      return NextResponse.json({ error: 'Failed to delete evaluation' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[prop/evaluations DELETE] error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
