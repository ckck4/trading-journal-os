import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { z } from 'zod'

const CompleteHabitSchema = z.object({
    date: z.string().optional() // 'YYYY-MM-DD' format expected
})

export async function POST(req: Request, props: { params: Promise<{ id: string }> }) {
    try {
        const params = await props.params;
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        let body = {}
        try {
            body = await req.json()
        } catch {
            // body is optional
        }

        const parsed = CompleteHabitSchema.safeParse(body)
        const targetDate = parsed.success && parsed.data.date ? parsed.data.date : new Date().toISOString().split('T')[0]

        const adminClient = createAdminClient()
        // By providing an exact duplicate on primary/unique constraint it will return an error, handle gracefully
        const { error } = await adminClient
            .from('habit_completions')
            .insert({
                user_id: user.id,
                habit_id: params.id,
                completed_date: targetDate
            })

        if (error && error.code !== '23505') {
            throw error
        }

        return NextResponse.json({ success: true })
    } catch (error: any) {
        console.error('Failed to complete habit:', error)
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

        let body = {}
        try {
            body = await req.json()
        } catch {
            // body is optional
        }

        const parsed = CompleteHabitSchema.safeParse(body)
        const targetDate = parsed.success && parsed.data.date ? parsed.data.date : new Date().toISOString().split('T')[0]

        const adminClient = createAdminClient()
        const { error } = await adminClient
            .from('habit_completions')
            .delete()
            .eq('habit_id', params.id)
            .eq('user_id', user.id)
            .eq('completed_date', targetDate)

        if (error) throw error

        return NextResponse.json({ success: true })
    } catch (error: any) {
        console.error('Failed to remove habit completion:', error)
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 })
    }
}
