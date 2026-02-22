import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { migrateRulesJson } from '@/lib/prop-migrate'
import type { RulesJson } from '@/types/prop'

// ─── LucidFlex 50K Preset (new stages-array format) ──────────────────────────

const LUCIDFLEX_50K_RULES: RulesJson = {
  stages: [
    {
      key: 'evaluation',
      label: 'Evaluation',
      rules: {
        profitTarget: 3000,
        maxDailyLoss: -1500,
        maxTrailingDrawdown: null,
        minTradingDays: 10,
        consistencyPct: 30,
      },
    },
    {
      key: 'pa',
      label: 'PA',
      rules: {
        profitTarget: null,
        maxDailyLoss: -1500,
        maxTrailingDrawdown: null,
        minTradingDays: null,
        consistencyPct: null,
      },
    },
    {
      key: 'funded',
      label: 'Funded',
      rules: {
        profitTarget: null,
        maxDailyLoss: -1500,
        maxTrailingDrawdown: null,
        minTradingDays: null,
        consistencyPct: null,
      },
    },
  ],
}

// ─── Row mapper: snake_case → camelCase (matches PropTemplate interface) ──────

function mapRow(row: Record<string, unknown>) {
  return {
    id: row.id as string,
    userId: row.user_id as string,
    firmName: row.firm_name as string,
    templateName: row.template_name as string,
    version: row.version as number,
    isDefault: row.is_default as boolean,
    maxLossLimit: row.max_loss_limit ? parseFloat(row.max_loss_limit as string) : null,
    rulesJson: migrateRulesJson(row.rules_json),
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  }
}

// ─── GET /api/prop/templates ─────────────────────────────────────────────────
// List user's prop templates. Auto-seeds LucidFlex 50K preset on first visit.
// Returns camelCase fields matching the PropTemplate client interface.

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

    // Fetch existing templates
    const { data: rows, error: queryError } = await admin
      .from('prop_templates')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true })

    if (queryError) {
      console.error('[prop/templates GET] query error:', queryError)
      return NextResponse.json({ error: 'Failed to fetch templates' }, { status: 500 })
    }

    // Auto-seed LucidFlex 50K on first visit (no templates yet)
    if ((rows ?? []).length === 0) {
      const { data: seeded, error: seedErr } = await admin
        .from('prop_templates')
        .insert({
          user_id: user.id,
          firm_name: 'LucidFlex',
          template_name: '50K Evaluation',
          version: 1,
          is_default: true,
          rules_json: LUCIDFLEX_50K_RULES,
        })
        .select()

      if (seedErr) {
        console.error('[prop/templates GET] seed error:', seedErr)
        return NextResponse.json({ error: 'Failed to seed default template' }, { status: 500 })
      }

      return NextResponse.json({ templates: (seeded ?? []).map(mapRow) })
    }

    return NextResponse.json({ templates: (rows ?? []).map(mapRow) })
  } catch (error) {
    console.error('[prop/templates GET] error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// ─── POST /api/prop/templates ────────────────────────────────────────────────

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
    const { firmName, templateName, rulesJson, isDefault, maxLossLimit } = body

    if (!templateName || !rulesJson) {
      return NextResponse.json(
        { error: 'templateName and rulesJson are required' },
        { status: 400 }
      )
    }

    const admin = createAdminClient()

    // If setting as default, clear existing defaults first
    if (isDefault) {
      await admin
        .from('prop_templates')
        .update({ is_default: false })
        .eq('user_id', user.id)
    }

    // Ensure stored format is always new format
    const normalizedRules = migrateRulesJson(rulesJson)

    const { data, error } = await admin
      .from('prop_templates')
      .insert({
        user_id: user.id,
        firm_name: firmName ?? 'Custom',
        template_name: templateName,
        version: 1,
        is_default: isDefault ?? false,
        max_loss_limit: maxLossLimit ?? null,
        rules_json: normalizedRules,
      })
      .select()
      .single()

    if (error) {
      console.error('[prop/templates POST] insert error:', error)
      return NextResponse.json({ error: 'Failed to create template' }, { status: 500 })
    }

    return NextResponse.json({ template: data }, { status: 201 })
  } catch (error) {
    console.error('[prop/templates POST] error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
