import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

// ─── GET /api/prop/evaluations ────────────────────────────────────────────────
// List all evaluations for user across all accounts, with joined account + template info.

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
      .from('prop_evaluations')
      .select(
        `*,
        accounts(id, name, broker, starting_balance),
        prop_templates(id, template_name, firm_name, rules_json)`
      )
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('[prop/evaluations GET] query error:', error)
      return NextResponse.json({ error: 'Failed to fetch evaluations' }, { status: 500 })
    }

    return NextResponse.json({ evaluations: data ?? [] })
  } catch (error) {
    console.error('[prop/evaluations GET] error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// ─── POST /api/prop/evaluations ───────────────────────────────────────────────
// Create a new prop evaluation for an account.

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
    const { accountId, templateId, stage, startDate } = body

    if (!accountId || !templateId || !startDate) {
      return NextResponse.json(
        { error: 'accountId, templateId, and startDate are required' },
        { status: 400 }
      )
    }

    const admin = createAdminClient()

    // Verify account belongs to user
    const { data: account, error: acctErr } = await admin
      .from('accounts')
      .select('id')
      .eq('id', accountId)
      .eq('user_id', user.id)
      .single()

    if (acctErr || !account) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 })
    }

    // Verify template belongs to user
    const { data: template, error: tmplErr } = await admin
      .from('prop_templates')
      .select('id')
      .eq('id', templateId)
      .eq('user_id', user.id)
      .single()

    if (tmplErr || !template) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 })
    }

    const { data, error } = await admin
      .from('prop_evaluations')
      .insert({
        user_id: user.id,
        account_id: accountId,
        template_id: templateId,
        stage: stage ?? 'evaluation',
        status: 'active',
        start_date: startDate,
        cumulative_pnl: '0',
        max_drawdown: '0',
        days_traded: 0,
        violations: [],
      })
      .select(
        `*,
        accounts(id, name, broker, starting_balance),
        prop_templates(id, template_name, firm_name, rules_json)`
      )
      .single()

    if (error) {
      console.error('[prop/evaluations POST] insert error:', error)
      return NextResponse.json({ error: 'Failed to create evaluation' }, { status: 500 })
    }

    return NextResponse.json({ evaluation: data }, { status: 201 })
  } catch (error) {
    console.error('[prop/evaluations POST] error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
