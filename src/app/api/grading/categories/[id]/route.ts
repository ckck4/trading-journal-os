import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import type { RubricCategory } from '@/types/grading'

type RawCategoryRow = {
  id: string
  rubric_id: string
  name: string
  weight: string
  max_score: number
  sort_order: number
  description: string | null
}

type RawRubricRef = {
  rubric_id: string
  grading_rubrics: { user_id: string } | null
}

async function verifyCategoryOwnership(
  adminClient: ReturnType<typeof import('@/lib/supabase/admin').createAdminClient>,
  categoryId: string,
  userId: string
): Promise<boolean> {
  // Join category → rubric to check user_id
  const { data, error } = await adminClient
    .from('grading_rubric_categories')
    .select('rubric_id, grading_rubrics!inner(user_id)')
    .eq('id', categoryId)
    .single()

  if (error || !data) return false
  const row = data as unknown as RawRubricRef
  return row.grading_rubrics?.user_id === userId
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

    const { id: categoryId } = await params
    const adminClient = createAdminClient()

    const owned = await verifyCategoryOwnership(adminClient, categoryId, user.id)
    if (!owned) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    let body: { name?: string; weight?: number; maxScore?: number; description?: string; sortOrder?: number }
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
    }

    const updatePayload: Record<string, unknown> = {}
    if (body.name !== undefined) {
      const trimmed = body.name.trim()
      if (!trimmed) return NextResponse.json({ error: 'name cannot be empty' }, { status: 400 })
      updatePayload.name = trimmed
    }
    if (body.weight !== undefined) updatePayload.weight = body.weight.toString()
    if (body.maxScore !== undefined) updatePayload.max_score = body.maxScore
    if (body.description !== undefined) updatePayload.description = body.description
    if (body.sortOrder !== undefined) updatePayload.sort_order = body.sortOrder

    if (Object.keys(updatePayload).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
    }

    const { data: updated, error: updateError } = await adminClient
      .from('grading_rubric_categories')
      .update(updatePayload)
      .eq('id', categoryId)
      .select('id, rubric_id, name, weight, max_score, sort_order, description')
      .single()

    if (updateError) {
      console.error('[grading/categories PATCH] error:', updateError)
      return NextResponse.json({ error: 'Update failed' }, { status: 500 })
    }

    const raw = updated as unknown as RawCategoryRow
    const category: RubricCategory = {
      id: raw.id,
      rubricId: raw.rubric_id,
      name: raw.name,
      weight: parseFloat(raw.weight ?? '0'),
      maxScore: raw.max_score,
      sortOrder: raw.sort_order,
      description: raw.description,
    }

    return NextResponse.json({ category })
  } catch (error) {
    console.error('[grading/categories PATCH] error:', error)
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

    const { id: categoryId } = await params
    const adminClient = createAdminClient()

    const owned = await verifyCategoryOwnership(adminClient, categoryId, user.id)
    if (!owned) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const { error: deleteError } = await adminClient
      .from('grading_rubric_categories')
      .delete()
      .eq('id', categoryId)

    if (deleteError) {
      console.error('[grading/categories DELETE] error:', deleteError)
      return NextResponse.json({ error: 'Delete failed' }, { status: 500 })
    }

    return new NextResponse(null, { status: 204 })
  } catch (error) {
    console.error('[grading/categories DELETE] error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
