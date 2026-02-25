import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { z } from 'zod'

const UpdateHabitSchema = z.object({
    name: z.string().min(1).optional(),
    description: z.string().optional().nullable(),
    frequency: z.enum(['daily', 'weekly', 'monthly']).optional(),
    category: z.string().optional(),
    is_active: z.boolean().optional()
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
            name: body.name,
            description: body.description,
            frequency: body.frequency,
            category: body.category,
            is_active: body.isActive ?? body.is_active
        }
        const parsed = UpdateHabitSchema.safeParse(mappedBody)

        if (!parsed.success) {
            return NextResponse.json({ error: 'Invalid payload', details: parsed.error.issues }, { status: 400 })
        }

        const updateData: any = { ...parsed.data }
        updateData.updated_at = new Date().toISOString()

        const adminClient = createAdminClient()
        const { data: updated, error } = await adminClient
            .from('habits')
            .update(updateData)
            .eq('id', params.id)
            .eq('user_id', user.id)
            .select()
            .single()

        if (error) throw error

        return NextResponse.json({ data: updated })
    } catch (error: any) {
        console.error('Failed to update habit:', error)
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
            .from('habits')
            .delete()
            .eq('id', params.id)
            .eq('user_id', user.id)

        if (error) throw error

        return NextResponse.json({ success: true })
    } catch (error: any) {
        console.error('Failed to delete habit:', error)
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 })
    }
}
