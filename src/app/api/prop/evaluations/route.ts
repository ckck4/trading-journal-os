import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { migrateRulesJson } from '@/lib/prop-migrate'

// ─── Row mapper: snake_case → camelCase (matches PropEvaluation interface) ────

function mapRow(row: Record<string, unknown>) {
  const acct = row.accounts as Record<string, unknown> | null
  const tmpl = row.prop_templates as Record<string, unknown> | null
  return {
    id: row.id as string,
    userId: row.user_id as string,
    accountId: row.account_id as string,
    templateId: row.template_id as string,
    stage: row.stage as string,
    status: row.status as string,
    startDate: row.start_date as string,
    endDate: row.end_date as string | null,
    cumulativePnl: row.cumulative_pnl as string,
    maxDrawdown: row.max_drawdown as string,
    consistencyPct: row.consistency_pct as string | null,
    daysTraded: row.days_traded as number,
    violations: row.violations as unknown[],
    profitTargetOverride: row.profit_target_override as string | null,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
    account: acct
      ? {
          id: acct.id as string,
          name: acct.name as string,
          broker: acct.broker as string,
          startingBalance: acct.starting_balance as string,
        }
      : undefined,
    template: tmpl
      ? {
          id: tmpl.id as string,
          templateName: tmpl.template_name as string,
          firmName: tmpl.firm_name as string,
          rulesJson: migrateRulesJson(tmpl.rules_json),
        }
      : undefined,
  }
}

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

    const evaluations = (data ?? []).map((row) => mapRow(row as Record<string, unknown>))
    return NextResponse.json({ evaluations })
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
    const { accountId, templateId, stage, startDate, status } = body

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
        status: status ?? 'active',
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

    return NextResponse.json({ evaluation: mapRow(data as Record<string, unknown>) }, { status: 201 })
  } catch (error) {
    console.error('[prop/evaluations POST] error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
