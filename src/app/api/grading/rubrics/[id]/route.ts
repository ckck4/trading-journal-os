import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

type RawRubricRow = {
  id: string
  user_id: string
  name: string
  is_default: boolean
  created_at: string
  updated_at: string
}

async function verifyOwnership(adminClient: ReturnType<typeof import('@/lib/supabase/admin').createAdminClient>, rubricId: string, userId: string) {
  const { data, error } = await adminClient
    .from('grading_rubrics')
    .select('id, user_id')
    .eq('id', rubricId)
    .single()

  if (error || !data) return null
  const row = data as unknown as { id: string; user_id: string }
  if (row.user_id !== userId) return null
  return row
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: rubricId } = await params
    const adminClient = createAdminClient()

    const owned = await verifyOwnership(adminClient, rubricId, user.id)
    if (!owned) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    let body: { name?: string; isDefault?: boolean }
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
    }

    const updatePayload: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    }
    if (body.name !== undefined) {
      const trimmed = body.name.trim()
      if (!trimmed) return NextResponse.json({ error: 'name cannot be empty' }, { status: 400 })
      updatePayload.name = trimmed
    }
    if (body.isDefault === true) {
      updatePayload.is_default = true
      // First clear all other rubrics for this user
      await adminClient
        .from('grading_rubrics')
        .update({ is_default: false, updated_at: new Date().toISOString() })
        .eq('user_id', user.id)
        .neq('id', rubricId)
    }

    const { data: updated, error: updateError } = await adminClient
      .from('grading_rubrics')
      .update(updatePayload)
      .eq('id', rubricId)
      .select('id, user_id, name, is_default, created_at, updated_at')
      .single()

    if (updateError) {
      console.error('[grading/rubrics PATCH] update error:', updateError)
      return NextResponse.json({ error: 'Update failed' }, { status: 500 })
    }

    const raw = updated as unknown as RawRubricRow

    return NextResponse.json({
      rubric: {
        id: raw.id,
        userId: raw.user_id,
        name: raw.name,
        isDefault: raw.is_default,
        createdAt: raw.created_at,
        updatedAt: raw.updated_at,
      },
    })
  } catch (error) {
    console.error('[grading/rubrics PATCH] error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: rubricId } = await params
    const adminClient = createAdminClient()

    const owned = await verifyOwnership(adminClient, rubricId, user.id)
    if (!owned) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const { error: deleteError } = await adminClient
      .from('grading_rubrics')
      .delete()
      .eq('id', rubricId)

    if (deleteError) {
      console.error('[grading/rubrics DELETE] error:', deleteError)
      return NextResponse.json({ error: 'Delete failed' }, { status: 500 })
    }

    return new NextResponse(null, { status: 204 })
  } catch (error) {
    console.error('[grading/rubrics DELETE] error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
