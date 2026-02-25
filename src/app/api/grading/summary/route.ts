import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const adminClient = createAdminClient()

        // Fetch trade_grades with embedded trades relation
        const { data: grades, error } = await adminClient
            .from('trade_grades')
            .select(`
        id,
        trade_id,
        grade,
        risk_management_score,
        execution_score,
        discipline_score,
        strategy_score,
        efficiency_score,
        created_at,
        trades (
          id,
          trading_day,
          net_pnl
        )
      `)
            .eq('user_id', user.id)

        if (error) {
            console.error('[grading/summary] DB error:', error)
            return NextResponse.json({ error: 'Failed to fetch grading summary' }, { status: 500 })
        }

        // Map rows cleanly since PostgREST embeds relation objects
        const mapped = (grades || []).map((row: any) => ({
            id: row.id,
            tradeId: row.trade_id,
            grade: row.grade,
            riskManagementScore: row.risk_management_score,
            executionScore: row.execution_score,
            disciplineScore: row.discipline_score,
            strategyScore: row.strategy_score,
            efficiencyScore: row.efficiency_score,
            createdAt: row.created_at,
            tradingDay: row.trades?.trading_day || null,
            netPnl: row.trades?.net_pnl || "0",
        }))

        return NextResponse.json({ data: mapped })
    } catch (error: any) {
        console.error('[grading/summary] Internal Server Error:', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}
