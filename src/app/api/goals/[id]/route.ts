import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { z } from 'zod'

const UpdateGoalSchema = z.object({
    title: z.string().min(1).optional(),
    description: z.string().optional().nullable(),
    goal_type: z.enum(['performance', 'consistency', 'financial', 'custom']).optional(),
    metric: z.string().optional().nullable(),
    unit: z.string().optional().nullable(),
    target_value: z.number().optional(),
    current_value: z.number().optional(),
    deadline: z.string().optional().nullable(),
    status: z.enum(['active', 'completed', 'failed', 'paused']).optional()
})

export async function PATCH(req: Request, props: { params: Promise<{ id: string }> }) {
    try {
        const params = await props.params;
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const body = await req.json()
        const mappedBody = {
            title: body.title,
            description: body.description,
            goal_type: body.goalType ?? body.goal_type,
            metric: body.metric,
            unit: body.unit,
            target_value: body.targetValue ?? body.target_value,
            current_value: body.currentValue ?? body.current_value,
            deadline: body.deadline,
            status: body.status
        }
        const parsed = UpdateGoalSchema.safeParse(mappedBody)

        if (!parsed.success) {
            return NextResponse.json({ error: 'Invalid payload', details: parsed.error.issues }, { status: 400 })
        }

        const adminClient = createAdminClient()

        // Auto-complete logic based on PATCH request
        const updateData: any = { ...parsed.data }
        updateData.updated_at = new Date().toISOString()

        if (parsed.data.current_value !== undefined && parsed.data.target_value !== undefined) {
            if (parsed.data.current_value >= parsed.data.target_value && (!parsed.data.status || parsed.data.status === 'active')) {
                updateData.status = 'completed'
            }
        } else if (parsed.data.current_value !== undefined || parsed.data.target_value !== undefined) {
            const { data: existingGoal } = await adminClient
                .from('goals')
                .select('*')
                .eq('id', params.id)
                .eq('user_id', user.id)
                .single()

            if (existingGoal) {
                const newCurrent = parsed.data.current_value !== undefined ? parsed.data.current_value : parseFloat(existingGoal.current_value || '0')
                const newTarget = parsed.data.target_value !== undefined ? parsed.data.target_value : parseFloat(existingGoal.target_value || '0')
                if (newCurrent >= newTarget && existingGoal.status === 'active' && (!parsed.data.status || parsed.data.status === 'active')) {
                    updateData.status = 'completed'
                }
            }
        }

        const { data: updated, error } = await adminClient
            .from('goals')
            .update(updateData)
            .eq('id', params.id)
            .eq('user_id', user.id)
            .select()
            .single()

        if (error) throw error

        return NextResponse.json({ data: updated })
    } catch (error: any) {
        console.error('Failed to update goal:', error)
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 })
    }
}

export async function DELETE(req: Request, props: { params: Promise<{ id: string }> }) {
    try {
        const params = await props.params;
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const adminClient = createAdminClient()
        const { error } = await adminClient
            .from('goals')
            .delete()
            .eq('id', params.id)
            .eq('user_id', user.id)

        if (error) throw error

        return NextResponse.json({ success: true })
    } catch (error: any) {
        console.error('Failed to delete goal:', error)
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 })
    }
}
