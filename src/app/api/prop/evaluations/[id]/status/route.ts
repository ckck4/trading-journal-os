import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { evaluateRules } from '@/lib/services/prop-rule-engine'

// ─── GET /api/prop/evaluations/[id]/status ────────────────────────────────────
// Run evaluateRules() and return live rule status for an evaluation.

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

    // Fetch evaluation to verify ownership and get accountId
    const { data: evalData, error: fetchErr } = await admin
      .from('prop_evaluations')
      .select('id, account_id, user_id')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (fetchErr || !evalData) {
      return NextResponse.json({ error: 'Evaluation not found' }, { status: 404 })
    }

    const result = await evaluateRules(evalData.account_id as string, id)

    return NextResponse.json({ status: result })
  } catch (error) {
    console.error('[prop/evaluations/status GET] error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
