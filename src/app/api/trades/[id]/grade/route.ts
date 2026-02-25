import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { z } from 'zod'

const GradeSchema = z.object({
  grade: z.enum(['A+', 'A', 'B+', 'B', 'B-', 'C']),
  risk_management_score: z.number().optional().nullable(),
  execution_score: z.number().optional().nullable(),
  discipline_score: z.number().optional().nullable(),
  strategy_score: z.number().optional().nullable(),
  efficiency_score: z.number().optional().nullable(),
  notes: z.string().optional().nullable(),
  confluence_ids: z.array(z.string().uuid()).optional().default([]),
})

export async function GET(req: Request, props: { params: Promise<{ id: string }> }) {
  try {
    const params = await props.params;
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const tradeId = params.id

    // Fetch trade grade
    const { data: gradeData, error: gradeError } = await supabase
      .from('trade_grades')
      .select('*')
      .eq('trade_id', tradeId)
      .eq('user_id', user.id)
      .maybeSingle()

    if (gradeError) {
      console.error('Error fetching trade grade:', gradeError)
      return NextResponse.json({ error: 'Failed to fetch trade grade' }, { status: 500 })
    }

    // Fetch selected confluences
    const { data: confluencesData, error: confError } = await supabase
      .from('trade_confluences')
      .select('confluence_id')
      .eq('trade_id', tradeId)
      .eq('user_id', user.id)

    if (confError) {
      console.error('Error fetching trade confluences:', confError)
      return NextResponse.json({ error: 'Failed to fetch trade confluences' }, { status: 500 })
    }

    return NextResponse.json({
      data: {
        ...(gradeData || {}),
        confluence_ids: confluencesData ? confluencesData.map((c: any) => c.confluence_id) : []
      }
    })
  } catch (error: any) {
    console.error('Failed to get grade:', error)
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 })
  }
}

export async function POST(req: Request, props: { params: Promise<{ id: string }> }) {
  try {
    const params = await props.params;
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const tradeId = params.id
    const body = await req.json()
    const parsed = GradeSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid payload', details: parsed.error.issues }, { status: 400 })
    }

    const {
      grade, risk_management_score, execution_score, discipline_score,
      strategy_score, efficiency_score, notes, confluence_ids
    } = parsed.data

    const adminClient = createAdminClient()

    // 1. Upsert trade_grades
    const { data: upsertedGrade, error: gradeError } = await adminClient
      .from('trade_grades')
      .upsert({
        user_id: user.id,
        trade_id: tradeId,
        grade,
        risk_management_score,
        execution_score,
        discipline_score,
        strategy_score,
        efficiency_score,
        notes,
        updated_at: new Date().toISOString()
      }, { onConflict: 'trade_id' })
      .select()
      .single()

    if (gradeError) throw gradeError

    // 2. Update trades.grade column
    const { error: tradeUpdateError } = await adminClient
      .from('trades')
      .update({ grade })
      .eq('id', tradeId)
      .eq('user_id', user.id)

    if (tradeUpdateError) throw tradeUpdateError

    // 3. Replace trade_confluences
    // First delete existing
    await adminClient
      .from('trade_confluences')
      .delete()
      .eq('trade_id', tradeId)
      .eq('user_id', user.id)

    // Then insert new if any
    if (confluence_ids && confluence_ids.length > 0) {
      const inserts = confluence_ids.map(id => ({
        user_id: user.id,
        trade_id: tradeId,
        confluence_id: id
      }))

      const { error: confInsertError } = await adminClient
        .from('trade_confluences')
        .insert(inserts)

      if (confInsertError) throw confInsertError
    }

    return NextResponse.json({
      data: {
        ...upsertedGrade,
        confluence_ids
      }
    })
  } catch (error: any) {
    console.error('Failed to save grade:', error)
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 })
  }
}
