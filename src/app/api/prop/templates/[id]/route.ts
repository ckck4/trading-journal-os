import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

// ─── PATCH /api/prop/templates/[id] ─────────────────────────────────────────

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
    const { firmName, templateName, rulesJson, isDefault, maxLossLimit } = body

    const admin = createAdminClient()

    // Verify ownership
    const { data: existing, error: fetchErr } = await admin
      .from('prop_templates')
      .select('id')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (fetchErr || !existing) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 })
    }

    // If setting as default, clear other defaults first
    if (isDefault === true) {
      await admin
        .from('prop_templates')
        .update({ is_default: false })
        .eq('user_id', user.id)
        .neq('id', id)
    }

    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
    if (firmName !== undefined) updates.firm_name = firmName
    if (templateName !== undefined) updates.template_name = templateName
    if (maxLossLimit !== undefined) updates.max_loss_limit = maxLossLimit
    if (rulesJson !== undefined) {
      // Bump version on rules change
      const { data: current } = await admin
        .from('prop_templates')
        .select('version, rules_json')
        .eq('id', id)
        .single()

      if (current) {
        // Store version snapshot
        await admin.from('prop_template_versions').insert({
          template_id: id,
          version: current.version as number,
          rules_json: current.rules_json,
          changed_at: new Date().toISOString(),
        })
        updates.rules_json = rulesJson
        updates.version = ((current.version as number) ?? 1) + 1
      }
    }
    if (isDefault !== undefined) updates.is_default = isDefault

    const { data, error } = await admin
      .from('prop_templates')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('[prop/templates PATCH] update error:', error)
      return NextResponse.json({ error: 'Failed to update template' }, { status: 500 })
    }

    return NextResponse.json({ template: data })
  } catch (error) {
    console.error('[prop/templates PATCH] error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// ─── DELETE /api/prop/templates/[id] ────────────────────────────────────────

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
      .from('prop_templates')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)

    if (error) {
      console.error('[prop/templates DELETE] error:', error)
      return NextResponse.json({ error: 'Failed to delete template' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[prop/templates DELETE] error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
