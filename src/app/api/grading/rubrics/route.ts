import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import type { Rubric, RubricCategory } from '@/types/grading'

type RawRubricRow = {
  id: string
  user_id: string
  name: string
  is_default: boolean
  created_at: string
  updated_at: string
}

type RawCategoryRow = {
  id: string
  rubric_id: string
  name: string
  weight: string
  max_score: number
  sort_order: number
  description: string | null
}

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const adminClient = createAdminClient()

    const { data: rubricRows, error: rubricsError } = await adminClient
      .from('grading_rubrics')
      .select('id, user_id, name, is_default, created_at, updated_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true })

    if (rubricsError) {
      console.error('[grading/rubrics GET] rubrics error:', rubricsError)
      return NextResponse.json({ error: 'Failed to fetch rubrics' }, { status: 500 })
    }

    const rubrics = (rubricRows ?? []) as RawRubricRow[]

    if (rubrics.length === 0) {
      return NextResponse.json({ rubrics: [] })
    }

    const rubricIds = rubrics.map((r) => r.id)

    // Fetch all categories for these rubrics in one query
    const { data: categoryRows, error: categoriesError } = await adminClient
      .from('grading_rubric_categories')
      .select('id, rubric_id, name, weight, max_score, sort_order, description')
      .in('rubric_id', rubricIds)
      .order('sort_order', { ascending: true })

    if (categoriesError) {
      console.error('[grading/rubrics GET] categories error:', categoriesError)
      return NextResponse.json({ error: 'Failed to fetch categories' }, { status: 500 })
    }

    const categories = (categoryRows ?? []) as RawCategoryRow[]

    // Group categories by rubric_id
    const catsByRubric = new Map<string, RubricCategory[]>()
    for (const rubric of rubrics) {
      catsByRubric.set(rubric.id, [])
    }
    for (const cat of categories) {
      const list = catsByRubric.get(cat.rubric_id)
      if (list) {
        list.push({
          id: cat.id,
          rubricId: cat.rubric_id,
          name: cat.name,
          weight: parseFloat(cat.weight ?? '0'),
          maxScore: cat.max_score,
          sortOrder: cat.sort_order,
          description: cat.description,
        })
      }
    }

    const result: Rubric[] = rubrics.map((r) => ({
      id: r.id,
      userId: r.user_id,
      name: r.name,
      isDefault: r.is_default,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
      categories: catsByRubric.get(r.id) ?? [],
    }))

    return NextResponse.json({ rubrics: result })
  } catch (error) {
    console.error('[grading/rubrics GET] error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    let body: { name?: string }
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
    }

    const name = (body.name ?? '').trim()
    if (!name) {
      return NextResponse.json({ error: 'name is required' }, { status: 400 })
    }

    const adminClient = createAdminClient()

    const { data: rubric, error: insertError } = await adminClient
      .from('grading_rubrics')
      .insert({ user_id: user.id, name, is_default: false })
      .select('id, user_id, name, is_default, created_at, updated_at')
      .single()

    if (insertError) {
      console.error('[grading/rubrics POST] insert error:', insertError)
      return NextResponse.json({ error: 'Failed to create rubric' }, { status: 500 })
    }

    const raw = rubric as unknown as RawRubricRow

    return NextResponse.json({
      rubric: {
        id: raw.id,
        userId: raw.user_id,
        name: raw.name,
        isDefault: raw.is_default,
        createdAt: raw.created_at,
        updatedAt: raw.updated_at,
        categories: [],
      } satisfies Rubric,
    })
  } catch (error) {
    console.error('[grading/rubrics POST] error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
