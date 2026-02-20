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

// ─── GET /api/prop/templates ─────────────────────────────────────────────────
// List user's prop templates. Auto-seeds LucidFlex 50K preset on first visit.
// Applies rules_json migration before returning to ensure new format.

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

      const seededMigrated = (seeded ?? []).map((row) => ({
        ...row,
        rules_json: migrateRulesJson(row.rules_json),
      }))

      return NextResponse.json({ templates: seededMigrated })
    }

    // Apply migration to all rows before returning
    const migrated = (rows ?? []).map((row) => ({
      ...row,
      rules_json: migrateRulesJson(row.rules_json),
    }))

    return NextResponse.json({ templates: migrated })
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
    const { firmName, templateName, rulesJson, isDefault } = body

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
