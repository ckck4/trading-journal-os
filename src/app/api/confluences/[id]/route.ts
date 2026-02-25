import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { z } from 'zod'

const UpdateConfluenceSchema = z.object({
    name: z.string().min(1).optional(),
    weight: z.number().optional(),
    category: z.enum(['Risk Management', 'Execution', 'Discipline', 'Strategy', 'Efficiency', 'Custom']).optional(),
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
        const parsed = UpdateConfluenceSchema.safeParse(body)

        if (!parsed.success) {
            return NextResponse.json({ error: 'Invalid payload', details: parsed.error.issues }, { status: 400 })
        }

        // Verify ownership
        const { data: existing, error: fetchError } = await supabase
            .from('confluences')
            .select('id')
            .eq('id', params.id)
            .eq('user_id', user.id)
            .single()

        if (fetchError || !existing) {
            return NextResponse.json({ error: 'Not Found' }, { status: 404 })
        }

        const adminClient = createAdminClient()
        const { data: updated, error } = await adminClient
            .from('confluences')
            .update(parsed.data)
            .eq('id', params.id)
            .select()
            .single()

        if (error) throw error

        return NextResponse.json({ data: updated })
    } catch (error: any) {
        console.error('Failed to update confluence:', error)
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

        // Verify ownership
        const { data: existing, error: fetchError } = await supabase
            .from('confluences')
            .select('id')
            .eq('id', params.id)
            .eq('user_id', user.id)
            .single()

        if (fetchError || !existing) {
            return NextResponse.json({ error: 'Not Found' }, { status: 404 })
        }

        const adminClient = createAdminClient()
        const { error } = await adminClient
            .from('confluences')
            .delete()
            .eq('id', params.id)

        if (error) throw error

        return NextResponse.json({ success: true })
    } catch (error: any) {
        console.error('Failed to delete confluence:', error)
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 })
    }
}
