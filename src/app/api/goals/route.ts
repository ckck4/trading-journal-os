import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { z } from 'zod'

const CreateGoalSchema = z.object({
    title: z.string().min(1),
    description: z.string().optional().nullable(),
    goal_type: z.enum(['performance', 'consistency', 'financial', 'custom']).optional(),
    metric: z.string().optional().nullable(),
    unit: z.string().optional().nullable(),
    target_value: z.number(),
    current_value: z.number().optional(),
    deadline: z.string().optional().nullable(),
    status: z.enum(['active', 'completed', 'failed', 'paused']).optional()
})

export async function GET() {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const adminClient = createAdminClient()
        const { data: userGoals, error } = await adminClient
            .from('goals')
            .select('*')
            .eq('user_id', user.id)
            .order('deadline', { ascending: true, nullsFirst: false })

        if (error) throw error

        const data = userGoals?.map(g => {
            let progress = 0
            const current = parseFloat(g.current_value || '0')
            const target = parseFloat(g.target_value || '0')

            if (target !== 0) {
                progress = (current / target) * 100
            }
            if (progress > 100) progress = 100
            if (progress < 0) progress = 0

            return {
                ...g,
                progress: Number(progress.toFixed(1))
            }
        }) || []

        return NextResponse.json({ data })
    } catch (error: any) {
        console.error('Failed to fetch goals:', error)
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 })
    }
}

export async function POST(req: Request) {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const body = await req.json()
        // Map camelCase to snake_case if necessary, or just expect snake_case from the prompt
        const mappedBody = {
            title: body.title,
            description: body.description ?? body.description,
            goal_type: body.goalType ?? body.goal_type,
            metric: body.metric,
            unit: body.unit,
            target_value: body.targetValue ?? body.target_value,
            current_value: body.currentValue ?? body.current_value,
            deadline: body.deadline,
            status: body.status
        }

        const parsed = CreateGoalSchema.safeParse(mappedBody)

        if (!parsed.success) {
            return NextResponse.json({ error: 'Invalid payload', details: parsed.error.issues }, { status: 400 })
        }

        const {
            title, description, goal_type, metric, unit, target_value, current_value, deadline, status
        } = parsed.data

        const adminClient = createAdminClient()
        const { data: newGoal, error } = await adminClient
            .from('goals')
            .insert({
                user_id: user.id,
                title,
                description,
                goal_type: goal_type ?? 'performance',
                metric,
                unit,
                target_value,
                current_value: current_value ?? 0,
                deadline,
                status: status ?? 'active'
            })
            .select()
            .single()

        if (error) throw error

        return NextResponse.json({ data: newGoal })
    } catch (error: any) {
        console.error('Failed to create goal:', error)
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 })
    }
}
