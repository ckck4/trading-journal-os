import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(req: Request) {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // Fetch all trade grades for the user
        const { data: grades, error } = await supabase
            .from('trade_grades')
            .select('grade, risk_management_score, execution_score, discipline_score, strategy_score, efficiency_score')
            .eq('user_id', user.id)

        if (error) {
            throw error
        }

        if (!grades || grades.length === 0) {
            return NextResponse.json({ data: { distribution: {}, averages: {} } })
        }

        const distribution: Record<string, number> = {}
        const sums = {
            risk_management_score: 0, execution_score: 0,
            discipline_score: 0, strategy_score: 0, efficiency_score: 0
        }
        const counts = { ...sums }

        grades.forEach((g: any) => {
            distribution[g.grade] = (distribution[g.grade] || 0) + 1

            if (g.risk_management_score != null) { sums.risk_management_score += Number(g.risk_management_score); counts.risk_management_score++ }
            if (g.execution_score != null) { sums.execution_score += Number(g.execution_score); counts.execution_score++ }
            if (g.discipline_score != null) { sums.discipline_score += Number(g.discipline_score); counts.discipline_score++ }
            if (g.strategy_score != null) { sums.strategy_score += Number(g.strategy_score); counts.strategy_score++ }
            if (g.efficiency_score != null) { sums.efficiency_score += Number(g.efficiency_score); counts.efficiency_score++ }
        })

        const averages: Record<string, number> = {}
        for (const [key, count] of Object.entries(counts)) {
            if (count > 0) {
                averages[key] = sums[key as keyof typeof sums] / count
            }
        }

        return NextResponse.json({
            data: {
                total_graded: grades.length,
                distribution,
                averages
            }
        })

    } catch (error: any) {
        console.error('Failed to get grading summary:', error)
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 })
    }
}
