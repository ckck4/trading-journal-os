import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

// ─── GET /api/dashboard/layouts ───────────────────────────────────────────────
// Get user's saved dashboard layouts.

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
      .from('dashboard_layouts')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('[dashboard/layouts GET] query error:', error)
      return NextResponse.json({ error: 'Failed to fetch layouts' }, { status: 500 })
    }

    return NextResponse.json({ layouts: data ?? [] })
  } catch (error) {
    console.error('[dashboard/layouts GET] error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// ─── POST /api/dashboard/layouts ─────────────────────────────────────────────
// Save/update layout. Upserts on is_default — only one default allowed at a time.

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
    const { name, layoutJson, isDefault } = body

    if (!layoutJson) {
      return NextResponse.json({ error: 'layoutJson is required' }, { status: 400 })
    }

    const admin = createAdminClient()

    // If saving as default, clear existing defaults
    if (isDefault !== false) {
      await admin
        .from('dashboard_layouts')
        .update({ is_default: false })
        .eq('user_id', user.id)
        .eq('is_default', true)
    }

    // Check if a default layout already exists to upsert
    const { data: existing } = await admin
      .from('dashboard_layouts')
      .select('id')
      .eq('user_id', user.id)
      .eq('name', name ?? 'Default')
      .limit(1)

    let result
    if (existing && existing.length > 0) {
      result = await admin
        .from('dashboard_layouts')
        .update({
          layout_json: layoutJson,
          is_default: isDefault !== false,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing[0].id)
        .select()
        .single()
    } else {
      result = await admin
        .from('dashboard_layouts')
        .insert({
          user_id: user.id,
          name: name ?? 'Default',
          is_default: isDefault !== false,
          layout_json: layoutJson,
        })
        .select()
        .single()
    }

    if (result.error) {
      console.error('[dashboard/layouts POST] error:', result.error)
      return NextResponse.json({ error: 'Failed to save layout' }, { status: 500 })
    }

    return NextResponse.json({ layout: result.data }, { status: 201 })
  } catch (error) {
    console.error('[dashboard/layouts POST] error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
