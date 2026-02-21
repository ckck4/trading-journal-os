import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { computeGrade } from '@/lib/services/grading'
import type { RubricCategory, TradeGrade, Rubric } from '@/types/grading'

type RawCategoryRow = {
  id: string
  rubric_id: string
  name: string
  weight: string
  max_score: number
  sort_order: number
  description: string | null
}

type RawGradeRow = {
  id: string
  trade_id: string
  rubric_id: string
  category_scores: Record<string, number>
  numeric_score: string
  letter_grade: string
  confluence_results: unknown[]
  notes: string | null
  created_at: string
  updated_at: string
}

type RawRubricRow = {
  id: string
  user_id: string
  name: string
  is_default: boolean
  created_at: string
  updated_at: string
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

    const { id: tradeId } = await params
    const adminClient = createAdminClient()

    // Verify trade ownership
    const { data: tradeRow, error: tradeError } = await adminClient
      .from('trades')
      .select('id, user_id')
      .eq('id', tradeId)
      .single()

    if (tradeError || !tradeRow) {
      return NextResponse.json({ error: 'Trade not found' }, { status: 404 })
    }
    if ((tradeRow as unknown as { user_id: string }).user_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Fetch grade
    const { data: gradeRow, error: gradeError } = await adminClient
      .from('trade_grades')
      .select('id, trade_id, rubric_id, category_scores, numeric_score, letter_grade, confluence_results, notes, created_at, updated_at')
      .eq('trade_id', tradeId)
      .maybeSingle()

    if (gradeError) {
      console.error('[trades/grade GET] grade error:', gradeError)
      return NextResponse.json({ error: 'Failed to fetch grade' }, { status: 500 })
    }

    if (!gradeRow) {
      return NextResponse.json({ grade: null })
    }

    const grade = gradeRow as unknown as RawGradeRow

    // Fetch rubric + categories for context
    const { data: rubricRow } = await adminClient
      .from('grading_rubrics')
      .select('id, user_id, name, is_default, created_at, updated_at')
      .eq('id', grade.rubric_id)
      .single()

    const { data: categoryRows } = await adminClient
      .from('grading_rubric_categories')
      .select('id, rubric_id, name, weight, max_score, sort_order, description')
      .eq('rubric_id', grade.rubric_id)
      .order('sort_order', { ascending: true })

    const rubric: Rubric | undefined = rubricRow
      ? (() => {
          const raw = rubricRow as unknown as RawRubricRow
          return {
            id: raw.id,
            userId: raw.user_id,
            name: raw.name,
            isDefault: raw.is_default,
            createdAt: raw.created_at,
            updatedAt: raw.updated_at,
            categories: ((categoryRows ?? []) as RawCategoryRow[]).map((c) => ({
              id: c.id,
              rubricId: c.rubric_id,
              name: c.name,
              weight: parseFloat(c.weight ?? '0'),
              maxScore: c.max_score,
              sortOrder: c.sort_order,
              description: c.description,
            })),
          }
        })()
      : undefined

    const result: TradeGrade = {
      id: grade.id,
      tradeId: grade.trade_id,
      rubricId: grade.rubric_id,
      categoryScores: grade.category_scores ?? {},
      numericScore: parseFloat(grade.numeric_score ?? '0'),
      letterGrade: grade.letter_grade,
      confluenceResults: grade.confluence_results ?? [],
      notes: grade.notes,
      createdAt: grade.created_at,
      updatedAt: grade.updated_at,
      rubric,
    }

    return NextResponse.json({ grade: result })
  } catch (error) {
    console.error('[trades/grade GET] error:', error)
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

    const { id: tradeId } = await params
    const adminClient = createAdminClient()

    // Verify trade ownership
    const { data: tradeRow, error: tradeError } = await adminClient
      .from('trades')
      .select('id, user_id')
      .eq('id', tradeId)
      .single()

    if (tradeError || !tradeRow) {
      return NextResponse.json({ error: 'Trade not found' }, { status: 404 })
    }
    if ((tradeRow as unknown as { user_id: string }).user_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    let body: { categoryScores?: Record<string, number>; rubricId?: string; notes?: string }
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
    }

    if (!body.rubricId) {
      return NextResponse.json({ error: 'rubricId is required' }, { status: 400 })
    }
    if (!body.categoryScores || typeof body.categoryScores !== 'object') {
      return NextResponse.json({ error: 'categoryScores is required' }, { status: 400 })
    }

    // Verify rubric belongs to user
    const { data: rubricRow, error: rubricError } = await adminClient
      .from('grading_rubrics')
      .select('id, user_id')
      .eq('id', body.rubricId)
      .single()

    if (rubricError || !rubricRow) {
      return NextResponse.json({ error: 'Rubric not found' }, { status: 404 })
    }
    if ((rubricRow as unknown as { user_id: string }).user_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Fetch rubric categories to compute grade server-side
    const { data: categoryRows, error: catsError } = await adminClient
      .from('grading_rubric_categories')
      .select('id, rubric_id, name, weight, max_score, sort_order, description')
      .eq('rubric_id', body.rubricId)
      .order('sort_order', { ascending: true })

    if (catsError) {
      console.error('[trades/grade POST] categories error:', catsError)
      return NextResponse.json({ error: 'Failed to fetch rubric categories' }, { status: 500 })
    }

    const categories: RubricCategory[] = ((categoryRows ?? []) as RawCategoryRow[]).map((c) => ({
      id: c.id,
      rubricId: c.rubric_id,
      name: c.name,
      weight: parseFloat(c.weight ?? '0'),
      maxScore: c.max_score,
      sortOrder: c.sort_order,
      description: c.description,
    }))

    // Compute grade server-side — never trust client-computed scores
    const gradeResult = computeGrade(body.categoryScores, categories)

    // Upsert — unique constraint is on trade_id
    const { data: upserted, error: upsertError } = await adminClient
      .from('trade_grades')
      .upsert(
        {
          trade_id: tradeId,
          rubric_id: body.rubricId,
          category_scores: gradeResult.categoryScores,
          numeric_score: gradeResult.numericScore.toString(),
          letter_grade: gradeResult.letterGrade,
          confluence_results: [],
          notes: body.notes ?? null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'trade_id' }
      )
      .select('id, trade_id, rubric_id, category_scores, numeric_score, letter_grade, created_at, updated_at')
      .single()

    if (upsertError) {
      console.error('[trades/grade POST] upsert error:', upsertError)
      return NextResponse.json({ error: 'Failed to save grade' }, { status: 500 })
    }

    const raw = upserted as unknown as RawGradeRow

    return NextResponse.json({
      grade: {
        id: raw.id,
        tradeId: raw.trade_id,
        rubricId: raw.rubric_id,
        categoryScores: raw.category_scores,
        numericScore: parseFloat(raw.numeric_score ?? '0'),
        letterGrade: raw.letter_grade,
        createdAt: raw.created_at,
        updatedAt: raw.updated_at,
      },
    })
  } catch (error) {
    console.error('[trades/grade POST] error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
