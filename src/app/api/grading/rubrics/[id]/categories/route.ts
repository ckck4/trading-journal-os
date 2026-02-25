import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import type { RubricCategory } from '@/types/grading-legacy'

type RawCategoryRow = {
  id: string
  rubric_id: string
  name: string
  weight: string
  max_score: number
  sort_order: number
  description: string | null
}

function mapCategory(cat: RawCategoryRow): RubricCategory {
  return {
    id: cat.id,
    rubricId: cat.rubric_id,
    name: cat.name,
    weight: parseFloat(cat.weight ?? '0'),
    maxScore: cat.max_score,
    sortOrder: cat.sort_order,
    description: cat.description,
  }
}

async function verifyRubricOwnership(
  adminClient: ReturnType<typeof import('@/lib/supabase/admin').createAdminClient>,
  rubricId: string,
  userId: string
): Promise<boolean> {
  const { data, error } = await adminClient
    .from('grading_rubrics')
    .select('id, user_id')
    .eq('id', rubricId)
    .single()
  if (error || !data) return false
  return (data as unknown as { user_id: string }).user_id === userId
}

export async function GET(
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

    const owned = await verifyRubricOwnership(adminClient, rubricId, user.id)
    if (!owned) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const { data: rows, error: queryError } = await adminClient
      .from('grading_rubric_categories')
      .select('id, rubric_id, name, weight, max_score, sort_order, description')
      .eq('rubric_id', rubricId)
      .order('sort_order', { ascending: true })

    if (queryError) {
      console.error('[grading/categories GET] error:', queryError)
      return NextResponse.json({ error: 'Failed to fetch categories' }, { status: 500 })
    }

    const categories = ((rows ?? []) as RawCategoryRow[]).map(mapCategory)
    return NextResponse.json({ categories })
  } catch (error) {
    console.error('[grading/categories GET] error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(
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

    const owned = await verifyRubricOwnership(adminClient, rubricId, user.id)
    if (!owned) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    let body: { name?: string; weight?: number; maxScore?: number; description?: string }
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
    }

    const name = (body.name ?? '').trim()
    if (!name) return NextResponse.json({ error: 'name is required' }, { status: 400 })
    const weight = body.weight ?? 0
    const maxScore = body.maxScore ?? 10

    // Find current max sort_order for this rubric
    const { data: existing } = await adminClient
      .from('grading_rubric_categories')
      .select('sort_order')
      .eq('rubric_id', rubricId)
      .order('sort_order', { ascending: false })
      .limit(1)

    const maxSort =
      existing && existing.length > 0
        ? ((existing[0] as unknown as { sort_order: number }).sort_order ?? 0)
        : -1
    const sortOrder = maxSort + 1

    const { data: inserted, error: insertError } = await adminClient
      .from('grading_rubric_categories')
      .insert({
        rubric_id: rubricId,
        name,
        weight: weight.toString(),
        max_score: maxScore,
        sort_order: sortOrder,
        description: body.description ?? null,
      })
      .select('id, rubric_id, name, weight, max_score, sort_order, description')
      .single()

    if (insertError) {
      console.error('[grading/categories POST] error:', insertError)
      return NextResponse.json({ error: 'Failed to create category' }, { status: 500 })
    }

    return NextResponse.json({ category: mapCategory(inserted as unknown as RawCategoryRow) })
  } catch (error) {
    console.error('[grading/categories POST] error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
